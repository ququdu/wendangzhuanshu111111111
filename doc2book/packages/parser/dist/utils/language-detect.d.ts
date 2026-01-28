/**
 * 语言检测工具
 * 使用 franc 库检测文本语言
 */
/**
 * 语言检测结果
 */
export interface LanguageDetectionResult {
    /** ISO 639-1 语言代码 */
    code: string;
    /** 语言名称 */
    name: string;
    /** 置信度（0-1） */
    confidence: number;
    /** 是否为混合语言 */
    isMixed: boolean;
    /** 检测到的所有语言 */
    allLanguages?: Array<{
        code: string;
        name: string;
        confidence: number;
    }>;
}
/**
 * 检测文本语言
 * @param text 要检测的文本
 * @param options 检测选项
 * @returns 语言检测结果
 */
export declare function detectLanguage(text: string, options?: {
    /** 最小文本长度（默认：10） */
    minLength?: number;
    /** 是否检测多语言（默认：false） */
    detectMultiple?: boolean;
}): LanguageDetectionResult;
/**
 * 获取语言名称
 */
export declare function getLanguageName(code: string): string;
/**
 * 获取支持的语言列表
 */
export declare function getSupportedLanguages(): Array<{
    code: string;
    name: string;
}>;
