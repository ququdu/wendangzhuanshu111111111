/**
 * 统一书籍生成器
 * 整合所有生成功能
 */
import type { BookStructure } from '@doc2book/shared';
import type { GeneratorOptions, GeneratorResult, ValidationResult } from './types';
import { EpubGenerator } from './epub-generator';
import { PdfGenerator } from './pdf-generator';
import { TocGenerator } from './toc-generator';
import { CoverGenerator } from './cover-generator';
import { KdpValidator } from './kdp-validator';
/**
 * 书籍生成器类
 */
export declare class BookGenerator {
    private epubGenerator;
    private pdfGenerator;
    private tocGenerator;
    private coverGenerator;
    private kdpValidator;
    constructor();
    /**
     * 生成书籍
     */
    generate(book: BookStructure, options: GeneratorOptions): Promise<GeneratorResult>;
    /**
     * 生成封面
     */
    generateCover(book: BookStructure, outputPath: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * 验证书籍
     */
    validate(book: BookStructure): ValidationResult;
    /**
     * 验证 EPUB 文件
     */
    validateEpub(epubPath: string): Promise<ValidationResult>;
    /**
     * 获取 EPUB 生成器
     */
    getEpubGenerator(): EpubGenerator;
    /**
     * 获取 PDF 生成器
     */
    getPdfGenerator(): PdfGenerator;
    /**
     * 获取目录生成器
     */
    getTocGenerator(): TocGenerator;
    /**
     * 获取封面生成器
     */
    getCoverGenerator(): CoverGenerator;
    /**
     * 获取 KDP 验证器
     */
    getKdpValidator(): KdpValidator;
}
/**
 * 创建书籍生成器实例
 */
export declare function createBookGenerator(): BookGenerator;
