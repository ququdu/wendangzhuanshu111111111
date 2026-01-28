/**
 * KDP 验证器
 * 验证生成的电子书是否符合亚马逊 KDP 标准
 */

import type { BookStructure } from '@doc2book/shared'
import type { ValidationResult, ValidationError, ValidationWarning } from './types'

/**
 * KDP 规范要求
 */
const KDP_REQUIREMENTS = {
  // 封面要求
  cover: {
    minWidth: 625,
    maxWidth: 10000,
    minHeight: 1000,
    maxHeight: 10000,
    aspectRatioMin: 1.6,
    aspectRatioMax: 1.6,
    maxFileSize: 50 * 1024 * 1024, // 50MB
  },
  // 内容要求
  content: {
    minWordCount: 2500,
    maxFileSize: 650 * 1024 * 1024, // 650MB
  },
  // 元数据要求
  metadata: {
    titleMaxLength: 200,
    subtitleMaxLength: 200,
    descriptionMinLength: 150,
    descriptionMaxLength: 4000,
    keywordsMax: 7,
  },
}

/**
 * KDP 验证器类
 */
export class KdpValidator {
  /**
   * 验证书籍结构
   */
  validate(book: BookStructure): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // 验证元数据
    this.validateMetadata(book, errors, warnings)

    // 验证内容
    this.validateContent(book, errors, warnings)

