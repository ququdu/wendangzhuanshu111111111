/**
 * DeepL 翻译 Provider
 */
import type { ProviderType } from '@doc2book/shared';
import type { IProvider, ProviderMessage, ProviderResponse, CompletionOptions, TranslationOptions, TranslationResult } from '../types';
/**
 * DeepL Provider 配置
 */
export interface DeepLProviderConfig {
    /** API 密钥 */
    apiKey: string;
    /** 是否使用免费版 API */
    useFreeApi?: boolean;
}
/**
 * DeepL Provider 实现
 */
export declare class DeepLProvider implements IProvider {
    type: ProviderType;
    name: string;
    private apiKey;
    private baseUrl;
    constructor(config: DeepLProviderConfig);
    /**
     * 检查 Provider 是否可用
     */
    isAvailable(): Promise<boolean>;
    /**
     * 获取可用模型列表（DeepL 不使用模型概念）
     */
    getModels(): Promise<string[]>;
    /**
     * 发送补全请求（DeepL 不支持，返回错误）
     */
    complete(messages: ProviderMessage[], options?: CompletionOptions): Promise<ProviderResponse>;
    /**
     * 翻译文本
     */
    translate(text: string, options: TranslationOptions): Promise<TranslationResult>;
    /**
     * 获取使用量信息
     */
    getUsage(): Promise<{
        characterCount: number;
        characterLimit: number;
    } | null>;
    /**
     * 获取支持的语言列表
     */
    getSupportedLanguages(): Promise<Array<{
        code: string;
        name: string;
    }>>;
}
