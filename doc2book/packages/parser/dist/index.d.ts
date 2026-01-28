/**
 * @doc2book/parser
 * 文档解析模块 - 支持多种文档格式的解析，输出统一 AST
 *
 * 支持的格式：
 * - PDF（文本提取 + OCR）
 * - Word（.docx）
 * - Markdown
 * - HTML
 * - 纯文本
 * - 图片（OCR）
 */
export { PdfParser } from './parsers/pdf-parser';
export { DocxParser } from './parsers/docx-parser';
export { MarkdownParser } from './parsers/markdown-parser';
export { HtmlParser } from './parsers/html-parser';
export { TxtParser } from './parsers/txt-parser';
export { ImageParser } from './parsers/image-parser';
export { detectLanguage } from './utils/language-detect';
export { AstBuilder } from './utils/ast-builder';
export { DocumentParser } from './document-parser';
export type { ParserOptions, ParseResult } from './types';
