/**
 * 原创内容生成模块类型定义
 */

export interface RewriteResult {
  success: boolean
  error?: string
  rewrittenContent?: string
  originalLength?: number
  rewrittenLength?: number
  rewriteTime?: number
}

export interface TranslateResult {
  success: boolean
  error?: string
  translatedContent?: string
  sourceLanguage?: string
  targetLanguage?: string
  translateTime?: number
}

export interface HumanizeResult {
  success: boolean
  error?: string
  humanizedContent?: string
  aiScore?: number
  humanScore?: number
  humanizeTime?: number
}

export interface StyleOptions {
  tone?: 'formal' | 'informal' | 'academic' | 'conversational'
  audience?: 'general' | 'professional' | 'academic' | 'children'
  complexity?: 'simple' | 'moderate' | 'complex'
}
