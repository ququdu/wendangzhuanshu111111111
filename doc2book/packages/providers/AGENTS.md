# PROVIDERS - AI Provider 管理包

**Generated:** 2026-01-31
**Stack:** TypeScript, OpenAI SDK, Anthropic SDK

## OVERVIEW
AI API Provider 抽象层，支持多 Provider 切换、故障转移、速率限制。

## STRUCTURE
```
packages/providers/src/
├── providers/           # Provider 实现
│   ├── anthropic.ts    # Claude
│   ├── openai.ts       # GPT
│   ├── openai-compatible.ts  # 兼容端点
│   └── deepl.ts        # 翻译
├── manager.ts          # Provider 生命周期管理
├── rate-limiter.ts     # 速率限制
└── types.ts            # Provider 接口定义
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Provider 接口 | types.ts:99-112 | `IProvider` 定义 |
| Manager | manager.ts | `ProviderManager` 类 |
| 速率限制 | rate-limiter.ts | Token + 请求双限制 |
| Provider 实现 | providers/*.ts | 各自逻辑 |

## CONVENTIONS

**Provider 接口:** `IProvider` 定义统一 API
**错误处理:** 返回 `ProviderResponse`，包含 success 字段
**速率限制:** Token 和请求双维度限制
**配置:** 通过 `ProviderConfig` 注入（来自 shared）

## ANTI-PATTERNS (PROVIDERS)

- NEVER 直接调用 Provider - 通过 `ProviderManager`
- NEVER 硬编码 API Key - 使用环境变量
- NEVER 忽略速率限制 - 触发时抛出错误
- NEVER 单 Provider 依赖 - 支持故障转移
- NEVER 混合同步/异步 - 全程 async/await

## NOTES

- ProviderManager 自动处理 Provider 选择和故障转移
- RateLimiter 支持每分钟请求数和 Token 数双限制
- OpenAICompatibleProvider 支持自定义端点
- DeepL 仅支持翻译，其他 Provider 支持补全
