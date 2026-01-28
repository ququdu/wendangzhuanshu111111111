"use strict";
/**
 * 统一去痕迹处理器
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sanitizer = void 0;
const entity_detector_1 = require("./entity-detector");
const replacer_1 = require("./replacer");
const validator_1 = require("./validator");
class Sanitizer {
    detector;
    replacer;
    validator;
    constructor(providerManager) {
        this.detector = new entity_detector_1.EntityDetector(providerManager);
        this.replacer = new replacer_1.ContentReplacer();
        this.validator = new validator_1.SanitizeValidator(providerManager);
    }
    async sanitize(ast, options) {
        try {
            let totalReplacements = 0;
            const sanitizedContent = await this.sanitizeNodes(ast.content, options);
            // 计算替换数量
            totalReplacements = this.countReplacements(ast.content, sanitizedContent);
            return {
                success: true,
                sanitizedAst: {
                    ...ast,
                    content: sanitizedContent,
                },
                totalReplacements,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '去痕迹处理失败',
            };
        }
    }
    async sanitizeNodes(nodes, options) {
        const result = [];
        for (const node of nodes) {
            const sanitizedNode = { ...node };
            if (node.text) {
                const detection = await this.detector.detect(node.text, options);
                if (detection.success && detection.entities && detection.entities.length > 0) {
                    const replaced = this.replacer.replace(node.text, detection.entities, options);
                    sanitizedNode.text = replaced.sanitizedText;
                }
            }
            if (node.children) {
                sanitizedNode.children = await this.sanitizeNodes(node.children, options);
            }
            result.push(sanitizedNode);
        }
        return result;
    }
    countReplacements(original, sanitized) {
        let count = 0;
        for (let i = 0; i < original.length; i++) {
            if (original[i].text !== sanitized[i]?.text) {
                count++;
            }
            if (original[i].children && sanitized[i]?.children) {
                count += this.countReplacements(original[i].children, sanitized[i].children);
            }
        }
        return count;
    }
}
exports.Sanitizer = Sanitizer;
