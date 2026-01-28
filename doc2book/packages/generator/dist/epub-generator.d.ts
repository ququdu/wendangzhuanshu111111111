/**
 * EPUB 生成器
 * 生成符合 EPUB 3.0 标准的电子书
 */
import type { BookStructure } from '@doc2book/shared';
import type { EpubOptions } from './types';
/**
 * EPUB 生成器类
 */
export declare class EpubGenerator {
    private options;
    constructor(options?: Partial<EpubOptions>);
    /**
     * 生成 EPUB
     */
    generate(book: BookStructure, outputPath: string): Promise<{
        success: boolean;
        error?: string;
        size?: number;
    }>;
    /**
     * 准备章节内容
     */
    private prepareChapters;
    /**
     * 将章节转换为内容
     */
    private chapterToContent;
    /**
     * 将内容节点转换为 HTML
     */
    private contentNodesToHtml;
    /**
     * 将单个节点转换为 HTML
     */
    private nodeToHtml;
    /**
     * 将表格转换为 HTML
     */
    private tableToHtml;
    /**
     * 生成目录
     */
    private generateToc;
    /**
     * 构建 EPUB 文件
     */
    private buildEpub;
    /**
     * 生成 container.xml
     */
    private generateContainerXml;
    /**
     * 生成 content.opf
     */
    private generateContentOpf;
    /**
     * 生成 toc.ncx
     */
    private generateTocNcx;
    /**
     * 生成 nav.xhtml
     */
    private generateNavXhtml;
    /**
     * 生成样式表
     */
    private generateStyles;
    /**
     * HTML 转义
     */
    private escapeHtml;
}
