"""
Node.js 处理服务客户端
用于调用 Node.js 处理服务进行文档解析和处理
"""

import httpx
from typing import Optional, Any
import os

# 处理服务地址
PROCESSOR_URL = os.getenv("PROCESSOR_URL", "http://localhost:8001")

# HTTP 客户端超时配置
TIMEOUT = httpx.Timeout(60.0, connect=10.0)


async def check_health() -> bool:
    """检查处理服务是否可用"""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get(f"{PROCESSOR_URL}/health")
            return response.status_code == 200
    except Exception:
        return False


async def parse_document(file_path: str, format: str = "auto", filename: str = "") -> dict:
    """
    调用处理服务解析文档

    Args:
        file_path: 文档文件路径
        format: 文档格式 (auto, pdf, docx, html, md, txt)
        filename: 原始文件名

    Returns:
        解析结果，包含 success, ast, metadata 或 error
    """
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                f"{PROCESSOR_URL}/parse",
                json={
                    "filePath": file_path,
                    "format": format,
                    "filename": filename
                }
            )
            return response.json()
    except httpx.ConnectError:
        return {
            "success": False,
            "error": "处理服务未启动，请先启动 Node.js 处理服务 (pnpm dev in apps/processor)"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"调用处理服务失败: {str(e)}"
        }


async def analyze_structure(ast: dict) -> dict:
    """
    分析文档结构

    Args:
        ast: 文档 AST

    Returns:
        分析结果
    """
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                f"{PROCESSOR_URL}/analyze",
                json={"ast": ast}
            )
            return response.json()
    except httpx.ConnectError:
        return {
            "success": False,
            "error": "处理服务未启动"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"分析失败: {str(e)}"
        }


async def detect_entities(text: str) -> dict:
    """
    检测文本中的实体（URL、邮箱、电话等）

    Args:
        text: 要检测的文本

    Returns:
        检测结果，包含 entities 列表
    """
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                f"{PROCESSOR_URL}/sanitize/detect",
                json={"text": text}
            )
            return response.json()
    except httpx.ConnectError:
        return {
            "success": False,
            "error": "处理服务未启动"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"检测失败: {str(e)}"
        }


async def replace_entities(text: str, entities: list, replacements: Optional[dict] = None) -> dict:
    """
    替换文本中的实体

    Args:
        text: 原始文本
        entities: 要替换的实体列表
        replacements: 自定义替换文本

    Returns:
        替换后的文本
    """
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                f"{PROCESSOR_URL}/sanitize/replace",
                json={
                    "text": text,
                    "entities": entities,
                    "replacements": replacements
                }
            )
            return response.json()
    except httpx.ConnectError:
        return {
            "success": False,
            "error": "处理服务未启动"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"替换失败: {str(e)}"
        }


async def rewrite_content(content: str, style: str = "book", language: str = "zh") -> dict:
    """
    调用 AI 重写内容

    Args:
        content: 要重写的内容
        style: 重写风格 (book, article, academic)
        language: 目标语言

    Returns:
        重写结果，包含 success, rewritten 或 error
    """
    try:
        # 使用更长的超时时间，因为 AI 重写可能需要较长时间
        timeout = httpx.Timeout(120.0, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{PROCESSOR_URL}/rewrite",
                json={
                    "content": content,
                    "style": style,
                    "language": language
                }
            )
            return response.json()
    except httpx.ConnectError:
        return {
            "success": False,
            "error": "处理服务未启动，请先启动 Node.js 处理服务"
        }
    except httpx.ReadTimeout:
        return {
            "success": False,
            "error": "AI 重写超时，请稍后重试"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"AI 重写失败: {str(e)}"
        }


