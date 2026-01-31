/**
 * 摘要生成器
 * 生成文档的各种类型摘要
 */

import type { UnifiedAST, ContentNode } from '@doc2book/shared'
import type { ProviderManager } from '@doc2book/providers'
import type { SummaryResult, SummaryOptions } from './types'

/**
 * 摘要生成器类
 */
export class Summarizer {
  private providerManager: ProviderManager

  constructor(providerManager: ProviderManager) {
    this.providerManager = providerManager
  }

  /**
   * 生成摘要
   */
  async summarize(ast: UnifiedAST, options?: SummaryOptions): Promise<SummaryResult> {
    const startTime = Date.now()

    try {
      // 提取文本内容
      const textContent = this.extractText(ast.content)

      if (textContent.length < 50) {
        return {
          success: false,
          error: '文档内容太短，无法生成摘要',
          generationTime: Date.now() - startTime,
        }
      }

      const summaryType = options?.type || 'all'
      const result: SummaryResult = {
        success: true,
        generationTime: 0,
      }

      // 根据类型生成不同的摘要
      if (summaryType === 'brief' || summaryType === 'all') {
        result.brief = await this.generateBriefSummary(textContent, options)
      }

      if (summaryType === 'standard' || summaryType === 'all') {
        result.standard = await this.generateStandardSummary(textContent, options)
      }

      if (summaryType === 'detailed' || summaryType === 'all') {
        result.detailed = await this.generateDetailedSummary(textContent, options)
      }

      if (summaryType === 'bullets' || summaryType === 'all') {
        result.bulletPoints = await this.generateBulletPoints(textContent, options)
      }

      result.generationTime = Date.now() - startTime
      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '生成摘要失败',
        generationTime: Date.now() - startTime,
      }
    }
  }

  /**
   * 生成简短摘要（1-2句）
   */
  private async generateBriefSummary(
    text: string,
    options?: SummaryOptions
  ): Promise<string | undefined> {
    const prompt = `请用1-2句话概括以下内容的核心要点：

${this.truncateText(text, 5000)}

要求：
- 简洁明了
- 抓住核心
- ${options?.language ? `使用${options.language}` : '使用原文语言'}
${options?.instruction ? `\n附加要求：\n${options.instruction}` : ''}`

    const response = await this.providerManager.complete(
      [{ role: 'user', content: prompt }],
      {
        providerId: options?.providerId,
        temperature: 0.3,
        maxTokens: 200,
      }
    )

    return response.success ? response.content : undefined
  }

  /**
   * 生成标准摘要（1段）
   */
  private async generateStandardSummary(
    text: string,
    options?: SummaryOptions
  ): Promise<string | undefined> {
    const maxLength = options?.maxLength || 500

    const prompt = `请为以下内容生成一段摘要（约${maxLength}字）：

${this.truncateText(text, 8000)}

要求：
- 涵盖主要内容
- 逻辑清晰
- 语言流畅
- ${options?.language ? `使用${options.language}` : '使用原文语言'}
${options?.instruction ? `\n附加要求：\n${options.instruction}` : ''}`

    const response = await this.providerManager.complete(
      [{ role: 'user', content: prompt }],
      {
        providerId: options?.providerId,
        temperature: 0.3,
        maxTokens: Math.ceil(maxLength * 1.5),
      }
    )

    return response.success ? response.content : undefined
  }

  /**
   * 生成详细摘要（多段）
   */
  private async generateDetailedSummary(
    text: string,
    options?: SummaryOptions
  ): Promise<string | undefined> {
    const prompt = `请为以下内容生成详细摘要：

${this.truncateText(text, 10000)}

要求：
- 分段组织
- 涵盖所有重要内容
- 保持逻辑结构
- 包含关键细节
- ${options?.language ? `使用${options.language}` : '使用原文语言'}
${options?.instruction ? `\n附加要求：\n${options.instruction}` : ''}`

    const response = await this.providerManager.complete(
      [{ role: 'user', content: prompt }],
      {
        providerId: options?.providerId,
        temperature: 0.3,
        maxTokens: 2000,
      }
    )

    return response.success ? response.content : undefined
  }

  /**
   * 生成要点列表
   */
  private async generateBulletPoints(
    text: string,
    options?: SummaryOptions
  ): Promise<string[] | undefined> {
    const bulletCount = options?.bulletCount || 5

    const prompt = `请从以下内容中提取${bulletCount}个核心要点：

${this.truncateText(text, 8000)}

要求：
- 每个要点一行
- 以"- "开头
- 简洁明了
- 抓住关键信息
- ${options?.language ? `使用${options.language}` : '使用原文语言'}
${options?.instruction ? `\n附加要求：\n${options.instruction}` : ''}`

    const response = await this.providerManager.complete(
      [{ role: 'user', content: prompt }],
      {
        providerId: options?.providerId,
        temperature: 0.3,
        maxTokens: 1000,
      }
    )

    if (!response.success || !response.content) {
      return undefined
    }

    // 解析要点
    const lines = response.content.split('\n')
    const bullets: string[] = []

    for (const line of lines) {
      const match = line.match(/^[-*•]\s*(.+)$/)
      if (match) {
        bullets.push(match[1].trim())
      }
    }

    return bullets.length > 0 ? bullets : undefined
  }

  /**
   * 提取文本内容
   */
  private extractText(nodes: ContentNode[]): string {
    const texts: string[] = []

    for (const node of nodes) {
      if (node.text) {
        texts.push(node.text)
      }
      if (node.children) {
        texts.push(this.extractText(node.children))
      }
    }

    return texts.join('\n\n')
  }

  /**
   * 截断文本
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text
    }
    return text.substring(0, maxLength) + '\n\n[内容已截断...]'
  }
}
