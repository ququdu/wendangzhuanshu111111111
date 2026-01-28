/**
 * KDP 验证器
 * 验证生成的电子书是否符合亚马逊 KDP 标准
 */
import type { BookStructure } from '@doc2book/shared';
import type { ValidationResult } from './types';
/**
 * KDP 规范要求
 */
declare const KDP_REQUIREMENTS: {
    cover: {
        minWidth: number;
        maxWidth: number;
        minHeight: number;
        maxHeight: number;
        aspectRatioMin: number;
        aspectRatioMax: number;
        maxFileSize: number;
    };
    content: {
        minWordCount: number;
        maxFileSize: number;
    };
    metadata: {
        titleMaxLength: number;
        subtitleMaxLength: number;
        descriptionMinLength: number;
        descriptionMaxLength: number;
        keywordsMax: number;
    };
};
/**
 * KDP 验证器类
 */
export declare class KdpValidator {
    /**
     * 验证书籍结构
     */
    validate(book: BookStructure): ValidationResult;
    /**
     * 验证 EPUB 文件
     */
    validateEpub(epubPath: string): Promise<ValidationResult>;
    /**
     * 验证封面图片
     */
    validateCover(coverPath: string): Promise<ValidationResult>;
    /**
     * 验证元数据
     */
    private validateMetadata;
    /**
     * 验证内容
     */
    private validateContent;
    /**
     * 验证结构
     */
    private validateStructure;
    /**
     * 获取 KDP 要求
     */
    getRequirements(): typeof KDP_REQUIREMENTS;
}
export {};
