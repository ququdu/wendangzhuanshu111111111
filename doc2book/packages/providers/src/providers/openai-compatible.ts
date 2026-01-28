/**
 * OpenAI 兼容 Provider
 * 支持任何兼容 OpenAI API 的服务
 */

import OpenAI from 'openai'
import type { ProviderType } from '@doc2book/shared'
import type {
  IProvider,
  ProviderMessage,
  ProviderResponse,
  CompletionOptions,
} from '../types'

/**
 * OpenAI 兼容 Provider 配置
 */
export interface OpenAICompatibleProviderConfig {
  /** API 密钥 */
  apiKey: string
  /** API 基础 URL */
  baseUrl: string
  /** Provider 名称 */
  name?: string
  /** 默认模型 */
  defaultModel?: string
  /** 可用模型列表 */
  models?: string[]
}

/**
 * OpenAI 兼容 Provider 实现
 */
export class OpenAICompatibleProvider implements IProvider {
  type: ProviderType = 'openai-compatible'
  name: string

  private client: OpenAI
  private defaultModel: string
  private availableModels: string[]

  constructor(config: OpenAICompatibleProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    })
    this.name = config.name || 'OpenAI Compatible'
    this.defaultModel = config.defaultModel || 'gpt-3.5-turbo'
    this.availableModels = config.models || [this.defaultModel]
  }

  /**
   * 检查 Provider 是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      // 尝试发送一个简单的请求
      await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 10,
      })
      return true
    } catch (error) {
      console.error(`${this.name} Provider 不可用:`, error)
      return false
    }
  }

  /**
   * 获取可用模型列表
   */
  async getModels(): Promise<string[]> {
    try {
      const response = await this.client.models.list()
      return response.data.map((model) => model.id)
    } catch (error) {
      // 返回配置的模型列表
      return this.availableModels
    }
  }

  /**
   * 发送补全请求
   */
  async complete(
    messages: ProviderMessage[],
    options?: CompletionOptions
  ): Promise<ProviderResponse> {
    const startTime = Date.now()

    try {
      // 构建消息列表
      const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = []

      // 添加系统消息
      if (options?.systemPrompt) {
        openaiMessages.push({
          role: 'system',
          content: options.systemPrompt,
        })
      }

      // 添加用户消息
      for (const msg of messages) {
        openaiMessages.push({
          role: msg.role,
          content: msg.content,
        })
      }

      // 发送请求
      const response = await this.client.chat.completions.create({
        model: options?.model || this.defaultModel,
        messages: openaiMessages,
        max_tokens: options?.maxTokens,
        temperature: options?.temperature,
        top_p: options?.topP,
        stop: options?.stopSequences,
      })

      const choice = response.choices[0]
      const content = choice?.message?.content || ''

      return {
        success: true,
        content,
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
        model: response.model,
        responseTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '请求失败',
        responseTime: Date.now() - startTime,
      }
    }
  }
}
