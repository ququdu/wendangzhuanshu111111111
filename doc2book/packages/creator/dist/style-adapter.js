"use strict";
/**
 * 风格适配器
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StyleAdapter = void 0;
class StyleAdapter {
    providerManager;
    constructor(providerManager) {
        this.providerManager = providerManager;
    }
    async adapt(content, targetStyle, options) {
        try {
            const styleDesc = this.describeStyle(targetStyle);
            const prompt = `请将以下内容调整为${styleDesc}风格：

${content.substring(0, 8000)}

只输出调整后的内容，不要解释。`;
            const response = await this.providerManager.complete([{ role: 'user', content: prompt }], { providerId: options?.providerId, temperature: 0.5, maxTokens: 4000 });
            if (!response.success || !response.content) {
                return { success: false, error: response.error };
            }
            return { success: true, adaptedContent: response.content };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : '适配失败' };
        }
    }
    describeStyle(style) {
        const parts = [];
        if (style.tone) {
            const toneMap = { formal: '正式', informal: '非正式', academic: '学术', conversational: '对话式' };
            parts.push(toneMap[style.tone] || style.tone);
        }
        if (style.audience) {
            const audienceMap = { general: '大众读者', professional: '专业人士', academic: '学术读者', children: '儿童' };
            parts.push(`面向${audienceMap[style.audience] || style.audience}`);
        }
        if (style.complexity) {
            const complexityMap = { simple: '简单易懂', moderate: '适中', complex: '深入详细' };
            parts.push(complexityMap[style.complexity] || style.complexity);
        }
        return parts.join('、') || '通用';
    }
}
exports.StyleAdapter = StyleAdapter;
