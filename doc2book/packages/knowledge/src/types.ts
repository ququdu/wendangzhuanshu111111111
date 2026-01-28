/**
 * 知识提取模块类型定义
 */

import type { KnowledgePoint, KnowledgeGraph } from '@doc2book/shared'

export interface ExtractionResult {
  success: boolean
  error?: string
  knowledgePoints?: KnowledgePoint[]
  extractionTime?: number
}

export interface GraphBuildResult {
  success: boolean
  error?: string
  graph?: KnowledgeGraph
  buildTime?: number
}

export interface RelationResult {
  success: boolean
  error?: string
  relations?: Array<{
    source: string
    target: string
    type: string
    confidence: number
  }>
}
