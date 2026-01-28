"""
数据库模型定义
"""
from sqlalchemy import Column, String, DateTime, Integer, JSON, ForeignKey, Enum, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from services.database import Base


class TaskStatus(str, enum.Enum):
    """任务状态"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskType(str, enum.Enum):
    """任务类型 - 新流程"""
    PARSE = "parse"           # 文档解析 (parser.DocumentParser)
    CLEAN = "clean"           # 内容清洗 (sanitizer.Sanitizer)
    UNDERSTAND = "understand" # 深度理解 (understanding.ContentAnalyzer)
    STRUCTURE = "structure"   # 结构化 (understanding.ChapterSplitter + Summarizer)
    CREATE = "create"         # 内容创作 (creator.ContentRewriter + Humanizer)
    TRANSLATE = "translate"   # 翻译 (creator.Translator)
    GENERATE = "generate"     # 生成 (generator.BookGenerator)


class ProjectStage(str, enum.Enum):
    """项目阶段 - 新流程"""
    UPLOAD = "upload"
    PARSE = "parse"
    CLEAN = "clean"
    UNDERSTAND = "understand"
    STRUCTURE = "structure"
    CREATE = "create"
    REVIEW = "review"         # 新增：审阅阶段
    TRANSLATE = "translate"   # 新增：翻译阶段
    GENERATE = "generate"
    COMPLETED = "completed"


class Project(Base):
    """项目模型"""
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    current_stage = Column(String(50), default=ProjectStage.UPLOAD.value)
    settings = Column(JSON, default=dict)

    # 关系
    documents = relationship("Document", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    exports = relationship("Export", back_populates="project", cascade="all, delete-orphan")
    book_drafts = relationship("BookDraft", back_populates="project", cascade="all, delete-orphan")
    translation_jobs = relationship("TranslationJob", back_populates="project", cascade="all, delete-orphan")

    def to_dict(self, document_count=None):
        result = {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "current_stage": self.current_stage,
            "settings": self.settings or {},
            "document_count": document_count if document_count is not None else 0
        }
        return result


class Document(Base):
    """文档模型"""
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    format = Column(String(50))
    size = Column(Integer, default=0)
    file_path = Column(String(500))
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="pending")
    parsed_content = Column(JSON)  # 存储解析后的 AST
    analysis_result = Column(JSON)  # 存储分析结果
    sanitized_content = Column(JSON)  # 存储去痕迹后的内容
    rewritten_content = Column(Text)  # 存储重写后的内容

    # 关系
    project = relationship("Project", back_populates="documents")

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "filename": self.filename,
            "original_filename": self.original_filename,
            "format": self.format,
            "size": self.size,
            "file_path": self.file_path,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "status": self.status,
            "has_parsed_content": self.parsed_content is not None,
            "has_analysis": self.analysis_result is not None,
            "has_sanitized": self.sanitized_content is not None,
            "has_rewritten": self.rewritten_content is not None
        }


class Task(Base):
    """任务模型"""
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    task_type = Column(String(50), nullable=False)
    status = Column(String(50), default=TaskStatus.PENDING.value)
    progress = Column(Integer, default=0)
    message = Column(String(500), default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    error = Column(Text)
    result_data = Column(JSON)  # 存储任务结果

    # 任务恢复相关字段
    retry_count = Column(Integer, default=0)        # 重试次数
    max_retries = Column(Integer, default=3)        # 最大重试次数
    last_heartbeat = Column(DateTime)               # 最后心跳时间
    checkpoint_data = Column(JSON)                  # 检查点数据（用于断点续传）

    # 关系
    project = relationship("Project", back_populates="tasks")

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "task_type": self.task_type,
            "status": self.status,
            "progress": self.progress,
            "message": self.message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "error": self.error,
            "result_data": self.result_data,
            "retry_count": self.retry_count,
            "max_retries": self.max_retries,
            "last_heartbeat": self.last_heartbeat.isoformat() if self.last_heartbeat else None,
        }


class Export(Base):
    """导出模型"""
    __tablename__ = "exports"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    formats = Column(JSON, default=list)  # ["epub", "pdf"]
    status = Column(String(50), default="pending")
    files = Column(JSON, default=list)  # 生成的文件路径列表
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    validation = Column(JSON)  # KDP 验证结果
    error = Column(Text)

    # 关系
    project = relationship("Project", back_populates="exports")

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "formats": self.formats or [],
            "status": self.status,
            "files": self.files or [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "validation": self.validation,
            "error": self.error
        }


class Settings(Base):
    """全局设置模型"""
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(JSON)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "key": self.key,
            "value": self.value,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class BookDraft(Base):
    """书籍草稿模型 - 用于审阅编辑"""
    __tablename__ = "book_drafts"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    language = Column(String(10), default="zh")
    version = Column(Integer, default=1)

    # 书籍元数据
    title = Column(String(500))
    subtitle = Column(String(500))
    author = Column(String(255))
    description = Column(Text)

    # 书籍内容
    table_of_contents = Column(JSON)  # 目录结构
    chapters = Column(JSON)           # 章节内容
    front_matter = Column(JSON)       # 前言、序言等
    back_matter = Column(JSON)        # 附录、参考文献等

    # 状态
    status = Column(String(50), default="draft")  # draft, reviewing, approved
    is_primary = Column(Boolean, default=False)   # 是否为主版本（中文）

    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    approved_at = Column(DateTime)  # 用户确认时间

    # 关系
    project = relationship("Project", back_populates="book_drafts")

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "language": self.language,
            "version": self.version,
            "title": self.title,
            "subtitle": self.subtitle,
            "author": self.author,
            "description": self.description,
            "table_of_contents": self.table_of_contents,
            "chapters": self.chapters,
            "front_matter": self.front_matter,
            "back_matter": self.back_matter,
            "status": self.status,
            "is_primary": self.is_primary,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
        }


class TranslationJob(Base):
    """翻译任务模型"""
    __tablename__ = "translation_jobs"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    source_draft_id = Column(String(36), ForeignKey("book_drafts.id"), nullable=False)

    target_language = Column(String(10), nullable=False)  # 目标语言
    status = Column(String(50), default="pending")  # pending, running, completed, failed
    progress = Column(Integer, default=0)

    # 翻译配置
    provider = Column(String(50), default="deepl")  # deepl, ai
    preserve_formatting = Column(Boolean, default=True)

    # 结果
    result_draft_id = Column(String(36), ForeignKey("book_drafts.id"))
    error = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)

    # 关系
    project = relationship("Project", back_populates="translation_jobs")
    source_draft = relationship("BookDraft", foreign_keys=[source_draft_id])
    result_draft = relationship("BookDraft", foreign_keys=[result_draft_id])

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "source_draft_id": self.source_draft_id,
            "target_language": self.target_language,
            "status": self.status,
            "progress": self.progress,
            "provider": self.provider,
            "preserve_formatting": self.preserve_formatting,
            "result_draft_id": self.result_draft_id,
            "error": self.error,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }
