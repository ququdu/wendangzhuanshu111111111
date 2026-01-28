/**
 * DeepL 翻译 Provider
 */

import type { ProviderType } from '@doc2book/shared'
import type {
  IProvider,
  ProviderMessage,
  ProviderResponse,
  CompletionOptions,
  TranslationOptions,
  TranslationResult,
} from '../types'

/**
 * DeepL Provider 配置
 */
export interface DeepLProviderConfig {
  /** API 密钥 */
  apiKey: string
  /** 是否使用免费版 API */
  useFreeApi?: boolean
}

/**
 * DeepL 支持的语言
 */
const DEEPL_LANGUAGES: Record<string, string> = {
  zh: 'ZH',
  en: 'EN',
  de: 'DE',
  fr: 'FR',
  es: 'ES',
  pt: 'PT',
  it: 'IT',
  nl: 'NL',
  pl: 'PL',
  ru: 'RU',
  ja: 'JA',
  ko: 'KO',
}

/**
 * DeepL Provider 实现
 */
export class DeepLProvider implements IProvider {
  type: ProviderType = 'deepl'
  name = 'DeepL Translator'

  private apiKey: string
  private baseUrl: string

  constructor(config: DeepLProviderConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.useFreeApi
      ? 'https://api-free.deepl.com/v2'
      : 'https://api.deepl.com/v2'
  }

  /**
   * 检查 Provider 是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/usage`, {
        headers: {
          Authorization: `DeepL-Auth-Key ${this.apiKey}`,
        },
      })
      return response.ok
    } catch (error) {
      console.error('DeepL Provider 不可用:', error)
      return false
    }
  }

  /**
   * 获取可用模型列表（DeepL 不使用模型概念）
   */
  async getModels(): Promise<string[]> {
    return ['deepl-translate']
  }

  /**
   * 发送补全请求（DeepL 不支持，返回错误）
   */
  async complete(
    messages: ProviderMessage[],
    options?: CompletionOptions
  ): Promise<ProviderResponse> {
    return {
      success: false,
      error: 'DeepL 不支持文本补全，请使用 translate 方法',
    }
  }

  /**
   * 翻译文本
   */
  async translate(text: string, options: TranslationOptions): Promise<TranslationResult> {
    try {
      // 转换语言代码
      const targetLang = DEEPL_LANGUAGES[options.targetLanguage] || options.targetLanguage.toUpperCase()
      const sourceLang = options.sourceLanguage
        ? DEEPL_LANGUAGES[options.sourceLanguage] || options.sourceLanguage.toUpperCase()
        : undefined

      // 构建请求参数
      const params = new URLSearchParams({
        text,
        target_lang: targetLang,
      })

      if (sourceLang) {
        params.append('source_lang', sourceLang)
      }

      if (options.preserveFormatting) {
        params.append('preserve_formatting', '1')
      }

      if (options.formality && options.formality !== 'default') {
        params.append('formality', options.formality)
      }

      // 发送请求
      const response = await fetch(`${this.baseUrl}/translate`, {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `DeepL API 错误: ${response.status} - ${errorText}`,
        }
      }

      const data = await response.json() as { translations?: Array<{ text: string; detected_source_language?: string }> }
      const translation = data.translations?.[0]

      if (!translation) {
        return {
          success: false,
          error: '翻译结果为空',
        }
      }

      return {
        success: true,
        translatedText: translation.text,
        detectedSourceLanguage: translation.detected_source_language?.toLowerCase(),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '翻译失败',
      }
    }
  }

  /**
   * 获取使用量信息
   */
  async getUsage(): Promise<{ characterCount: number; characterLimit: number } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/usage`, {
        headers: {
          Authorization: `DeepL-Auth-Key ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json() as { character_count: number; character_limit: number }
      return {
        characterCount: data.character_count,
        characterLimit: data.character_limit,
      }
    } catch (error) {
      return null
    }
  }

  /**
   * 获取支持的语言列表
   */
  async getSupportedLanguages(): Promise<Array<{ code: string; name: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/languages`, {
        headers: {
          Authorization: `DeepL-Auth-Key ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        return []
      }

      const data = await response.json() as Array<{ language: string; name: string }>
      return data.map((lang) => ({
        code: lang.language.toLowerCase(),
        name: lang.name,
      }))
    } catch (error) {
      return []
    }
  }
}
