"""
数据库服务
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from typing import AsyncGenerator
import os

# 数据库文件路径
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "doc2book.db")
DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"
SYNC_DATABASE_URL = f"sqlite:///{DB_PATH}"

# 异步引擎
engine = create_async_engine(DATABASE_URL, echo=False)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# 同步引擎（用于启动时的任务恢复）
sync_engine = create_engine(SYNC_DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=sync_engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


async def init_db():
    """初始化数据库，创建所有表"""
    # 导入模型以确保它们被注册
    from models import Project, Document, Task, Export, Settings

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print(f"Database initialized at: {DB_PATH}")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """获取数据库会话"""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_db_session() -> AsyncSession:
    """获取数据库会话（非生成器版本，用于后台任务）"""
    return async_session_maker()
