/**
 * 内容重写器
 */

import type { ProviderManager } from '@doc2book/providers'
import type { RewriteResult, StyleOptions } from './types'

export class ContentRewriter {
  private providerManager: ProviderManager

  constructor(providerManager: ProviderManager) {
    this.providerManager = providerManager
  }

  async rewrite(content: string, options?: StyleOptions & { providerId?: string }): Promise<RewriteResult> {
    const startTime = Date.now()

    try {
      const prompt = `请将以下内容完全重写，保持核心信息但使用全新的表达方式：

${content.substring(0, 8000)}

要求：
- 保留核心信息和观点
- 使用完全不同的句式和词汇
- 语气：${options?.tone || 'formal'}
- 目标读者：${options?.audience || 'general'}
- 复杂度：${options?.complexity || 'moderate'}
- 不要添加新信息
- 不要遗漏重要内容`

      const response = await this.providerManager.complete(
        [{ role: 'user', content: prompt }],
        { providerId: options?.providerId, temperature: 0.7, maxTokens: 4000 }
      )

      if (!response.success || !response.content) {
        return { success: false, error: response.error, rewriteTime: Date.now() - startTime }
      }

      return {
        success: true,
        rewrittenContent: response.content,
        originalLength: content.length,
        rewrittenLength: response.content.length,
        rewriteTime: Date.now() - startTime,
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '重写失败', rewriteTime: Date.now() - startTime }
    }
  }
}
