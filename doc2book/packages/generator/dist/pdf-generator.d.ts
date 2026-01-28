/**
 * PDF 生成器
 * 生成符合打印标准的 PDF 文件
 */
import type { BookStructure } from '@doc2book/shared';
import type { PdfOptions } from './types';
/**
 * PDF 生成器类
 */
export declare class PdfGenerator {
    private options;
    constructor(options?: Partial<PdfOptions>);
    /**
     * 生成 PDF
     */
    generate(book: BookStructure, outputPath: string): Promise<{
        success: boolean;
        error?: string;
        size?: number;
    }>;
    /**
     * 生成内容
     */
    private generateContent;
    /**
     * 生成标题页
     */
    private generateTitlePage;
    /**
     * 生成版权页
     */
    private generateCopyrightPage;
    /**
     * 生成目录
     */
    private generateTableOfContents;
    /**
     * 生成章节
     */
    private generateChapter;
    /**
     * 渲染内容节点
     */
    private renderNode;
    /**
     * 渲染表格
     */
    private renderTable;
    /**
     * 添加页码
     */
    private addPageNumbers;
}
