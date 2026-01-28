/**
 * 抄袭检测报告生成器
 */

import type { ProviderManager } from '@doc2book/providers'
import type { SimilarityResult, PlagiarismReport, CheckOptions } from './types'
import { SimilarityChecker } from './similarity-checker'
import { VectorStore } from './vector-store'

/**
 * 报告生成器配置
 */
export interface ReportGeneratorConfig {
  /** 相似度阈值 */
  threshold?: number
  /** 是否生成改写建议 */
  generateSuggestions?: boolean
  /** 报告语言 */
  language?: string
}

/**
 * 报告生成器类
 */
export class ReportGenerator {
  private providerManager: ProviderManager
  private similarityChecker: SimilarityChecker
  private vectorStore: VectorStore
  private config: ReportGeneratorConfig

  constructor(providerManager: ProviderManager, config?: ReportGeneratorConfig) {
    this.providerManager = providerManager
    this.similarityChecker = new SimilarityChecker(providerManager)
    this.vectorStore = new VectorStore(providerManager)
    this.config = {
      threshold: 0.8,
      generateSuggestions: true,
      language: 'zh',
      ...config,
    }
  }

  /**
   * 生成抄袭检测报告
   */
  async generateReport(
    text: string,
    sources: string[],
    options?: CheckOptions
  ): Promise<PlagiarismReport> {
    const startTime = Date.now()

    try {
      // 将源文本添加到向量存储
      for (let i = 0; i < sources.length; i++) {
        await this.vectorStore.add(sources[i], { sourceIndex: i })
      }

      // 执行相似度检查
      const checkResult = await this.similarityChecker.check(text, sources, {
        ...options,
        threshold: this.config.threshold,
      })

      if (!checkResult.success) {
        return {
          success: false,
          error: checkResult.error,
          overallScore: 0,
          originalityScore: 1,
          totalChecked: 0,
          flaggedSections: [],
          summary: '检测失败',
          generatedAt: new Date(),
        }
      }

      // 处理标记的部分
      const flaggedSections = await this.processFlaggedSections(
        checkResult.matches,
        options
      )

      // 计算总体分数
      const overallScore = checkResult.score
      const originalityScore = 1 - overallScore

      // 生成摘要
      const summary = await this.generateSummary(
        overallScore,
        flaggedSections.length,
        text.length
      )

      return {
        success: true,
        overallScore,
        originalityScore,
        totalChecked: text.length,
        flaggedSections,
        summary,
        generatedAt: new Date(),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '生成报告失败',
        overallScore: 0,
        originalityScore: 1,
        totalChecked: 0,
        flaggedSections: [],
        summary: '生成报告时发生错误',
        generatedAt: new Date(),
      }
    } finally {
      // 清理向量存储
      this.vectorStore.clear()
    }
  }

  /**
   * 处理标记的部分
   */
  private async processFlaggedSections(
    matches: SimilarityResult['matches'],
    options?: CheckOptions
  ): Promise<PlagiarismReport['flaggedSections']> {
    const flaggedSections: PlagiarismReport['flaggedSections'] = []

    for (const match of matches) {
      const section: PlagiarismReport['flaggedSections'][0] = {
        text: match.sourceText,
        similarity: match.similarity,
        source: match.matchedText,
      }

      // 生成改写建议
      if (this.config.generateSuggestions) {
        section.suggestion = await this.generateSuggestion(
          match.sourceText,
          options?.providerId
        )
      }

      flaggedSections.push(section)
    }

    return flaggedSections
  }

  /**
   * 生成改写建议
   */
  private async generateSuggestion(
    text: string,
    providerId?: string
  ): Promise<string> {
    const prompt = `请将以下文本改写为原创内容，保持原意但使用不同的表达方式：

"${text}"

要求：
1. 保持原文的核心含义
2. 使用不同的词汇和句式
3. 确保改写后的内容自然流畅
4. 只返回改写后的文本，不要其他说明`

    const response = await this.providerManager.complete(
      [{ role: 'user', content: prompt }],
      { providerId, temperature: 0.7, maxTokens: 500 }
    )

    if (response.success && response.content) {
      return response.content.trim()
    }

    return '无法生成改写建议'
  }

  /**
   * 生成报告摘要
   */
  private async generateSummary(
    overallScore: number,
    flaggedCount: number,
    totalLength: number
  ): Promise<string> {
    const originalityPercent = Math.round((1 - overallScore) * 100)

    if (overallScore < 0.2) {
      return `文档原创性良好（${originalityPercent}%），未发现明显的抄袭问题。`
    } else if (overallScore < 0.5) {
      return `文档原创性一般（${originalityPercent}%），发现 ${flaggedCount} 处可能存在相似内容，建议进行适当修改。`
    } else if (overallScore < 0.8) {
      return `文档原创性较低（${originalityPercent}%），发现 ${flaggedCount} 处高度相似内容，强烈建议进行改写。`
    } else {
      return `文档原创性很低（${originalityPercent}%），发现 ${flaggedCount} 处疑似抄袭内容，需要大幅改写。`
    }
  }

  /**
   * 快速检查（不生成详细报告）
   */
  async quickCheck(
    text: string,
    sources: string[]
  ): Promise<{ isPlagiarized: boolean; score: number }> {
    const result = await this.similarityChecker.check(text, sources, {
      threshold: this.config.threshold,
      maxMatches: 1,
    })

    return {
      isPlagiarized: result.score >= (this.config.threshold || 0.8),
      score: result.score,
    }
  }

  /**
   * 获取向量存储实例
   */
  getVectorStore(): VectorStore {
    return this.vectorStore
  }
}
