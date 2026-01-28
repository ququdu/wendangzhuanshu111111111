/**
 * 统一去痕迹处理器
 */

import type { UnifiedAST, ContentNode, SanitizeResult } from '@doc2book/shared'
import type { ProviderManager } from '@doc2book/providers'
import type { SanitizeOptions } from './types'
import { EntityDetector } from './entity-detector'
import { ContentReplacer } from './replacer'
import { SanitizeValidator } from './validator'

export class Sanitizer {
  private detector: EntityDetector
  private replacer: ContentReplacer
  private validator: SanitizeValidator

  constructor(providerManager: ProviderManager) {
    this.detector = new EntityDetector(providerManager)
    this.replacer = new ContentReplacer()
    this.validator = new SanitizeValidator(providerManager)
  }

  async sanitize(ast: UnifiedAST, options?: SanitizeOptions): Promise<{
    success: boolean
    error?: string
    sanitizedAst?: UnifiedAST
    totalReplacements?: number
  }> {
    try {
      let totalReplacements = 0
      const sanitizedContent = await this.sanitizeNodes(ast.content, options)

      // 计算替换数量
      totalReplacements = this.countReplacements(ast.content, sanitizedContent)

      return {
        success: true,
        sanitizedAst: {
          ...ast,
          content: sanitizedContent,
        },
        totalReplacements,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '去痕迹处理失败',
      }
    }
  }

  private async sanitizeNodes(nodes: ContentNode[], options?: SanitizeOptions): Promise<ContentNode[]> {
    const result: ContentNode[] = []

    for (const node of nodes) {
      const sanitizedNode = { ...node }

      if (node.text) {
        const detection = await this.detector.detect(node.text, options)
        if (detection.success && detection.entities && detection.entities.length > 0) {
          const replaced = this.replacer.replace(node.text, detection.entities, options)
          sanitizedNode.text = replaced.sanitizedText
        }
      }

      if (node.children) {
        sanitizedNode.children = await this.sanitizeNodes(node.children, options)
      }

      result.push(sanitizedNode)
    }

    return result
  }

  private countReplacements(original: ContentNode[], sanitized: ContentNode[]): number {
    let count = 0

    for (let i = 0; i < original.length; i++) {
      if (original[i].text !== sanitized[i]?.text) {
        count++
      }
      if (original[i].children && sanitized[i]?.children) {
        count += this.countReplacements(original[i].children!, sanitized[i].children!)
      }
    }

    return count
  }
}
