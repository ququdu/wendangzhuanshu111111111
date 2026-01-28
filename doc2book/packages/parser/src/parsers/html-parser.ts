/**
 * HTML 解析器
 * 使用 cheerio 解析 HTML 文档
 */

import * as cheerio from 'cheerio'
import type { AnyNode } from 'domhandler'
import type { DocumentFormat } from '@doc2book/shared'
import type { IParser, ParserOptions, ParseResult } from '../types'
import { AstBuilder } from '../utils/ast-builder'
import { detectLanguage } from '../utils/language-detect'

/**
 * HTML 解析器类
 */
export class HtmlParser implements IParser {
  supportedFormats: DocumentFormat[] = ['html']

  /**
   * 解析 HTML 文档
   * @param input HTML 内容
   * @param options 解析选项
   */
  async parse(input: Buffer | string, options?: ParserOptions): Promise<ParseResult> {
    const startTime = Date.now()

    try {
      // 确保输入是字符串
      const html = typeof input === 'string' ? input : input.toString('utf-8')

      // 加载 HTML
      const $ = cheerio.load(html)

      // 移除脚本和样式
      $('script, style, noscript').remove()

      // 提取纯文本用于语言检测
      const plainText = $('body').text() || $.text()

      // 检测语言
      let detectedLanguage = 'und'
      if (options?.detectLanguage !== false && plainText.length > 50) {
        const langResult = detectLanguage(plainText)
        detectedLanguage = langResult.code
      }

      // 提取标题
      const title = $('title').text().trim() || $('h1').first().text().trim()

      // 构建 AST
      const builder = new AstBuilder('document.html')
      builder.setMetadata({
        title: title || undefined,
        language: detectedLanguage,
      })

      // 解析内容
      // 优先解析 article 或 main 标签
      let $content = $('article, main, .content, #content').first()
      if ($content.length === 0) {
        $content = $('body')
      }

      this.parseElement($, $content, builder, options)

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
        error: error instanceof Error ? error.message : '解析 HTML 失败',
        metadata: {
          parseTime: Date.now() - startTime,
          method: 'text',
        },
      }
    }
  }

  /**
   * 递归解析 HTML 元素
   */
  private parseElement(
    $: cheerio.CheerioAPI,
    $el: cheerio.Cheerio<AnyNode>,
    builder: AstBuilder,
    options?: ParserOptions
  ): void {
    $el.children().each((_, element) => {
      const $child = $(element)
      const tagName = element.tagName?.toLowerCase()

      // 跳过隐藏元素
      if ($child.css('display') === 'none' || $child.attr('hidden') !== undefined) {
        return
      }

      switch (tagName) {
        case 'h1':
          builder.addHeading($child.text().trim(), 1)
          break
        case 'h2':
          builder.addHeading($child.text().trim(), 2)
          break
        case 'h3':
          builder.addHeading($child.text().trim(), 3)
          break
        case 'h4':
          builder.addHeading($child.text().trim(), 4)
          break
        case 'h5':
          builder.addHeading($child.text().trim(), 5)
          break
        case 'h6':
          builder.addHeading($child.text().trim(), 6)
          break

        case 'p':
          const pText = $child.text().trim()
          if (pText) {
            builder.addParagraph(pText)
          }
          break

        case 'ul':
          const ulItems: string[] = []
          $child.find('> li').each((_, li) => {
            const liText = $(li).text().trim()
            if (liText) {
              ulItems.push(liText)
            }
          })
          if (ulItems.length > 0) {
            builder.addList(ulItems, false)
          }
          break

        case 'ol':
          const olItems: string[] = []
          $child.find('> li').each((_, li) => {
            const liText = $(li).text().trim()
            if (liText) {
              olItems.push(liText)
            }
          })
          if (olItems.length > 0) {
            builder.addList(olItems, true)
          }
          break

        case 'table':
          if (options?.extractTables !== false) {
            this.parseTable($, $child, builder)
          }
          break

        case 'blockquote':
          builder.addBlockquote($child.text().trim())
          break

        case 'pre':
          const codeEl = $child.find('code')
          const code = codeEl.length > 0 ? codeEl.text() : $child.text()
          const lang = codeEl.attr('class')?.match(/language-(\w+)/)?.[1]
          builder.addCodeBlock(code, lang)
          break

        case 'code':
          // 行内代码，作为段落处理
          if ($child.parent().get(0)?.tagName?.toLowerCase() !== 'pre') {
            builder.addParagraph($child.text())
          }
          break

        case 'img':
          if (options?.extractImages !== false) {
            const src = $child.attr('src')
            const alt = $child.attr('alt')
            if (src) {
              // 如果是 base64 图片
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
              } else {
                // 外部图片，记录 URL
                const assetId = builder.addAsset({
                  type: 'image',
                  filename: src.split('/').pop() || 'image.png',
                  mimeType: 'image/png',
                  url: src,
                  caption: alt,
                })
                builder.addImage(assetId, alt)
              }
            }
          }
          break

        case 'figure':
          // 图片容器
          if (options?.extractImages !== false) {
            const $img = $child.find('img')
            const $caption = $child.find('figcaption')
            if ($img.length > 0) {
              const src = $img.attr('src')
              const alt = $img.attr('alt') || $caption.text().trim()
              if (src) {
                const assetId = builder.addAsset({
                  type: 'image',
                  filename: src.split('/').pop() || 'image.png',
                  mimeType: 'image/png',
                  url: src,
                  caption: alt,
                })
                builder.addImage(assetId, alt)
              }
            }
          }
          break

        case 'hr':
          builder.addNode({
            type: 'paragraph',
            text: '---',
            attributes: { isHorizontalRule: true },
          })
          break

        case 'br':
          // 换行，忽略
          break

        case 'div':
        case 'section':
        case 'article':
        case 'aside':
        case 'header':
        case 'footer':
        case 'nav':
        case 'main':
          // 容器元素，递归解析
          this.parseElement($, $child, builder, options)
          break

        case 'span':
        case 'a':
        case 'strong':
        case 'em':
        case 'b':
        case 'i':
        case 'u':
          // 行内元素，如果是直接子元素，提取文本
          const inlineText = $child.text().trim()
          if (inlineText && $child.parent().get(0)?.tagName?.toLowerCase() === 'body') {
            builder.addParagraph(inlineText)
          }
          break

        default:
          // 其他元素，尝试递归或提取文本
          if ($child.children().length > 0) {
            this.parseElement($, $child, builder, options)
          } else {
            const defaultText = $child.text().trim()
            if (defaultText) {
              builder.addParagraph(defaultText)
            }
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
    const $rows = $tbody.length > 0 ? $tbody.find('tr') : $table.find('> tr')

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
      builder.addTable(rows, hasHeader)
    }
  }
}
