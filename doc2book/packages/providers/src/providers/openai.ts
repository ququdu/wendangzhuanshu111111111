/**
 * OpenAI Provider
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
 * OpenAI Provider 配置
 */
export interface OpenAIProviderConfig {
  apiKey: string
  baseUrl?: string
  organization?: string
  defaultModel?: string
}

/**
 * OpenAI Provider 实现
 */
export class OpenAIProvider implements IProvider {
  type: ProviderType = 'openai'
  name = 'OpenAI GPT'

  private client: OpenAI
  private defaultModel: string

  constructor(config: OpenAIProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      organization: config.organization,
    })
    this.defaultModel = config.defaultModel || 'gpt-4-turbo-preview'
  }

  /**
   * 检查 Provider 是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list()
      return true
    } catch (error) {
      console.error('OpenAI Provider 不可用:', error)
      return false
    }
  }

  /**
   * 获取可用模型列表
   */
  async getModels(): Promise<string[]> {
    try {
      const response = await this.client.models.list()
      return response.data
        .filter((model) => model.id.startsWith('gpt'))
        .map((model) => model.id)
        .sort()
    } catch (error) {
      // 返回默认模型列表
      return [
        'gpt-4-turbo-preview',
        'gpt-4-0125-preview',
        'gpt-4-1106-preview',
        'gpt-4',
        'gpt-3.5-turbo',
        'gpt-3.5-turbo-16k',
      ]
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
