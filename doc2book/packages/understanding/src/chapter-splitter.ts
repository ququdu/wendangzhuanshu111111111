/**
 * 章节分割器
 * 智能分割文档为章节
 */

import { v4 as uuidv4 } from 'uuid'
import type { UnifiedAST, ContentNode, Chapter } from '@doc2book/shared'
import type { ProviderManager } from '@doc2book/providers'
import type { ChapterSplitResult, ChapterSplitOptions } from './types'

/**
 * 章节分割器类
 */
export class ChapterSplitter {
  private providerManager: ProviderManager

  constructor(providerManager: ProviderManager) {
    this.providerManager = providerManager
  }

  /**
   * 分割文档为章节
   */
  async split(ast: UnifiedAST, options?: ChapterSplitOptions): Promise<ChapterSplitResult> {
    const startTime = Date.now()

    try {
      // 首先使用规则分割
      let chapters = this.splitByRules(ast.content, options)

      // 如果启用 AI 辅助，进一步优化
      if (options?.useAI) {
        chapters = await this.optimizeWithAI(ast.content, chapters, options)
      }

      // 生成建议的书籍结构
      const suggestedStructure = this.generateSuggestedStructure(chapters)

      return {
        success: true,
        chapters,
        suggestedStructure,
        splitTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '章节分割失败',
        splitTime: Date.now() - startTime,
      }
    }
  }

  /**
   * 基于规则分割章节
   */
  private splitByRules(nodes: ContentNode[], options?: ChapterSplitOptions): Chapter[] {
    const chapters: Chapter[] = []
    let currentChapter: Chapter | null = null
    let currentContent: ContentNode[] = []

    const minLength = options?.minChapterLength || 500
    const maxLength = options?.maxChapterLength || 50000

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]

