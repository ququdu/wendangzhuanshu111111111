/**
 * 纯文本解析器
 */

import type { DocumentFormat } from '@doc2book/shared'
import type { IParser, ParserOptions, ParseResult } from '../types'
import { AstBuilder } from '../utils/ast-builder'
import { detectLanguage } from '../utils/language-detect'

/**
 * 纯文本解析器类
 */
export class TxtParser implements IParser {
  supportedFormats: DocumentFormat[] = ['txt']

  /**
   * 解析纯文本文档
   * @param input 文本内容
   * @param options 解析选项
   */
  async parse(input: Buffer | string, options?: ParserOptions): Promise<ParseResult> {
    const startTime = Date.now()

    try {
      // 确保输入是字符串
      const text = typeof input === 'string' ? input : input.toString('utf-8')

      // 检测语言
      let detectedLanguage = 'und'
      if (options?.detectLanguage !== false && text.length > 50) {
        const langResult = detectLanguage(text)
        detectedLanguage = langResult.code
      }

      // 构建 AST
      const builder = new AstBuilder('document.txt')
      builder.setMetadata({
        language: detectedLanguage,
      })

      // 解析文本内容
      this.parseText(text, builder)

      const ast = builder.build()
      const parseTime = Date.now() - startTime

      return {
        success: true,
        ast,
        metadata: {
          parseTime,
          method: 'text',
          detectedLanguage,
          wordCount: ast.metadata.wordCount,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '解析文本失败',
        metadata: {
          parseTime: Date.now() - startTime,
          method: 'text',
        },
      }
    }
  }

  /**
   * 解析文本内容
   */
  private parseText(text: string, builder: AstBuilder): void {
    // 按段落分割（两个或更多换行符）
    const paragraphs = text.split(/\n{2,}/)

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim()
      if (!trimmed) continue

      // 检测是否是标题
      if (this.isLikelyHeading(trimmed)) {
        const level = this.detectHeadingLevel(trimmed)
        builder.addHeading(trimmed, level)
        continue
      }

      // 检测是否是列表
      const listItems = this.extractListItems(trimmed)
      if (listItems) {
        builder.addList(listItems.items, listItems.ordered)
        continue
      }

      // 普通段落
      // 合并单个换行符为空格
      const normalizedText = trimmed.replace(/\n/g, ' ').replace(/\s+/g, ' ')
      builder.addParagraph(normalizedText)
    }
  }

  /**
   * 判断是否可能是标题
   */
  private isLikelyHeading(text: string): boolean {
    // 太长不太可能是标题
    if (text.length > 100) return false

    // 不包含换行符
    if (text.includes('\n')) return false

    // 全大写（英文）
    if (/^[A-Z\s\d]+$/.test(text) && text.length > 3 && text.length < 80) return true

    // 以章节编号开头
    if (/^(第[一二三四五六七八九十百千]+[章节篇部]|Chapter\s+\d+|CHAPTER\s+\d+|\d+\.\s)/i.test(text)) {
      return true
    }

    // 以数字编号开头
    if (/^\d+(\.\d+)*\s+\S/.test(text) && text.length < 80) {
      return true
    }

    return false
  }

  /**
   * 检测标题级别
   */
  private detectHeadingLevel(text: string): number {
    // 第X章 -> 1级
    if (/^第[一二三四五六七八九十百千]+章/.test(text)) return 1
    // 第X节 -> 2级
    if (/^第[一二三四五六七八九十百千]+节/.test(text)) return 2
    // 第X篇 -> 1级
    if (/^第[一二三四五六七八九十百千]+篇/.test(text)) return 1
    // 第X部 -> 1级
    if (/^第[一二三四五六七八九十百千]+部/.test(text)) return 1
    // Chapter X -> 1级
    if (/^(Chapter|CHAPTER)\s+\d+/i.test(text)) return 1
    // X.Y.Z 格式
    const dotMatch = text.match(/^(\d+\.)+/)
    if (dotMatch) {
      const dots = (dotMatch[0].match(/\./g) || []).length
      return Math.min(dots + 1, 6)
    }
    // 纯数字编号
    if (/^\d+\s/.test(text)) return 2
    // 默认 2 级
    return 2
  }

  /**
   * 提取列表项
   */
  private extractListItems(text: string): { items: string[]; ordered: boolean } | null {
    const lines = text.split('\n')

    // 检测无序列表
    const unorderedPattern = /^[-*•●○]\s+(.+)$/
    const unorderedItems: string[] = []
    let isUnordered = true

    for (const line of lines) {
      const match = line.trim().match(unorderedPattern)
      if (match) {
        unorderedItems.push(match[1])
      } else if (line.trim()) {
        isUnordered = false
        break
      }
    }

    if (isUnordered && unorderedItems.length > 0) {
      return { items: unorderedItems, ordered: false }
    }

    // 检测有序列表
    const orderedPattern = /^\d+[.)]\s+(.+)$/
    const orderedItems: string[] = []
    let isOrdered = true

    for (const line of lines) {
      const match = line.trim().match(orderedPattern)
      if (match) {
        orderedItems.push(match[1])
      } else if (line.trim()) {
        isOrdered = false
        break
      }
    }

    if (isOrdered && orderedItems.length > 0) {
      return { items: orderedItems, ordered: true }
    }

    return null
  }
}
