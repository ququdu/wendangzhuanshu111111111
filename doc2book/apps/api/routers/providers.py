"""
AI Provider 路由
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Any
from sqlalchemy import select

from services import processor_client
from services.database import get_db, AsyncSession
from models import Settings

router = APIRouter(tags=["providers"])


class ProviderItem(BaseModel):
    id: str = Field(..., description="Provider ID")
    name: str = Field(..., description="Provider 名称")
    type: str = Field(..., description="Provider 类型")
    apiKey: str = Field(..., description="API Key")
    baseUrl: Optional[str] = Field(default=None, description="Base URL")
    defaultModel: Optional[str] = Field(default=None, description="默认模型")
    models: Optional[List[str]] = Field(default=None, description="模型列表")
    enabled: bool = Field(True, description="是否启用")
    priority: int = Field(1, description="优先级")


class ProviderConfigPayload(BaseModel):
    providers: List[ProviderItem] = []
    defaultProvider: Optional[str] = None
    fallbackChain: Optional[List[str]] = None


class ProviderTestPayload(BaseModel):
    provider: str = Field(..., description="Provider 类型")
    apiKey: str = Field(..., description="API Key")
    baseUrl: Optional[str] = Field(default=None, description="Base URL")
    model: Optional[str] = Field(default=None, description="模型")


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


@router.get("/status")
async def get_provider_status():
    """获取 AI Provider 状态"""
    return await processor_client.get_provider_status()


@router.get("/config")
async def get_provider_config(db: AsyncSession = Depends(get_db)):
    """获取已保存的 Provider 配置"""
    config = await get_settings_value(db, "provider_config") or {}
    return {"success": True, "config": config}


@router.post("/config")
async def update_provider_config(payload: ProviderConfigPayload, db: AsyncSession = Depends(get_db)):
    """更新 Provider 配置并同步到处理服务"""
    config_payload = payload.model_dump()
    await upsert_settings_value(db, "provider_config", config_payload)
    result = await processor_client.update_provider_config(config_payload)
    return {"success": True, "config": config_payload, "result": result}


@router.post("/test")
async def test_provider_connection(payload: ProviderTestPayload):
    """测试 Provider 连接"""
    return await processor_client.test_provider_connection(payload.model_dump())
