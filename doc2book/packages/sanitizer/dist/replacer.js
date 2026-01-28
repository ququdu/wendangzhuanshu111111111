"use strict";
/**
 * 内容替换器
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentReplacer = void 0;
class ContentReplacer {
    defaultReplacements = {
        person: '某人',
        brand: '某品牌',
        company: '某公司',
        product: '某产品',
        contact: '[联系方式已移除]',
        copyright: '',
        ad: '',
        url: '[链接已移除]',
    };
    replace(text, entities, options) {
        const replacements = [];
        const customMap = options?.replacementMap || {};
        // 按位置倒序排列，从后往前替换
        const sortedEntities = [...entities].sort((a, b) => b.position.start - a.position.start);
        let result = text;
        for (const entity of sortedEntities) {
            const replacement = customMap[entity.text] ||
                this.defaultReplacements[entity.type] ||
                '';
            // 执行替换
            result = result.substring(0, entity.position.start) +
                replacement +
                result.substring(entity.position.end);
            replacements.push({
                entityType: entity.type,
                original: entity.text,
                replacement,
                position: entity.position,
            });
        }
        return {
            originalText: text,
            sanitizedText: result,
            replacements: replacements.reverse(),
        };
    }
}
exports.ContentReplacer = ContentReplacer;
