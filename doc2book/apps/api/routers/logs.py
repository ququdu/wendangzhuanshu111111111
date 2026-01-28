"""
日志管理路由
提供日志查询和系统状态监控 API
"""

from fastapi import APIRouter, Query
from typing import Optional

from services.logger import log_manager

router = APIRouter()


@router.get("")
async def get_logs(
    module: Optional[str] = Query(None, description="模块名称过滤"),
    level: Optional[str] = Query(None, description="日志级别过滤 (DEBUG, INFO, WARNING, ERROR, CRITICAL)"),
    limit: int = Query(100, ge=1, le=1000, description="返回数量限制"),
    offset: int = Query(0, ge=0, description="偏移量")
):
    """
    获取日志列表

    - **module**: 可选，按模块名称过滤
    - **level**: 可选，按日志级别过滤
    - **limit**: 返回数量，默认 100，最大 1000
    - **offset**: 偏移量，用于分页
    """
    logs = await log_manager.get_logs(module, level, limit, offset)
    return {
        "logs": logs,
        "total": len(logs),
        "limit": limit,
        "offset": offset
    }


@router.get("/status")
async def get_status():
    """
    获取系统状态概览

    返回:
    - modules: 各模块状态
    - total_logs: 总日志数
    - error_count: 错误数
    - warning_count: 警告数
    """
    return await log_manager.get_status()


@router.get("/modules")
async def get_modules():
    """
    获取所有模块状态

    返回各模块的最后活动时间、状态等信息
    """
    status = await log_manager.get_status()
    return {"modules": status["modules"]}


@router.get("/modules/{module}")
async def get_module_status(module: str):
    """
    获取指定模块状态

    - **module**: 模块名称
    """
    status = await log_manager.get_module_status(module)
    if status:
        return {"module": module, "status": status}
    return {"module": module, "status": None, "message": "模块未找到"}


@router.get("/errors")
async def get_recent_errors(
    limit: int = Query(10, ge=1, le=100, description="返回数量限制")
):
    """
    获取最近的错误日志

    - **limit**: 返回数量，默认 10，最大 100
    """
    errors = await log_manager.get_recent_errors(limit)
    return {"errors": errors, "count": len(errors)}


@router.delete("")
async def clear_logs():
    """
    清空所有日志

    注意：此操作不可恢复
    """
    await log_manager.clear_logs()
    return {"success": True, "message": "日志已清空"}


@router.get("/health")
async def logs_health():
    """
    日志服务健康检查
    """
    status = await log_manager.get_status()
    return {
        "status": "healthy",
        "total_logs": status["total_logs"],
        "error_count": status["error_count"],
        "active_modules": len(status["modules"])
    }
