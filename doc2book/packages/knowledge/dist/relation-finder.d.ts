/**
 * 关系发现器
 */
import type { KnowledgePoint } from '@doc2book/shared';
import type { ProviderManager } from '@doc2book/providers';
import type { RelationResult } from './types';
export declare class RelationFinder {
    private providerManager;
    constructor(providerManager: ProviderManager);
    findRelations(knowledgePoints: KnowledgePoint[]): Promise<RelationResult>;
}
