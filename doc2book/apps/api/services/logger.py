"""
统一日志服务
用于记录系统运行日志，支持模块状态监控
"""

import asyncio
from datetime import datetime
from typing import Optional, Dict, List
from collections import deque


class LogEntry:
    """日志条目"""
    def __init__(self, level: str, module: str, message: str, data: Optional[Dict] = None):
        self.id = str(datetime.utcnow().timestamp())
        self.timestamp = datetime.utcnow().isoformat()
        self.level = level  # DEBUG, INFO, WARNING, ERROR, CRITICAL
        self.module = module  # api, processor, task, database, parser, creator, etc.
        self.message = message
        self.data = data or {}

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "level": self.level,
            "module": self.module,
            "message": self.message,
            "data": self.data
        }


class LogManager:
    """日志管理器"""
    def __init__(self, max_entries: int = 1000):
        self.max_entries = max_entries
        self.logs: deque = deque(maxlen=max_entries)
        self.module_status: Dict[str, Dict] = {}
        self._lock = asyncio.Lock()

    async def log(self, level: str, module: str, message: str, data: Optional[Dict] = None):
        """记录日志"""
        async with self._lock:
            entry = LogEntry(level, module, message, data)
            self.logs.append(entry)

            # 更新模块状态
            self.module_status[module] = {
                "last_activity": entry.timestamp,
                "last_level": level,
                "last_message": message,
                "status": "error" if level in ["ERROR", "CRITICAL"] else "running"
            }

            # 同时输出到控制台
            print(f"[{entry.timestamp}] [{level}] [{module}] {message}")

    async def get_logs(self, module: Optional[str] = None, level: Optional[str] = None,
                       limit: int = 100, offset: int = 0) -> List[Dict]:
        """获取日志"""
        async with self._lock:
            filtered = list(self.logs)

            if module:
                filtered = [l for l in filtered if l.module == module]
            if level:
                filtered = [l for l in filtered if l.level == level]

            # 倒序（最新的在前）
            filtered = list(reversed(filtered))
            return [l.to_dict() for l in filtered[offset:offset + limit]]

    async def get_status(self) -> Dict:
        """获取所有模块状态"""
        async with self._lock:
            return {
                "modules": self.module_status.copy(),
                "total_logs": len(self.logs),
                "error_count": sum(1 for l in self.logs if l.level in ["ERROR", "CRITICAL"]),
                "warning_count": sum(1 for l in self.logs if l.level == "WARNING")
            }

    async def get_module_status(self, module: str) -> Optional[Dict]:
        """获取指定模块状态"""
        async with self._lock:
            return self.module_status.get(module)

    async def clear_logs(self):
        """清空日志"""
        async with self._lock:
            self.logs.clear()
            # 保留模块状态，但标记为已清空
            for module in self.module_status:
                self.module_status[module]["status"] = "cleared"

    async def get_recent_errors(self, limit: int = 10) -> List[Dict]:
        """获取最近的错误日志"""
        async with self._lock:
            errors = [l for l in self.logs if l.level in ["ERROR", "CRITICAL"]]
            errors = list(reversed(errors))[:limit]
            return [l.to_dict() for l in errors]


# 全局日志管理器实例
log_manager = LogManager()


# 便捷函数
async def log_debug(module: str, message: str, data: Dict = None):
    """记录调试日志"""
    await log_manager.log("DEBUG", module, message, data)


async def log_info(module: str, message: str, data: Dict = None):
    """记录信息日志"""
    await log_manager.log("INFO", module, message, data)


async def log_warning(module: str, message: str, data: Dict = None):
    """记录警告日志"""
    await log_manager.log("WARNING", module, message, data)


async def log_error(module: str, message: str, data: Dict = None):
    """记录错误日志"""
    await log_manager.log("ERROR", module, message, data)


async def log_critical(module: str, message: str, data: Dict = None):
    """记录严重错误日志"""
    await log_manager.log("CRITICAL", module, message, data)


# 同步版本的日志函数（用于非异步上下文）
def log_sync(level: str, module: str, message: str, data: Dict = None):
    """同步记录日志（用于非异步上下文）"""
    entry = LogEntry(level, module, message, data)
    log_manager.logs.append(entry)
    log_manager.module_status[module] = {
        "last_activity": entry.timestamp,
        "last_level": level,
        "last_message": message,
        "status": "error" if level in ["ERROR", "CRITICAL"] else "running"
    }
    print(f"[{entry.timestamp}] [{level}] [{module}] {message}")
