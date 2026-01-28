"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentParser = exports.AstBuilder = exports.detectLanguage = exports.ImageParser = exports.TxtParser = exports.HtmlParser = exports.MarkdownParser = exports.DocxParser = exports.PdfParser = void 0;
// 解析器
var pdf_parser_1 = require("./parsers/pdf-parser");
Object.defineProperty(exports, "PdfParser", { enumerable: true, get: function () { return pdf_parser_1.PdfParser; } });
var docx_parser_1 = require("./parsers/docx-parser");
Object.defineProperty(exports, "DocxParser", { enumerable: true, get: function () { return docx_parser_1.DocxParser; } });
var markdown_parser_1 = require("./parsers/markdown-parser");
Object.defineProperty(exports, "MarkdownParser", { enumerable: true, get: function () { return markdown_parser_1.MarkdownParser; } });
var html_parser_1 = require("./parsers/html-parser");
Object.defineProperty(exports, "HtmlParser", { enumerable: true, get: function () { return html_parser_1.HtmlParser; } });
var txt_parser_1 = require("./parsers/txt-parser");
Object.defineProperty(exports, "TxtParser", { enumerable: true, get: function () { return txt_parser_1.TxtParser; } });
var image_parser_1 = require("./parsers/image-parser");
Object.defineProperty(exports, "ImageParser", { enumerable: true, get: function () { return image_parser_1.ImageParser; } });
// 工具函数
var language_detect_1 = require("./utils/language-detect");
Object.defineProperty(exports, "detectLanguage", { enumerable: true, get: function () { return language_detect_1.detectLanguage; } });
var ast_builder_1 = require("./utils/ast-builder");
Object.defineProperty(exports, "AstBuilder", { enumerable: true, get: function () { return ast_builder_1.AstBuilder; } });
// 统一解析器
var document_parser_1 = require("./document-parser");
Object.defineProperty(exports, "DocumentParser", { enumerable: true, get: function () { return document_parser_1.DocumentParser; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7OztHQVdHOzs7QUFFSCxNQUFNO0FBQ04sbURBQWdEO0FBQXZDLHVHQUFBLFNBQVMsT0FBQTtBQUNsQixxREFBa0Q7QUFBekMseUdBQUEsVUFBVSxPQUFBO0FBQ25CLDZEQUEwRDtBQUFqRCxpSEFBQSxjQUFjLE9BQUE7QUFDdkIscURBQWtEO0FBQXpDLHlHQUFBLFVBQVUsT0FBQTtBQUNuQixtREFBZ0Q7QUFBdkMsdUdBQUEsU0FBUyxPQUFBO0FBQ2xCLHVEQUFvRDtBQUEzQywyR0FBQSxXQUFXLE9BQUE7QUFFcEIsT0FBTztBQUNQLDJEQUF3RDtBQUEvQyxpSEFBQSxjQUFjLE9BQUE7QUFDdkIsbURBQWdEO0FBQXZDLHlHQUFBLFVBQVUsT0FBQTtBQUVuQixRQUFRO0FBQ1IscURBQWtEO0FBQXpDLGlIQUFBLGNBQWMsT0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGRvYzJib29rL3BhcnNlclxuICog5paH5qGj6Kej5p6Q5qih5Z2XIC0g5pSv5oyB5aSa56eN5paH5qGj5qC85byP55qE6Kej5p6Q77yM6L6T5Ye657uf5LiAIEFTVFxuICpcbiAqIOaUr+aMgeeahOagvOW8j++8mlxuICogLSBQREbvvIjmlofmnKzmj5Dlj5YgKyBPQ1LvvIlcbiAqIC0gV29yZO+8iC5kb2N477yJXG4gKiAtIE1hcmtkb3duXG4gKiAtIEhUTUxcbiAqIC0g57qv5paH5pysXG4gKiAtIOWbvueJh++8iE9DUu+8iVxuICovXG5cbi8vIOino+aekOWZqFxuZXhwb3J0IHsgUGRmUGFyc2VyIH0gZnJvbSAnLi9wYXJzZXJzL3BkZi1wYXJzZXInXG5leHBvcnQgeyBEb2N4UGFyc2VyIH0gZnJvbSAnLi9wYXJzZXJzL2RvY3gtcGFyc2VyJ1xuZXhwb3J0IHsgTWFya2Rvd25QYXJzZXIgfSBmcm9tICcuL3BhcnNlcnMvbWFya2Rvd24tcGFyc2VyJ1xuZXhwb3J0IHsgSHRtbFBhcnNlciB9IGZyb20gJy4vcGFyc2Vycy9odG1sLXBhcnNlcidcbmV4cG9ydCB7IFR4dFBhcnNlciB9IGZyb20gJy4vcGFyc2Vycy90eHQtcGFyc2VyJ1xuZXhwb3J0IHsgSW1hZ2VQYXJzZXIgfSBmcm9tICcuL3BhcnNlcnMvaW1hZ2UtcGFyc2VyJ1xuXG4vLyDlt6Xlhbflh73mlbBcbmV4cG9ydCB7IGRldGVjdExhbmd1YWdlIH0gZnJvbSAnLi91dGlscy9sYW5ndWFnZS1kZXRlY3QnXG5leHBvcnQgeyBBc3RCdWlsZGVyIH0gZnJvbSAnLi91dGlscy9hc3QtYnVpbGRlcidcblxuLy8g57uf5LiA6Kej5p6Q5ZmoXG5leHBvcnQgeyBEb2N1bWVudFBhcnNlciB9IGZyb20gJy4vZG9jdW1lbnQtcGFyc2VyJ1xuXG4vLyDnsbvlnotcbmV4cG9ydCB0eXBlIHsgUGFyc2VyT3B0aW9ucywgUGFyc2VSZXN1bHQgfSBmcm9tICcuL3R5cGVzJ1xuIl19