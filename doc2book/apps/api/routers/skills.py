"""
技能配置路由
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Any
from sqlalchemy import select

from services.database import get_db, AsyncSession
from models import Settings, Project

router = APIRouter(tags=["skills"])


class SkillItem(BaseModel):
    """单条技能配置"""
    id: str = Field(..., description="技能唯一ID")
    name: str = Field(..., description="技能名称")
    instruction: str = Field(..., description="技能提示词/约束")
    stages: List[str] = Field(..., description="适用阶段")
    enabled: bool = Field(True, description="是否启用")
    options: Optional[dict] = Field(default=None, description="阶段选项")


class SkillsPayload(BaseModel):
    skills: List[SkillItem] = []


class ProjectSkillsUpdate(BaseModel):
    skills: Optional[List[SkillItem]] = None
    inherit: bool = False


async def get_settings_value(db: AsyncSession, key: str) -> Optional[Any]:
    result = await db.execute(select(Settings).where(Settings.key == key))
    setting = result.scalar_one_or_none()
    return setting.value if setting else None


async def upsert_settings_value(db: AsyncSession, key: str, value: Any) -> None:
    result = await db.execute(select(Settings).where(Settings.key == key))
    setting = result.scalar_one_or_none()
    if setting:
        setting.value = value
    else:
        setting = Settings(key=key, value=value)
        db.add(setting)
    await db.flush()


@router.get("/global")
async def get_global_skills(db: AsyncSession = Depends(get_db)):
    """获取全局技能"""
    skills = await get_settings_value(db, "global_skills") or []
    return {"skills": skills}


@router.put("/global")
async def update_global_skills(payload: SkillsPayload, db: AsyncSession = Depends(get_db)):
    """更新全局技能"""
    await upsert_settings_value(db, "global_skills", payload.skills)
    return {"success": True, "skills": payload.skills}


@router.get("/project/{project_id}")
async def get_project_skills(project_id: str, db: AsyncSession = Depends(get_db)):
    """获取项目技能"""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    settings = project.settings or {}
    skills = settings.get("skills")
    return {"skills": skills, "inherits": skills is None}


@router.put("/project/{project_id}")
async def update_project_skills(
    project_id: str,
    payload: ProjectSkillsUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新项目技能（支持继承）"""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    settings = project.settings or {}

    if payload.inherit:
        settings.pop("skills", None)
    else:
        settings["skills"] = payload.skills or []

    project.settings = settings
    await db.flush()

    return {"success": True, "skills": settings.get("skills"), "inherits": "skills" not in settings}


@router.get("/effective/{project_id}")
async def get_effective_skills(project_id: str, db: AsyncSession = Depends(get_db)):
    """获取项目生效技能（项目优先，其次全局）"""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    settings = project.settings or {}
    if "skills" in settings:
        return {"skills": settings.get("skills") or [], "source": "project"}

    skills = await get_settings_value(db, "global_skills") or []
    return {"skills": skills, "source": "global"}
