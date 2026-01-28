/**
 * 章节分割器
 * 智能分割文档为章节
 */
import type { UnifiedAST } from '@doc2book/shared';
import type { ProviderManager } from '@doc2book/providers';
import type { ChapterSplitResult, ChapterSplitOptions } from './types';
/**
 * 章节分割器类
 */
export declare class ChapterSplitter {
    private providerManager;
    constructor(providerManager: ProviderManager);
    /**
     * 分割文档为章节
     */
    split(ast: UnifiedAST, options?: ChapterSplitOptions): Promise<ChapterSplitResult>;
    /**
     * 基于规则分割章节
     */
    private splitByRules;
    /**
     * 判断是否是章节边界
     */
    private isChapterBoundary;
    /**
     * 平衡章节长度
     */
    private balanceChapters;
    /**
     * 拆分过长的章节
     */
    private splitLongChapter;
    /**
     * 使用 AI 优化章节分割
     */
    private optimizeWithAI;
    /**
     * 生成建议的书籍结构
     */
    private generateSuggestedStructure;
    /**
     * 建议部分划分
     */
    private suggestParts;
    /**
     * 计算字数
     */
    private countWords;
    /**
     * 数字转中文
     */
    private toChineseNumber;
}
