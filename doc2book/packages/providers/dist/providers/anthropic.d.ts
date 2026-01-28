/**
 * Anthropic (Claude) Provider
 */
import type { ProviderType } from '@doc2book/shared';
import type { IProvider, ProviderMessage, ProviderResponse, CompletionOptions } from '../types';
/**
 * Anthropic Provider 配置
 */
export interface AnthropicProviderConfig {
    apiKey: string;
    baseUrl?: string;
    defaultModel?: string;
}
/**
 * Anthropic Provider 实现
 */
export declare class AnthropicProvider implements IProvider {
    type: ProviderType;
    name: string;
    private client;
    private defaultModel;
    constructor(config: AnthropicProviderConfig);
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
