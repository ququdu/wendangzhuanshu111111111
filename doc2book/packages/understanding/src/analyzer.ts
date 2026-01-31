/**
 * 内容分析器
 * 深度理解文档内容，提取核心信息
 */

import type { UnifiedAST, ContentNode } from '@doc2book/shared'
import type { ProviderManager } from '@doc2book/providers'
import type {
  AnalysisResult,
  AnalysisOptions,
  DocumentTheme,
  KeyPoint,
} from './types'

/**
 * 内容分析器类
 */
export class ContentAnalyzer {
  private providerManager: ProviderManager

  constructor(providerManager: ProviderManager) {
    this.providerManager = providerManager
  }

  /**
   * 分析文档内容
   */
  async analyze(ast: UnifiedAST, options?: AnalysisOptions): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      // 提取文本内容
      const textContent = this.extractText(ast.content)

      if (textContent.length < 100) {
        return {
          success: false,
          error: '文档内容太短，无法进行有效分析',
          analysisTime: Date.now() - startTime,
        }
      }

      // 构建分析提示
      const prompt = this.buildAnalysisPrompt(textContent, options)

      // 调用 AI 进行分析
      const response = await this.providerManager.complete(
        [{ role: 'user', content: prompt }],
        {
          systemPrompt: this.getSystemPrompt(),
          providerId: options?.providerId,
          temperature: 0.3,
          maxTokens: 2000,
        }
      )

      if (!response.success || !response.content) {
        return {
          success: false,
          error: response.error || '分析失败',
          analysisTime: Date.now() - startTime,
        }
      }

      // 解析 AI 响应
      const result = this.parseAnalysisResponse(response.content)

      return {
        success: true,
        ...result,
        analysisTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '分析失败',
        analysisTime: Date.now() - startTime,
      }
    }
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
   * 获取系统提示
   */
  private getSystemPrompt(): string {
    return `你是一个专业的内容分析专家。你的任务是深度分析文档内容，提取核心信息。

请以 JSON 格式返回分析结果，包含以下字段：
- mainTheme: 主要主题 { name, description, keywords[], confidence }
- subThemes: 次要主题数组
- keyPoints: 关键点数组 { content, type, importance }
- targetAudience: 目标读者描述
- documentType: 文档类型 (academic/technical/business/narrative/instructional/other)
- writingStyle: 写作风格 (formal/informal/technical/conversational)

确保返回有效的 JSON 格式。`
  }

  /**
   * 构建分析提示
   */
  private buildAnalysisPrompt(text: string, options?: AnalysisOptions): string {
    // 如果文本太长，截取前面部分
    const maxLength = 10000
    const truncatedText = text.length > maxLength
      ? text.substring(0, maxLength) + '\n\n[文档内容已截断...]'
      : text

    let prompt = `请分析以下文档内容：

---
${truncatedText}
---

`

    if (options?.extractKeyPoints) {
      prompt += `请提取最多 ${options.maxKeyPoints || 10} 个关键点。\n`
    }

    if (options?.identifyThemes) {
      prompt += `请识别文档的主要主题和次要主题。\n`
    }

    if (options?.analyzeStyle) {
      prompt += `请分析文档的写作风格。\n`
    }

    prompt += `\n请以 JSON 格式返回分析结果。`

    if (options?.instruction) {
      prompt += `\n\n附加要求：\n${options.instruction}`
    }

    return prompt
  }

  /**
   * 解析 AI 响应
   */
  private parseAnalysisResponse(content: string): Partial<AnalysisResult> {
    try {
      // 尝试提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return this.parseTextResponse(content)
      }

      const data = JSON.parse(jsonMatch[0])

      return {
        mainTheme: data.mainTheme,
        subThemes: data.subThemes,
        keyPoints: data.keyPoints,
        targetAudience: data.targetAudience,
        documentType: data.documentType,
        writingStyle: data.writingStyle,
      }
    } catch (error) {
      // JSON 解析失败，尝试文本解析
      return this.parseTextResponse(content)
    }
  }

  /**
   * 解析文本响应（备用方案）
   */
  private parseTextResponse(content: string): Partial<AnalysisResult> {
    // 简单的文本解析
    const keyPoints: KeyPoint[] = []

    // 提取要点（以数字或破折号开头的行）
    const lines = content.split('\n')
    for (const line of lines) {
      const match = line.match(/^[\d\-\*•]\s*(.+)$/)
      if (match) {
        keyPoints.push({
          content: match[1].trim(),
          type: 'fact',
          importance: 3,
        })
      }
    }

    return {
      keyPoints: keyPoints.length > 0 ? keyPoints : undefined,
    }
  }
}
