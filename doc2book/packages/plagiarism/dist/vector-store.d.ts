/**
 * 向量存储
 * 用于存储和检索文本向量，支持相似度搜索
 */
import type { ProviderManager } from '@doc2book/providers';
import type { VectorEntry } from './types';
/**
 * 向量存储配置
 */
export interface VectorStoreConfig {
    /** 向量维度 */
    dimensions?: number;
    /** 相似度阈值 */
    similarityThreshold?: number;
}
/**
 * 向量存储类
 * 简单的内存向量存储实现
 */
export declare class VectorStore {
    private entries;
    private providerManager;
    private dimensions;
    private similarityThreshold;
    constructor(providerManager: ProviderManager, config?: VectorStoreConfig);
    /**
     * 添加文本到向量存储
     */
    add(text: string, metadata?: Record<string, any>): Promise<string>;
    /**
     * 批量添加文本
     */
    addBatch(items: Array<{
        text: string;
        metadata?: Record<string, any>;
    }>): Promise<string[]>;
    /**
     * 搜索相似文本
     */
    search(query: string, options?: {
        limit?: number;
        threshold?: number;
    }): Promise<Array<{
        entry: VectorEntry;
        similarity: number;
    }>>;
    /**
     * 检查文本是否与存储中的内容相似
     */
    checkSimilarity(text: string, threshold?: number): Promise<{
        isSimilar: boolean;
        matches: Array<{
            entry: VectorEntry;
            similarity: number;
        }>;
    }>;
    /**
     * 删除条目
     */
    delete(id: string): boolean;
    /**
     * 清空存储
     */
    clear(): void;
    /**
     * 获取条目数量
     */
    size(): number;
    /**
     * 获取所有条目
     */
    getAll(): VectorEntry[];
    /**
     * 获取文本的嵌入向量
     */
    private getEmbedding;
    /**
     * 简单的文本哈希向量
     */
    private simpleTextHash;
    /**
     * 归一化向量
     */
    private normalizeVector;
    /**
     * 计算余弦相似度
     */
    private cosineSimilarity;
    /**
     * 导出存储数据
     */
    export(): VectorEntry[];
    /**
     * 导入存储数据
     */
    import(entries: VectorEntry[]): void;
}
