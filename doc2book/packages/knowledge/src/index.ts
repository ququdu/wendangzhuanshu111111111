/**
 * @doc2book/knowledge
 * 知识提取模块 - 构建知识图谱，提取关键信息
 */

export { KnowledgeExtractor } from './extractor'
export { GraphBuilder } from './graph-builder'
export { RelationFinder } from './relation-finder'

export type {
  ExtractionResult,
  GraphBuildResult,
  RelationResult,
} from './types'
