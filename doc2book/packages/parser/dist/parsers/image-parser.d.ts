/**
 * 图片解析器
 * 使用 Tesseract.js 进行 OCR 识别
 */
import type { DocumentFormat } from '@doc2book/shared';
import type { IParser, ParserOptions, ParseResult } from '../types';
/**
 * 图片解析器类
 */
export declare class ImageParser implements IParser {
    supportedFormats: DocumentFormat[];
    private worker;
    /**
     * 解析图片（OCR）
     * @param input 图片数据（Buffer 或 base64 字符串）
     * @param options 解析选项
     */
    parse(input: Buffer | string, options?: ParserOptions): Promise<ParseResult>;
    /**
     * 解析 OCR 结果
     */
    private parseOcrResult;
    /**
     * 判断是否可能是标题
     */
    private isLikelyHeading;
    /**
     * 终止 worker
     */
    terminate(): Promise<void>;
}
