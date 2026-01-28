/**
 * 目录生成器
 * 从书籍结构生成目录
 */

import type { BookStructure, TOCEntry, Chapter } from '@doc2book/shared'
import type { TocItem } from './types'

/**
 * 目录生成器配置
 */
export interface TocGeneratorConfig {
  /** 最大深度 */
  maxDepth?: number
  /** 是否包含页码 */
  includePageNumbers?: boolean
  /** 是否包含前言 */
  includeFrontMatter?: boolean
  /** 是否包含附录 */
  includeBackMatter?: boolean
}

/**
 * 目录生成器类
 */
export class TocGenerator {
  private config: TocGeneratorConfig

  constructor(config?: TocGeneratorConfig) {
    this.config = {
      maxDepth: 3,
      includePageNumbers: true,
      includeFrontMatter: true,
      includeBackMatter: true,
      ...config,
    }
  }

  /**
   * 生成目录
   */
  generate(book: BookStructure): TOCEntry[] {
    const toc: TOCEntry[] = []
    let currentPage = 1

    // 前言部分
    if (this.config.includeFrontMatter) {
      if (book.frontMatter.preface) {
        toc.push(this.chapterToTocEntry(book.frontMatter.preface, currentPage++))
      }
      if (book.frontMatter.foreword) {
        toc.push(this.chapterToTocEntry(book.frontMatter.foreword, currentPage++))
      }
    }

    // 正文章节
    if (book.body.introduction) {
      toc.push(this.chapterToTocEntry(book.body.introduction, currentPage++))
    }

    for (const chapter of book.body.chapters) {
      const entry = this.chapterToTocEntry(chapter, currentPage++)

      // 子章节
      if (chapter.children && this.config.maxDepth! > 1) {
        entry.children = []
        for (const subChapter of chapter.children) {
          const subEntry = this.chapterToTocEntry(subChapter, currentPage++)
          subEntry.level = 2

          // 三级章节
          if (subChapter.children && this.config.maxDepth! > 2) {
            subEntry.children = []
            for (const subSubChapter of subChapter.children) {
              const subSubEntry = this.chapterToTocEntry(subSubChapter, currentPage++)
              subSubEntry.level = 3
              subEntry.children.push(subSubEntry)
            }
          }

          entry.children.push(subEntry)
        }
      }

      toc.push(entry)
    }

    // 附录部分
    if (this.config.includeBackMatter) {
      for (const appendix of book.backMatter.appendices) {
        toc.push(this.chapterToTocEntry(appendix, currentPage++))
      }
    }

    return toc
  }

  /**
   * 生成扁平化目录（用于 EPUB nav）
   */
  generateFlat(book: BookStructure): TocItem[] {
    const toc = this.generate(book)
    return this.flattenToc(toc)
  }

  /**
   * 将章节转换为目录项
   */
  private chapterToTocEntry(chapter: Chapter, page?: number): TOCEntry {
    return {
      id: chapter.id,
      title: chapter.title,
      level: chapter.level,
      page: this.config.includePageNumbers ? page : undefined,
    }
  }

  /**
   * 扁平化目录
   */
  private flattenToc(entries: TOCEntry[]): TocItem[] {
    const result: TocItem[] = []

    for (const entry of entries) {
      result.push({
        title: entry.title,
        href: `#${entry.id}`,
        level: entry.level,
      })

      if (entry.children) {
        const children = this.flattenToc(entry.children)
        result.push(...children)
      }
    }

    return result
  }

  /**
   * 计算目录深度
   */
  calculateDepth(entries: TOCEntry[]): number {
    let maxDepth = 0

    for (const entry of entries) {
      maxDepth = Math.max(maxDepth, entry.level)
      if (entry.children) {
        maxDepth = Math.max(maxDepth, this.calculateDepth(entry.children))
      }
    }

    return maxDepth
  }

  /**
   * 获取目录项数量
   */
  countEntries(entries: TOCEntry[]): number {
    let count = entries.length

    for (const entry of entries) {
      if (entry.children) {
        count += this.countEntries(entry.children)
      }
    }

    return count
  }
}
