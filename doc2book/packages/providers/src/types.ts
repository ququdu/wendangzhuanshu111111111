/**
 * Provider 类型定义
 */

import type { ProviderType, ProviderConfig } from '@doc2book/shared'

/**
 * 消息角色
 */
export type MessageRole = 'system' | 'user' | 'assistant'

/**
 * Provider 消息
 */
export interface ProviderMessage {
  role: MessageRole
  content: string
}

/**
 * 补全选项
 */
export interface CompletionOptions {
  /** 模型名称 */
  model?: string
  /** 最大 token 数 */
  maxTokens?: number
  /** 温度（0-1） */
  temperature?: number
  /** Top P */
  topP?: number
  /** 停止序列 */
  stopSequences?: string[]
  /** 系统提示 */
  systemPrompt?: string
  /** 是否流式输出 */
  stream?: boolean
}

/**
 * Provider 响应
 */
export interface ProviderResponse {
  /** 是否成功 */
  success: boolean
  /** 响应内容 */
  content?: string
  /** 错误信息 */
  error?: string
  /** 使用的 token 数 */
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  /** 使用的模型 */
  model?: string
  /** 响应时间（毫秒） */
  responseTime?: number
}

/**
 * 翻译选项
 */
export interface TranslationOptions {
  /** 源语言（自动检测则为空） */
  sourceLanguage?: string
  /** 目标语言 */
  targetLanguage: string
  /** 是否保留格式 */
  preserveFormatting?: boolean
  /** 术语表 */
  glossary?: Record<string, string>
  /** 正式程度 */
  formality?: 'default' | 'more' | 'less' | 'prefer_more' | 'prefer_less'
}

/**
 * 翻译结果
 */
export interface TranslationResult {
  /** 是否成功 */
  success: boolean
  /** 翻译后的文本 */
  translatedText?: string
  /** 检测到的源语言 */
  detectedSourceLanguage?: string
  /** 错误信息 */
  error?: string
}

/**
 * Provider 接口
 */
export interface IProvider {
  /** Provider 类型 */
  type: ProviderType
  /** Provider 名称 */
  name: string
  /** 是否可用 */
  isAvailable(): Promise<boolean>
  /** 获取可用模型列表 */
  getModels(): Promise<string[]>
  /** 发送补全请求 */
  complete(messages: ProviderMessage[], options?: CompletionOptions): Promise<ProviderResponse>
  /** 发送翻译请求（如果支持） */
  translate?(text: string, options: TranslationOptions): Promise<TranslationResult>
}

/**
 * Provider 状态
 */
export interface ProviderStatus {
  /** Provider ID */
  id: string
  /** Provider 名称 */
  name: string
  /** 是否可用 */
  available: boolean
  /** 延迟（毫秒） */
  latency?: number
  /** 最后检查时间 */
  lastCheck: Date
  /** 错误信息 */
  error?: string
}

/**
 * 速率限制配置
 */
export interface RateLimitConfig {
  /** 每分钟请求数 */
  requestsPerMinute: number
  /** 每分钟 token 数 */
  tokensPerMinute: number
  /** 并发请求数 */
  maxConcurrent?: number
}

/**
 * 速率限制状态
 */
export interface RateLimitStatus {
  /** 剩余请求数 */
  remainingRequests: number
  /** 剩余 token 数 */
  remainingTokens: number
  /** 重置时间 */
  resetTime: Date
  /** 是否被限制 */
  isLimited: boolean
}
