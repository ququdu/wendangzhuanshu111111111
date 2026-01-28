"use strict";
/**
 * 去痕迹验证器
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SanitizeValidator = void 0;
const entity_detector_1 = require("./entity-detector");
class SanitizeValidator {
    detector;
    constructor(providerManager) {
        this.detector = new entity_detector_1.EntityDetector(providerManager);
    }
    async validate(text) {
        const startTime = Date.now();
        try {
            const detection = await this.detector.detect(text, { useAI: false });
            if (!detection.success) {
                return {
                    success: false,
                    error: detection.error,
                    isClean: false,
                    validationTime: Date.now() - startTime,
                };
            }
            const remainingEntities = (detection.entities || [])
                .filter(e => e.confidence > 0.8)
                .map(e => ({
                type: e.type,
                text: e.text,
                position: e.position,
            }));
            return {
                success: true,
                isClean: remainingEntities.length === 0,
                remainingEntities,
                validationTime: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '验证失败',
                isClean: false,
                validationTime: Date.now() - startTime,
            };
        }
    }
}
exports.SanitizeValidator = SanitizeValidator;
