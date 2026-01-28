/**
 * 统一书籍生成器
 * 整合所有生成功能
 */

import type { BookStructure } from '@doc2book/shared'
import type { GeneratorOptions, GeneratorResult, ValidationResult } from './types'
import { EpubGenerator } from './epub-generator'
import { PdfGenerator } from './pdf-generator'
import { TocGenerator } from './toc-generator'
import { CoverGenerator } from './cover-generator'
import { KdpValidator } from './kdp-validator'
import * as path from 'path'

/**
 * 书籍生成器类
 */
export class BookGenerator {
  private epubGenerator: EpubGenerator
  private pdfGenerator: PdfGenerator
  private tocGenerator: TocGenerator
  private coverGenerator: CoverGenerator
  private kdpValidator: KdpValidator

  constructor() {
    this.epubGenerator = new EpubGenerator()
    this.pdfGenerator = new PdfGenerator()
    this.tocGenerator = new TocGenerator()
    this.coverGenerator = new CoverGenerator()
    this.kdpValidator = new KdpValidator()
  }

  /**
   * 生成书籍
   */
  async generate(
    book: BookStructure,
    options: GeneratorOptions
  ): Promise<GeneratorResult> {
    const startTime = Date.now()
    const files: GeneratorResult['files'] = []
    let validation: ValidationResult | undefined

    try {
      // 确保输出目录存在
      const fs = await import('fs/promises')
      await fs.mkdir(options.outputDir, { recursive: true })

      // 生成目录（如果没有）
      if (!book.frontMatter.tableOfContents || book.frontMatter.tableOfContents.length === 0) {
        book.frontMatter.tableOfContents = this.tocGenerator.generate(book)
      }

      // KDP 验证
      if (options.validateKdp) {
        validation = this.kdpValidator.validate(book)
        if (!validation.valid) {
          console.warn('KDP 验证发现问题:', validation.errors)
        }
      }

      // 生成 EPUB
      if (options.format === 'epub' || options.format === 'both') {
        const epubPath = path.join(options.outputDir, `${options.filename}.epub`)
        const epubResult = await this.epubGenerator.generate(book, epubPath)

        if (epubResult.success) {
          files.push({
            format: 'epub',
            path: epubPath,
            size: epubResult.size || 0,
          })
        } else {
          throw new Error(`EPUB 生成失败: ${epubResult.error}`)
        }
      }

      // 生成 PDF
      if (options.format === 'pdf' || options.format === 'both') {
        const pdfPath = path.join(options.outputDir, `${options.filename}.pdf`)
        const pdfResult = await this.pdfGenerator.generate(book, pdfPath)

        if (pdfResult.success) {
          files.push({
            format: 'pdf',
            path: pdfPath,
            size: pdfResult.size || 0,
          })
        } else {
          throw new Error(`PDF 生成失败: ${pdfResult.error}`)
        }
      }

      return {
        success: true,
        files,
        validation,
        generationTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '生成失败',
        files,
        validation,
        generationTime: Date.now() - startTime,
      }
    }
  }

  /**
   * 生成封面
   */
  async generateCover(
    book: BookStructure,
    outputPath: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.coverGenerator.generate(
      {
        title: book.metadata.title,
        subtitle: book.metadata.subtitle,
        author: book.metadata.author,
      },
      outputPath
    )
  }

  /**
   * 验证书籍
   */
  validate(book: BookStructure): ValidationResult {
    return this.kdpValidator.validate(book)
  }

  /**
   * 验证 EPUB 文件
   */
  async validateEpub(epubPath: string): Promise<ValidationResult> {
    return this.kdpValidator.validateEpub(epubPath)
  }

  /**
   * 获取 EPUB 生成器
   */
  getEpubGenerator(): EpubGenerator {
    return this.epubGenerator
  }

  /**
   * 获取 PDF 生成器
   */
  getPdfGenerator(): PdfGenerator {
    return this.pdfGenerator
  }

  /**
   * 获取目录生成器
   */
  getTocGenerator(): TocGenerator {
    return this.tocGenerator
  }

  /**
   * 获取封面生成器
   */
  getCoverGenerator(): CoverGenerator {
    return this.coverGenerator
  }

  /**
   * 获取 KDP 验证器
   */
  getKdpValidator(): KdpValidator {
    return this.kdpValidator
  }
}

/**
 * 创建书籍生成器实例
 */
export function createBookGenerator(): BookGenerator {
  return new BookGenerator()
}