      // 检测章节边界
      if (this.isChapterBoundary(node)) {
        // 保存当前章节
        if (currentChapter && currentContent.length > 0) {
          currentChapter.content = currentContent
          currentChapter.wordCount = this.countWords(currentContent)
          chapters.push(currentChapter)
        }

        // 开始新章节
        currentChapter = {
          id: uuidv4(),
          title: node.text || `第 ${chapters.length + 1} 章`,
          level: 1,
          content: [],
          wordCount: 0,
          status: 'draft',
        }
        currentContent = []
      } else {
        currentContent.push(node)
      }
    }

    // 保存最后一个章节
    if (currentChapter && currentContent.length > 0) {
      currentChapter.content = currentContent
      currentChapter.wordCount = this.countWords(currentContent)
      chapters.push(currentChapter)
    }

    // 如果没有检测到章节，将整个文档作为一个章节
    if (chapters.length === 0 && nodes.length > 0) {
      chapters.push({
        id: uuidv4(),
        title: '正文',
        level: 1,
        content: nodes,
        wordCount: this.countWords(nodes),
        status: 'draft',
      })
    }

    // 处理过长或过短的章节
    return this.balanceChapters(chapters, minLength, maxLength)
  }

  /**
   * 判断是否是章节边界
   */
  private isChapterBoundary(node: ContentNode): boolean {
    if (node.type !== 'heading') return false
    if (node.level !== 1) return false

    const text = node.text || ''

    // 检测常见的章节标题模式
    const patterns = [
      /^第[一二三四五六七八九十百千]+章/,
      /^第\d+章/,
      /^Chapter\s+\d+/i,
      /^CHAPTER\s+\d+/,
      /^Part\s+\d+/i,
      /^PART\s+\d+/,
      /^\d+\.\s+/,
    ]

    return patterns.some((pattern) => pattern.test(text))
  }

  /**
   * 平衡章节长度
   */
  private balanceChapters(
    chapters: Chapter[],
    minLength: number,
    maxLength: number
  ): Chapter[] {
    const balanced: Chapter[] = []

    for (const chapter of chapters) {
      if (chapter.wordCount < minLength && balanced.length > 0) {
        // 合并到上一章
        const lastChapter = balanced[balanced.length - 1]
        lastChapter.content.push(...chapter.content)
        lastChapter.wordCount += chapter.wordCount
      } else if (chapter.wordCount > maxLength) {
        // 拆分章节
        const splitChapters = this.splitLongChapter(chapter, maxLength)
        balanced.push(...splitChapters)
      } else {
        balanced.push(chapter)
      }
    }

    return balanced
  }

  /**
   * 拆分过长的章节
   */
  private splitLongChapter(chapter: Chapter, maxLength: number): Chapter[] {
    const result: Chapter[] = []
    let currentContent: ContentNode[] = []
    let currentWordCount = 0
    let partIndex = 1

    for (const node of chapter.content) {
      const nodeWordCount = this.countWords([node])

      if (currentWordCount + nodeWordCount > maxLength && currentContent.length > 0) {
        // 创建新章节
        result.push({
          id: uuidv4(),
          title: `${chapter.title}（${partIndex}）`,
          level: chapter.level,
          content: currentContent,
          wordCount: currentWordCount,
          status: 'draft',
        })

        currentContent = []
        currentWordCount = 0
        partIndex++
      }

      currentContent.push(node)
      currentWordCount += nodeWordCount
    }

    // 添加最后一部分
    if (currentContent.length > 0) {
      result.push({
        id: uuidv4(),
        title: partIndex > 1 ? `${chapter.title}（${partIndex}）` : chapter.title,
        level: chapter.level,
        content: currentContent,
        wordCount: currentWordCount,
        status: 'draft',
      })
    }

    return result
  }

  /**
   * 使用 AI 优化章节分割
   */
  private async optimizeWithAI(
    nodes: ContentNode[],
    chapters: Chapter[],
    options: ChapterSplitOptions
  ): Promise<Chapter[]> {
    // 提取章节标题用于 AI 分析
    const chapterTitles = chapters.map((c, i) => ({
      index: i,
      title: c.title,
      wordCount: c.wordCount,
    }))

    const prompt = `请分析以下章节结构，并提供优化建议：

当前章节：
${JSON.stringify(chapterTitles, null, 2)}

请以 JSON 格式返回优化建议：
{
  "suggestions": [
    {
      "index": 0,
      "suggestedTitle": "建议的标题",
      "shouldMergeWith": null 或 下一章索引,
      "shouldSplit": false
    }
  ]
}

只返回 JSON，不要其他内容。`

    const response = await this.providerManager.complete(
      [{ role: 'user', content: prompt }],
      {
        providerId: options.providerId,
        temperature: 0.2,
        maxTokens: 1000,
      }
    )

    if (!response.success || !response.content) {
      return chapters
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return chapters

      const data = JSON.parse(jsonMatch[0])
      if (!data.suggestions || !Array.isArray(data.suggestions)) return chapters

      // 应用建议
      return chapters.map((chapter, index) => {
        const suggestion = data.suggestions.find((s: any) => s.index === index)
        if (suggestion?.suggestedTitle) {
          return {
            ...chapter,
            title: suggestion.suggestedTitle,
          }
        }
        return chapter
      })
    } catch {
      return chapters
    }
  }

  /**
   * 生成建议的书籍结构
   */
  private generateSuggestedStructure(chapters: Chapter[]): ChapterSplitResult['suggestedStructure'] {
    const totalWordCount = chapters.reduce((sum, c) => sum + c.wordCount, 0)

    return {
      needsPreface: totalWordCount > 10000,
      needsIntroduction: chapters.length > 3,
      needsConclusion: chapters.length > 3,
      needsAppendix: false,
      suggestedParts: this.suggestParts(chapters),
    }
  }

  /**
   * 建议部分划分
   */
  private suggestParts(chapters: Chapter[]): Array<{ title: string; chapterIds: string[] }> | undefined {
    if (chapters.length < 6) return undefined

    // 简单地将章节分为几个部分
    const partsCount = Math.ceil(chapters.length / 4)
    const chaptersPerPart = Math.ceil(chapters.length / partsCount)
    const parts: Array<{ title: string; chapterIds: string[] }> = []

    for (let i = 0; i < partsCount; i++) {
      const startIndex = i * chaptersPerPart
      const endIndex = Math.min(startIndex + chaptersPerPart, chapters.length)
      const partChapters = chapters.slice(startIndex, endIndex)

      parts.push({
        title: `第${this.toChineseNumber(i + 1)}部分`,
        chapterIds: partChapters.map((c) => c.id),
      })
    }

    return parts
  }

  /**
   * 计算字数
   */
  private countWords(nodes: ContentNode[]): number {
    let count = 0

    for (const node of nodes) {
      if (node.text) {
        // 中文按字符计数，英文按单词计数
        const chineseChars = (node.text.match(/[\u4e00-\u9fa5]/g) || []).length
        const englishWords = (node.text.match(/[a-zA-Z]+/g) || []).length
        count += chineseChars + englishWords
      }
      if (node.children) {
        count += this.countWords(node.children)
      }
    }

    return count
  }

  /**
   * 数字转中文
   */
  private toChineseNumber(num: number): string {
    const chars = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
    if (num <= 10) return chars[num]
    if (num < 20) return '十' + (num % 10 === 0 ? '' : chars[num % 10])
    return num.toString()
  }
}
