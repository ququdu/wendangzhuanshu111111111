/**
 * 抄袭检测模块类型定义
 */

export interface SimilarityResult {
  success: boolean
  error?: string
  score: number // 0-1，越高越相似
  matches: Array<{
    sourceText: string
    matchedText: string
    similarity: number
    sourceId?: string
  }>
  checkTime?: number
}

export interface PlagiarismReport {
  success: boolean
  error?: string
  overallScore: number
  originalityScore: number // 1 - overallScore
  totalChecked: number
  flaggedSections: Array<{
    text: string
    similarity: number
    source?: string
    suggestion?: string
  }>
  summary: string
  generatedAt: Date
}

export interface CheckOptions {
  threshold?: number // 相似度阈值，默认 0.8
  chunkSize?: number // 分块大小，默认 500 字符
  maxMatches?: number // 最大匹配数，默认 10
  sources?: string[] // 要比对的源文本
  providerId?: string
}

export interface VectorEntry {
  id: string
  text: string
  vector: number[]
  metadata?: Record<string, any>
}
