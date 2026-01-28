/**
 * 抄袭检测报告生成器
 */
import type { ProviderManager } from '@doc2book/providers';
import type { PlagiarismReport, CheckOptions } from './types';
import { VectorStore } from './vector-store';
/**
 * 报告生成器配置
 */
export interface ReportGeneratorConfig {
    /** 相似度阈值 */
    threshold?: number;
    /** 是否生成改写建议 */
    generateSuggestions?: boolean;
    /** 报告语言 */
    language?: string;
}
/**
 * 报告生成器类
 */
export declare class ReportGenerator {
    private providerManager;
    private similarityChecker;
    private vectorStore;
    private config;
    constructor(providerManager: ProviderManager, config?: ReportGeneratorConfig);
    /**
     * 生成抄袭检测报告
     */
    generateReport(text: string, sources: string[], options?: CheckOptions): Promise<PlagiarismReport>;
    /**
     * 处理标记的部分
     */
    private processFlaggedSections;
    /**
     * 生成改写建议
     */
    private generateSuggestion;
    /**
     * 生成报告摘要
     */
    private generateSummary;
    /**
     * 快速检查（不生成详细报告）
     */
    quickCheck(text: string, sources: string[]): Promise<{
        isPlagiarized: boolean;
        score: number;
    }>;
    /**
     * 获取向量存储实例
     */
    getVectorStore(): VectorStore;
}
