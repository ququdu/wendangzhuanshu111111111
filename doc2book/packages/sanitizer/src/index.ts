/**
 * @doc2book/sanitizer
 * 去痕迹处理模块 - 移除原资料中的广告、人名、品牌等
 */

export { EntityDetector } from './entity-detector'
export { ContentReplacer } from './replacer'
export { SanitizeValidator } from './validator'
export { Sanitizer } from './sanitizer'

export type { SanitizeOptions, DetectionResult, ValidationResult } from './types'
