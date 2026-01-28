/**
 * 统一文档解析器
 * 根据文件格式自动选择合适的解析器
 */
import type { DocumentFormat, UnifiedAST } from '@doc2book/shared';
import type { ParserOptions, ParseResult } from './types';
/**
 * 统一文档解析器类
 */
export declare class DocumentParser {
    private parsers;
    private imageParser;
    constructor();
    /**
     * 解析文档
     * @param input 文档内容（Buffer 或字符串）
     * @param options 解析选项
     */
    parse(input: Buffer | string, options?: ParserOptions & {
        /** 文件名（用于检测格式） */
        filename?: string;
        /** MIME 类型（用于检测格式） */
        mimeType?: string;
        /** 强制指定格式 */
        format?: DocumentFormat;
    }): Promise<ParseResult>;
    /**
     * 批量解析文档
     * @param documents 文档列表
     * @param options 解析选项
     */
    parseMultiple(documents: Array<{
        input: Buffer | string;
        filename?: string;
        mimeType?: string;
        format?: DocumentFormat;
    }>, options?: ParserOptions): Promise<ParseResult[]>;
    /**
     * 合并多个 AST
     * @param asts AST 列表
     * @param title 合并后的标题
     */
    mergeAsts(asts: UnifiedAST[], title?: string): UnifiedAST;
    /**
     * 检测文档格式
     */
    private detectFormat;
    /**
     * 获取支持的格式列表
     */
    getSupportedFormats(): DocumentFormat[];
    /**
     * 检查是否支持指定格式
     */
    isFormatSupported(format: DocumentFormat): boolean;
    /**
     * 清理资源
     */
    cleanup(): Promise<void>;
}
/**
 * 创建文档解析器实例
 */
export declare function createDocumentParser(): DocumentParser;
