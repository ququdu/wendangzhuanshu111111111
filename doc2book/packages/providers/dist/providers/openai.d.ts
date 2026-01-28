/**
 * OpenAI Provider
 */
import type { ProviderType } from '@doc2book/shared';
import type { IProvider, ProviderMessage, ProviderResponse, CompletionOptions } from '../types';
/**
 * OpenAI Provider 配置
 */
export interface OpenAIProviderConfig {
    apiKey: string;
    baseUrl?: string;
    organization?: string;
    defaultModel?: string;
}
/**
 * OpenAI Provider 实现
 */
export declare class OpenAIProvider implements IProvider {
    type: ProviderType;
    name: string;
    private client;
    private defaultModel;
    constructor(config: OpenAIProviderConfig);
    /**
     * 检查 Provider 是否可用
     */
    isAvailable(): Promise<boolean>;
    /**
     * 获取可用模型列表
     */
    getModels(): Promise<string[]>;
    /**
     * 发送补全请求
     */
    complete(messages: ProviderMessage[], options?: CompletionOptions): Promise<ProviderResponse>;
}
