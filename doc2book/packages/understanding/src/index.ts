/**
 * @doc2book/understanding
 * 内容理解模块 - 类似 Google NotebookLM 的深度内容理解
 *
 * 功能：
 * - 内容分析：理解文档的核心主题和论点
 * - 摘要生成：生成文档摘要
 * - 结构识别：识别文档结构
 * - 章节分割：智能分割章节
 */

// 核心功能
export { ContentAnalyzer } from './analyzer'
export { Summarizer } from './summarizer'
export { StructureDetector } from './structure-detector'
export { ChapterSplitter } from './chapter-splitter'

// 类型
export type {
  AnalysisResult,
  SummaryResult,
  StructureResult,
  ChapterSplitResult,
  DocumentTheme,
  KeyPoint,
} from './types'
