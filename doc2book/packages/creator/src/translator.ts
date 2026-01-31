/**
 * 翻译器
 */

import type { ProviderManager } from '@doc2book/providers'
import type { TranslateResult } from './types'

export class Translator {
  private providerManager: ProviderManager

  constructor(providerManager: ProviderManager) {
    this.providerManager = providerManager
  }

  async translate(
    content: string,
    targetLanguage: string,
    options?: {
      providerId?: string
      sourceLanguage?: string
      instruction?: string
      mode?: 'auto' | 'ai' | 'deepl'
    }
  ): Promise<TranslateResult> {
    const startTime = Date.now()

    try {
      const preferAI = options?.mode === 'ai' || Boolean(options?.instruction)

      if (!preferAI) {
        // 优先使用 DeepL
        const deeplResult = await this.providerManager.translate(content, {
          targetLanguage,
          sourceLanguage: options?.sourceLanguage,
          preserveFormatting: true,
        })

        if (deeplResult.success && deeplResult.translatedText) {
          return {
            success: true,
            translatedContent: deeplResult.translatedText,
            sourceLanguage: deeplResult.detectedSourceLanguage || options?.sourceLanguage,
            targetLanguage,
            translateTime: Date.now() - startTime,
          }
        }

        if (options?.mode === 'deepl') {
          return { success: false, error: 'DeepL 翻译失败', translateTime: Date.now() - startTime }
        }
      }

      // 回退到 AI 翻译
      const aiResult = await this.providerManager.translateWithAI(content, {
        targetLanguage,
        sourceLanguage: options?.sourceLanguage,
        providerId: options?.providerId,
        instruction: options?.instruction,
      })

      if (aiResult.success && aiResult.translatedText) {
        return {
          success: true,
          translatedContent: aiResult.translatedText,
          sourceLanguage: options?.sourceLanguage,
          targetLanguage,
          translateTime: Date.now() - startTime,
        }
      }

      return { success: false, error: aiResult.error || '翻译失败', translateTime: Date.now() - startTime }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '翻译失败', translateTime: Date.now() - startTime }
    }
  }
}
