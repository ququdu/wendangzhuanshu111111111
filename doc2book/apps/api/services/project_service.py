"""
项目服务
"""

from typing import Optional, List
from datetime import datetime
import uuid


class ProjectService:
    """项目服务类"""

    def __init__(self):
        self.projects = {}

    async def create(
        self,
        name: str,
        description: Optional[str] = None,
        settings: Optional[dict] = None,
    ) -> dict:
        """创建项目"""
        project_id = str(uuid.uuid4())
        now = datetime.now()

        project = {
            "id": project_id,
            "name": name,
            "description": description,
            "created_at": now,
            "updated_at": now,
            "current_stage": "upload",
            "document_count": 0,
            "settings": settings or {
                "source_language": "auto",
                "target_languages": ["zh"],
                "output_formats": ["epub"],
                "kdp_compliant": True,
            },
        }

        self.projects[project_id] = project
        return project

    async def get(self, project_id: str) -> Optional[dict]:
        """获取项目"""
        return self.projects.get(project_id)

    async def list(self) -> List[dict]:
        """获取所有项目"""
        return list(self.projects.values())

    async def update(self, project_id: str, **kwargs) -> Optional[dict]:
        """更新项目"""
        if project_id not in self.projects:
            return None

        project = self.projects[project_id]
        for key, value in kwargs.items():
            if value is not None and key in project:
                project[key] = value

        project["updated_at"] = datetime.now()
        return project

    async def delete(self, project_id: str) -> bool:
        """删除项目"""
        if project_id in self.projects:
            del self.projects[project_id]
            return True
        return False

    async def update_stage(self, project_id: str, stage: str) -> Optional[dict]:
        """更新项目阶段"""
        return await self.update(project_id, current_stage=stage)

    async def increment_document_count(self, project_id: str) -> Optional[dict]:
        """增加文档计数"""
        if project_id not in self.projects:
            return None

        project = self.projects[project_id]
        project["document_count"] += 1
        project["updated_at"] = datetime.now()
        return project

    async def decrement_document_count(self, project_id: str) -> Optional[dict]:
        """减少文档计数"""
        if project_id not in self.projects:
            return None

        project = self.projects[project_id]
        project["document_count"] = max(0, project["document_count"] - 1)
        project["updated_at"] = datetime.now()
        return project
