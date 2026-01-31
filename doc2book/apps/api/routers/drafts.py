"""
书籍草稿路由
用于审阅编辑功能
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select, func, update
from pydantic import BaseModel
from typing import Optional, List, Any, cast
from datetime import datetime
import uuid

from services.database import get_db, AsyncSession
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
async def list_drafts(project_id: str, db: AsyncSession = Depends(get_db)):
    """获取项目的所有草稿"""
    result = await db.execute(
        select(BookDraft)
        .where(BookDraft.project_id == project_id)
        .order_by(BookDraft.created_at.desc())
    )
    drafts = result.scalars().all()
    return [draft.to_dict() for draft in drafts]


@router.get("/project/{project_id}/primary")
async def get_primary_draft(project_id: str, db: AsyncSession = Depends(get_db)):
    """获取项目的主草稿（中文版）"""
    result = await db.execute(
        select(BookDraft).where(
            BookDraft.project_id == project_id,
            BookDraft.is_primary == True
        )
    )
    draft = result.scalar_one_or_none()

    if not draft:
        raise HTTPException(status_code=404, detail="未找到主草稿")

    draft_any: Any = draft

    return draft.to_dict()


@router.get("/{draft_id}")
async def get_draft(draft_id: str, db: AsyncSession = Depends(get_db)):
    """获取草稿详情"""
    result = await db.execute(select(BookDraft).where(BookDraft.id == draft_id))
    draft = result.scalar_one_or_none()

    if not draft:
        raise HTTPException(status_code=404, detail="草稿不存在")

    draft_any: Any = draft

    return draft.to_dict()


@router.post("")
async def create_draft(request: CreateDraftRequest, db: AsyncSession = Depends(get_db)):
    """创建新草稿"""
    # 验证项目存在
    project_result = await db.execute(select(Project).where(Project.id == request.project_id))
    project = project_result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="项目不存在")

    project = cast(Any, project)

    # 如果是主草稿，取消其他主草稿
    if request.is_primary:
        await db.execute(
            update(BookDraft)
            .where(
                BookDraft.project_id == request.project_id,
                BookDraft.is_primary == True
            )
            .values(is_primary=False)
        )

    # 获取版本号
    max_version_result = await db.execute(
        select(func.count())
        .select_from(BookDraft)
        .where(
            BookDraft.project_id == request.project_id,
            BookDraft.language == request.language
        )
    )
    max_version = max_version_result.scalar_one()

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
    await db.flush()
    await db.refresh(draft)

    return draft.to_dict()


@router.put("/{draft_id}")
async def update_draft(draft_id: str, request: UpdateDraftRequest, db: AsyncSession = Depends(get_db)):
    """更新草稿"""
    result = await db.execute(select(BookDraft).where(BookDraft.id == draft_id))
    draft = result.scalar_one_or_none()

    if not draft:
        raise HTTPException(status_code=404, detail="草稿不存在")

    draft_any: Any = draft

    # 更新字段
    update_data = request.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(draft_any, key, value)

    draft_any.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(draft_any)

    return draft_any.to_dict()


@router.put("/{draft_id}/chapter")
async def update_chapter(draft_id: str, request: UpdateChapterRequest, db: AsyncSession = Depends(get_db)):
    """更新单个章节"""
    result = await db.execute(select(BookDraft).where(BookDraft.id == draft_id))
    draft = result.scalar_one_or_none()

    if not draft:
        raise HTTPException(status_code=404, detail="草稿不存在")

    draft_any: Any = draft

    if not draft_any.chapters:
        raise HTTPException(status_code=400, detail="草稿没有章节")

    # 查找并更新章节
    chapters = list(draft_any.chapters)
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

    draft_any.chapters = chapters
    draft_any.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(draft_any)

    return draft_any.to_dict()


@router.put("/{draft_id}/reorder")
async def reorder_chapters(draft_id: str, request: ReorderChaptersRequest, db: AsyncSession = Depends(get_db)):
    """重新排序章节"""
    result = await db.execute(select(BookDraft).where(BookDraft.id == draft_id))
    draft = result.scalar_one_or_none()

    if not draft:
        raise HTTPException(status_code=404, detail="草稿不存在")

    draft_any: Any = draft

    if not draft_any.chapters:
        raise HTTPException(status_code=400, detail="草稿没有章节")

    # 创建章节映射
    chapter_map = {ch.get("id"): ch for ch in draft_any.chapters}

    # 按新顺序重排
    new_chapters = []
    for chapter_id in request.chapter_ids:
        if chapter_id in chapter_map:
            new_chapters.append(chapter_map[chapter_id])

    # 添加未在列表中的章节（保持原顺序）
    for chapter in draft_any.chapters:
        if chapter.get("id") not in request.chapter_ids:
            new_chapters.append(chapter)

    draft_any.chapters = new_chapters
    draft_any.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(draft_any)

    return draft_any.to_dict()


@router.post("/{draft_id}/approve")
async def approve_draft(draft_id: str, db: AsyncSession = Depends(get_db)):
    """确认审阅完成"""
    result = await db.execute(select(BookDraft).where(BookDraft.id == draft_id))
    draft = result.scalar_one_or_none()

    if not draft:
        raise HTTPException(status_code=404, detail="草稿不存在")

    draft_any: Any = draft

    # 更新草稿状态
    draft_any.status = "approved"
    draft_any.approved_at = datetime.utcnow()
    draft_any.updated_at = datetime.utcnow()

    # 更新项目阶段到翻译
    project_result = await db.execute(select(Project).where(Project.id == draft_any.project_id))
    project = project_result.scalar_one_or_none()
    if project:
        project = cast(Any, project)
        if project.current_stage == ProjectStage.REVIEW.value:
            project.current_stage = ProjectStage.TRANSLATE.value
            project.updated_at = datetime.utcnow()

    await db.flush()
    await db.refresh(draft_any)

    return {
        "success": True,
        "draft": draft_any.to_dict(),
        "message": "审阅已完成，可以开始翻译"
    }


@router.delete("/{draft_id}")
async def delete_draft(draft_id: str, db: AsyncSession = Depends(get_db)):
    """删除草稿"""
    result = await db.execute(select(BookDraft).where(BookDraft.id == draft_id))
    draft = result.scalar_one_or_none()

    if not draft:
        raise HTTPException(status_code=404, detail="草稿不存在")

    draft_any: Any = draft

    # 不允许删除主草稿
    if draft_any.is_primary:
        raise HTTPException(status_code=400, detail="不能删除主草稿")

    await db.delete(draft_any)
    await db.flush()

    return {"success": True, "message": "草稿已删除"}
