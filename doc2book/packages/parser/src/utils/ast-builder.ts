/**
 * AST 构建器
 * 用于构建统一的抽象语法树
 */

import { v4 as uuidv4 } from 'uuid'
import type {
  UnifiedAST,
  ContentNode,
  ContentNodeType,
  DocumentMetadata,
  DocumentFormat,
  Reference,
  Asset,
} from '@doc2book/shared'

/**
 * AST 构建器类
 */
export class AstBuilder {
  private id: string
  private sourceFile: string
  private content: ContentNode[] = []
  private references: Reference[] = []
  private assets: Asset[] = []
  private metadata: Partial<DocumentMetadata> = {}

  constructor(sourceFile: string) {
    this.id = uuidv4()
    this.sourceFile = sourceFile
  }

  /**
   * 设置文档元数据
   */
  setMetadata(metadata: Partial<DocumentMetadata>): this {
    this.metadata = { ...this.metadata, ...metadata }
    return this
  }

  /**
   * 添加标题节点
   */
  addHeading(text: string, level: number = 1): this {
    this.content.push({
      type: 'heading',
      level: Math.min(6, Math.max(1, level)),
      text,
    })
    return this
  }

  /**
   * 添加段落节点
   */
  addParagraph(text: string): this {
    if (text.trim()) {
      this.content.push({
        type: 'paragraph',
        text,
      })
    }
    return this
  }

  /**
   * 添加列表节点
   */
  addList(items: string[], ordered: boolean = false): this {
    const listItems: ContentNode[] = items.map((item) => ({
      type: 'list-item' as ContentNodeType,
      text: item,
    }))

    this.content.push({
      type: 'list',
      children: listItems,
      attributes: { ordered },
    })
    return this
  }

  /**
   * 添加代码块节点
   */
  addCodeBlock(code: string, language?: string): this {
    this.content.push({
      type: 'code',
      text: code,
      attributes: { language },
    })
    return this
  }

  /**
   * 添加引用块节点
   */
  addBlockquote(text: string): this {
    this.content.push({
      type: 'blockquote',
      text,
    })
    return this
  }

  /**
   * 添加表格节点
   */
  addTable(rows: string[][], hasHeader: boolean = true): this {
    const tableRows: ContentNode[] = rows.map((row, rowIndex) => ({
      type: 'table-row' as ContentNodeType,
      children: row.map((cell) => ({
        type: 'table-cell' as ContentNodeType,
        text: cell,
        attributes: { isHeader: hasHeader && rowIndex === 0 },
      })),
    }))

    this.content.push({
      type: 'table',
      children: tableRows,
      attributes: { hasHeader },
    })
    return this
  }

  /**
   * 添加图片节点
   */
  addImage(
    id: string,
    caption?: string,
    sourceLocation?: { file: string; page?: number }
  ): this {
    this.content.push({
      type: 'image',
      text: caption,
      attributes: { assetId: id },
      sourceLocation,
    })
    return this
  }

  /**
   * 添加脚注节点
   */
  addFootnote(id: string, text: string): this {
    this.content.push({
      type: 'footnote',
      text,
      attributes: { id },
    })
    return this
  }

  /**
   * 添加引用
   */
  addReference(reference: Omit<Reference, 'id'>): this {
    this.references.push({
      id: uuidv4(),
      ...reference,
    })
    return this
  }

  /**
   * 添加资源（图片、表格等）
   */
  addAsset(asset: Omit<Asset, 'id'>): string {
    const id = uuidv4()
    this.assets.push({
      id,
      ...asset,
    })
    return id
  }

  /**
   * 添加通用内容节点
   */
  addNode(node: ContentNode): this {
    this.content.push(node)
    return this
  }

  /**
   * 批量添加内容节点
   */
  addNodes(nodes: ContentNode[]): this {
    this.content.push(...nodes)
    return this
  }

  /**
   * 从文本解析内容
   * 自动识别标题、段落、列表等
   */
  parseText(text: string): this {
    const lines = text.split('\n')
    let currentParagraph: string[] = []

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join(' ').trim()
        if (paragraphText) {
          this.addParagraph(paragraphText)
        }
        currentParagraph = []
      }
    }

    for (const line of lines) {
      const trimmedLine = line.trim()

      // 空行：结束当前段落
      if (!trimmedLine) {
        flushParagraph()
        continue
      }

      // 检测标题（以 # 开头或全大写）
      const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/)
      if (headingMatch) {
        flushParagraph()
        this.addHeading(headingMatch[2], headingMatch[1].length)
        continue
      }

      // 检测列表项
      const listMatch = trimmedLine.match(/^[-*•]\s+(.+)$/)
      if (listMatch) {
        flushParagraph()
        // 收集连续的列表项
        const listItems: string[] = [listMatch[1]]
        // 这里简化处理，只添加单个列表项
        this.addList(listItems, false)
        continue
      }

      // 检测有序列表
      const orderedListMatch = trimmedLine.match(/^\d+[.)]\s+(.+)$/)
      if (orderedListMatch) {
        flushParagraph()
        this.addList([orderedListMatch[1]], true)
        continue
      }

      // 检测引用块
      if (trimmedLine.startsWith('>')) {
        flushParagraph()
        this.addBlockquote(trimmedLine.substring(1).trim())
        continue
      }

      // 普通文本，添加到当前段落
      currentParagraph.push(trimmedLine)
    }

    // 处理最后一个段落
    flushParagraph()

    return this
  }

  /**
   * 构建最终的 AST
   */
  build(): UnifiedAST {
    // 计算字数
    const wordCount = this.content.reduce((count, node) => {
      if (node.text) {
        // 中文按字符计数，英文按单词计数
        const chineseChars = (node.text.match(/[\u4e00-\u9fa5]/g) || []).length
        const englishWords = (node.text.match(/[a-zA-Z]+/g) || []).length
        return count + chineseChars + englishWords
      }
      return count
    }, 0)

    // 构建完整的元数据
    const fullMetadata: DocumentMetadata = {
      id: this.id,
      filename: this.sourceFile,
      format: this.detectFormat(),
      size: 0, // 需要外部设置
      language: this.metadata.language || 'und',
      createdAt: new Date(),
      updatedAt: new Date(),
      wordCount,
      ...this.metadata,
    }

    return {
      id: this.id,
      sourceFile: this.sourceFile,
      parseTime: new Date(),
      content: this.content,
      metadata: fullMetadata,
      references: this.references,
      assets: this.assets,
    }
  }

  /**
   * 根据文件名检测格式
   */
  private detectFormat(): DocumentFormat {
    const ext = this.sourceFile.toLowerCase().split('.').pop()
    const formatMap: Record<string, DocumentFormat> = {
      pdf: 'pdf',
      docx: 'docx',
      doc: 'doc',
      md: 'md',
      markdown: 'markdown',
      html: 'html',
      htm: 'html',
      txt: 'txt',
      png: 'image',
      jpg: 'image',
      jpeg: 'image',
      gif: 'image',
      webp: 'image',
      bmp: 'image',
    }
    return formatMap[ext || ''] || 'txt'
  }

  /**
   * 获取当前内容节点数量
   */
  getNodeCount(): number {
    return this.content.length
  }

  /**
   * 获取当前资源数量
   */
  getAssetCount(): number {
    return this.assets.length
  }

  /**
   * 清空构建器
   */
  clear(): this {
    this.content = []
    this.references = []
    this.assets = []
    this.metadata = {}
    return this
  }
}
