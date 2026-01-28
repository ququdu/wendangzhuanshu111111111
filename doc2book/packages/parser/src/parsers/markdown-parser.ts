/**
 * Markdown 解析器
 * 使用 marked 解析 Markdown 文档
 */

import { marked, Tokens, Token, TokensList } from 'marked'
import type { DocumentFormat } from '@doc2book/shared'
import type { IParser, ParserOptions, ParseResult } from '../types'
import { AstBuilder } from '../utils/ast-builder'
import { detectLanguage } from '../utils/language-detect'

/**
 * Markdown 解析器类
 */
export class MarkdownParser implements IParser {
  supportedFormats: DocumentFormat[] = ['md', 'markdown']

  /**
   * 解析 Markdown 文档
   * @param input Markdown 文本内容
   * @param options 解析选项
   */
  async parse(input: Buffer | string, options?: ParserOptions): Promise<ParseResult> {
    const startTime = Date.now()

    try {
      // 确保输入是字符串
      const text = typeof input === 'string' ? input : input.toString('utf-8')

      // 检测语言
      let detectedLanguage = 'und'
      if (options?.detectLanguage !== false && text.length > 50) {
        const langResult = detectLanguage(text)
        detectedLanguage = langResult.code
      }

      // 构建 AST
      const builder = new AstBuilder('document.md')
      builder.setMetadata({
        language: detectedLanguage,
      })

      // 使用 marked 的 lexer 解析为 tokens
      const tokens = marked.lexer(text)

      // 解析 tokens
      this.parseTokens(tokens, builder, options)

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
        error: error instanceof Error ? error.message : '解析 Markdown 失败',
        metadata: {
          parseTime: Date.now() - startTime,
          method: 'text',
        },
      }
    }
  }

  /**
   * 解析 marked tokens
   */
  private parseTokens(
    tokens: TokensList,
    builder: AstBuilder,
    options?: ParserOptions
  ): void {
    for (const token of tokens) {
      this.parseToken(token, builder, options)
    }
  }

  /**
   * 解析单个 token
   */
  private parseToken(
    token: Token,
    builder: AstBuilder,
    options?: ParserOptions
  ): void {
    switch (token.type) {
      case 'heading':
        builder.addHeading(token.text, token.depth)
        break

      case 'paragraph':
        builder.addParagraph(token.text)
        break

      case 'list':
        const items = token.items.map((item: Tokens.ListItem) => item.text)
        builder.addList(items, token.ordered)
        break

      case 'code':
        builder.addCodeBlock(token.text, token.lang)
        break

      case 'blockquote':
        // blockquote 可能包含多个 token
        const quoteText = this.extractText(token)
        builder.addBlockquote(quoteText)
        break

      case 'table':
        if (options?.extractTables !== false && token.type === 'table') {
          this.parseTable(token as Tokens.Table, builder)
        }
        break

      case 'hr':
        // 水平线，可以作为分隔符
        builder.addNode({
          type: 'paragraph',
          text: '---',
          attributes: { isHorizontalRule: true },
        })
        break

      case 'html':
        // HTML 块，尝试提取文本
        const htmlText = token.text.replace(/<[^>]+>/g, '').trim()
        if (htmlText) {
          builder.addParagraph(htmlText)
        }
        break

      case 'space':
        // 空白，忽略
        break

      default:
        // 其他类型，尝试提取文本
        if ('text' in token && typeof token.text === 'string') {
          builder.addParagraph(token.text)
        }
    }
  }

  /**
   * 从 token 中提取纯文本
   */
  private extractText(token: Token): string {
    if ('text' in token && typeof token.text === 'string') {
      return token.text
    }
    if ('tokens' in token && Array.isArray(token.tokens)) {
      return token.tokens.map((t: Token) => this.extractText(t)).join(' ')
    }
    if ('items' in token && Array.isArray(token.items)) {
      return token.items.map((item: Token) => this.extractText(item)).join('\n')
    }
    return ''
  }

  /**
   * 解析表格
   */
  private parseTable(token: Tokens.Table, builder: AstBuilder): void {
    const rows: string[][] = []

    // 添加表头
    if (token.header && token.header.length > 0) {
      const headerRow = token.header.map((cell) => cell.text)
      rows.push(headerRow)
    }

    // 添加表格内容
    for (const row of token.rows) {
      const rowData = row.map((cell) => cell.text)
      rows.push(rowData)
    }

    if (rows.length > 0) {
      builder.addTable(rows, token.header && token.header.length > 0)
    }
  }
}
