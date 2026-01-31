/**
 * 结构检测器
 * 识别文档的层次结构
 */

import type { UnifiedAST, ContentNode } from '@doc2book/shared'
import type { ProviderManager } from '@doc2book/providers'
import type { StructureResult, StructureElement, StructureOptions } from './types'

/**
 * 结构检测器类
 */
export class StructureDetector {
  private providerManager: ProviderManager

  constructor(providerManager: ProviderManager) {
    this.providerManager = providerManager
  }

  /**
   * 检测文档结构
   */
  async detect(ast: UnifiedAST, options?: StructureOptions): Promise<StructureResult> {
    const startTime = Date.now()

    try {
      // 首先使用规则检测
      const ruleBasedStructure = this.detectByRules(ast.content)

      // 如果启用 AI 辅助，进一步优化
      if (options?.useAI && ruleBasedStructure.length > 0) {
        const aiEnhanced = await this.enhanceWithAI(ast.content, ruleBasedStructure, options)
        if (aiEnhanced) {
          return {
            success: true,
            title: ast.metadata.title || this.extractTitle(ruleBasedStructure),
            structure: aiEnhanced,
            tableOfContents: this.generateTOC(aiEnhanced),
            detectionTime: Date.now() - startTime,
          }
        }
      }

      return {
        success: true,
        title: ast.metadata.title || this.extractTitle(ruleBasedStructure),
        structure: ruleBasedStructure,
        tableOfContents: this.generateTOC(ruleBasedStructure),
        detectionTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '结构检测失败',
        detectionTime: Date.now() - startTime,
      }
    }
  }

  /**
   * 基于规则检测结构
   */
  private detectByRules(nodes: ContentNode[]): StructureElement[] {
    const structure: StructureElement[] = []
    let currentChapter: StructureElement | null = null
    let currentSection: StructureElement | null = null

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]

      if (node.type === 'heading') {
        const level = node.level || 1
        const title = node.text || ''

        const element: StructureElement = {
          type: level === 1 ? 'chapter' : level === 2 ? 'section' : 'subsection',
          title,
          level,
          startIndex: i,
          endIndex: i,
          children: [],
          preview: this.getPreview(nodes, i),
        }

        if (level === 1) {
          // 新章节
          if (currentChapter) {
            currentChapter.endIndex = i - 1
          }
          currentChapter = element
          currentSection = null
          structure.push(element)
        } else if (level === 2) {
          // 新节
          if (currentSection) {
            currentSection.endIndex = i - 1
          }
          currentSection = element
          if (currentChapter) {
            currentChapter.children = currentChapter.children || []
            currentChapter.children.push(element)
          } else {
            structure.push(element)
          }
        } else {
          // 小节
          if (currentSection) {
            currentSection.children = currentSection.children || []
            currentSection.children.push(element)
          } else if (currentChapter) {
            currentChapter.children = currentChapter.children || []
            currentChapter.children.push(element)
          } else {
            structure.push(element)
          }
        }
      }
    }

    // 更新最后一个元素的结束索引
    if (currentChapter) {
      currentChapter.endIndex = nodes.length - 1
    }
    if (currentSection) {
      currentSection.endIndex = nodes.length - 1
    }

    return structure
  }

  /**
   * 使用 AI 增强结构检测
   */
  private async enhanceWithAI(
    nodes: ContentNode[],
    ruleBasedStructure: StructureElement[],
    options: StructureOptions
  ): Promise<StructureElement[] | null> {
    // 提取文本用于 AI 分析
    const textContent = this.extractText(nodes)

    const prompt = `请分析以下文档的结构，并以 JSON 格式返回优化后的结构：

文档内容：
${this.truncateText(textContent, 5000)}

当前检测到的结构：
${JSON.stringify(ruleBasedStructure.map(s => ({ title: s.title, level: s.level })), null, 2)}

请返回优化后的结构，格式如下：
{
  "structure": [
    {
      "title": "章节标题",
      "level": 1,
      "suggestedTitle": "建议的标题（如果原标题不够好）"
    }
  ]
}

只返回 JSON，不要其他内容。
${options.instruction ? `\n附加要求：\n${options.instruction}` : ''}`

    const response = await this.providerManager.complete(
      [{ role: 'user', content: prompt }],
      {
        providerId: options.providerId,
        temperature: 0.2,
        maxTokens: 1000,
      }
    )

    if (!response.success || !response.content) {
      return null
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return null

      const data = JSON.parse(jsonMatch[0])
      if (!data.structure || !Array.isArray(data.structure)) return null

      // 合并 AI 建议到原结构
      return ruleBasedStructure.map((element, index) => {
        const aiSuggestion = data.structure[index]
        if (aiSuggestion?.suggestedTitle) {
          return {
            ...element,
            title: aiSuggestion.suggestedTitle,
          }
        }
        return element
      })
    } catch {
      return null
    }
  }

  /**
   * 生成目录
   */
  private generateTOC(
    structure: StructureElement[]
  ): Array<{ title: string; level: number; index: number }> {
    const toc: Array<{ title: string; level: number; index: number }> = []

    const traverse = (elements: StructureElement[]) => {
      for (const element of elements) {
        if (element.title) {
          toc.push({
            title: element.title,
            level: element.level,
            index: element.startIndex,
          })
        }
        if (element.children) {
          traverse(element.children)
        }
      }
    }

    traverse(structure)
    return toc
  }

  /**
   * 提取标题
   */
  private extractTitle(structure: StructureElement[]): string | undefined {
    // 查找第一个一级标题
    for (const element of structure) {
      if (element.level === 1 && element.title) {
        return element.title
      }
    }
    return undefined
  }

  /**
   * 获取预览文本
   */
  private getPreview(nodes: ContentNode[], startIndex: number): string {
    const previewLength = 200
    let preview = ''

    for (let i = startIndex + 1; i < nodes.length && preview.length < previewLength; i++) {
      const node = nodes[i]
      if (node.type === 'heading') break
      if (node.text) {
        preview += node.text + ' '
      }
    }

    return preview.trim().substring(0, previewLength)
  }

  /**
   * 提取文本
   */
  private extractText(nodes: ContentNode[]): string {
    return nodes
      .map((node) => {
        if (node.text) return node.text
        if (node.children) return this.extractText(node.children)
        return ''
      })
      .join('\n')
  }

  /**
   * 截断文本
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }
}
