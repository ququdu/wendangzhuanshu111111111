/**
 * 知识图谱构建器
 */
import type { KnowledgePoint } from '@doc2book/shared';
import type { GraphBuildResult } from './types';
export declare class GraphBuilder {
    build(knowledgePoints: KnowledgePoint[]): GraphBuildResult;
}
