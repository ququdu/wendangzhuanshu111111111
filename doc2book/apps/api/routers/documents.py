"""
文档管理路由
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from sqlalchemy import select
import uuid
import os
import aiofiles

from services.database import get_db, AsyncSession
from models import Document, Project

router = APIRouter()

# 上传目录
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# 支持的文件格式
ALLOWED_EXTENSIONS = {
    ".pdf", ".docx", ".doc", ".md", ".markdown",
    ".html", ".htm", ".txt", ".png", ".jpg", ".jpeg"
}

# 格式映射
FORMAT_MAP = {
    ".pdf": "PDF",
    ".docx": "Word",
    ".doc": "Word",
    ".md": "Markdown",
    ".markdown": "Markdown",
    ".html": "HTML",
    ".htm": "HTML",
    ".txt": "Text",
    ".png": "Image",
    ".jpg": "Image",
    ".jpeg": "Image",
}

# MIME 类型映射
MIME_MAP = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc": "application/msword",
    ".md": "text/markdown",
    ".markdown": "text/markdown",
    ".html": "text/html",
    ".htm": "text/html",
    ".txt": "text/plain",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
}


@router.get("/{project_id}")
async def list_documents(project_id: str, db: AsyncSession = Depends(get_db)):
    """获取项目的所有文档"""
    # 验证项目存在
    project_result = await db.execute(select(Project).where(Project.id == project_id))
    if not project_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="项目不存在")

    result = await db.execute(
        select(Document).where(Document.project_id == project_id).order_by(Document.uploaded_at.desc())
    )
    documents = result.scalars().all()
    return [doc.to_dict() for doc in documents]


@router.post("/{project_id}/upload")
async def upload_document(
    project_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """上传文档"""
    # 验证项目存在
    project_result = await db.execute(select(Project).where(Project.id == project_id))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    # 检查文件扩展名
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件格式: {ext}。支持的格式: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # 生成文档 ID
    doc_id = str(uuid.uuid4())

    # 保存文件
    project_upload_dir = os.path.join(UPLOAD_DIR, project_id)
    os.makedirs(project_upload_dir, exist_ok=True)

    filename = f"{doc_id}{ext}"
    file_path = os.path.join(project_upload_dir, filename)

    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    # 创建文档记录
    document = Document(
        id=doc_id,
        project_id=project_id,
        filename=filename,
        original_filename=file.filename,
        format=FORMAT_MAP.get(ext, "Unknown"),
        size=len(content),
        file_path=file_path,
        uploaded_at=datetime.utcnow(),
        status="pending"
    )

    db.add(document)

    # 更新项目时间
    project.updated_at = datetime.utcnow()

    await db.flush()
    await db.refresh(document)

    return document.to_dict()


@router.get("/{project_id}/{document_id}")
async def get_document(project_id: str, document_id: str, db: AsyncSession = Depends(get_db)):
    """获取文档详情"""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.project_id == project_id
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")

    return document.to_dict()


@router.delete("/{project_id}/{document_id}")
async def delete_document(project_id: str, document_id: str, db: AsyncSession = Depends(get_db)):
    """删除文档"""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.project_id == project_id
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")

    # 删除文件
    if document.file_path and os.path.exists(document.file_path):
        os.remove(document.file_path)

    await db.delete(document)

    return {"message": "文档已删除"}


@router.post("/{project_id}/{document_id}/parse")
async def parse_document(project_id: str, document_id: str, db: AsyncSession = Depends(get_db)):
    """解析文档（触发解析任务）"""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.project_id == project_id
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")

    # 更新状态
    document.status = "parsing"
    await db.flush()

    # 返回文档信息，实际解析由任务系统处理
    return {
        "message": "解析已开始",
        "document_id": document_id,
        "file_path": document.file_path,
        "format": document.format
    }


@router.get("/{project_id}/{document_id}/content")
async def get_document_content(project_id: str, document_id: str, db: AsyncSession = Depends(get_db)):
    """获取文档解析后的内容"""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.project_id == project_id
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")

    if not document.parsed_content:
        raise HTTPException(status_code=400, detail="文档尚未解析")

    return {
        "document_id": document_id,
        "parsed_content": document.parsed_content,
        "analysis_result": document.analysis_result,
        "sanitized_content": document.sanitized_content,
        "rewritten_content": document.rewritten_content
    }
