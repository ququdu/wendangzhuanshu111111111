"""
导出路由
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid
import os

router = APIRouter()

# 导出目录
EXPORT_DIR = "exports"
os.makedirs(EXPORT_DIR, exist_ok=True)

# 内存存储
exports_db: dict = {}


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


@router.post("")
async def create_export(request: ExportRequest):
    """创建导出任务"""
    export_id = str(uuid.uuid4())
    now = datetime.now()

    export_record = {
        "id": export_id,
        "project_id": request.project_id,
        "formats": request.formats,
        "status": "pending",
        "files": [],
        "created_at": now,
        "completed_at": None,
        "validation": None,
    }

    exports_db[export_id] = export_record

    # TODO: 启动后台导出任务

    return export_record


@router.get("/{export_id}")
async def get_export(export_id: str):
    """获取导出状态"""
    if export_id not in exports_db:
        raise HTTPException(status_code=404, detail="导出记录不存在")
    return exports_db[export_id]


@router.get("/{export_id}/download/{format}")
async def download_export(export_id: str, format: str):
    """下载导出文件"""
    if export_id not in exports_db:
        raise HTTPException(status_code=404, detail="导出记录不存在")

    export_record = exports_db[export_id]

    if export_record["status"] != "completed":
        raise HTTPException(status_code=400, detail="导出尚未完成")

    # 查找对应格式的文件
    file_info = None
    for f in export_record["files"]:
        if f["format"] == format:
            file_info = f
            break

    if not file_info:
        raise HTTPException(status_code=404, detail=f"没有 {format} 格式的文件")

    file_path = file_info["path"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="文件不存在")

    return FileResponse(
        path=file_path,
        filename=file_info["filename"],
        media_type=file_info.get("mime_type", "application/octet-stream"),
    )


@router.get("/project/{project_id}")
async def list_project_exports(project_id: str):
    """获取项目的所有导出记录"""
    return [e for e in exports_db.values() if e["project_id"] == project_id]


@router.delete("/{export_id}")
async def delete_export(export_id: str):
    """删除导出记录"""
    if export_id not in exports_db:
        raise HTTPException(status_code=404, detail="导出记录不存在")

    export_record = exports_db[export_id]

    # 删除文件
    for f in export_record["files"]:
        if os.path.exists(f["path"]):
            os.remove(f["path"])

    del exports_db[export_id]

    return {"message": "导出记录已删除"}
