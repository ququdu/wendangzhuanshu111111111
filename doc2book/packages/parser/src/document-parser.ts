/**
 * 统一文档解析器
 * 根据文件格式自动选择合适的解析器
 */

import type { DocumentFormat, UnifiedAST } from '@doc2book/shared'
import type { ParserOptions, ParseResult, IParser } from './types'
import { PdfParser } from './parsers/pdf-parser'
import { DocxParser } from './parsers/docx-parser'
import { MarkdownParser } from './parsers/markdown-parser'
import { HtmlParser } from './parsers/html-parser'
import { TxtParser } from './parsers/txt-parser'
import { ImageParser } from './parsers/image-parser'

/**
 * 文件扩展名到格式的映射
 */
const EXTENSION_MAP: Record<string, DocumentFormat> = {
  pdf: 'pdf',
  docx: 'docx',
  doc: 'doc',
  md: 'md',
  markdown: 'markdown',
  html: 'html',
  htm: 'html',
  txt: 'txt',
  text: 'txt',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  bmp: 'image',
  tiff: 'image',
  tif: 'image',
}

/**
 * MIME 类型到格式的映射
 */
const MIME_MAP: Record<string, DocumentFormat> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'text/markdown': 'md',
  'text/x-markdown': 'markdown',
  'text/html': 'html',
  'application/xhtml+xml': 'html',
  'text/plain': 'txt',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/bmp': 'image',
  'image/tiff': 'image',
}

/**
 * 统一文档解析器类
 */
export class DocumentParser {
  private parsers: Map<DocumentFormat, IParser> = new Map()
  private imageParser: ImageParser

  constructor() {
    // 初始化所有解析器
    this.parsers.set('pdf', new PdfParser())
    this.parsers.set('docx', new DocxParser())
    this.parsers.set('doc', new DocxParser()) // doc 也用 docx 解析器
    this.parsers.set('md', new MarkdownParser())
    this.parsers.set('markdown', new MarkdownParser())
    this.parsers.set('html', new HtmlParser())
    this.parsers.set('txt', new TxtParser())

    // 图片解析器单独保存，因为需要管理 worker
    this.imageParser = new ImageParser()
    this.parsers.set('image', this.imageParser)
  }

  /**
   * 解析文档
   * @param input 文档内容（Buffer 或字符串）
   * @param options 解析选项
   */
  async parse(
    input: Buffer | string,
    options?: ParserOptions & {
      /** 文件名（用于检测格式） */
      filename?: string
      /** MIME 类型（用于检测格式） */
      mimeType?: string
      /** 强制指定格式 */
      format?: DocumentFormat
    }
  ): Promise<ParseResult> {
    // 检测文档格式
    const format = options?.format || this.detectFormat(options?.filename, options?.mimeType)

    if (!format) {
      return {
        success: false,
        error: '无法检测文档格式，请指定 format 参数',
        metadata: {
          parseTime: 0,
          method: 'text',
        },
      }
    }

    // 获取对应的解析器
    const parser = this.parsers.get(format)

    if (!parser) {
      return {
        success: false,
        error: `不支持的文档格式: ${format}`,
        metadata: {
          parseTime: 0,
          method: 'text',
        },
      }
    }

    // 执行解析
    const result = await parser.parse(input, options)

    // 更新文件名
    if (result.success && result.ast && options?.filename) {
      result.ast.sourceFile = options.filename
      result.ast.metadata.filename = options.filename
    }

    return result
  }

  /**
   * 批量解析文档
   * @param documents 文档列表
   * @param options 解析选项
   */
  async parseMultiple(
    documents: Array<{
      input: Buffer | string
      filename?: string
      mimeType?: string
      format?: DocumentFormat
    }>,
    options?: ParserOptions
  ): Promise<ParseResult[]> {
    const results: ParseResult[] = []

    for (const doc of documents) {
      const result = await this.parse(doc.input, {
        ...options,
        filename: doc.filename,
        mimeType: doc.mimeType,
        format: doc.format,
      })
      results.push(result)
    }

    return results
  }

  /**
   * 合并多个 AST
   * @param asts AST 列表
   * @param title 合并后的标题
   */
  mergeAsts(asts: UnifiedAST[], title?: string): UnifiedAST {
    if (asts.length === 0) {
      throw new Error('没有可合并的 AST')
    }

    if (asts.length === 1) {
      return asts[0]
    }

    // 使用第一个 AST 作为基础
    const merged: UnifiedAST = {
      ...asts[0],
      id: `merged_${Date.now()}`,
      sourceFile: title || 'merged_document',
      content: [],
      references: [],
      assets: [],
    }

    // 合并所有内容
    for (const ast of asts) {
      // 添加来源标记
      merged.content.push({
        type: 'heading',
        level: 1,
        text: ast.metadata.title || ast.sourceFile,
        sourceLocation: {
          file: ast.sourceFile,
        },
      })

      // 添加内容
      merged.content.push(...ast.content)

      // 合并引用
      merged.references.push(...ast.references)

      // 合并资源
      merged.assets.push(...ast.assets)
    }

    // 更新元数据
    merged.metadata = {
      ...merged.metadata,
      title: title || '合并文档',
      filename: 'merged_document',
      wordCount: asts.reduce((sum, ast) => sum + (ast.metadata.wordCount || 0), 0),
    }

    return merged
  }

  /**
   * 检测文档格式
   */
  private detectFormat(filename?: string, mimeType?: string): DocumentFormat | null {
    // 优先使用 MIME 类型
    if (mimeType && MIME_MAP[mimeType]) {
      return MIME_MAP[mimeType]
    }

    // 使用文件扩展名
    if (filename) {
      const ext = filename.toLowerCase().split('.').pop()
      if (ext && EXTENSION_MAP[ext]) {
        return EXTENSION_MAP[ext]
      }
    }

    return null
  }

  /**
   * 获取支持的格式列表
   */
  getSupportedFormats(): DocumentFormat[] {
    return Array.from(this.parsers.keys())
  }

  /**
   * 检查是否支持指定格式
   */
  isFormatSupported(format: DocumentFormat): boolean {
    return this.parsers.has(format)
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    await this.imageParser.terminate()
  }
}

/**
 * 创建文档解析器实例
 */
export function createDocumentParser(): DocumentParser {
  return new DocumentParser()
}
