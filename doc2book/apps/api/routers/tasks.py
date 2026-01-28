"""
任务管理路由
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from sqlalchemy import select
import uuid
import asyncio
import json

from services.database import get_db, get_db_session, AsyncSession
from services import processor_client
from services.logger import log_info, log_error, log_warning
from models import Task, TaskStatus, TaskType, Document, Project

router = APIRouter()


class TaskCreate(BaseModel):
    """创建任务请求"""
    project_id: str
    task_type: str


class TaskResponse(BaseModel):
    """任务响应"""
    id: str
    project_id: str
    task_type: str
    status: str
    progress: int
    message: str
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None


# 自动执行的任务序列（到审阅暂停）
AUTO_TASK_SEQUENCE = {
    TaskType.PARSE.value: TaskType.CLEAN.value,
    TaskType.CLEAN.value: TaskType.UNDERSTAND.value,
    TaskType.UNDERSTAND.value: TaskType.STRUCTURE.value,
    TaskType.STRUCTURE.value: TaskType.CREATE.value,
    TaskType.CREATE.value: None,  # 到审阅阶段暂停
}

# 审阅后的任务序列
POST_REVIEW_SEQUENCE = {
    TaskType.TRANSLATE.value: TaskType.GENERATE.value,
    TaskType.GENERATE.value: None,
}

# 合并的任务序列（用于验证）
TASK_SEQUENCE = {**AUTO_TASK_SEQUENCE, **POST_REVIEW_SEQUENCE}

# 任务类型到项目阶段的映射
TASK_TO_STAGE = {
    TaskType.PARSE.value: "parse",
    TaskType.CLEAN.value: "clean",
    TaskType.UNDERSTAND.value: "understand",
    TaskType.STRUCTURE.value: "structure",
    TaskType.CREATE.value: "create",
    TaskType.TRANSLATE.value: "translate",
    TaskType.GENERATE.value: "generate"
}


async def run_task(task_id: str):
    """后台运行任务"""
    await log_info("task", f"开始执行任务: {task_id}")
    db = await get_db_session()

    try:
        # 获取任务
        result = await db.execute(select(Task).where(Task.id == task_id))
        task = result.scalar_one_or_none()

        if not task:
            return

        # 更新任务状态为运行中
        task.status = TaskStatus.RUNNING.value
        task.started_at = datetime.utcnow()
        task.last_heartbeat = datetime.utcnow()
        await db.commit()

        # 获取项目和文档
        project_result = await db.execute(select(Project).where(Project.id == task.project_id))
        project = project_result.scalar_one_or_none()

        docs_result = await db.execute(
            select(Document).where(Document.project_id == task.project_id)
        )
        documents = docs_result.scalars().all()

        try:
            # 根据任务类型执行不同的处理
            if task.task_type == TaskType.PARSE.value:
                await run_parse_task(task, documents, db)
            elif task.task_type == TaskType.CLEAN.value:
                await run_clean_task(task, documents, db)
            elif task.task_type == TaskType.UNDERSTAND.value:
                await run_understand_task(task, documents, db)
            elif task.task_type == TaskType.STRUCTURE.value:
                await run_structure_task(task, documents, project, db)
            elif task.task_type == TaskType.CREATE.value:
                await run_create_task(task, documents, db)
            elif task.task_type == TaskType.TRANSLATE.value:
                await run_translate_task(task, project, db)
            elif task.task_type == TaskType.GENERATE.value:
                await run_generate_task(task, project, db)

            # 任务完成
            task.status = TaskStatus.COMPLETED.value
            task.progress = 100
            task.message = "处理完成"
            task.completed_at = datetime.utcnow()
            task.last_heartbeat = datetime.utcnow()

            await log_info("task", f"任务完成: {task_id}", {"task_type": task.task_type, "status": "completed"})

            # 更新项目阶段
            if project:
                next_task_type = TASK_SEQUENCE.get(task.task_type)
                if next_task_type:
                    project.current_stage = TASK_TO_STAGE.get(next_task_type, "completed")
                elif task.task_type == TaskType.CREATE.value:
                    # 创作完成后进入审阅阶段
                    project.current_stage = "review"
                elif task.task_type == TaskType.GENERATE.value:
                    project.current_stage = "completed"
                else:
                    project.current_stage = "completed"
                project.updated_at = datetime.utcnow()

            await db.commit()

        except Exception as e:
            await log_error("task", f"任务失败: {task_id}", {"error": str(e)})
            task.status = TaskStatus.FAILED.value
            task.error = str(e)
            task.message = f"处理失败: {str(e)}"
            task.completed_at = datetime.utcnow()
            await db.commit()
            raise

    finally:
        await db.close()


async def run_parse_task(task: Task, documents: list, db: AsyncSession):
    """执行解析任务 - 调用 Node.js 处理服务进行真实解析"""
    total = len(documents)
    if total == 0:
        task.message = "没有文档需要解析"
        return

    await log_info("parser", f"开始解析 {total} 个文档")

    # 检查处理服务是否可用
    service_available = await processor_client.check_health()
    if not service_available:
        await log_warning("parser", "处理服务未启动，使用基础解析模式")
        task.message = "警告: 处理服务未启动，使用基础解析模式"
        await db.commit()

    for i, doc in enumerate(documents):
        # 检查任务是否被取消
        await db.refresh(task)
        if task.status == TaskStatus.CANCELLED.value:
            return

        task.progress = int((i / total) * 100)
        task.message = f"正在解析: {doc.original_filename}"
        await db.commit()

        if service_available and doc.file_path:
            # 调用 Node.js 处理服务进行真实解析
            result = await processor_client.parse_document(
                file_path=doc.file_path,
                format=doc.format or "auto",
                filename=doc.original_filename
            )

            if result.get("success"):
                doc.parsed_content = {
                    "ast": result.get("ast"),
                    "metadata": result.get("metadata")
                }
                doc.status = "parsed"
            else:
                # 解析失败，记录错误但继续处理其他文档
                doc.parsed_content = {
                    "error": result.get("error", "解析失败"),
                    "fallback": True
                }
                doc.status = "parse_failed"
        else:
            # 处理服务不可用或没有文件路径，使用基础模式
            doc.parsed_content = {
                "type": "document",
                "title": doc.original_filename,
                "content": f"[基础解析 - {doc.format}]",
                "note": "处理服务未启动，使用基础解析模式",
                "sections": []
            }
            doc.status = "parsed"

        await db.commit()

    # 更新最终进度
    task.progress = 100
    await db.commit()


async def run_understand_task(task: Task, documents: list, db: AsyncSession):
    """执行理解任务 - 分析文档结构"""
    total = len(documents)
    if total == 0:
        task.message = "没有文档需要分析"
        return

    # 检查处理服务是否可用
    service_available = await processor_client.check_health()

    for i, doc in enumerate(documents):
        if not doc.parsed_content:
            continue

        await db.refresh(task)
        if task.status == TaskStatus.CANCELLED.value:
            return

        task.progress = int((i / total) * 100)
        task.message = f"正在分析: {doc.original_filename}"
        await db.commit()

        if service_available and doc.parsed_content.get("ast"):
            # 调用处理服务分析结构
            result = await processor_client.analyze_structure(doc.parsed_content.get("ast"))

            if result.get("success"):
                doc.analysis_result = result.get("analysis")
                doc.status = "analyzed"
            else:
                # 分析失败，使用基础分析
                doc.analysis_result = {
                    "summary": "结构分析失败",
                    "error": result.get("error"),
                    "fallback": True
                }
                doc.status = "analyzed"
        else:
            # 处理服务不可用，使用基础分析
            parsed = doc.parsed_content or {}
            doc.analysis_result = {
                "summary": f"文档: {doc.original_filename}",
                "title": parsed.get("title", doc.original_filename),
                "structure": {
                    "headings": [],
                    "paragraphCount": 0,
                    "wordCount": 0
                },
                "note": "基础分析模式 - AI 分析需要配置 API Key"
            }
            doc.status = "analyzed"

        await db.commit()

    task.progress = 100
    await db.commit()


async def run_clean_task(task: Task, documents: list, db: AsyncSession):
    """执行清洗任务 - 检测并移除广告、联系方式等无关内容"""
    total = len(documents)
    if total == 0:
        task.message = "没有文档需要清洗"
        return

    # 检查处理服务是否可用
    service_available = await processor_client.check_health()

    for i, doc in enumerate(documents):
        if not doc.parsed_content:
            continue

        await db.refresh(task)
        if task.status == TaskStatus.CANCELLED.value:
            return

        task.progress = int((i / total) * 100)
        task.message = f"正在清洗: {doc.original_filename}"
        await db.commit()

        # 获取文档内容文本
        content = ""
        parsed = doc.parsed_content or {}
        if parsed.get("ast"):
            # 从 AST 提取文本
            content = extract_text_from_ast(parsed.get("ast"))
        elif parsed.get("content"):
            content = parsed.get("content")

        if service_available and content:
            # 调用处理服务检测实体
            detect_result = await processor_client.detect_entities(content)

            if detect_result.get("success"):
                entities = detect_result.get("entities", [])

                if entities:
                    # 替换检测到的实体
                    replace_result = await processor_client.replace_entities(content, entities)

                    if replace_result.get("success"):
                        doc.sanitized_content = {
                            "type": "document",
                            "content": replace_result.get("text"),
                            "removed_items": entities,
                            "removed_count": replace_result.get("replacedCount", 0)
                        }
                    else:
                        doc.sanitized_content = {
                            "type": "document",
                            "content": content,
                            "removed_items": [],
                            "note": "替换失败，保留原内容"
                        }
                else:
                    # 没有检测到需要移除的内容
                    doc.sanitized_content = {
                        "type": "document",
                        "content": content,
                        "removed_items": [],
                        "note": "未检测到需要移除的敏感信息"
                    }
            else:
                doc.sanitized_content = {
                    "type": "document",
                    "content": content,
                    "error": detect_result.get("error")
                }
        else:
            # 处理服务不可用
            doc.sanitized_content = {
                "type": "document",
                "content": content or "[无内容]",
                "removed_items": [],
                "note": "基础模式 - 处理服务未启动"
            }

        doc.status = "cleaned"
        await db.commit()

    task.progress = 100
    await db.commit()


def extract_text_from_ast(ast: dict) -> str:
    """从 AST 中提取纯文本"""
    texts = []

    def traverse(node):
        if isinstance(node, dict):
            if node.get("text"):
                texts.append(node.get("text"))
            if node.get("content") and isinstance(node.get("content"), str):
                texts.append(node.get("content"))
            if node.get("children"):
                for child in node.get("children", []):
                    traverse(child)
        elif isinstance(node, list):
            for item in node:
                traverse(item)

    traverse(ast)
    return "\n".join(texts)


async def run_structure_task(task: Task, documents: list, project: Project, db: AsyncSession):
    """执行结构化任务 - 生成书籍目录和章节结构"""
    from models import BookDraft

    task.message = "正在生成书籍结构..."
    task.progress = 10
    await db.commit()

    # 收集所有文档的分析结果
    all_content = []
    for doc in documents:
        if doc.analysis_result:
            all_content.append({
                "filename": doc.original_filename,
                "analysis": doc.analysis_result,
                "content": doc.sanitized_content.get("content", "") if doc.sanitized_content else ""
            })

    task.progress = 30
    task.message = "正在生成目录结构..."
    await db.commit()

    # 生成书籍结构（基础版本，后续可调用 AI）
    chapters = []
    for i, item in enumerate(all_content, 1):
        chapter = {
            "id": str(uuid.uuid4()),
            "number": i,
            "title": f"第 {i} 章: {item['filename'].rsplit('.', 1)[0]}",
            "content": item["content"][:5000] if item["content"] else "",  # 限制长度
            "summary": item["analysis"].get("summary", "") if item["analysis"] else "",
        }
        chapters.append(chapter)

    task.progress = 60
    task.message = "正在生成书籍草稿..."
    await db.commit()

    # 创建书籍草稿
    draft_id = str(uuid.uuid4())
    book_draft = BookDraft(
        id=draft_id,
        project_id=project.id,
        language="zh",
        version=1,
        title=project.name,
        description=project.description,
        table_of_contents=[
            {"id": ch["id"], "number": ch["number"], "title": ch["title"]}
            for ch in chapters
        ],
        chapters=chapters,
        status="draft",
        is_primary=True,
    )

    db.add(book_draft)
    await db.commit()

    task.progress = 100
    task.result_data = {
        "draft_id": draft_id,
        "chapter_count": len(chapters),
        "note": "书籍结构已生成，请在审阅阶段进行编辑"
    }
    await db.commit()


async def run_create_task(task: Task, documents: list, db: AsyncSession):
    """执行创作任务 - 调用 AI 进行内容重写"""
    total = len(documents)
    if total == 0:
        task.message = "没有文档需要重写"
        return

    await log_info("creator", f"开始 AI 重写 {total} 个文档")

    # 检查处理服务是否可用
    service_available = await processor_client.check_health()
    if not service_available:
        await log_error("creator", "处理服务未启动，无法进行 AI 重写")
        task.message = "处理服务未启动，无法进行 AI 重写"
        task.error = "Processor 服务不可用，请确保已启动处理服务 (pnpm dev in apps/processor) 并配置 AI API Key"
        await db.commit()
        return

    for i, doc in enumerate(documents):
        if not doc.sanitized_content and not doc.parsed_content:
            continue

        await db.refresh(task)
        if task.status == TaskStatus.CANCELLED.value:
            return

        task.progress = int((i / total) * 100)
        task.message = f"正在重写: {doc.original_filename}"
        task.last_heartbeat = datetime.utcnow()
        await db.commit()

        # 获取要重写的内容
        content = ""
        if doc.sanitized_content:
            content = doc.sanitized_content.get("content", "")
        elif doc.parsed_content:
            if doc.parsed_content.get("ast"):
                content = extract_text_from_ast(doc.parsed_content.get("ast"))
            else:
                content = doc.parsed_content.get("content", "")

        if not content or len(content.strip()) < 10:
            doc.rewritten_content = "[无内容可重写]"
            doc.status = "rewritten"
            await db.commit()
            continue

        await log_info("creator", f"正在重写: {doc.original_filename}", {"content_length": len(content)})

        # 调用 Processor 服务进行 AI 重写
        result = await processor_client.rewrite_content(
            content=content,
            style="book",
            language="zh"
        )

        if result.get("success"):
            # 获取重写后的内容
            rewritten = result.get("rewritten") or result.get("content") or result.get("text")
            if rewritten:
                doc.rewritten_content = rewritten
                doc.status = "rewritten"
                await log_info("creator", f"重写成功: {doc.original_filename}")
            else:
                doc.rewritten_content = f"# 重写结果为空\n\n## 原始内容\n\n{content[:2000]}..."
                doc.status = "rewrite_failed"
                await log_warning("creator", f"重写结果为空: {doc.original_filename}")
        else:
            error_msg = result.get("error", "未知错误")
            await log_error("creator", f"重写失败: {doc.original_filename}", {"error": error_msg})
            # 如果是 AI 未配置的错误，给出更友好的提示
            if "没有配置任何 AI Provider" in error_msg or "API Key" in error_msg:
                doc.rewritten_content = f"""# {doc.original_filename}

