/**
 * 内容理解模块类型定义
 */

import type { ContentNode, Chapter } from '@doc2book/shared'

/**
 * 文档主题
 */
export interface DocumentTheme {
  /** 主题名称 */
  name: string
  /** 主题描述 */
  description: string
  /** 相关关键词 */
  keywords: string[]
  /** 置信度（0-1） */
  confidence: number
}

/**
 * 关键点
 */
export interface KeyPoint {
  /** 关键点内容 */
  content: string
  /** 类型 */
  type: 'fact' | 'opinion' | 'conclusion' | 'definition' | 'example'
  /** 重要性（1-5） */
  importance: number
  /** 来源位置 */
  sourceLocation?: {
    nodeIndex: number
    text: string
  }
}

/**
 * 内容分析结果
 */
export interface AnalysisResult {
  /** 是否成功 */
  success: boolean
  /** 错误信息 */
  error?: string
  /** 主要主题 */
  mainTheme?: DocumentTheme
  /** 次要主题 */
  subThemes?: DocumentTheme[]
  /** 关键点列表 */
  keyPoints?: KeyPoint[]
  /** 目标读者 */
  targetAudience?: string
  /** 文档类型 */
  documentType?: 'academic' | 'technical' | 'business' | 'narrative' | 'instructional' | 'other'
  /** 写作风格 */
  writingStyle?: 'formal' | 'informal' | 'technical' | 'conversational'
  /** 分析耗时（毫秒） */
  analysisTime?: number
}

/**
 * 摘要结果
 */
export interface SummaryResult {
  /** 是否成功 */
  success: boolean
  /** 错误信息 */
  error?: string
  /** 简短摘要（1-2句） */
  brief?: string
  /** 标准摘要（1段） */
  standard?: string
  /** 详细摘要（多段） */
  detailed?: string
  /** 要点列表 */
  bulletPoints?: string[]
  /** 生成耗时（毫秒） */
  generationTime?: number
}

/**
 * 结构元素
 */
export interface StructureElement {
  /** 元素类型 */
  type: 'title' | 'chapter' | 'section' | 'subsection' | 'paragraph' | 'list' | 'table' | 'figure'
  /** 标题/名称 */
  title?: string
  /** 级别（1-6） */
  level: number
  /** 开始索引 */
  startIndex: number
  /** 结束索引 */
  endIndex: number
  /** 子元素 */
  children?: StructureElement[]
  /** 内容预览 */
  preview?: string
}

/**
 * 结构识别结果
 */
export interface StructureResult {
  /** 是否成功 */
  success: boolean
  /** 错误信息 */
  error?: string
  /** 文档标题 */
  title?: string
  /** 结构树 */
  structure?: StructureElement[]
  /** 目录 */
  tableOfContents?: Array<{
    title: string
    level: number
    index: number
  }>
  /** 识别耗时（毫秒） */
  detectionTime?: number
}

/**
 * 章节分割结果
 */
export interface ChapterSplitResult {
  /** 是否成功 */
  success: boolean
  /** 错误信息 */
  error?: string
  /** 分割后的章节 */
  chapters?: Chapter[]
  /** 建议的书籍结构 */
  suggestedStructure?: {
    /** 是否需要前言 */
    needsPreface: boolean
    /** 是否需要引言 */
    needsIntroduction: boolean
    /** 是否需要结语 */
    needsConclusion: boolean
    /** 是否需要附录 */
    needsAppendix: boolean
    /** 建议的部分划分 */
    suggestedParts?: Array<{
      title: string
      chapterIds: string[]
    }>
  }
  /** 分割耗时（毫秒） */
  splitTime?: number
}

/**
 * 分析选项
 */
export interface AnalysisOptions {
  /** 是否提取关键点 */
  extractKeyPoints?: boolean
  /** 最大关键点数量 */
  maxKeyPoints?: number
  /** 是否识别主题 */
  identifyThemes?: boolean
  /** 是否分析写作风格 */
  analyzeStyle?: boolean
  /** 使用的 AI Provider ID */
  providerId?: string
}

/**
 * 摘要选项
 */
export interface SummaryOptions {
  /** 摘要类型 */
  type?: 'brief' | 'standard' | 'detailed' | 'bullets' | 'all'
  /** 最大长度（字符数） */
  maxLength?: number
  /** 要点数量 */
  bulletCount?: number
  /** 目标语言 */
  language?: string
  /** 使用的 AI Provider ID */
  providerId?: string
}

/**
 * 结构检测选项
 */
export interface StructureOptions {
  /** 最小章节长度（字符数） */
  minChapterLength?: number
  /** 是否使用 AI 辅助 */
  useAI?: boolean
  /** 使用的 AI Provider ID */
  providerId?: string
}

/**
 * 章节分割选项
 */
export interface ChapterSplitOptions {
  /** 目标章节数量 */
  targetChapterCount?: number
  /** 最小章节长度（字符数） */
  minChapterLength?: number
  /** 最大章节长度（字符数） */
  maxChapterLength?: number
  /** 是否使用 AI 辅助 */
  useAI?: boolean
  /** 使用的 AI Provider ID */
  providerId?: string
}
