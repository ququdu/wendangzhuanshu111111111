/**
 * HTML 解析器
 * 使用 cheerio 解析 HTML 文档
 */
import type { DocumentFormat } from '@doc2book/shared';
import type { IParser, ParserOptions, ParseResult } from '../types';
/**
 * HTML 解析器类
 */
export declare class HtmlParser implements IParser {
    supportedFormats: DocumentFormat[];
    /**
     * 解析 HTML 文档
     * @param input HTML 内容
     * @param options 解析选项
     */
    parse(input: Buffer | string, options?: ParserOptions): Promise<ParseResult>;
    /**
     * 递归解析 HTML 元素
     */
    private parseElement;
    /**
     * 解析表格
     */
    private parseTable;
}
