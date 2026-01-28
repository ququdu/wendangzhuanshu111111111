/**
 * 摘要生成器
 * 生成文档的各种类型摘要
 */
import type { UnifiedAST } from '@doc2book/shared';
import type { ProviderManager } from '@doc2book/providers';
import type { SummaryResult, SummaryOptions } from './types';
/**
 * 摘要生成器类
 */
export declare class Summarizer {
    private providerManager;
    constructor(providerManager: ProviderManager);
    /**
     * 生成摘要
     */
    summarize(ast: UnifiedAST, options?: SummaryOptions): Promise<SummaryResult>;
    /**
     * 生成简短摘要（1-2句）
     */
    private generateBriefSummary;
    /**
     * 生成标准摘要（1段）
     */
    private generateStandardSummary;
    /**
     * 生成详细摘要（多段）
     */
    private generateDetailedSummary;
    /**
     * 生成要点列表
     */
    private generateBulletPoints;
    /**
     * 提取文本内容
     */
    private extractText;
    /**
     * 截断文本
     */
    private truncateText;
}
