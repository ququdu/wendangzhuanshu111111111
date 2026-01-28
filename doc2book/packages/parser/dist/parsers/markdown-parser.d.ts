/**
 * Markdown 解析器
 * 使用 marked 解析 Markdown 文档
 */
import type { DocumentFormat } from '@doc2book/shared';
import type { IParser, ParserOptions, ParseResult } from '../types';
/**
 * Markdown 解析器类
 */
export declare class MarkdownParser implements IParser {
    supportedFormats: DocumentFormat[];
    /**
     * 解析 Markdown 文档
     * @param input Markdown 文本内容
     * @param options 解析选项
     */
    parse(input: Buffer | string, options?: ParserOptions): Promise<ParseResult>;
    /**
     * 解析 marked tokens
     */
    private parseTokens;
    /**
     * 解析单个 token
     */
    private parseToken;
    /**
     * 从 token 中提取纯文本
     */
    private extractText;
    /**
     * 解析表格
     */
    private parseTable;
}
