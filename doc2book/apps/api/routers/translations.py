"""
翻译任务路由
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid
import httpx
import asyncio

from services.database import get_db
from models import TranslationJob, BookDraft, Project, ProjectStage

router = APIRouter(tags=["translations"])

# Processor 服务地址
PROCESSOR_URL = "http://localhost:8001"


# ==================== 请求模型 ====================

class CreateTranslationRequest(BaseModel):
    project_id: str
    source_draft_id: str
    target_languages: List[str]
    provider: str = "deepl"  # deepl 或 ai
    preserve_formatting: bool = True


class TranslationStatusResponse(BaseModel):
    id: str
    target_language: str
    status: str
    progress: int
    error: Optional[str] = None


# ==================== 支持的语言 ====================

SUPPORTED_LANGUAGES = {
    "en": "英语",
    "ja": "日语",
    "ko": "韩语",
    "de": "德语",
    "fr": "法语",
    "es": "西班牙语",
    "pt": "葡萄牙语",
    "it": "意大利语",
    "nl": "荷兰语",
    "pl": "波兰语",
    "ru": "俄语",
}


# ==================== 路由 ====================

@router.get("/languages")
async def get_supported_languages():
    """获取支持的翻译语言"""
    return {
        "languages": [
            {"code": code, "name": name}
            for code, name in SUPPORTED_LANGUAGES.items()
        ]
    }


@router.get("/project/{project_id}")
async def list_translations(project_id: str, db: Session = Depends(get_db)):
    """获取项目的所有翻译任务"""
    jobs = db.query(TranslationJob).filter(
        TranslationJob.project_id == project_id
    ).order_by(TranslationJob.created_at.desc()).all()

    return [job.to_dict() for job in jobs]


@router.get("/{job_id}")
async def get_translation(job_id: str, db: Session = Depends(get_db)):
    """获取翻译任务详情"""
    job = db.query(TranslationJob).filter(TranslationJob.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="翻译任务不存在")

    return job.to_dict()


@router.post("")
async def create_translations(
    request: CreateTranslationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """创建翻译任务（支持多语言并发）"""
    # 验证项目
    project = db.query(Project).filter(Project.id == request.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    # 验证源草稿
    source_draft = db.query(BookDraft).filter(BookDraft.id == request.source_draft_id).first()
    if not source_draft:
        raise HTTPException(status_code=404, detail="源草稿不存在")

    # 验证源草稿已审阅
    if source_draft.status != "approved":
        raise HTTPException(status_code=400, detail="源草稿尚未审阅完成")

    # 验证语言
    invalid_languages = [lang for lang in request.target_languages if lang not in SUPPORTED_LANGUAGES]
    if invalid_languages:
        raise HTTPException(status_code=400, detail=f"不支持的语言: {invalid_languages}")

    # 创建翻译任务
    jobs = []
    for target_language in request.target_languages:
        # 检查是否已有相同语言的翻译任务
        existing = db.query(TranslationJob).filter(
            TranslationJob.project_id == request.project_id,
            TranslationJob.source_draft_id == request.source_draft_id,
            TranslationJob.target_language == target_language,
            TranslationJob.status.in_(["pending", "running"])
        ).first()

        if existing:
            continue

        job = TranslationJob(
            id=str(uuid.uuid4()),
            project_id=request.project_id,
            source_draft_id=request.source_draft_id,
            target_language=target_language,
            provider=request.provider,
            preserve_formatting=request.preserve_formatting,
            status="pending",
            progress=0
        )
        db.add(job)
        jobs.append(job)

    db.commit()

    # 刷新获取完整数据
    for job in jobs:
        db.refresh(job)

    # 在后台执行翻译
    for job in jobs:
        background_tasks.add_task(run_translation_job, job.id, source_draft.to_dict())

    return {
        "success": True,
        "jobs": [job.to_dict() for job in jobs],
        "message": f"已创建 {len(jobs)} 个翻译任务"
    }


async def run_translation_job(job_id: str, source_draft: dict):
    """执行翻译任务"""
    from services.database import SessionLocal

    db = SessionLocal()
    try:
        job = db.query(TranslationJob).filter(TranslationJob.id == job_id).first()
        if not job:
            return

        # 更新状态为运行中
        job.status = "running"
        job.progress = 0
        db.commit()

        # 准备翻译内容
        chapters = source_draft.get("chapters", [])
        total_chapters = len(chapters)
        translated_chapters = []

        async with httpx.AsyncClient(timeout=120.0) as client:
            for i, chapter in enumerate(chapters):
                try:
                    # 翻译章节标题
                    title_response = await client.post(
                        f"{PROCESSOR_URL}/translate",
                        json={
                            "content": chapter.get("title", ""),
                            "targetLanguage": job.target_language,
                            "options": {
                                "preserveFormatting": job.preserve_formatting
                            }
                        }
                    )
                    title_result = title_response.json()

                    # 翻译章节内容
                    content_response = await client.post(
                        f"{PROCESSOR_URL}/translate",
                        json={
                            "content": chapter.get("content", ""),
                            "targetLanguage": job.target_language,
                            "options": {
                                "preserveFormatting": job.preserve_formatting
                            }
                        }
                    )
                    content_result = content_response.json()

                    translated_chapters.append({
                        **chapter,
                        "title": title_result.get("translatedContent", chapter.get("title")),
                        "content": content_result.get("translatedContent", chapter.get("content"))
                    })

                    # 更新进度
                    job.progress = int((i + 1) / total_chapters * 100)
                    db.commit()

                except Exception as e:
                    print(f"翻译章节失败: {e}")
                    translated_chapters.append(chapter)

        # 翻译元数据
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                # 翻译标题
                if source_draft.get("title"):
                    title_resp = await client.post(
                        f"{PROCESSOR_URL}/translate",
                        json={
                            "content": source_draft.get("title"),
                            "targetLanguage": job.target_language
                        }
                    )
                    translated_title = title_resp.json().get("translatedContent", source_draft.get("title"))
                else:
                    translated_title = source_draft.get("title")

                # 翻译描述
                if source_draft.get("description"):
                    desc_resp = await client.post(
                        f"{PROCESSOR_URL}/translate",
                        json={
                            "content": source_draft.get("description"),
                            "targetLanguage": job.target_language
                        }
                    )
                    translated_description = desc_resp.json().get("translatedContent", source_draft.get("description"))
                else:
                    translated_description = source_draft.get("description")

        except Exception as e:
            print(f"翻译元数据失败: {e}")
            translated_title = source_draft.get("title")
            translated_description = source_draft.get("description")

        # 创建翻译后的草稿
        result_draft = BookDraft(
            id=str(uuid.uuid4()),
            project_id=job.project_id,
            language=job.target_language,
            version=1,
            title=translated_title,
            subtitle=source_draft.get("subtitle"),
            author=source_draft.get("author"),
            description=translated_description,
            table_of_contents=source_draft.get("table_of_contents"),
            chapters=translated_chapters,
            front_matter=source_draft.get("front_matter"),
            back_matter=source_draft.get("back_matter"),
            status="draft",
            is_primary=False
        )
        db.add(result_draft)

        # 更新任务状态
        job.status = "completed"
        job.progress = 100
        job.result_draft_id = result_draft.id
        job.completed_at = datetime.utcnow()

        db.commit()

    except Exception as e:
        print(f"翻译任务失败: {e}")
        job = db.query(TranslationJob).filter(TranslationJob.id == job_id).first()
        if job:
            job.status = "failed"
            job.error = str(e)
            db.commit()

    finally:
        db.close()


@router.post("/{job_id}/cancel")
async def cancel_translation(job_id: str, db: Session = Depends(get_db)):
    """取消翻译任务"""
    job = db.query(TranslationJob).filter(TranslationJob.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="翻译任务不存在")

    if job.status not in ["pending", "running"]:
        raise HTTPException(status_code=400, detail="任务已完成或已取消")

    job.status = "cancelled"
    db.commit()
    db.refresh(job)

    return job.to_dict()


@router.delete("/{job_id}")
async def delete_translation(job_id: str, db: Session = Depends(get_db)):
    """删除翻译任务"""
    job = db.query(TranslationJob).filter(TranslationJob.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="翻译任务不存在")

    # 如果有结果草稿，也删除
    if job.result_draft_id:
        result_draft = db.query(BookDraft).filter(BookDraft.id == job.result_draft_id).first()
        if result_draft:
            db.delete(result_draft)

    db.delete(job)
    db.commit()

    return {"success": True, "message": "翻译任务已删除"}


@router.post("/project/{project_id}/complete")
async def complete_translations(project_id: str, db: Session = Depends(get_db)):
    """完成翻译阶段，进入生成阶段"""
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    if project.current_stage != ProjectStage.TRANSLATE.value:
        raise HTTPException(status_code=400, detail="项目不在翻译阶段")

    # 检查是否有完成的翻译
    completed_jobs = db.query(TranslationJob).filter(
        TranslationJob.project_id == project_id,
        TranslationJob.status == "completed"
    ).count()

    # 更新项目阶段
    project.current_stage = ProjectStage.GENERATE.value
    project.updated_at = datetime.utcnow()

    db.commit()

    return {
        "success": True,
        "message": f"翻译阶段完成，共 {completed_jobs} 个翻译版本",
        "current_stage": project.current_stage
    }