async def translate_content(content: str, target_language: str, options: Optional[dict] = None) -> dict:
    """
    调用翻译服务

    Args:
        content: 要翻译的内容
        target_language: 目标语言
        options: 翻译选项

    Returns:
        翻译结果
    """
    try:
        timeout = httpx.Timeout(120.0, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{PROCESSOR_URL}/translate",
                json={
                    "content": content,
                    "targetLanguage": target_language,
                    "options": options or {}
                }
            )
            return response.json()
    except httpx.ConnectError:
        return {
            "success": False,
            "error": "处理服务未启动"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"翻译失败: {str(e)}"
        }


async def humanize_content(content: str, options: Optional[dict] = None) -> dict:
    """
    调用去 AI 化服务

    Args:
        content: 要处理的内容
        options: 处理选项

    Returns:
        处理结果
    """
    try:
        timeout = httpx.Timeout(120.0, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{PROCESSOR_URL}/humanize",
                json={
                    "content": content,
                    "options": options or {}
                }
            )
            return response.json()
    except httpx.ConnectError:
        return {
            "success": False,
            "error": "处理服务未启动"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"去 AI 化失败: {str(e)}"
        }


async def update_provider_config(config: dict) -> dict:
    """
    更新 Provider 配置

    Args:
        config: Provider 配置

    Returns:
        更新结果
    """
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                f"{PROCESSOR_URL}/config/providers",
                json=config
            )
            return response.json()
    except httpx.ConnectError:
        return {
            "success": False,
            "error": "处理服务未启动"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"更新配置失败: {str(e)}"
        }


async def test_provider_connection(config: dict) -> dict:
    """
    测试 Provider 连接

    Args:
        config: Provider 配置 (provider, apiKey, baseUrl, model)

    Returns:
        测试结果
    """
    try:
        timeout = httpx.Timeout(30.0, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{PROCESSOR_URL}/config/test",
                json=config
            )
            return response.json()
    except httpx.ConnectError:
        return {
            "success": False,
            "error": "处理服务未启动，请先启动 Node.js 处理服务"
        }
    except httpx.ReadTimeout:
        return {
            "success": False,
            "error": "连接测试超时"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"测试连接失败: {str(e)}"
        }


async def generate_book(chapters: list, metadata: dict, output_format: str = "epub") -> dict:
    """
    生成书籍文件

    Args:
        chapters: 章节列表
        metadata: 书籍元数据
        output_format: 输出格式 (epub, pdf)

    Returns:
        生成结果
    """
    try:
        timeout = httpx.Timeout(300.0, connect=10.0)  # 生成可能需要更长时间
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{PROCESSOR_URL}/generate",
                json={
                    "chapters": chapters,
                    "metadata": metadata,
                    "format": output_format
                }
            )
            return response.json()
    except httpx.ConnectError:
        return {
            "success": False,
            "error": "处理服务未启动"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"生成书籍失败: {str(e)}"
        }


async def deep_analyze(content: str, options: Optional[dict] = None) -> dict:
    """
    深度内容分析（需要 AI）

    Args:
        content: 要分析的内容
        options: 分析选项

    Returns:
        分析结果
    """
    try:
        timeout = httpx.Timeout(120.0, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{PROCESSOR_URL}/analyze/deep",
                json={
                    "content": content,
                    "options": options or {}
                }
            )
            return response.json()
    except httpx.ConnectError:
        return {
            "success": False,
            "error": "处理服务未启动"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"深度分析失败: {str(e)}"
        }


async def summarize_content(content: str, summary_type: str = "standard") -> dict:
    """
    生成内容摘要

    Args:
        content: 要摘要的内容
        summary_type: 摘要类型 (brief, standard, detailed, bullets)

    Returns:
        摘要结果
    """
    try:
        timeout = httpx.Timeout(120.0, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{PROCESSOR_URL}/summarize",
                json={
                    "content": content,
                    "type": summary_type
                }
            )
            return response.json()
    except httpx.ConnectError:
        return {
            "success": False,
            "error": "处理服务未启动"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"生成摘要失败: {str(e)}"
        }
