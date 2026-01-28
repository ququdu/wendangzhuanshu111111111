/**
 * 去痕迹验证器
 */

import type { SanitizeEntityType } from '@doc2book/shared'
import type { ValidationResult } from './types'
import { EntityDetector } from './entity-detector'
import type { ProviderManager } from '@doc2book/providers'

export class SanitizeValidator {
  private detector: EntityDetector

  constructor(providerManager: ProviderManager) {
    this.detector = new EntityDetector(providerManager)
  }

  async validate(text: string): Promise<ValidationResult> {
    const startTime = Date.now()

    try {
      const detection = await this.detector.detect(text, { useAI: false })

      if (!detection.success) {
        return {
          success: false,
          error: detection.error,
          isClean: false,
          validationTime: Date.now() - startTime,
        }
      }

      const remainingEntities = (detection.entities || [])
        .filter(e => e.confidence > 0.8)
        .map(e => ({
          type: e.type,
          text: e.text,
          position: e.position,
        }))

      return {
        success: true,
        isClean: remainingEntities.length === 0,
        remainingEntities,
        validationTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '验证失败',
        isClean: false,
        validationTime: Date.now() - startTime,
      }
    }
  }
}
