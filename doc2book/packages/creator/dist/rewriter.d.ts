/**
 * 内容重写器
 */
import type { ProviderManager } from '@doc2book/providers';
import type { RewriteResult, StyleOptions } from './types';
export declare class ContentRewriter {
    private providerManager;
    constructor(providerManager: ProviderManager);
    rewrite(content: string, options?: StyleOptions & {
        providerId?: string;
    }): Promise<RewriteResult>;
}
