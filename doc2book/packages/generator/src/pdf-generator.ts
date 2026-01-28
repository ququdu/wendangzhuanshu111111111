/**
 * PDF 生成器
 * 生成符合打印标准的 PDF 文件
 */

import PDFDocument from 'pdfkit'
import type { BookStructure, Chapter, ContentNode } from '@doc2book/shared'
import type { PdfOptions } from './types'

/**
 * 页面尺寸配置
 */
const PAGE_SIZES: Record<string, [number, number]> = {
  letter: [612, 792],
  a4: [595.28, 841.89],
  '6x9': [432, 648],
  '5.5x8.5': [396, 612],
}

/**
 * PDF 生成器类
 */
export class PdfGenerator {
  private options: PdfOptions

  constructor(options?: Partial<PdfOptions>) {
    this.options = {
      pageSize: '6x9',
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
      fontSize: 11,
      lineHeight: 1.5,
      fontFamily: 'Helvetica',
      headerFooter: true,
      tocPageNumbers: true,
      pageNumbers: true,
      pageNumberPosition: 'bottom',
      bookmarks: true,
      ...options,
    }
  }

  /**
   * 生成 PDF
   */
  async generate(
    book: BookStructure,
    outputPath: string
  ): Promise<{ success: boolean; error?: string; size?: number }> {
    try {
      const fs = await import('fs')
      const { PassThrough } = await import('stream')

      // 获取页面尺寸
      const pageSize = PAGE_SIZES[this.options.pageSize] || PAGE_SIZES['6x9']

      // 创建 PDF 文档
      const doc = new PDFDocument({
        size: pageSize,
        margins: this.options.margins,
        bufferPages: true,
        info: {
          Title: book.metadata.title,
          Author: book.metadata.author,
          Subject: book.metadata.description,
          Creator: 'Doc2Book',
        },
      })

      // 创建写入流
      const writeStream = fs.createWriteStream(outputPath)
      doc.pipe(writeStream)

      // 生成内容
      await this.generateContent(doc, book)

      // 添加页码
      if (this.options.pageNumbers) {
        this.addPageNumbers(doc)
      }

      // 完成文档
      doc.end()

      // 等待写入完成
      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', resolve)
        writeStream.on('error', reject)
      })

      const stats = fs.statSync(outputPath)

