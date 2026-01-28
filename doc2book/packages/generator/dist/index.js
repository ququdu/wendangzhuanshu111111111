"use strict";
/**
 * @doc2book/generator
 * 书籍生成模块 - 生成符合 KDP 标准的电子书
 *
 * 支持的格式：
 * - EPUB（亚马逊 KDP 兼容）
 * - PDF（打印版）
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBookGenerator = exports.BookGenerator = exports.KdpValidator = exports.CoverGenerator = exports.TocGenerator = exports.PdfGenerator = exports.EpubGenerator = void 0;
// 生成器
var epub_generator_1 = require("./epub-generator");
Object.defineProperty(exports, "EpubGenerator", { enumerable: true, get: function () { return epub_generator_1.EpubGenerator; } });
var pdf_generator_1 = require("./pdf-generator");
Object.defineProperty(exports, "PdfGenerator", { enumerable: true, get: function () { return pdf_generator_1.PdfGenerator; } });
var toc_generator_1 = require("./toc-generator");
Object.defineProperty(exports, "TocGenerator", { enumerable: true, get: function () { return toc_generator_1.TocGenerator; } });
var cover_generator_1 = require("./cover-generator");
Object.defineProperty(exports, "CoverGenerator", { enumerable: true, get: function () { return cover_generator_1.CoverGenerator; } });
var kdp_validator_1 = require("./kdp-validator");
Object.defineProperty(exports, "KdpValidator", { enumerable: true, get: function () { return kdp_validator_1.KdpValidator; } });
// 统一生成器
var book_generator_1 = require("./book-generator");
Object.defineProperty(exports, "BookGenerator", { enumerable: true, get: function () { return book_generator_1.BookGenerator; } });
Object.defineProperty(exports, "createBookGenerator", { enumerable: true, get: function () { return book_generator_1.createBookGenerator; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7O0dBT0c7OztBQUVILE1BQU07QUFDTixtREFBZ0Q7QUFBdkMsK0dBQUEsYUFBYSxPQUFBO0FBQ3RCLGlEQUE4QztBQUFyQyw2R0FBQSxZQUFZLE9BQUE7QUFDckIsaURBQThDO0FBQXJDLDZHQUFBLFlBQVksT0FBQTtBQUNyQixxREFBa0Q7QUFBekMsaUhBQUEsY0FBYyxPQUFBO0FBQ3ZCLGlEQUE4QztBQUFyQyw2R0FBQSxZQUFZLE9BQUE7QUFFckIsUUFBUTtBQUNSLG1EQUFxRTtBQUE1RCwrR0FBQSxhQUFhLE9BQUE7QUFBRSxxSEFBQSxtQkFBbUIsT0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGRvYzJib29rL2dlbmVyYXRvclxuICog5Lmm57GN55Sf5oiQ5qih5Z2XIC0g55Sf5oiQ56ym5ZCIIEtEUCDmoIflh4bnmoTnlLXlrZDkuaZcbiAqXG4gKiDmlK/mjIHnmoTmoLzlvI/vvJpcbiAqIC0gRVBVQu+8iOS6mumprOmAiiBLRFAg5YW85a6577yJXG4gKiAtIFBERu+8iOaJk+WNsOeJiO+8iVxuICovXG5cbi8vIOeUn+aIkOWZqFxuZXhwb3J0IHsgRXB1YkdlbmVyYXRvciB9IGZyb20gJy4vZXB1Yi1nZW5lcmF0b3InXG5leHBvcnQgeyBQZGZHZW5lcmF0b3IgfSBmcm9tICcuL3BkZi1nZW5lcmF0b3InXG5leHBvcnQgeyBUb2NHZW5lcmF0b3IgfSBmcm9tICcuL3RvYy1nZW5lcmF0b3InXG5leHBvcnQgeyBDb3ZlckdlbmVyYXRvciB9IGZyb20gJy4vY292ZXItZ2VuZXJhdG9yJ1xuZXhwb3J0IHsgS2RwVmFsaWRhdG9yIH0gZnJvbSAnLi9rZHAtdmFsaWRhdG9yJ1xuXG4vLyDnu5/kuIDnlJ/miJDlmahcbmV4cG9ydCB7IEJvb2tHZW5lcmF0b3IsIGNyZWF0ZUJvb2tHZW5lcmF0b3IgfSBmcm9tICcuL2Jvb2stZ2VuZXJhdG9yJ1xuXG4vLyDnsbvlnotcbmV4cG9ydCB0eXBlIHtcbiAgR2VuZXJhdG9yT3B0aW9ucyxcbiAgR2VuZXJhdG9yUmVzdWx0LFxuICBFcHViT3B0aW9ucyxcbiAgUGRmT3B0aW9ucyxcbiAgQ292ZXJPcHRpb25zLFxuICBWYWxpZGF0aW9uUmVzdWx0LFxufSBmcm9tICcuL3R5cGVzJ1xuIl19