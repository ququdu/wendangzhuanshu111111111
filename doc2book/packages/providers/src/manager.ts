/**
 * Provider 管理器
 * 统一管理多个 AI Provider，支持故障转移和负载均衡
 */

import type { ProviderConfig, ProviderManagerConfig, ProviderType } from '@doc2book/shared'
import type {
  IProvider,
  ProviderMessage,
  ProviderResponse,
  CompletionOptions,
  ProviderStatus,
  TranslationOptions,
  TranslationResult,
} from './types'
import { AnthropicProvider } from './providers/anthropic'
import { OpenAIProvider } from './providers/openai'
import { OpenAICompatibleProvider } from './providers/openai-compatible'
import { DeepLProvider } from './providers/deepl'
import { RateLimiter } from './rate-limiter'

/**
 * Provider 管理器类
 */
export class ProviderManager {
  private providers: Map<string, IProvider> = new Map()
  private rateLimiters: Map<string, RateLimiter> = new Map()
  private providerConfigs: Map<string, ProviderConfig> = new Map()
  private defaultProviderId: string
  private fallbackChain: string[]
  private retryAttempts: number
  private timeout: number

  constructor(config: ProviderManagerConfig) {
    this.defaultProviderId = config.defaultProvider
    this.fallbackChain = config.fallbackChain || []
    this.retryAttempts = config.retryAttempts || 3
    this.timeout = config.timeout || 30000

    // 初始化所有 Provider
    for (const providerConfig of config.providers) {
      if (providerConfig.enabled) {
        this.addProvider(providerConfig)
      }
    }
  }

  /**
   * 添加 Provider
   */
  addProvider(config: ProviderConfig): void {
    const provider = this.createProvider(config)
    if (provider) {
      this.providers.set(config.id, provider)
      this.providerConfigs.set(config.id, config)

      // 创建速率限制器
      if (config.rateLimit) {
        this.rateLimiters.set(
          config.id,
          new RateLimiter({
            requestsPerMinute: config.rateLimit.requestsPerMinute,
            tokensPerMinute: config.rateLimit.tokensPerMinute,
          })
        )
      }
    }
  }

  /**
   * 移除 Provider
   */
  removeProvider(id: string): void {
    this.providers.delete(id)
    this.providerConfigs.delete(id)
    this.rateLimiters.delete(id)
  }

  /**
   * 获取 Provider
   */
  getProvider(id: string): IProvider | undefined {
    return this.providers.get(id)
  }

  /**
   * 获取所有 Provider 状态
   */
  async getProviderStatuses(): Promise<ProviderStatus[]> {
    const statuses: ProviderStatus[] = []

    for (const [id, provider] of this.providers) {
      const startTime = Date.now()
      let available = false
      let error: string | undefined

      try {
        available = await Promise.race([
          provider.isAvailable(),
          new Promise<boolean>((_, reject) =>
            setTimeout(() => reject(new Error('超时')), 5000)
          ),
        ])
      } catch (e) {
        error = e instanceof Error ? e.message : '检查失败'
      }

      statuses.push({
        id,
        name: provider.name,
        available,
        latency: Date.now() - startTime,
        lastCheck: new Date(),
        error,
      })
    }

    return statuses
  }

  /**
   * 发送补全请求
   */
  async complete(
    messages: ProviderMessage[],
    options?: CompletionOptions & { providerId?: string }
  ): Promise<ProviderResponse> {
    // 确定使用的 Provider
    const providerId = options?.providerId || this.defaultProviderId
    const providerChain = [providerId, ...this.fallbackChain.filter((id) => id !== providerId)]

    // 尝试每个 Provider
    for (const id of providerChain) {
      const provider = this.providers.get(id)
      if (!provider) continue

      // 检查速率限制
      const rateLimiter = this.rateLimiters.get(id)
      if (rateLimiter) {
        await rateLimiter.waitForSlot()
        rateLimiter.startRequest()
      }

      try {
        // 发送请求
        const response = await this.executeWithRetry(
          () => provider.complete(messages, options),
          this.retryAttempts
        )

        // 更新速率限制
        if (rateLimiter && response.usage) {
          rateLimiter.endRequest(response.usage.totalTokens)
        }

        if (response.success) {
          return response
        }

        // 如果失败，尝试下一个 Provider
        console.warn(`Provider ${id} 失败:`, response.error)
      } catch (error) {
        if (rateLimiter) {
          rateLimiter.endRequest(0)
        }
        console.error(`Provider ${id} 异常:`, error)
      }
    }

    return {
      success: false,
      error: '所有 Provider 都失败了',
    }
  }

