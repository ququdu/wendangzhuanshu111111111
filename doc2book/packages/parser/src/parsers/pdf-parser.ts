/**
 * PDF 解析器
 * 支持文本提取和 OCR 识别
 */

import pdfParse from 'pdf-parse'
import type { DocumentFormat } from '@doc2book/shared'
import type { IParser, ParserOptions, ParseResult, TextBlock } from '../types'
import { AstBuilder } from '../utils/ast-builder'
import { detectLanguage } from '../utils/language-detect'

/**
 * PDF 解析器类
 */
export class PdfParser implements IParser {
  supportedFormats: DocumentFormat[] = ['pdf']

  /**
   * 解析 PDF 文档
   * @param input PDF 文件的 Buffer
   * @param options 解析选项
   */
  async parse(input: Buffer | string, options?: ParserOptions): Promise<ParseResult> {
    const startTime = Date.now()

    try {
      // 确保输入是 Buffer
      const buffer = typeof input === 'string' ? Buffer.from(input, 'base64') : input

      // 使用 pdf-parse 提取文本
      const pdfData = await pdfParse(buffer, {
        max: options?.maxPages || 0, // 0 表示不限制
      })

      const text = pdfData.text
      const pageCount = pdfData.numpages

      // 计算文本密度（字符数/页数）
      const textDensity = pageCount > 0 ? text.length / pageCount : 0
      const threshold = options?.textDensityThreshold || 100

      // 判断是否需要 OCR
      let method: 'text' | 'ocr' | 'hybrid' = 'text'
      let finalText = text

      if (options?.enableOcr && textDensity < threshold) {
        // 文本密度太低，可能是扫描版 PDF，需要 OCR
        // 注意：这里只是标记，实际 OCR 需要在 ImageParser 中处理
        method = 'ocr'
        // TODO: 实现 PDF 页面转图片 + OCR
        console.warn('PDF 文本密度过低，建议使用 OCR 模式')
      }

      // 检测语言
      let detectedLanguage = 'und'
      if (options?.detectLanguage !== false && text.length > 50) {
        const langResult = detectLanguage(text)
        detectedLanguage = langResult.code
      }

      // 构建 AST
      const builder = new AstBuilder('document.pdf')
      builder.setMetadata({
        title: pdfData.info?.Title || undefined,
        author: pdfData.info?.Author || undefined,
        language: detectedLanguage,
        pageCount,
      })

      // 解析文本内容
      this.parseContent(finalText, builder)

      const ast = builder.build()
      const parseTime = Date.now() - startTime

      return {
        success: true,
        ast,
        metadata: {
          parseTime,
          method,
          textDensity,
          detectedLanguage,
          pageCount,
          wordCount: ast.metadata.wordCount,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '解析 PDF 失败',
        metadata: {
          parseTime: Date.now() - startTime,
          method: 'text',
        },
      }
    }
  }

  /**
   * 解析文本内容，识别结构
   */
  private parseContent(text: string, builder: AstBuilder): void {
    // 按页分割（pdf-parse 用 \n\n 分隔页面）
    const pages = text.split(/\n{3,}/)

    for (const page of pages) {
      const lines = page.split('\n')
      let currentParagraph: string[] = []

      const flushParagraph = () => {
        if (currentParagraph.length > 0) {
          const paragraphText = currentParagraph.join(' ').trim()
          if (paragraphText) {
            builder.addParagraph(paragraphText)
          }
          currentParagraph = []
        }
      }

      for (const line of lines) {
        const trimmedLine = line.trim()

        // 空行：结束当前段落
        if (!trimmedLine) {
          flushParagraph()
          continue
        }

        // 检测可能的标题（短行、全大写、或以数字开头）
        if (this.isLikelyHeading(trimmedLine, lines)) {
          flushParagraph()
          const level = this.detectHeadingLevel(trimmedLine)
          builder.addHeading(trimmedLine, level)
          continue
        }

        // 检测列表项
        if (this.isListItem(trimmedLine)) {
          flushParagraph()
          const listText = trimmedLine.replace(/^[-*•●○]\s*/, '').replace(/^\d+[.)]\s*/, '')
          builder.addList([listText], /^\d+[.)]/.test(trimmedLine))
          continue
        }

        // 普通文本
        currentParagraph.push(trimmedLine)
      }

      flushParagraph()
    }
  }

  /**
   * 判断是否可能是标题
   */
  private isLikelyHeading(line: string, allLines: string[]): boolean {
    // 太长不太可能是标题
    if (line.length > 100) return false

    // 全大写（英文）
    if (/^[A-Z\s\d]+$/.test(line) && line.length > 3) return true

    // 以章节编号开头
    if (/^(第[一二三四五六七八九十百千]+[章节篇部]|Chapter\s+\d+|CHAPTER\s+\d+|\d+\.\s)/i.test(line)) {
      return true
    }

    // 短行且后面跟着较长的段落
    const lineIndex = allLines.indexOf(line)
    if (line.length < 50 && lineIndex < allLines.length - 1) {
      const nextLine = allLines[lineIndex + 1]?.trim()
      if (nextLine && nextLine.length > line.length * 2) {
        return true
      }
    }

    return false
  }

  /**
   * 检测标题级别
   */
  private detectHeadingLevel(line: string): number {
    // 第X章 -> 1级
    if (/^第[一二三四五六七八九十百千]+章/.test(line)) return 1
    // 第X节 -> 2级
    if (/^第[一二三四五六七八九十百千]+节/.test(line)) return 2
    // Chapter X -> 1级
    if (/^(Chapter|CHAPTER)\s+\d+/i.test(line)) return 1
    // X.Y.Z 格式
    const dotMatch = line.match(/^(\d+\.)+/)
    if (dotMatch) {
      const dots = (dotMatch[0].match(/\./g) || []).length
      return Math.min(dots + 1, 6)
    }
    // 默认 2 级
    return 2
  }

  /**
   * 判断是否是列表项
   */
  private isListItem(line: string): boolean {
    return /^[-*•●○]\s/.test(line) || /^\d+[.)]\s/.test(line)
  }
}
