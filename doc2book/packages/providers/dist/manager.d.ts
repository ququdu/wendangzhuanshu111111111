/**
 * Provider 管理器
 * 统一管理多个 AI Provider，支持故障转移和负载均衡
 */
import type { ProviderConfig, ProviderManagerConfig } from '@doc2book/shared';
import type { IProvider, ProviderMessage, ProviderResponse, CompletionOptions, ProviderStatus, TranslationOptions, TranslationResult } from './types';
/**
 * Provider 管理器类
 */
export declare class ProviderManager {
    private providers;
    private rateLimiters;
    private providerConfigs;
    private defaultProviderId;
    private fallbackChain;
    private retryAttempts;
    private timeout;
    constructor(config: ProviderManagerConfig);
    /**
     * 添加 Provider
     */
    addProvider(config: ProviderConfig): void;
    /**
     * 移除 Provider
     */
    removeProvider(id: string): void;
    /**
     * 获取 Provider
     */
    getProvider(id: string): IProvider | undefined;
    /**
     * 获取所有 Provider 状态
     */
    getProviderStatuses(): Promise<ProviderStatus[]>;
    /**
     * 发送补全请求
     */
    complete(messages: ProviderMessage[], options?: CompletionOptions & {
        providerId?: string;
    }): Promise<ProviderResponse>;
    /**
     * 翻译文本
     */
    translate(text: string, options: TranslationOptions & {
        providerId?: string;
    }): Promise<TranslationResult>;
    /**
     * 使用 AI 进行翻译（通过补全 API）
     */
    translateWithAI(text: string, options: TranslationOptions & {
        providerId?: string;
    }): Promise<TranslationResult>;
    /**
     * 创建 Provider 实例
     */
    private createProvider;
    /**
     * 查找翻译 Provider
     */
    private findTranslationProvider;
    /**
     * 带重试的执行
     */
    private executeWithRetry;
}
/**
 * 创建 Provider 管理器
 */
export declare function createProviderManager(config: ProviderManagerConfig): ProviderManager;
