/**
 * @doc2book/generator
 * 书籍生成模块 - 生成符合 KDP 标准的电子书
 *
 * 支持的格式：
 * - EPUB（亚马逊 KDP 兼容）
 * - PDF（打印版）
 */

// 生成器
export { EpubGenerator } from './epub-generator'
export { PdfGenerator } from './pdf-generator'
export { TocGenerator } from './toc-generator'
export { CoverGenerator } from './cover-generator'
export { KdpValidator } from './kdp-validator'

// 统一生成器
export { BookGenerator, createBookGenerator } from './book-generator'

// 类型
export type {
  GeneratorOptions,
  GeneratorResult,
  EpubOptions,
  PdfOptions,
  CoverOptions,
  ValidationResult,
} from './types'