      return {
        success: true,
        size: stats.size,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '生成 PDF 失败',
      }
    }
  }

  /**
   * 生成内容
   */
  private async generateContent(doc: PDFKit.PDFDocument, book: BookStructure): Promise<void> {
    // 标题页
    this.generateTitlePage(doc, book)

    // 版权页
    if (book.frontMatter.copyright) {
      this.generateCopyrightPage(doc, book)
    }

    // 目录
    if (book.frontMatter.tableOfContents.length > 0) {
      this.generateTableOfContents(doc, book)
    }

    // 前言
    if (book.frontMatter.preface) {
      this.generateChapter(doc, book.frontMatter.preface)
    }

    // 正文章节
    for (const chapter of book.body.chapters) {
      this.generateChapter(doc, chapter)

      // 子章节
      if (chapter.children) {
        for (const subChapter of chapter.children) {
          this.generateChapter(doc, subChapter)
        }
      }
    }

    // 附录
    for (const appendix of book.backMatter.appendices) {
      this.generateChapter(doc, appendix)
    }
  }

  /**
   * 生成标题页
   */
  private generateTitlePage(doc: PDFKit.PDFDocument, book: BookStructure): void {
    const pageWidth = doc.page.width
    const pageHeight = doc.page.height

    // 标题
    doc.fontSize(28)
      .font('Helvetica-Bold')
      .text(book.metadata.title, 0, pageHeight / 3, {
        align: 'center',
        width: pageWidth,
      })

    // 副标题
    if (book.metadata.subtitle) {
      doc.moveDown()
        .fontSize(18)
        .font('Helvetica')
        .text(book.metadata.subtitle, 0, doc.y, {
          align: 'center',
          width: pageWidth,
        })
    }

    // 作者
    doc.moveDown(4)
      .fontSize(16)
      .font('Helvetica')
      .text(book.metadata.author, 0, doc.y, {
        align: 'center',
        width: pageWidth,
      })

    doc.addPage()
  }

  /**
   * 生成版权页
   */
  private generateCopyrightPage(doc: PDFKit.PDFDocument, book: BookStructure): void {
    doc.fontSize(10)
      .font('Helvetica')

    // 版权信息
    doc.text(book.metadata.copyright, {
      align: 'center',
    })

    doc.moveDown(2)

    // ISBN
    if (book.metadata.isbn) {
      doc.text(`ISBN: ${book.metadata.isbn}`)
    }
    if (book.metadata.isbnEbook) {
      doc.text(`ISBN (电子版): ${book.metadata.isbnEbook}`)
    }

    // 出版信息
    if (book.metadata.publisher) {
      doc.moveDown()
        .text(`出版: ${book.metadata.publisher}`)
    }

    if (book.metadata.publishDate) {
      doc.text(`出版日期: ${book.metadata.publishDate.toLocaleDateString()}`)
    }

    doc.addPage()
  }

  /**
   * 生成目录
   */
  private generateTableOfContents(doc: PDFKit.PDFDocument, book: BookStructure): void {
    doc.fontSize(20)
      .font('Helvetica-Bold')
      .text('目录', { align: 'center' })

    doc.moveDown(2)
      .fontSize(this.options.fontSize)
      .font('Helvetica')

    for (const entry of book.frontMatter.tableOfContents) {
      const indent = (entry.level - 1) * 20
      const pageNum = entry.page ? entry.page.toString() : ''

      doc.text(entry.title, this.options.margins.left + indent, doc.y, {
        continued: true,
        width: doc.page.width - this.options.margins.left - this.options.margins.right - indent - 30,
      })

      if (this.options.tocPageNumbers && pageNum) {
        doc.text(pageNum, { align: 'right' })
      } else {
        doc.text('')
      }

      // 子目录
      if (entry.children) {
        for (const child of entry.children) {
          const childIndent = entry.level * 20
          const childPageNum = child.page ? child.page.toString() : ''

          doc.text(child.title, this.options.margins.left + childIndent, doc.y, {
            continued: true,
            width: doc.page.width - this.options.margins.left - this.options.margins.right - childIndent - 30,
          })

          if (this.options.tocPageNumbers && childPageNum) {
            doc.text(childPageNum, { align: 'right' })
          } else {
            doc.text('')
          }
        }
      }
    }

    doc.addPage()
  }

  /**
   * 生成章节
   */
  private generateChapter(doc: PDFKit.PDFDocument, chapter: Chapter): void {
    // 章节标题
    const titleSize = chapter.level === 1 ? 24 : chapter.level === 2 ? 18 : 14
    doc.fontSize(titleSize)
      .font('Helvetica-Bold')
      .text(chapter.title, { align: chapter.level === 1 ? 'center' : 'left' })

    // 添加书签
    if (this.options.bookmarks) {
      doc.outline.addItem(chapter.title)
    }

    doc.moveDown()
      .fontSize(this.options.fontSize)
      .font('Helvetica')

    // 章节内容
    for (const node of chapter.content) {
      this.renderNode(doc, node)
    }

    // 章节结束后换页
    if (chapter.level === 1) {
      doc.addPage()
    }
  }

  /**
   * 渲染内容节点
   */
  private renderNode(doc: PDFKit.PDFDocument, node: ContentNode): void {
    switch (node.type) {
      case 'heading':
        const level = node.level || 2
        const size = level === 1 ? 20 : level === 2 ? 16 : level === 3 ? 14 : 12
        doc.moveDown()
          .fontSize(size)
          .font('Helvetica-Bold')
          .text(node.text || '')
          .fontSize(this.options.fontSize)
          .font('Helvetica')
        break

      case 'paragraph':
        doc.moveDown(0.5)
          .text(node.text || '', {
            align: 'justify',
            indent: 20,
            lineGap: (this.options.lineHeight - 1) * this.options.fontSize,
          })
        break

      case 'list':
        doc.moveDown(0.5)
        if (node.children) {
          const ordered = node.attributes?.ordered
          node.children.forEach((item, index) => {
            const bullet = ordered ? `${index + 1}.` : '•'
            doc.text(`${bullet} ${item.text || ''}`, {
              indent: 20,
            })
          })
        }
        break

      case 'blockquote':
        doc.moveDown(0.5)
          .font('Helvetica-Oblique')
          .text(node.text || '', {
            indent: 40,
          })
          .font('Helvetica')
        break

      case 'code':
        doc.moveDown(0.5)
          .font('Courier')
          .fontSize(this.options.fontSize - 1)
          .text(node.text || '', {
            indent: 20,
          })
          .font('Helvetica')
          .fontSize(this.options.fontSize)
        break

      case 'table':
        this.renderTable(doc, node)
        break

      default:
        if (node.text) {
          doc.text(node.text)
        }
    }
  }

  /**
   * 渲染表格
   */
  private renderTable(doc: PDFKit.PDFDocument, node: ContentNode): void {
    if (!node.children || node.children.length === 0) return

    doc.moveDown()

    const tableWidth = doc.page.width - this.options.margins.left - this.options.margins.right
    const rows = node.children
    const colCount = rows[0]?.children?.length || 1
    const colWidth = tableWidth / colCount

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const isHeader = node.attributes?.hasHeader && i === 0
      const startY = doc.y

      if (row.children) {
        let maxHeight = 0

        // 计算行高
        for (let j = 0; j < row.children.length; j++) {
          const cell = row.children[j]
          const cellHeight = doc.heightOfString(cell.text || '', {
            width: colWidth - 10,
          })
          maxHeight = Math.max(maxHeight, cellHeight + 10)
        }

        // 绘制单元格
        for (let j = 0; j < row.children.length; j++) {
          const cell = row.children[j]
          const x = this.options.margins.left + j * colWidth

          // 绘制边框
          doc.rect(x, startY, colWidth, maxHeight).stroke()

          // 绘制文本
          if (isHeader) {
            doc.font('Helvetica-Bold')
          }
          doc.text(cell.text || '', x + 5, startY + 5, {
            width: colWidth - 10,
          })
          if (isHeader) {
            doc.font('Helvetica')
          }
        }

        doc.y = startY + maxHeight
      }
    }

    doc.moveDown()
  }

  /**
   * 添加页码
   */
  private addPageNumbers(doc: PDFKit.PDFDocument): void {
    const pages = doc.bufferedPageRange()

    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i)

      const pageNum = i + 1
      const y = this.options.pageNumberPosition === 'top'
        ? this.options.margins.top / 2
        : doc.page.height - this.options.margins.bottom / 2

      doc.fontSize(10)
        .text(
          pageNum.toString(),
          0,
          y,
          {
            align: 'center',
            width: doc.page.width,
          }
        )
    }
  }
}
