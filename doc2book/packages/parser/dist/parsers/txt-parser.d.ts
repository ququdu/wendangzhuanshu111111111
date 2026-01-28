/**
 * 纯文本解析器
 */
import type { DocumentFormat } from '@doc2book/shared';
import type { IParser, ParserOptions, ParseResult } from '../types';
/**
 * 纯文本解析器类
 */
export declare class TxtParser implements IParser {
    supportedFormats: DocumentFormat[];
    /**
     * 解析纯文本文档
     * @param input 文本内容
     * @param options 解析选项
     */
    parse(input: Buffer | string, options?: ParserOptions): Promise<ParseResult>;
    /**
     * 解析文本内容
     */
    private parseText;
    /**
     * 判断是否可能是标题
     */
    private isLikelyHeading;
    /**
     * 检测标题级别
     */
    private detectHeadingLevel;
    /**
     * 提取列表项
     */
    private extractListItems;
}
