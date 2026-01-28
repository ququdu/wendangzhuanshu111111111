/**
 * Word 文档解析器
 * 使用 mammoth 将 .docx 转换为 HTML，然后解析
 */

import mammoth from 'mammoth'
import * as cheerio from 'cheerio'
import type { AnyNode } from 'domhandler'
import type { DocumentFormat } from '@doc2book/shared'
import type { IParser, ParserOptions, ParseResult } from '../types'
import { AstBuilder } from '../utils/ast-builder'
import { detectLanguage } from '../utils/language-detect'

/**
 * Word 文档解析器类
 */
export class DocxParser implements IParser {
  supportedFormats: DocumentFormat[] = ['docx', 'doc']

  /**
   * 解析 Word 文档
   * @param input Word 文件的 Buffer
   * @param options 解析选项
   */
  async parse(input: Buffer | string, options?: ParserOptions): Promise<ParseResult> {
    const startTime = Date.now()

    try {
      // 确保输入是 Buffer
      const buffer = typeof input === 'string' ? Buffer.from(input, 'base64') : input

      // 使用 mammoth 转换为 HTML
      const result = await mammoth.convertToHtml({ buffer }, {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Heading 4'] => h4:fresh",
          "p[style-name='Heading 5'] => h5:fresh",
          "p[style-name='Heading 6'] => h6:fresh",
          "p[style-name='Title'] => h1:fresh",
          "p[style-name='Subtitle'] => h2:fresh",
        ],
      })

      const html = result.value
      const messages = result.messages

      // 记录警告信息
      if (messages.length > 0) {
        console.warn('Word 解析警告:', messages.map((m) => m.message).join('; '))
      }

      // 解析 HTML
      const $ = cheerio.load(html)

      // 提取纯文本用于语言检测
      const plainText = $.text()

      // 检测语言
      let detectedLanguage = 'und'
      if (options?.detectLanguage !== false && plainText.length > 50) {
        const langResult = detectLanguage(plainText)
        detectedLanguage = langResult.code
      }

      // 构建 AST
      const builder = new AstBuilder('document.docx')
      builder.setMetadata({
        language: detectedLanguage,
      })

      // 解析 HTML 内容
      this.parseHtmlContent($, builder, options)

      const ast = builder.build()
      const parseTime = Date.now() - startTime

      return {
        success: true,
        ast,
        metadata: {
          parseTime,
          method: 'text',
          detectedLanguage,
          wordCount: ast.metadata.wordCount,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '解析 Word 文档失败',
        metadata: {
          parseTime: Date.now() - startTime,
          method: 'text',
        },
      }
    }
  }

  /**
   * 解析 HTML 内容
   */
  private parseHtmlContent(
    $: cheerio.CheerioAPI,
    builder: AstBuilder,
    options?: ParserOptions
  ): void {
    // 遍历所有顶级元素
    $('body').children().each((_, element) => {
      const $el = $(element)
      const tagName = element.tagName?.toLowerCase()

      switch (tagName) {
        case 'h1':
          builder.addHeading($el.text().trim(), 1)
          break
        case 'h2':
          builder.addHeading($el.text().trim(), 2)
          break
        case 'h3':
          builder.addHeading($el.text().trim(), 3)
          break
        case 'h4':
          builder.addHeading($el.text().trim(), 4)
          break
        case 'h5':
          builder.addHeading($el.text().trim(), 5)
          break
        case 'h6':
          builder.addHeading($el.text().trim(), 6)
          break
        case 'p':
          const text = $el.text().trim()
          if (text) {
            builder.addParagraph(text)
          }
          break
        case 'ul':
          const ulItems: string[] = []
          $el.find('li').each((_, li) => {
            ulItems.push($(li).text().trim())
          })
          if (ulItems.length > 0) {
            builder.addList(ulItems, false)
          }
          break
        case 'ol':
          const olItems: string[] = []
          $el.find('li').each((_, li) => {
            olItems.push($(li).text().trim())
          })
          if (olItems.length > 0) {
            builder.addList(olItems, true)
          }
          break
        case 'table':
          if (options?.extractTables !== false) {
            this.parseTable($, $el, builder)
          }
          break
        case 'blockquote':
          builder.addBlockquote($el.text().trim())
          break
        case 'pre':
        case 'code':
          builder.addCodeBlock($el.text())
          break
        case 'img':
          if (options?.extractImages !== false) {
            const src = $el.attr('src')
            const alt = $el.attr('alt')
            if (src) {
              // 如果是 base64 图片，添加为资源
              if (src.startsWith('data:')) {
                const match = src.match(/^data:([^;]+);base64,(.+)$/)
                if (match) {
                  const assetId = builder.addAsset({
                    type: 'image',
                    filename: `image_${Date.now()}.png`,
                    mimeType: match[1],
                    data: match[2],
                    caption: alt,
                  })
                  builder.addImage(assetId, alt)
                }
              }
            }
          }
          break
        default:
          // 其他元素，尝试提取文本
          const defaultText = $el.text().trim()
          if (defaultText) {
            builder.addParagraph(defaultText)
          }
      }
    })
  }

  /**
   * 解析表格
   */
  private parseTable(
    $: cheerio.CheerioAPI,
    $table: cheerio.Cheerio<AnyNode>,
    builder: AstBuilder
  ): void {
    const rows: string[][] = []
    let hasHeader = false

    // 检查是否有 thead
    const $thead = $table.find('thead')
    if ($thead.length > 0) {
      hasHeader = true
      $thead.find('tr').each((_, tr) => {
        const row: string[] = []
        $(tr).find('th, td').each((_, cell) => {
          row.push($(cell).text().trim())
        })
        if (row.length > 0) {
          rows.push(row)
        }
      })
    }

    // 处理 tbody 或直接的 tr
    const $tbody = $table.find('tbody')
    const $rows = $tbody.length > 0 ? $tbody.find('tr') : $table.find('tr')

    $rows.each((_, tr) => {
      const row: string[] = []
      $(tr).find('th, td').each((_, cell) => {
        row.push($(cell).text().trim())
      })
      if (row.length > 0) {
        rows.push(row)
      }
    })

    if (rows.length > 0) {
      // 如果没有明确的 thead，检查第一行是否可能是表头
      if (!hasHeader && rows.length > 1) {
        const firstRow = rows[0]
        const secondRow = rows[1]
        // 如果第一行都是短文本，可能是表头
        const avgFirstRowLength = firstRow.reduce((sum, cell) => sum + cell.length, 0) / firstRow.length
        const avgSecondRowLength = secondRow.reduce((sum, cell) => sum + cell.length, 0) / secondRow.length
        if (avgFirstRowLength < avgSecondRowLength * 0.5) {
          hasHeader = true
        }
      }

      builder.addTable(rows, hasHeader)
    }
  }
}
