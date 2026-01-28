/**
 * 翻译器
 */
import type { ProviderManager } from '@doc2book/providers';
import type { TranslateResult } from './types';
export declare class Translator {
    private providerManager;
    constructor(providerManager: ProviderManager);
    translate(content: string, targetLanguage: string, options?: {
        providerId?: string;
        sourceLanguage?: string;
    }): Promise<TranslateResult>;
}
