/**
 * 书籍生成模块类型定义
 */

import type { BookStructure, EpubConfig, PdfConfig } from '@doc2book/shared'

/**
 * 生成器选项
 */
export interface GeneratorOptions {
  /** 输出格式 */
  format: 'epub' | 'pdf' | 'both'
  /** 输出目录 */
  outputDir: string
  /** 文件名（不含扩展名） */
  filename: string
  /** EPUB 选项 */
  epub?: EpubOptions
  /** PDF 选项 */
  pdf?: PdfOptions
  /** 是否验证 KDP 兼容性 */
  validateKdp?: boolean
}

/**
 * EPUB 生成选项
 */
export interface EpubOptions extends EpubConfig {
  /** 是否压缩图片 */
  compressImages?: boolean
  /** 图片最大宽度 */
  maxImageWidth?: number
  /** 是否包含 NCX 目录（兼容旧版阅读器） */
  includeNcx?: boolean
  /** CSS 内容 */
  css?: string
}

/**
 * PDF 生成选项
 */
export interface PdfOptions extends PdfConfig {
  /** 是否嵌入字体 */
  embedFonts?: boolean
  /** 字体文件路径 */
  fontPath?: string
  /** 是否添加页码 */
  pageNumbers?: boolean
  /** 页码位置 */
  pageNumberPosition?: 'top' | 'bottom'
  /** 是否添加书签 */
  bookmarks?: boolean
}

/**
 * 封面生成选项
 */
export interface CoverOptions {
  /** 标题 */
  title: string
  /** 副标题 */
  subtitle?: string
  /** 作者 */
  author: string
  /** 背景颜色 */
  backgroundColor?: string
  /** 文字颜色 */
  textColor?: string
  /** 背景图片 */
  backgroundImage?: string
  /** 输出宽度 */
  width?: number
  /** 输出高度 */
  height?: number
  /** 输出格式 */
  format?: 'png' | 'jpeg'
}

/**
 * 生成结果
 */
export interface GeneratorResult {
  success: boolean
  error?: string
  /** 生成的文件路径 */
  files: Array<{
    format: 'epub' | 'pdf'
    path: string
    size: number
  }>
  /** KDP 验证结果 */
  validation?: ValidationResult
  /** 生成耗时（毫秒） */
  generationTime: number
}

/**
 * KDP 验证结果
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

/**
 * 验证错误
 */
export interface ValidationError {
  code: string
  message: string
  location?: string
  suggestion?: string
}

/**
 * 验证警告
 */
export interface ValidationWarning {
  code: string
  message: string
  location?: string
  suggestion?: string
}

/**
 * 章节内容（用于 EPUB 生成）
 */
export interface ChapterContent {
  id: string
  title: string
  content: string
  filename: string
}

/**
 * 目录项（用于生成）
 */
export interface TocItem {
  title: string
  href: string
  level: number
  children?: TocItem[]
}
