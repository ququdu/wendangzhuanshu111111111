/**
 * 知识点提取器
 */
import type { UnifiedAST } from '@doc2book/shared';
import type { ProviderManager } from '@doc2book/providers';
import type { ExtractionResult } from './types';
export declare class KnowledgeExtractor {
    private providerManager;
    constructor(providerManager: ProviderManager);
    extract(ast: UnifiedAST): Promise<ExtractionResult>;
    private extractText;
    private parseResponse;
}
