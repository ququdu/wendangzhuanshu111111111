/**
 * 去痕迹处理模块类型定义
 */

import type { SanitizeEntityType, SanitizeRule, SanitizeResult } from '@doc2book/shared'

export interface SanitizeOptions {
  /** 要处理的实体类型 */
  entityTypes?: SanitizeEntityType[]
  /** 自定义规则 */
  customRules?: SanitizeRule[]
  /** 替换映射 */
  replacementMap?: Record<string, string>
  /** 是否使用 AI 辅助 */
  useAI?: boolean
  /** AI Provider ID */
  providerId?: string
  /** 额外指令（AI 检测使用） */
  instruction?: string
}

export interface DetectionResult {
  success: boolean
  error?: string
  entities?: Array<{
    type: SanitizeEntityType
    text: string
    position: { start: number; end: number }
    confidence: number
  }>
  detectionTime?: number
}

export interface ValidationResult {
  success: boolean
  error?: string
  isClean: boolean
  remainingEntities?: Array<{
    type: SanitizeEntityType
    text: string
    position: { start: number; end: number }
  }>
  validationTime?: number
}
