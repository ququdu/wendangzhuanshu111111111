/**
 * PDF 解析器
 * 支持文本提取和 OCR 识别
 */
import type { DocumentFormat } from '@doc2book/shared';
import type { IParser, ParserOptions, ParseResult } from '../types';
/**
 * PDF 解析器类
 */
export declare class PdfParser implements IParser {
    supportedFormats: DocumentFormat[];
    /**
     * 解析 PDF 文档
     * @param input PDF 文件的 Buffer
     * @param options 解析选项
     */
    parse(input: Buffer | string, options?: ParserOptions): Promise<ParseResult>;
    /**
     * 解析文本内容，识别结构
     */
    private parseContent;
    /**
     * 判断是否可能是标题
     */
    private isLikelyHeading;
    /**
     * 检测标题级别
     */
    private detectHeadingLevel;
    /**
     * 判断是否是列表项
     */
    private isListItem;
}
