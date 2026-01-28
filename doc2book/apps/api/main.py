"""
Doc2Book API 服务
FastAPI 后端，提供文档处理和书籍生成服务
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

from routers import projects, documents, tasks, export, drafts, translations, logs
from services.database import init_db, SessionLocal
from services.logger import log_info, log_error, log_sync
from models import Task, TaskStatus


async def recover_interrupted_tasks():
    """恢复中断的任务"""
    db = SessionLocal()
    try:
        # 查找状态为 RUNNING 但超过 5 分钟没有心跳的任务
        stale_threshold = datetime.utcnow() - timedelta(minutes=5)

        stale_tasks = db.query(Task).filter(
            Task.status == TaskStatus.RUNNING.value
        ).all()

        recovered_count = 0
        for task in stale_tasks:
            # 检查心跳时间
            if task.last_heartbeat is None or task.last_heartbeat < stale_threshold:
                if task.retry_count < (task.max_retries or 3):
                    # 重置为 PENDING 状态，等待重新执行
                    task.status = TaskStatus.PENDING.value
                    task.retry_count = (task.retry_count or 0) + 1
                    task.message = f"任务中断，自动重试 ({task.retry_count}/{task.max_retries or 3})"
                    recovered_count += 1
                else:
                    # 超过最大重试次数，标记为失败
                    task.status = TaskStatus.FAILED.value
                    task.error = "任务多次中断，已达到最大重试次数"
                    task.completed_at = datetime.utcnow()

        db.commit()
        if recovered_count > 0:
            print(f"[任务恢复] 恢复了 {recovered_count} 个中断的任务")
    except Exception as e:
        print(f"[任务恢复] 恢复任务时出错: {e}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时初始化数据库
    await init_db()
    await log_info("api", "数据库初始化完成")

    # 恢复中断的任务
    await recover_interrupted_tasks()
    await log_info("api", "API 服务启动完成", {"port": 8000})

    yield
    # 关闭时清理资源
    await log_info("api", "API 服务正在关闭")


app = FastAPI(
    title="Doc2Book API",
    description="文档转书籍服务 API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS 配置 - 允许所有来源（开发环境）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(export.router, prefix="/api/export", tags=["export"])
app.include_router(drafts.router, prefix="/api/drafts", tags=["drafts"])
app.include_router(translations.router, prefix="/api/translations", tags=["translations"])
app.include_router(logs.router, prefix="/api/logs", tags=["logs"])


@app.get("/")
async def root():
    """API 根路径"""
    return {
        "name": "Doc2Book API",
        "version": "0.1.0",
        "status": "运行中",
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