  /**
   * 翻译文本
   */
  async translate(
    text: string,
    options: TranslationOptions & { providerId?: string }
  ): Promise<TranslationResult> {
    // 优先使用 DeepL
    const providerId = options.providerId || this.findTranslationProvider()

    if (!providerId) {
      return {
        success: false,
        error: '没有可用的翻译 Provider',
      }
    }

    const provider = this.providers.get(providerId)
    if (!provider || !provider.translate) {
      return {
        success: false,
        error: `Provider ${providerId} 不支持翻译`,
      }
    }

    // 检查速率限制
    const rateLimiter = this.rateLimiters.get(providerId)
    if (rateLimiter) {
      await rateLimiter.waitForSlot()
      rateLimiter.startRequest()
    }

    try {
      const result = await provider.translate(text, options)

      if (rateLimiter) {
        rateLimiter.endRequest(text.length)
      }

      return result
    } catch (error) {
      if (rateLimiter) {
        rateLimiter.endRequest(0)
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : '翻译失败',
      }
    }
  }

  /**
   * 使用 AI 进行翻译（通过补全 API）
   */
  async translateWithAI(
    text: string,
    options: TranslationOptions & { providerId?: string }
  ): Promise<TranslationResult> {
    const systemPrompt = `你是一个专业的翻译专家。请将以下文本翻译成${options.targetLanguage}。
要求：
1. 保持原文的语气和风格
2. 确保翻译准确、流畅、自然
3. 只输出翻译结果，不要添加任何解释或注释
${options.preserveFormatting ? '4. 保持原文的格式（段落、列表等）' : ''}`

    const response = await this.complete(
      [{ role: 'user', content: text }],
      {
        systemPrompt,
        providerId: options.providerId,
        temperature: 0.3,
      }
    )

    if (response.success && response.content) {
      return {
        success: true,
        translatedText: response.content,
      }
    }

    return {
      success: false,
      error: response.error || '翻译失败',
    }
  }

  /**
   * 创建 Provider 实例
   */
  private createProvider(config: ProviderConfig): IProvider | null {
    switch (config.type) {
      case 'anthropic':
        return new AnthropicProvider({
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          defaultModel: config.defaultModel,
        })

      case 'openai':
        return new OpenAIProvider({
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          defaultModel: config.defaultModel,
        })

      case 'openai-compatible':
        return new OpenAICompatibleProvider({
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          name: config.name,
          defaultModel: config.defaultModel,
          models: config.models,
        })

      case 'deepl':
        return new DeepLProvider({
          apiKey: config.apiKey,
          useFreeApi: config.baseUrl?.includes('api-free'),
        })

      case 'google':
        // TODO: 实现 Google Gemini Provider
        console.warn('Google Gemini Provider 尚未实现')
        return null

      default:
        console.warn(`未知的 Provider 类型: ${config.type}`)
        return null
    }
  }

  /**
   * 查找翻译 Provider
   */
  private findTranslationProvider(): string | null {
    // 优先使用 DeepL
    for (const [id, provider] of this.providers) {
      if (provider.type === 'deepl') {
        return id
      }
    }

    // 其次使用任何支持翻译的 Provider
    for (const [id, provider] of this.providers) {
      if (provider.translate) {
        return id
      }
    }

    // 最后使用默认 Provider（通过 AI 翻译）
    return this.defaultProviderId
  }

  /**
   * 带重试的执行
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number
  ): Promise<T> {
    let lastError: Error | null = null

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // 指数退避
        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000))
        }
      }
    }

    throw lastError || new Error('重试失败')
  }
}

/**
 * 创建 Provider 管理器
 */
export function createProviderManager(config: ProviderManagerConfig): ProviderManager {
  return new ProviderManager(config)
}
