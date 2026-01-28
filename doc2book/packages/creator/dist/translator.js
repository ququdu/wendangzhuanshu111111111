"use strict";
/**
 * 翻译器
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Translator = void 0;
class Translator {
    providerManager;
    constructor(providerManager) {
        this.providerManager = providerManager;
    }
    async translate(content, targetLanguage, options) {
        const startTime = Date.now();
        try {
            // 优先使用 DeepL
            const deeplResult = await this.providerManager.translate(content, {
                targetLanguage,
                sourceLanguage: options?.sourceLanguage,
                preserveFormatting: true,
            });
            if (deeplResult.success && deeplResult.translatedText) {
                return {
                    success: true,
                    translatedContent: deeplResult.translatedText,
                    sourceLanguage: deeplResult.detectedSourceLanguage || options?.sourceLanguage,
                    targetLanguage,
                    translateTime: Date.now() - startTime,
                };
            }
            // 回退到 AI 翻译
            const aiResult = await this.providerManager.translateWithAI(content, {
                targetLanguage,
                sourceLanguage: options?.sourceLanguage,
                providerId: options?.providerId,
            });
            if (aiResult.success && aiResult.translatedText) {
                return {
                    success: true,
                    translatedContent: aiResult.translatedText,
                    sourceLanguage: options?.sourceLanguage,
                    targetLanguage,
                    translateTime: Date.now() - startTime,
                };
            }
            return { success: false, error: aiResult.error || '翻译失败', translateTime: Date.now() - startTime };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : '翻译失败', translateTime: Date.now() - startTime };
        }
    }
}
exports.Translator = Translator;
