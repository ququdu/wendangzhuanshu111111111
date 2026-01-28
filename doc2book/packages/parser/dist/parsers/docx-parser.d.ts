/**
 * Word 文档解析器
 * 使用 mammoth 将 .docx 转换为 HTML，然后解析
 */
import type { DocumentFormat } from '@doc2book/shared';
import type { IParser, ParserOptions, ParseResult } from '../types';
/**
 * Word 文档解析器类
 */
export declare class DocxParser implements IParser {
    supportedFormats: DocumentFormat[];
    /**
     * 解析 Word 文档
     * @param input Word 文件的 Buffer
     * @param options 解析选项
     */
    parse(input: Buffer | string, options?: ParserOptions): Promise<ParseResult>;
    /**
     * 解析 HTML 内容
     */
    private parseHtmlContent;
    /**
     * 解析表格
     */
    private parseTable;
}
