/**
 * 去 AI 化处理器
 */
import type { ProviderManager } from '@doc2book/providers';
import type { HumanizeResult } from './types';
export declare class Humanizer {
    private providerManager;
    constructor(providerManager: ProviderManager);
    humanize(content: string, options?: {
        providerId?: string;
    }): Promise<HumanizeResult>;
}
