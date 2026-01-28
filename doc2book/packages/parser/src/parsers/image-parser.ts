/**
 * 图片解析器
 * 使用 Tesseract.js 进行 OCR 识别
 */

import Tesseract from 'tesseract.js'
import type { DocumentFormat } from '@doc2book/shared'
import type { IParser, ParserOptions, ParseResult } from '../types'
import { AstBuilder } from '../utils/ast-builder'
import { detectLanguage } from '../utils/language-detect'

/**
 * 图片解析器类
 */
export class ImageParser implements IParser {
  supportedFormats: DocumentFormat[] = ['image']

  // Tesseract worker 实例
  private worker: Tesseract.Worker | null = null

  /**
   * 解析图片（OCR）
   * @param input 图片数据（Buffer 或 base64 字符串）
   * @param options 解析选项
   */
  async parse(input: Buffer | string, options?: ParserOptions): Promise<ParseResult> {
    const startTime = Date.now()

    try {
      // 确定 OCR 语言
      const ocrLanguage = options?.ocrLanguage || 'chi_sim+eng'

      // 初始化 worker
      if (!this.worker) {
        this.worker = await Tesseract.createWorker(ocrLanguage)
      }

      // 准备图片数据
      let imageData: string | Buffer
      if (typeof input === 'string') {
        // 如果是 base64 字符串
        if (input.startsWith('data:')) {
          imageData = input
        } else {
          imageData = `data:image/png;base64,${input}`
        }
      } else {
        imageData = input
      }

      // 执行 OCR
      const result = await this.worker.recognize(imageData)
      const text = result.data.text

      // 检测语言
      let detectedLanguage = 'und'
      if (options?.detectLanguage !== false && text.length > 50) {
        const langResult = detectLanguage(text)
        detectedLanguage = langResult.code
      }

      // 构建 AST
      const builder = new AstBuilder('image.png')
      builder.setMetadata({
        language: detectedLanguage,
      })

      // 解析 OCR 结果
      this.parseOcrResult(result.data, builder)

      const ast = builder.build()
      const parseTime = Date.now() - startTime

      return {
        success: true,
        ast,
        metadata: {
          parseTime,
          method: 'ocr',
          detectedLanguage,
          wordCount: ast.metadata.wordCount,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OCR 识别失败',
        metadata: {
          parseTime: Date.now() - startTime,
          method: 'ocr',
        },
      }
    }
  }

  /**
   * 解析 OCR 结果
   */
  private parseOcrResult(data: Tesseract.Page, builder: AstBuilder): void {
    // 按段落分组
    const paragraphs: string[] = []
    let currentParagraph: string[] = []

    for (const block of data.blocks || []) {
      for (const paragraph of block.paragraphs || []) {
        const lines: string[] = []
        for (const line of paragraph.lines || []) {
          const lineText = line.words?.map((w) => w.text).join(' ') || ''
          if (lineText.trim()) {
            lines.push(lineText.trim())
          }
        }

        if (lines.length > 0) {
          // 检查是否是新段落
          const paragraphText = lines.join(' ')
          if (paragraphText.trim()) {
            paragraphs.push(paragraphText)
          }
        }
      }
    }

    // 如果没有段落结构，使用纯文本
    if (paragraphs.length === 0 && data.text) {
      const textParagraphs = data.text.split(/\n{2,}/)
      for (const p of textParagraphs) {
        const trimmed = p.trim()
        if (trimmed) {
          paragraphs.push(trimmed)
        }
      }
    }

    // 添加到 AST
    for (const paragraph of paragraphs) {
      // 检测是否是标题
      if (this.isLikelyHeading(paragraph)) {
        builder.addHeading(paragraph, 2)
      } else {
        builder.addParagraph(paragraph)
      }
    }
  }

  /**
   * 判断是否可能是标题
   */
  private isLikelyHeading(text: string): boolean {
    // 太长不太可能是标题
    if (text.length > 100) return false

    // 全大写（英文）
    if (/^[A-Z\s\d]+$/.test(text) && text.length > 3 && text.length < 80) return true

    // 以章节编号开头
    if (/^(第[一二三四五六七八九十百千]+[章节篇部]|Chapter\s+\d+|CHAPTER\s+\d+|\d+\.\s)/i.test(text)) {
      return true
    }

    return false
  }

  /**
   * 终止 worker
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate()
      this.worker = null
    }
  }
}
