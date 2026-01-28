/**
 * @doc2book/providers
 * AI API Provider 管理模块
 *
 * 支持的 Provider：
 * - Anthropic (Claude)
 * - OpenAI (GPT)
 * - Google (Gemini)
 * - DeepL (翻译)
 * - OpenAI 兼容端点
 */

// Provider 实现
export { AnthropicProvider } from './providers/anthropic'
export { OpenAIProvider } from './providers/openai'
export { OpenAICompatibleProvider } from './providers/openai-compatible'
export { DeepLProvider } from './providers/deepl'

// Provider 管理器
export { ProviderManager, createProviderManager } from './manager'

// 速率限制
export { RateLimiter } from './rate-limiter'

// 类型
export type {
  IProvider,
  ProviderMessage,
  ProviderResponse,
  CompletionOptions,
  TranslationOptions,
  TranslationResult,
} from './types'
