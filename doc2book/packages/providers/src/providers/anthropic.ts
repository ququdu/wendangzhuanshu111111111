/**
 * Anthropic (Claude) Provider
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ProviderType } from '@doc2book/shared'
import type {
  IProvider,
  ProviderMessage,
  ProviderResponse,
  CompletionOptions,
} from '../types'

/**
 * Anthropic Provider 配置
 */
export interface AnthropicProviderConfig {
  apiKey: string
  baseUrl?: string
  defaultModel?: string
}

/**
 * Anthropic Provider 实现
 */
export class AnthropicProvider implements IProvider {
  type: ProviderType = 'anthropic'
  name = 'Anthropic Claude'

  private client: Anthropic
  private defaultModel: string

  constructor(config: AnthropicProviderConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    })
    this.defaultModel = config.defaultModel || 'claude-3-sonnet-20240229'
  }

  /**
   * 检查 Provider 是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      // 发送一个简单的请求来检查可用性
      await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      })
      return true
    } catch (error) {
      console.error('Anthropic Provider 不可用:', error)
      return false
    }
  }

  /**
   * 获取可用模型列表
   */
  async getModels(): Promise<string[]> {
    // Anthropic API 目前不提供模型列表接口，返回已知模型
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2',
    ]
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
      // 分离系统消息和用户消息
      const systemMessage = messages.find((m) => m.role === 'system')?.content ||
        options?.systemPrompt

      const userMessages = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))

      // 发送请求
      const response = await this.client.messages.create({
        model: options?.model || this.defaultModel,
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature,
        top_p: options?.topP,
        stop_sequences: options?.stopSequences,
        system: systemMessage,
        messages: userMessages,
      })

      // 提取响应内容
      const content = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as { type: 'text'; text: string }).text)
        .join('')

      return {
        success: true,
        content,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
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
