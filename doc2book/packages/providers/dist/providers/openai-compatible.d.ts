/**
 * OpenAI 兼容 Provider
 * 支持任何兼容 OpenAI API 的服务
 */
import type { ProviderType } from '@doc2book/shared';
import type { IProvider, ProviderMessage, ProviderResponse, CompletionOptions } from '../types';
/**
 * OpenAI 兼容 Provider 配置
 */
export interface OpenAICompatibleProviderConfig {
    /** API 密钥 */
    apiKey: string;
    /** API 基础 URL */
    baseUrl: string;
    /** Provider 名称 */
    name?: string;
    /** 默认模型 */
    defaultModel?: string;
    /** 可用模型列表 */
    models?: string[];
}
/**
 * OpenAI 兼容 Provider 实现
 */
export declare class OpenAICompatibleProvider implements IProvider {
    type: ProviderType;
    name: string;
    private client;
    private defaultModel;
    private availableModels;
    constructor(config: OpenAICompatibleProviderConfig);
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
