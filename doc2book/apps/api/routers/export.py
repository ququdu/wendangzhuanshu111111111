"""
导出路由
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
from sqlalchemy import select
import uuid
import os

from services.database import get_db, get_db_session, AsyncSession
from services import processor_client
from models import Export, Project, BookDraft

router = APIRouter()


class ExportRequest(BaseModel):
    """导出请求"""
    project_id: str
    formats: List[str] = ["epub"]
    validate_kdp: bool = True


class ExportResponse(BaseModel):
    """导出响应"""
    id: str
    project_id: str
    formats: List[str]
    status: str
    files: List[dict]
    created_at: datetime
    completed_at: Optional[datetime] = None
    validation: Optional[dict] = None


def build_content_nodes(text: str) -> list:
    """将纯文本转换为内容节点"""
    if not text:
        return []

    paragraphs = [line.strip() for line in text.splitlines() if line.strip()]
    return [{"type": "paragraph", "text": paragraph} for paragraph in paragraphs]


def build_book_structure(project: Project, draft: BookDraft) -> dict:
    """构建生成器所需的书籍结构"""
    settings = project.settings or {}
    language = draft.language or settings.get("source_language") or "zh"
    chapters = []

    for index, chapter in enumerate(draft.chapters or [], 1):
        content = chapter.get("content") or ""
        chapters.append({
            "id": chapter.get("id") or f"chapter_{index}",
            "title": chapter.get("title") or f"第 {index} 章",
            "level": chapter.get("level") or 1,
            "content": build_content_nodes(content),
            "children": chapter.get("children") or [],
            "wordCount": len(content.split()),
            "status": chapter.get("status") or "draft",
        })

    toc_entries = []
    for item in draft.table_of_contents or []:
        toc_entries.append({
            "id": item.get("id") or str(uuid.uuid4()),
            "title": item.get("title") or item.get("name") or "未命名章节",
            "level": item.get("level") or 1,
            "children": item.get("children") or [],
        })

    return {
        "metadata": {
            "title": draft.title or project.name,
            "subtitle": draft.subtitle,
            "author": draft.author or "未知作者",
            "language": language,
            "targetLanguages": settings.get("target_languages") or ["zh"],
            "category": [],
            "keywords": [],
            "description": draft.description or project.description or "",
            "copyright": "版权所有，未经许可不得转载",
        },
        "frontMatter": {
            "titlePage": True,
            "copyright": True,
            "dedication": None,
            "tableOfContents": toc_entries,
            "preface": None,
            "foreword": None,
            "acknowledgments": None,
        },
        "body": {
            "introduction": None,
            "parts": [],
            "chapters": chapters,
        },
        "backMatter": {
            "epilogue": None,
            "appendices": [],
            "glossary": [],
            "bibliography": [],
            "index": [],
            "aboutAuthor": None,
            "alsoByAuthor": [],
        },
    }


def get_mime_type(fmt: str) -> str:
    if fmt == "epub":
        return "application/epub+zip"
    if fmt == "pdf":
        return "application/pdf"
    return "application/octet-stream"


async def run_export_task(export_id: str, validate_kdp: bool) -> None:
    """执行导出任务"""
    db = await get_db_session()
    try:
        export_result = await db.execute(select(Export).where(Export.id == export_id))
        export = export_result.scalar_one_or_none()
        if not export:
            return

        export.status = "running"
        await db.commit()

        project_result = await db.execute(select(Project).where(Project.id == export.project_id))
        project = project_result.scalar_one_or_none()
        if not project:
            export.status = "failed"
            export.error = "项目不存在"
            await db.commit()
            return

        draft_result = await db.execute(
            select(BookDraft)
            .where(
                BookDraft.project_id == export.project_id,
                BookDraft.is_primary == True
            )
        )
        draft = draft_result.scalar_one_or_none()

        if not draft:
            latest_result = await db.execute(
                select(BookDraft)
                .where(BookDraft.project_id == export.project_id)
                .order_by(BookDraft.created_at.desc())
            )
            draft = latest_result.scalar_one_or_none()

        if not draft:
            export.status = "failed"
            export.error = "未找到草稿"
            await db.commit()
            return

        service_available = await processor_client.check_health()
        if not service_available:
            export.status = "failed"
            export.error = "处理服务未启动"
            await db.commit()
            return

        export_dir = os.path.join(os.path.dirname(__file__), "..", "exports", export.project_id, export.id)
        os.makedirs(export_dir, exist_ok=True)

        book_structure = build_book_structure(project, draft)
        formats = export.formats or ["epub"]
        format_option = "epub"
        if "epub" in formats and "pdf" in formats:
            format_option = "both"
        elif "pdf" in formats:
            format_option = "pdf"

        result = await processor_client.generate_book(
            book=book_structure,
            options={
                "format": format_option,
                "outputDir": os.path.abspath(export_dir),
                "filename": "book",
                "validateKdp": validate_kdp,
            }
        )

        if not result.get("success"):
            export.status = "failed"
            export.error = result.get("error", "导出失败")
            await db.commit()
            return

        files = result.get("files", [])
        for f in files:
            f["filename"] = os.path.basename(f.get("path", ""))
            f["mime_type"] = get_mime_type(f.get("format"))

        export.status = "completed"
        export.files = files
        export.validation = result.get("validation")
        export.completed_at = datetime.utcnow()
        await db.commit()

    except Exception as e:
        export_result = await db.execute(select(Export).where(Export.id == export_id))
        export = export_result.scalar_one_or_none()
        if export:
            export.status = "failed"
            export.error = str(e)
            await db.commit()
    finally:
        await db.close()


@router.post("")
async def create_export(
    request: ExportRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """创建导出任务"""
    project_result = await db.execute(select(Project).where(Project.id == request.project_id))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    export_id = str(uuid.uuid4())
    export_record = Export(
        id=export_id,
        project_id=request.project_id,
        formats=request.formats,
        status="pending",
        files=[],
        created_at=datetime.utcnow(),
        validation=None,
    )

    db.add(export_record)
    await db.flush()
    await db.refresh(export_record)

    background_tasks.add_task(run_export_task, export_record.id, request.validate_kdp)

    return export_record.to_dict()


@router.get("/{export_id}")
async def get_export(export_id: str, db: AsyncSession = Depends(get_db)):
    """获取导出状态"""
    result = await db.execute(select(Export).where(Export.id == export_id))
    export_record = result.scalar_one_or_none()
    if not export_record:
        raise HTTPException(status_code=404, detail="导出记录不存在")
    return export_record.to_dict()


@router.get("/{export_id}/download/{format}")
async def download_export(export_id: str, format: str, db: AsyncSession = Depends(get_db)):
    """下载导出文件"""
    result = await db.execute(select(Export).where(Export.id == export_id))
    export_record = result.scalar_one_or_none()
    if not export_record:
        raise HTTPException(status_code=404, detail="导出记录不存在")

    if export_record.status != "completed":
        raise HTTPException(status_code=400, detail="导出尚未完成")

    file_info = None
    for f in export_record.files or []:
        if f.get("format") == format:
            file_info = f
            break

    if not file_info:
        raise HTTPException(status_code=404, detail=f"没有 {format} 格式的文件")

    file_path = file_info.get("path")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="文件不存在")

    return FileResponse(
        path=file_path,
        filename=file_info.get("filename") or os.path.basename(file_path),
        media_type=file_info.get("mime_type") or "application/octet-stream",
    )


@router.get("/project/{project_id}")
async def list_project_exports(project_id: str, db: AsyncSession = Depends(get_db)):
    """获取项目的所有导出记录"""
    result = await db.execute(
        select(Export)
        .where(Export.project_id == project_id)
        .order_by(Export.created_at.desc())
    )
    exports = result.scalars().all()
    return [e.to_dict() for e in exports]


@router.delete("/{export_id}")
async def delete_export(export_id: str, db: AsyncSession = Depends(get_db)):
    """删除导出记录"""
    result = await db.execute(select(Export).where(Export.id == export_id))
    export_record = result.scalar_one_or_none()
    if not export_record:
        raise HTTPException(status_code=404, detail="导出记录不存在")

    for f in export_record.files or []:
        path = f.get("path")
        if path and os.path.exists(path):
            os.remove(path)

    await db.delete(export_record)
    await db.flush()

    return {"message": "导出记录已删除"}