    // 验证结构
    this.validateStructure(book, errors, warnings)

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * 验证 EPUB 文件
   */
  async validateEpub(
    epubPath: string
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    try {
      const fs = await import('fs/promises')
      const stats = await fs.stat(epubPath)

      // 检查文件大小
      if (stats.size > KDP_REQUIREMENTS.content.maxFileSize) {
        errors.push({
          code: 'FILE_TOO_LARGE',
          message: `EPUB 文件大小 (${Math.round(stats.size / 1024 / 1024)}MB) 超过 KDP 限制 (650MB)`,
          suggestion: '压缩图片或减少内容',
        })
      }

      // TODO: 解压 EPUB 并验证内部结构
      // - 检查 mimetype 文件
      // - 验证 container.xml
      // - 验证 content.opf
      // - 检查所有引用的资源是否存在

    } catch (error) {
      errors.push({
        code: 'FILE_READ_ERROR',
        message: error instanceof Error ? error.message : '无法读取 EPUB 文件',
      })
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * 验证封面图片
   */
  async validateCover(
    coverPath: string
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    try {
      const fs = await import('fs/promises')
      const stats = await fs.stat(coverPath)

      // 检查文件大小
      if (stats.size > KDP_REQUIREMENTS.cover.maxFileSize) {
        errors.push({
          code: 'COVER_TOO_LARGE',
          message: `封面文件大小 (${Math.round(stats.size / 1024 / 1024)}MB) 超过限制 (50MB)`,
          suggestion: '压缩封面图片',
        })
      }

      // TODO: 使用图像处理库检查尺寸
      // - 检查宽度和高度
      // - 检查宽高比
      // - 检查颜色模式（应为 RGB）

    } catch (error) {
      errors.push({
        code: 'COVER_READ_ERROR',
        message: error instanceof Error ? error.message : '无法读取封面文件',
      })
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * 验证元数据
   */
  private validateMetadata(
    book: BookStructure,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const { metadata } = book

    // 标题
    if (!metadata.title || metadata.title.trim().length === 0) {
      errors.push({
        code: 'MISSING_TITLE',
        message: '缺少书籍标题',
        location: 'metadata.title',
      })
    } else if (metadata.title.length > KDP_REQUIREMENTS.metadata.titleMaxLength) {
      errors.push({
        code: 'TITLE_TOO_LONG',
        message: `标题长度 (${metadata.title.length}) 超过限制 (${KDP_REQUIREMENTS.metadata.titleMaxLength})`,
        location: 'metadata.title',
        suggestion: '缩短标题',
      })
    }

    // 作者
    if (!metadata.author || metadata.author.trim().length === 0) {
      errors.push({
        code: 'MISSING_AUTHOR',
        message: '缺少作者信息',
        location: 'metadata.author',
      })
    }

    // 描述
    if (!metadata.description || metadata.description.trim().length === 0) {
      warnings.push({
        code: 'MISSING_DESCRIPTION',
        message: '缺少书籍描述',
        location: 'metadata.description',
        suggestion: '添加书籍描述以提高可发现性',
      })
    } else {
      if (metadata.description.length < KDP_REQUIREMENTS.metadata.descriptionMinLength) {
        warnings.push({
          code: 'DESCRIPTION_TOO_SHORT',
          message: `描述长度 (${metadata.description.length}) 低于建议值 (${KDP_REQUIREMENTS.metadata.descriptionMinLength})`,
          location: 'metadata.description',
          suggestion: '扩展书籍描述',
        })
      }
      if (metadata.description.length > KDP_REQUIREMENTS.metadata.descriptionMaxLength) {
        errors.push({
          code: 'DESCRIPTION_TOO_LONG',
          message: `描述长度 (${metadata.description.length}) 超过限制 (${KDP_REQUIREMENTS.metadata.descriptionMaxLength})`,
          location: 'metadata.description',
          suggestion: '缩短书籍描述',
        })
      }
    }

    // 语言
    if (!metadata.language) {
      errors.push({
        code: 'MISSING_LANGUAGE',
        message: '缺少语言设置',
        location: 'metadata.language',
      })
    }

    // 关键词
    if (metadata.keywords && metadata.keywords.length > KDP_REQUIREMENTS.metadata.keywordsMax) {
      warnings.push({
        code: 'TOO_MANY_KEYWORDS',
        message: `关键词数量 (${metadata.keywords.length}) 超过建议值 (${KDP_REQUIREMENTS.metadata.keywordsMax})`,
        location: 'metadata.keywords',
        suggestion: '减少关键词数量',
      })
    }

    // 版权
    if (!metadata.copyright) {
      warnings.push({
        code: 'MISSING_COPYRIGHT',
        message: '缺少版权信息',
        location: 'metadata.copyright',
        suggestion: '添加版权声明',
      })
    }
  }

  /**
   * 验证内容
   */
  private validateContent(
    book: BookStructure,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // 计算总字数
    let totalWordCount = 0

    for (const chapter of book.body.chapters) {
      totalWordCount += chapter.wordCount || 0
      if (chapter.children) {
        for (const subChapter of chapter.children) {
          totalWordCount += subChapter.wordCount || 0
        }
      }
    }

    // 检查最小字数
    if (totalWordCount < KDP_REQUIREMENTS.content.minWordCount) {
      warnings.push({
        code: 'LOW_WORD_COUNT',
        message: `总字数 (${totalWordCount}) 低于建议值 (${KDP_REQUIREMENTS.content.minWordCount})`,
        suggestion: '增加内容以提高书籍质量',
      })
    }

    // 检查空章节
    for (const chapter of book.body.chapters) {
      if (!chapter.content || chapter.content.length === 0) {
        warnings.push({
          code: 'EMPTY_CHAPTER',
          message: `章节 "${chapter.title}" 没有内容`,
          location: `chapter.${chapter.id}`,
          suggestion: '添加章节内容或删除空章节',
        })
      }
    }
  }

  /**
   * 验证结构
   */
  private validateStructure(
    book: BookStructure,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // 检查是否有章节
    if (!book.body.chapters || book.body.chapters.length === 0) {
      errors.push({
        code: 'NO_CHAPTERS',
        message: '书籍没有章节',
        location: 'body.chapters',
      })
    }

    // 检查目录
    if (!book.frontMatter.tableOfContents || book.frontMatter.tableOfContents.length === 0) {
      warnings.push({
        code: 'NO_TOC',
        message: '缺少目录',
        location: 'frontMatter.tableOfContents',
        suggestion: '生成目录以改善导航体验',
      })
    }

    // 检查章节标题
    const titles = new Set<string>()
    for (const chapter of book.body.chapters) {
      if (titles.has(chapter.title)) {
        warnings.push({
          code: 'DUPLICATE_TITLE',
          message: `重复的章节标题: "${chapter.title}"`,
          location: `chapter.${chapter.id}`,
          suggestion: '使用唯一的章节标题',
        })
      }
      titles.add(chapter.title)
    }
  }

  /**
   * 获取 KDP 要求
   */
  getRequirements(): typeof KDP_REQUIREMENTS {
    return KDP_REQUIREMENTS
  }
}
