/**
 * 解析器本地类型定义
 */

import type { DocumentFormat, UnifiedAST, ContentNode } from '@doc2book/shared'

/**
 * 解析器选项
 */
export interface ParserOptions {
  /** 是否启用 OCR（用于扫描版 PDF 和图片） */
  enableOcr?: boolean
  /** OCR 语言（默认：chi_sim+eng） */
  ocrLanguage?: string
  /** 是否自动检测语言 */
  detectLanguage?: boolean
  /** 最大页数限制（0 表示不限制） */
  maxPages?: number
  /** 是否提取图片 */
  extractImages?: boolean
  /** 是否提取表格 */
  extractTables?: boolean
  /** 文本密度阈值（低于此值启用 OCR） */
  textDensityThreshold?: number
}

/**
 * 解析结果
 */
export interface ParseResult {
  /** 是否成功 */
  success: boolean
  /** 统一 AST */
  ast?: UnifiedAST
  /** 错误信息 */
  error?: string
  /** 解析元数据 */
  metadata?: {
    /** 解析耗时（毫秒） */
    parseTime: number
    /** 使用的解析方法 */
    method: 'text' | 'ocr' | 'hybrid'
    /** 文本密度（字符数/页数） */
    textDensity?: number
    /** 检测到的语言 */
    detectedLanguage?: string
    /** 页数 */
    pageCount?: number
    /** 字数 */
    wordCount?: number
  }
}

/**
 * 基础解析器接口
 */
export interface IParser {
  /** 支持的格式 */
  supportedFormats: DocumentFormat[]
  /** 解析文档 */
  parse(input: Buffer | string, options?: ParserOptions): Promise<ParseResult>
}

/**
 * 章节检测结果
 */
export interface ChapterDetection {
  /** 章节标题 */
  title: string
  /** 章节级别（1-6） */
  level: number
  /** 开始位置 */
  startIndex: number
  /** 结束位置 */
  endIndex: number
  /** 内容节点 */
  content: ContentNode[]
}

/**
 * 文本块
 */
export interface TextBlock {
  /** 文本内容 */
  text: string
  /** 页码 */
  page?: number
  /** 位置信息 */
  position?: {
    x: number
    y: number
    width: number
    height: number
  }
  /** 字体信息 */
  font?: {
    name?: string
    size?: number
    bold?: boolean
    italic?: boolean
  }
}

/**
 * 图片信息
 */
export interface ImageInfo {
  /** 图片 ID */
  id: string
  /** 图片数据（base64） */
  data: string
  /** MIME 类型 */
  mimeType: string
  /** 宽度 */
  width?: number
  /** 高度 */
  height?: number
  /** 页码 */
  page?: number
  /** 图注 */
  caption?: string
}

/**
 * 表格信息
 */
export interface TableInfo {
  /** 表格 ID */
  id: string
  /** 行数据 */
  rows: string[][]
  /** 是否有表头 */
  hasHeader?: boolean
  /** 页码 */
  page?: number
  /** 表格标题 */
  caption?: string
}
