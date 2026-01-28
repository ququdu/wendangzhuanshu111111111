/**
 * 风格适配器
 */
import type { ProviderManager } from '@doc2book/providers';
import type { StyleOptions } from './types';
export declare class StyleAdapter {
    private providerManager;
    constructor(providerManager: ProviderManager);
    adapt(content: string, targetStyle: StyleOptions, options?: {
        providerId?: string;
    }): Promise<{
        success: boolean;
        error?: string;
        adaptedContent?: string;
    }>;
    private describeStyle;
}
