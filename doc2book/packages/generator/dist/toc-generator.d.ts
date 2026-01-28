/**
 * 目录生成器
 * 从书籍结构生成目录
 */
import type { BookStructure, TOCEntry } from '@doc2book/shared';
import type { TocItem } from './types';
/**
 * 目录生成器配置
 */
export interface TocGeneratorConfig {
    /** 最大深度 */
    maxDepth?: number;
    /** 是否包含页码 */
    includePageNumbers?: boolean;
    /** 是否包含前言 */
    includeFrontMatter?: boolean;
    /** 是否包含附录 */
    includeBackMatter?: boolean;
}
/**
 * 目录生成器类
 */
export declare class TocGenerator {
    private config;
    constructor(config?: TocGeneratorConfig);
    /**
     * 生成目录
     */
    generate(book: BookStructure): TOCEntry[];
    /**
     * 生成扁平化目录（用于 EPUB nav）
     */
    generateFlat(book: BookStructure): TocItem[];
    /**
     * 将章节转换为目录项
     */
    private chapterToTocEntry;
    /**
     * 扁平化目录
     */
    private flattenToc;
    /**
     * 计算目录深度
     */
    calculateDepth(entries: TOCEntry[]): number;
    /**
     * 获取目录项数量
     */
    countEntries(entries: TOCEntry[]): number;
}
