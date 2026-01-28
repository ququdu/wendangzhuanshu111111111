"use strict";
/**
 * 去 AI 化处理器
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Humanizer = void 0;
class Humanizer {
    providerManager;
    constructor(providerManager) {
        this.providerManager = providerManager;
    }
    async humanize(content, options) {
        const startTime = Date.now();
        try {
            const prompt = `请将以下文本进行"去AI化"处理，使其读起来更像人类写的：

${content.substring(0, 8000)}

处理要点：
1. 减少过度使用"的"字
2. 避免被动语态，改用主动语态
3. 减少翻译腔，使用更自然的中文表达
4. 适当使用口语化表达
5. 增加语气词和过渡词
6. 避免过于工整的句式
7. 保持原意不变

只输出处理后的文本，不要解释。`;
            const response = await this.providerManager.complete([{ role: 'user', content: prompt }], { providerId: options?.providerId, temperature: 0.6, maxTokens: 4000 });
            if (!response.success || !response.content) {
                return { success: false, error: response.error, humanizeTime: Date.now() - startTime };
            }
            return {
                success: true,
                humanizedContent: response.content,
                humanizeTime: Date.now() - startTime,
            };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : '处理失败', humanizeTime: Date.now() - startTime };
        }
    }
}
exports.Humanizer = Humanizer;
