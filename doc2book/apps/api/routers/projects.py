"""
项目管理路由
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import uuid

from services.database import get_db, AsyncSession
from models import Project, Document, Task, TaskStatus, TaskType

router = APIRouter()


class ProjectCreate(BaseModel):
    """创建项目请求"""
    name: str
    description: Optional[str] = None
    source_language: str = "auto"
    target_languages: List[str] = ["zh"]
    output_formats: List[str] = ["epub"]
    kdp_compliant: bool = True


class ProjectUpdate(BaseModel):
    """更新项目请求"""
    name: Optional[str] = None
    description: Optional[str] = None
    source_language: Optional[str] = None
    target_languages: Optional[List[str]] = None
    output_formats: Optional[List[str]] = None
    kdp_compliant: Optional[bool] = None
    current_stage: Optional[str] = None


@router.get("")
async def list_projects(db: AsyncSession = Depends(get_db)):
    """获取所有项目"""
    result = await db.execute(
        select(Project).options(selectinload(Project.documents)).order_by(Project.updated_at.desc())
    )
    projects = result.scalars().all()
    return [p.to_dict(document_count=len(p.documents) if p.documents else 0) for p in projects]


@router.post("")
async def create_project(project: ProjectCreate, db: AsyncSession = Depends(get_db)):
    """创建新项目"""
    project_id = str(uuid.uuid4())
    now = datetime.utcnow()

    new_project = Project(
        id=project_id,
        name=project.name,
        description=project.description or "",
        created_at=now,
        updated_at=now,
        current_stage="upload",
        settings={
            "source_language": project.source_language,
            "target_languages": project.target_languages,
            "output_formats": project.output_formats,
            "kdp_compliant": project.kdp_compliant,
        }
    )

    db.add(new_project)
    await db.flush()

    # New project has no documents
    return new_project.to_dict(document_count=0)


@router.get("/{project_id}")
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    """获取项目详情"""
    result = await db.execute(
        select(Project).options(selectinload(Project.documents)).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    return project.to_dict(document_count=len(project.documents) if project.documents else 0)


@router.put("/{project_id}")
async def update_project(project_id: str, project_update: ProjectUpdate, db: AsyncSession = Depends(get_db)):
    """更新项目"""
    result = await db.execute(
        select(Project).options(selectinload(Project.documents)).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    if project_update.name is not None:
        project.name = project_update.name
    if project_update.description is not None:
        project.description = project_update.description
    if project_update.current_stage is not None:
        project.current_stage = project_update.current_stage

    # 更新 settings
    settings = project.settings or {}
    if project_update.source_language is not None:
        settings["source_language"] = project_update.source_language
    if project_update.target_languages is not None:
        settings["target_languages"] = project_update.target_languages
    if project_update.output_formats is not None:
        settings["output_formats"] = project_update.output_formats
    if project_update.kdp_compliant is not None:
        settings["kdp_compliant"] = project_update.kdp_compliant
    project.settings = settings

    project.updated_at = datetime.utcnow()

    await db.flush()

    return project.to_dict(document_count=len(project.documents) if project.documents else 0)


@router.delete("/{project_id}")
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    """删除项目"""
    result = await db.execute(
        select(Project).options(selectinload(Project.documents)).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    await db.delete(project)

    return {"message": "项目已删除"}


@router.post("/{project_id}/process")
async def start_processing(project_id: str, db: AsyncSession = Depends(get_db)):
    """开始处理项目 - 创建处理任务"""
    result = await db.execute(
        select(Project).options(selectinload(Project.documents)).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    if not project.documents:
        raise HTTPException(status_code=400, detail="项目没有文档，请先上传文档")

    # 创建解析任务
    task_id = str(uuid.uuid4())
    task = Task(
        id=task_id,
        project_id=project_id,
        task_type=TaskType.PARSE.value,
        status=TaskStatus.PENDING.value,
        progress=0,
        message="等待开始解析",
        created_at=datetime.utcnow()
    )

    db.add(task)

    # 更新项目阶段
    project.current_stage = "parse"
    project.updated_at = datetime.utcnow()

    await db.flush()

    return {
        "message": "处理已开始",
        "task_id": task_id,
        "task_type": "parse"
    }


@router.get("/{project_id}/tasks")
async def get_project_tasks(project_id: str, db: AsyncSession = Depends(get_db)):
    """获取项目的所有任务"""
    result = await db.execute(
        select(Task).where(Task.project_id == project_id).order_by(Task.created_at.desc())
    )
    tasks = result.scalars().all()
    return [t.to_dict() for t in tasks]
