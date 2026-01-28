/**
 * 相似度检测器
 */
import type { ProviderManager } from '@doc2book/providers';
import type { SimilarityResult, CheckOptions } from './types';
export declare class SimilarityChecker {
    private providerManager;
    constructor(providerManager: ProviderManager);
    /**
     * 检查文本相似度
     */
    check(text: string, sources: string[], options?: CheckOptions): Promise<SimilarityResult>;
    /**
     * 使用 AI 计算相似度
     */
    private calculateSimilarity;
    /**
     * Jaro-Winkler 相似度算法
     */
    private jaroWinkler;
    /**
     * 将文本分块
     */
    private splitIntoChunks;
    /**
     * 在源文本中找到匹配的部分
     */
    private findMatchingSection;
}
