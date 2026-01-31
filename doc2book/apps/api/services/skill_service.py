"""
技能配置服务
"""

from typing import Any, List, Optional, Dict
from sqlalchemy import select

from services.database import AsyncSession
from models import Settings, Project


async def get_global_skills(db: AsyncSession) -> List[Dict[str, Any]]:
    result = await db.execute(select(Settings).where(Settings.key == "global_skills"))
    setting = result.scalar_one_or_none()
    return setting.value if setting and setting.value else []


async def get_project_skills(project_id: str, db: AsyncSession) -> Optional[List[Dict[str, Any]]]:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        return None

    settings = project.settings or {}
    if "skills" in settings:
        return settings.get("skills") or []
    return None


async def get_effective_skills(project_id: str, db: AsyncSession) -> List[Dict[str, Any]]:
    project_skills = await get_project_skills(project_id, db)
    if project_skills is not None:
        return project_skills
    return await get_global_skills(db)


def build_stage_instruction(skills: List[Dict[str, Any]], stage: str) -> str:
    stage_aliases = {"translate": {"translate", "localize"}}
    target_stages = stage_aliases.get(stage, {stage})
    lines: List[str] = []
    for skill in skills:
        if not skill or not skill.get("enabled", True):
            continue
        stages = skill.get("stages") or []
        if not target_stages.intersection(set(stages)):
            continue
        name = skill.get("name") or "未命名技能"
        instruction = skill.get("instruction") or ""
        if instruction.strip():
            lines.append(f"【{name}】{instruction.strip()}")
    return "\n\n".join(lines)


def build_stage_options(skills: List[Dict[str, Any]], stage: str) -> Dict[str, Any]:
    stage_aliases = {"translate": {"translate", "localize"}}
    target_stages = stage_aliases.get(stage, {stage})
    options: Dict[str, Any] = {}
    for skill in skills:
        if not skill or not skill.get("enabled", True):
            continue
        stages = skill.get("stages") or []
        if not target_stages.intersection(set(stages)):
            continue
        skill_options = skill.get("options") or {}
        if isinstance(skill_options, dict):
            options.update(skill_options)
    instruction = build_stage_instruction(skills, stage)
    if instruction:
        options["instruction"] = instruction
    return options
