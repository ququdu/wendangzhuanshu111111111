"""
书籍草稿路由
用于审阅编辑功能
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
import uuid

from services.database import get_db
from models import BookDraft, Project, ProjectStage

router = APIRouter(tags=["drafts"])


# ==================== 请求模型 ====================

class CreateDraftRequest(BaseModel):
    project_id: str
    language: str = "zh"
    title: Optional[str] = None
    subtitle: Optional[str] = None
    author: Optional[str] = None
    description: Optional[str] = None
    table_of_contents: Optional[List[Any]] = None
    chapters: Optional[List[Any]] = None
    front_matter: Optional[dict] = None
    back_matter: Optional[dict] = None
    is_primary: bool = False


class UpdateDraftRequest(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    author: Optional[str] = None
    description: Optional[str] = None
    table_of_contents: Optional[List[Any]] = None
    chapters: Optional[List[Any]] = None
    front_matter: Optional[dict] = None
    back_matter: Optional[dict] = None
    status: Optional[str] = None


class UpdateChapterRequest(BaseModel):
    chapter_id: str
    title: Optional[str] = None
    content: Optional[str] = None


class ReorderChaptersRequest(BaseModel):
    chapter_ids: List[str]


# ==================== 路由 ====================

@router.get("/project/{project_id}")
async def list_drafts(project_id: str, db: Session = Depends(get_db)):
    """获取项目的所有草稿"""
    drafts = db.query(BookDraft).filter(
        BookDraft.project_id == project_id
    ).order_by(BookDraft.created_at.desc()).all()

    return [draft.to_dict() for draft in drafts]


@router.get("/project/{project_id}/primary")
async def get_primary_draft(project_id: str, db: Session = Depends(get_db)):
    """获取项目的主草稿（中文版）"""
    draft = db.query(BookDraft).filter(
        BookDraft.project_id == project_id,
        BookDraft.is_primary == True
    ).first()

    if not draft:
        raise HTTPException(status_code=404, detail="未找到主草稿")

    return draft.to_dict()


@router.get("/{draft_id}")
async def get_draft(draft_id: str, db: Session = Depends(get_db)):
    """获取草稿详情"""
    draft = db.query(BookDraft).filter(BookDraft.id == draft_id).first()

    if not draft:
        raise HTTPException(status_code=404, detail="草稿不存在")

    return draft.to_dict()


@router.post("")
async def create_draft(request: CreateDraftRequest, db: Session = Depends(get_db)):
    """创建新草稿"""
    # 验证项目存在
    project = db.query(Project).filter(Project.id == request.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    # 如果是主草稿，取消其他主草稿
    if request.is_primary:
        db.query(BookDraft).filter(
            BookDraft.project_id == request.project_id,
            BookDraft.is_primary == True
        ).update({"is_primary": False})

    # 获取版本号
    max_version = db.query(BookDraft).filter(
        BookDraft.project_id == request.project_id,
        BookDraft.language == request.language
    ).count()

    draft = BookDraft(
        id=str(uuid.uuid4()),
        project_id=request.project_id,
        language=request.language,
        version=max_version + 1,
        title=request.title,
        subtitle=request.subtitle,
        author=request.author,
        description=request.description,
        table_of_contents=request.table_of_contents,
        chapters=request.chapters,
        front_matter=request.front_matter,
        back_matter=request.back_matter,
        is_primary=request.is_primary,
        status="draft"
    )

    db.add(draft)
    db.commit()
    db.refresh(draft)

    return draft.to_dict()


@router.put("/{draft_id}")
async def update_draft(draft_id: str, request: UpdateDraftRequest, db: Session = Depends(get_db)):
    """更新草稿"""
    draft = db.query(BookDraft).filter(BookDraft.id == draft_id).first()

    if not draft:
        raise HTTPException(status_code=404, detail="草稿不存在")

    # 更新字段
    update_data = request.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(draft, key, value)

    draft.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(draft)

    return draft.to_dict()


@router.put("/{draft_id}/chapter")
async def update_chapter(draft_id: str, request: UpdateChapterRequest, db: Session = Depends(get_db)):
    """更新单个章节"""
    draft = db.query(BookDraft).filter(BookDraft.id == draft_id).first()

    if not draft:
        raise HTTPException(status_code=404, detail="草稿不存在")

    if not draft.chapters:
        raise HTTPException(status_code=400, detail="草稿没有章节")

    # 查找并更新章节
    chapters = list(draft.chapters)
    chapter_found = False

    for i, chapter in enumerate(chapters):
        if chapter.get("id") == request.chapter_id:
            if request.title is not None:
                chapters[i]["title"] = request.title
            if request.content is not None:
                chapters[i]["content"] = request.content
            chapter_found = True
            break

    if not chapter_found:
        raise HTTPException(status_code=404, detail="章节不存在")

    draft.chapters = chapters
    draft.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(draft)

    return draft.to_dict()


@router.put("/{draft_id}/reorder")
async def reorder_chapters(draft_id: str, request: ReorderChaptersRequest, db: Session = Depends(get_db)):
    """重新排序章节"""
    draft = db.query(BookDraft).filter(BookDraft.id == draft_id).first()

    if not draft:
        raise HTTPException(status_code=404, detail="草稿不存在")

    if not draft.chapters:
        raise HTTPException(status_code=400, detail="草稿没有章节")

    # 创建章节映射
    chapter_map = {ch.get("id"): ch for ch in draft.chapters}

    # 按新顺序重排
    new_chapters = []
    for chapter_id in request.chapter_ids:
        if chapter_id in chapter_map:
            new_chapters.append(chapter_map[chapter_id])

    # 添加未在列表中的章节（保持原顺序）
    for chapter in draft.chapters:
        if chapter.get("id") not in request.chapter_ids:
            new_chapters.append(chapter)

    draft.chapters = new_chapters
    draft.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(draft)

    return draft.to_dict()


@router.post("/{draft_id}/approve")
async def approve_draft(draft_id: str, db: Session = Depends(get_db)):
    """确认审阅完成"""
    draft = db.query(BookDraft).filter(BookDraft.id == draft_id).first()

    if not draft:
        raise HTTPException(status_code=404, detail="草稿不存在")

    # 更新草稿状态
    draft.status = "approved"
    draft.approved_at = datetime.utcnow()
    draft.updated_at = datetime.utcnow()

    # 更新项目阶段到翻译
    project = db.query(Project).filter(Project.id == draft.project_id).first()
    if project and project.current_stage == ProjectStage.REVIEW.value:
        project.current_stage = ProjectStage.TRANSLATE.value
        project.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(draft)

    return {
        "success": True,
        "draft": draft.to_dict(),
        "message": "审阅已完成，可以开始翻译"
    }


@router.delete("/{draft_id}")
async def delete_draft(draft_id: str, db: Session = Depends(get_db)):
    """删除草稿"""
    draft = db.query(BookDraft).filter(BookDraft.id == draft_id).first()

    if not draft:
        raise HTTPException(status_code=404, detail="草稿不存在")

    # 不允许删除主草稿
    if draft.is_primary:
        raise HTTPException(status_code=400, detail="不能删除主草稿")

    db.delete(draft)
    db.commit()

    return {"success": True, "message": "草稿已删除"}