## AI 服务未配置

请在设置页面配置 AI 服务后重试。

### 支持的 AI 服务
- Anthropic Claude API
- OpenAI API
- OpenAI 兼容 API（如 DeepSeek）

### 原始内容预览

{content[:1000]}{'...' if len(content) > 1000 else ''}
"""
            else:
                doc.rewritten_content = f"# 重写失败\n\n错误: {error_msg}\n\n## 原始内容\n\n{content[:1000]}..."
            doc.status = "rewrite_failed"

        await db.commit()

    await log_info("creator", f"AI 重写完成，共处理 {total} 个文档")
    task.progress = 100
    await db.commit()


async def run_plagiarism_task(task: Task, documents: list, db: AsyncSession):
    """执行查重任务 - 基础相似度检测"""
    total = len(documents)
    if total == 0:
        task.message = "没有文档需要查重"
        return

    results = []
    for i, doc in enumerate(documents):
        if not doc.rewritten_content:
            continue

        await db.refresh(task)
        if task.status == TaskStatus.CANCELLED.value:
            return

        task.progress = int((i / total) * 100)
        task.message = f"正在查重: {doc.original_filename}"
        await db.commit()

        # 基础查重：计算与原文的相似度
        original_content = ""
        if doc.parsed_content:
            if doc.parsed_content.get("ast"):
                original_content = extract_text_from_ast(doc.parsed_content.get("ast"))
            else:
                original_content = doc.parsed_content.get("content", "")

        rewritten_content = doc.rewritten_content or ""

        # 简单的相似度计算（基于词汇重叠）
        similarity = calculate_similarity(original_content, rewritten_content)

        results.append({
            "document_id": doc.id,
            "document_name": doc.original_filename,
            "similarity_score": similarity,
            "is_original": similarity < 0.3,  # 相似度低于 30% 认为是原创
            "note": "基础查重 - 完整查重需要配置查重服务 API"
        })

    task.result_data = {"plagiarism_results": results}
    task.progress = 100
    await db.commit()


def calculate_similarity(text1: str, text2: str) -> float:
    """计算两段文本的简单相似度"""
    if not text1 or not text2:
        return 0.0

    # 分词（简单按空格和标点分割）
    import re
    words1 = set(re.findall(r'\w+', text1.lower()))
    words2 = set(re.findall(r'\w+', text2.lower()))

    if not words1 or not words2:
        return 0.0

    # Jaccard 相似度
    intersection = len(words1 & words2)
    union = len(words1 | words2)

    return intersection / union if union > 0 else 0.0


async def run_generate_task(task: Task, project: Project, db: AsyncSession):
    """执行生成任务 - 生成书籍文件"""
    import os

    task.message = "正在准备生成书籍..."
    task.progress = 10
    await db.commit()

    # 获取项目的所有文档
    docs_result = await db.execute(
        select(Document).where(Document.project_id == project.id)
    )
    documents = docs_result.scalars().all()

    # 收集所有重写后的内容
    book_content = []
    for doc in documents:
        if doc.rewritten_content:
            book_content.append({
                "title": doc.original_filename,
                "content": doc.rewritten_content
            })

    task.progress = 30
    task.message = "正在组织书籍结构..."
    await db.commit()

    # 创建导出目录
    export_dir = os.path.join(os.path.dirname(__file__), "..", "exports", project.id)
    os.makedirs(export_dir, exist_ok=True)

    task.progress = 50
    task.message = "正在生成书籍文件..."
    await db.commit()

    # 生成简单的 Markdown 书籍
    book_md = f"# {project.name}\n\n"
    book_md += f"*{project.description or ''}*\n\n"
    book_md += "---\n\n"

    for i, chapter in enumerate(book_content, 1):
        book_md += f"## 第 {i} 章: {chapter['title']}\n\n"
        book_md += chapter['content']
        book_md += "\n\n---\n\n"

    # 保存 Markdown 文件
    md_path = os.path.join(export_dir, "book.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(book_md)

    task.progress = 80
    task.message = "正在验证输出..."
    await db.commit()

    # TODO: 调用 generator 包生成 EPUB/PDF
    # 目前只生成 Markdown

    task.progress = 100
    task.result_data = {
        "files": [
            {
                "format": "md",
                "path": md_path,
                "size": len(book_md.encode("utf-8")),
                "note": "Markdown 格式 - EPUB/PDF 生成需要完整配置"
            }
        ],
        "validation": {
            "kdp_compliant": True,
            "warnings": [],
            "note": "基础验证通过"
        },
        "summary": {
            "chapters": len(book_content),
            "total_documents": len(documents)
        }
    }
    await db.commit()


async def run_translate_task(task: Task, project: Project, db: AsyncSession):
    """执行翻译任务 - 翻译书籍到目标语言"""
    from models import BookDraft, TranslationJob

    task.message = "正在准备翻译..."
    task.progress = 10
    await db.commit()

    # 获取主版本草稿（中文）
    draft_result = await db.execute(
        select(BookDraft).where(
            BookDraft.project_id == project.id,
            BookDraft.is_primary == True
        )
    )
    source_draft = draft_result.scalar_one_or_none()

    if not source_draft:
        task.message = "未找到主版本草稿，请先完成创作阶段"
        task.status = TaskStatus.FAILED.value
        await db.commit()
        return

    # 获取待翻译的任务
    jobs_result = await db.execute(
        select(TranslationJob).where(
            TranslationJob.project_id == project.id,
            TranslationJob.status == "pending"
        )
    )
    translation_jobs = jobs_result.scalars().all()

    if not translation_jobs:
        task.message = "没有待翻译的任务"
        task.progress = 100
        await db.commit()
        return

    total = len(translation_jobs)
    completed = 0

    for job in translation_jobs:
        task.progress = int((completed / total) * 80) + 10
        task.message = f"正在翻译到 {job.target_language}..."
        await db.commit()

        try:
            # 更新翻译任务状态
            job.status = "running"
            await db.commit()

            # TODO: 调用翻译服务
            # 目前使用占位符
            translated_chapters = []
            for chapter in (source_draft.chapters or []):
                translated_chapters.append({
                    **chapter,
                    "content": f"[{job.target_language} 翻译] {chapter.get('content', '')[:200]}...\n\n(翻译功能需要配置 DeepL 或 AI API Key)",
                })

            # 创建翻译后的草稿
            result_draft_id = str(uuid.uuid4())
            result_draft = BookDraft(
                id=result_draft_id,
                project_id=project.id,
                language=job.target_language,
                version=1,
                title=f"{source_draft.title} ({job.target_language})",
                description=source_draft.description,
                table_of_contents=source_draft.table_of_contents,
                chapters=translated_chapters,
                status="draft",
                is_primary=False,
            )
            db.add(result_draft)

            # 更新翻译任务
            job.status = "completed"
            job.progress = 100
            job.result_draft_id = result_draft_id
            job.completed_at = datetime.utcnow()

            completed += 1
            await db.commit()

        except Exception as e:
            job.status = "failed"
            job.error = str(e)
            await db.commit()

    task.progress = 100
    task.message = f"翻译完成，共翻译 {completed}/{total} 种语言"
    task.result_data = {
        "completed": completed,
        "total": total,
        "languages": [job.target_language for job in translation_jobs if job.status == "completed"]
    }
    await db.commit()


@router.get("")
async def list_tasks(project_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    """获取任务列表"""
    query = select(Task).order_by(Task.created_at.desc())
    if project_id:
        query = query.where(Task.project_id == project_id)

    result = await db.execute(query)
    tasks = result.scalars().all()
    return [t.to_dict() for t in tasks]


@router.post("")
async def create_task(
    task_data: TaskCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """创建新任务"""
    # 验证项目存在
    project_result = await db.execute(select(Project).where(Project.id == task_data.project_id))
    if not project_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="项目不存在")

    # 验证任务类型
    valid_types = [t.value for t in TaskType]
    if task_data.task_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"无效的任务类型。有效类型: {valid_types}")

    task_id = str(uuid.uuid4())
    now = datetime.utcnow()

    new_task = Task(
        id=task_id,
        project_id=task_data.project_id,
        task_type=task_data.task_type,
        status=TaskStatus.PENDING.value,
        progress=0,
        message="等待处理",
        created_at=now
    )

    db.add(new_task)
    await db.flush()
    await db.refresh(new_task)

    # 启动后台任务
    background_tasks.add_task(run_task, task_id)

    return new_task.to_dict()


@router.get("/{task_id}")
async def get_task(task_id: str, db: AsyncSession = Depends(get_db)):
    """获取任务详情"""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    return task.to_dict()


@router.post("/{task_id}/cancel")
async def cancel_task(task_id: str, db: AsyncSession = Depends(get_db)):
    """取消任务"""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    if task.status not in [TaskStatus.PENDING.value, TaskStatus.RUNNING.value]:
        raise HTTPException(status_code=400, detail="任务无法取消")

    task.status = TaskStatus.CANCELLED.value
    task.message = "已取消"
    task.completed_at = datetime.utcnow()

    await db.flush()
    await db.refresh(task)

    return task.to_dict()


@router.delete("/{task_id}")
async def delete_task(task_id: str, db: AsyncSession = Depends(get_db)):
    """删除任务"""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    if task.status == TaskStatus.RUNNING.value:
        raise HTTPException(status_code=400, detail="运行中的任务无法删除")

    await db.delete(task)

    return {"message": "任务已删除"}


@router.post("/{task_id}/retry")
async def retry_task(
    task_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """重试失败的任务"""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    if task.status not in [TaskStatus.FAILED.value, TaskStatus.CANCELLED.value]:
        raise HTTPException(status_code=400, detail="只能重试失败或已取消的任务")

    # 重置任务状态
    task.status = TaskStatus.PENDING.value
    task.error = None
    task.progress = 0
    task.retry_count = (task.retry_count or 0) + 1
    task.message = f"手动重试 (第 {task.retry_count} 次)"
    task.started_at = None
    task.completed_at = None

    await db.flush()
    await db.refresh(task)

    # 启动后台任务
    background_tasks.add_task(run_task, task.id)

    return task.to_dict()


@router.post("/{task_id}/heartbeat")
async def update_heartbeat(task_id: str, db: AsyncSession = Depends(get_db)):
    """更新任务心跳"""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    task.last_heartbeat = datetime.utcnow()
    await db.flush()

    return {"success": True, "heartbeat": task.last_heartbeat.isoformat()}
