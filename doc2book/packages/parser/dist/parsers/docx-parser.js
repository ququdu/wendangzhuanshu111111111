"use strict";
/**
 * Word 文档解析器
 * 使用 mammoth 将 .docx 转换为 HTML，然后解析
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocxParser = void 0;
const mammoth_1 = __importDefault(require("mammoth"));
const cheerio = __importStar(require("cheerio"));
const ast_builder_1 = require("../utils/ast-builder");
const language_detect_1 = require("../utils/language-detect");
/**
 * Word 文档解析器类
 */
class DocxParser {
    supportedFormats = ['docx', 'doc'];
    /**
     * 解析 Word 文档
     * @param input Word 文件的 Buffer
     * @param options 解析选项
     */
    async parse(input, options) {
        const startTime = Date.now();
        try {
            // 确保输入是 Buffer
            const buffer = typeof input === 'string' ? Buffer.from(input, 'base64') : input;
            // 使用 mammoth 转换为 HTML
            const result = await mammoth_1.default.convertToHtml({ buffer }, {
                styleMap: [
                    "p[style-name='Heading 1'] => h1:fresh",
                    "p[style-name='Heading 2'] => h2:fresh",
                    "p[style-name='Heading 3'] => h3:fresh",
                    "p[style-name='Heading 4'] => h4:fresh",
                    "p[style-name='Heading 5'] => h5:fresh",
                    "p[style-name='Heading 6'] => h6:fresh",
                    "p[style-name='Title'] => h1:fresh",
                    "p[style-name='Subtitle'] => h2:fresh",
                ],
            });
            const html = result.value;
            const messages = result.messages;
            // 记录警告信息
            if (messages.length > 0) {
                console.warn('Word 解析警告:', messages.map((m) => m.message).join('; '));
            }
            // 解析 HTML
            const $ = cheerio.load(html);
            // 提取纯文本用于语言检测
            const plainText = $.text();
            // 检测语言
            let detectedLanguage = 'und';
            if (options?.detectLanguage !== false && plainText.length > 50) {
                const langResult = (0, language_detect_1.detectLanguage)(plainText);
                detectedLanguage = langResult.code;
            }
            // 构建 AST
            const builder = new ast_builder_1.AstBuilder('document.docx');
            builder.setMetadata({
                language: detectedLanguage,
            });
            // 解析 HTML 内容
            this.parseHtmlContent($, builder, options);
            const ast = builder.build();
            const parseTime = Date.now() - startTime;
            return {
                success: true,
                ast,
                metadata: {
                    parseTime,
                    method: 'text',
                    detectedLanguage,
                    wordCount: ast.metadata.wordCount,
                },
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '解析 Word 文档失败',
                metadata: {
                    parseTime: Date.now() - startTime,
                    method: 'text',
                },
            };
        }
    }
    /**
     * 解析 HTML 内容
     */
    parseHtmlContent($, builder, options) {
        // 遍历所有顶级元素
        $('body').children().each((_, element) => {
            const $el = $(element);
            const tagName = element.tagName?.toLowerCase();
            switch (tagName) {
                case 'h1':
                    builder.addHeading($el.text().trim(), 1);
                    break;
                case 'h2':
                    builder.addHeading($el.text().trim(), 2);
                    break;
                case 'h3':
                    builder.addHeading($el.text().trim(), 3);
                    break;
                case 'h4':
                    builder.addHeading($el.text().trim(), 4);
                    break;
                case 'h5':
                    builder.addHeading($el.text().trim(), 5);
                    break;
                case 'h6':
                    builder.addHeading($el.text().trim(), 6);
                    break;
                case 'p':
                    const text = $el.text().trim();
                    if (text) {
                        builder.addParagraph(text);
                    }
                    break;
                case 'ul':
                    const ulItems = [];
                    $el.find('li').each((_, li) => {
                        ulItems.push($(li).text().trim());
                    });
                    if (ulItems.length > 0) {
                        builder.addList(ulItems, false);
                    }
                    break;
                case 'ol':
                    const olItems = [];
                    $el.find('li').each((_, li) => {
                        olItems.push($(li).text().trim());
                    });
                    if (olItems.length > 0) {
                        builder.addList(olItems, true);
                    }
                    break;
                case 'table':
                    if (options?.extractTables !== false) {
                        this.parseTable($, $el, builder);
                    }
                    break;
                case 'blockquote':
                    builder.addBlockquote($el.text().trim());
                    break;
                case 'pre':
                case 'code':
                    builder.addCodeBlock($el.text());
                    break;
                case 'img':
                    if (options?.extractImages !== false) {
                        const src = $el.attr('src');
                        const alt = $el.attr('alt');
                        if (src) {
                            // 如果是 base64 图片，添加为资源
                            if (src.startsWith('data:')) {
                                const match = src.match(/^data:([^;]+);base64,(.+)$/);
                                if (match) {
                                    const assetId = builder.addAsset({
                                        type: 'image',
                                        filename: `image_${Date.now()}.png`,
                                        mimeType: match[1],
                                        data: match[2],
                                        caption: alt,
                                    });
                                    builder.addImage(assetId, alt);
                                }
                            }
                        }
                    }
                    break;
                default:
                    // 其他元素，尝试提取文本
                    const defaultText = $el.text().trim();
                    if (defaultText) {
                        builder.addParagraph(defaultText);
                    }
            }
        });
    }
    /**
     * 解析表格
     */
    parseTable($, $table, builder) {
        const rows = [];
        let hasHeader = false;
        // 检查是否有 thead
        const $thead = $table.find('thead');
        if ($thead.length > 0) {
            hasHeader = true;
            $thead.find('tr').each((_, tr) => {
                const row = [];
                $(tr).find('th, td').each((_, cell) => {
                    row.push($(cell).text().trim());
                });
                if (row.length > 0) {
                    rows.push(row);
                }
            });
        }
        // 处理 tbody 或直接的 tr
        const $tbody = $table.find('tbody');
        const $rows = $tbody.length > 0 ? $tbody.find('tr') : $table.find('tr');
        $rows.each((_, tr) => {
            const row = [];
            $(tr).find('th, td').each((_, cell) => {
                row.push($(cell).text().trim());
            });
            if (row.length > 0) {
                rows.push(row);
            }
        });
        if (rows.length > 0) {
            // 如果没有明确的 thead，检查第一行是否可能是表头
            if (!hasHeader && rows.length > 1) {
                const firstRow = rows[0];
                const secondRow = rows[1];
                // 如果第一行都是短文本，可能是表头
                const avgFirstRowLength = firstRow.reduce((sum, cell) => sum + cell.length, 0) / firstRow.length;
                const avgSecondRowLength = secondRow.reduce((sum, cell) => sum + cell.length, 0) / secondRow.length;
                if (avgFirstRowLength < avgSecondRowLength * 0.5) {
                    hasHeader = true;
                }
            }
            builder.addTable(rows, hasHeader);
        }
    }
}
exports.DocxParser = DocxParser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jeC1wYXJzZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcGFyc2Vycy9kb2N4LXBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCxzREFBNkI7QUFDN0IsaURBQWtDO0FBSWxDLHNEQUFpRDtBQUNqRCw4REFBeUQ7QUFFekQ7O0dBRUc7QUFDSCxNQUFhLFVBQVU7SUFDckIsZ0JBQWdCLEdBQXFCLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBRXBEOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQXNCLEVBQUUsT0FBdUI7UUFDekQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBRTVCLElBQUksQ0FBQztZQUNILGVBQWU7WUFDZixNQUFNLE1BQU0sR0FBRyxPQUFPLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7WUFFL0Usc0JBQXNCO1lBQ3RCLE1BQU0sTUFBTSxHQUFHLE1BQU0saUJBQU8sQ0FBQyxhQUFhLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRTtnQkFDckQsUUFBUSxFQUFFO29CQUNSLHVDQUF1QztvQkFDdkMsdUNBQXVDO29CQUN2Qyx1Q0FBdUM7b0JBQ3ZDLHVDQUF1QztvQkFDdkMsdUNBQXVDO29CQUN2Qyx1Q0FBdUM7b0JBQ3ZDLG1DQUFtQztvQkFDbkMsc0NBQXNDO2lCQUN2QzthQUNGLENBQUMsQ0FBQTtZQUVGLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUE7WUFDekIsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQTtZQUVoQyxTQUFTO1lBQ1QsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFH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QUFDO0NBQ0Y7QUFoUEQsZ0NBZ1BDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBXb3JkIOaWh+aho+ino+aekOWZqFxuICog5L2/55SoIG1hbW1vdGgg5bCGIC5kb2N4IOi9rOaNouS4uiBIVE1M77yM54S25ZCO6Kej5p6QXG4gKi9cblxuaW1wb3J0IG1hbW1vdGggZnJvbSAnbWFtbW90aCdcbmltcG9ydCAqIGFzIGNoZWVyaW8gZnJvbSAnY2hlZXJpbydcbmltcG9ydCB0eXBlIHsgQW55Tm9kZSB9IGZyb20gJ2RvbWhhbmRsZXInXG5pbXBvcnQgdHlwZSB7IERvY3VtZW50Rm9ybWF0IH0gZnJvbSAnQGRvYzJib29rL3NoYXJlZCdcbmltcG9ydCB0eXBlIHsgSVBhcnNlciwgUGFyc2VyT3B0aW9ucywgUGFyc2VSZXN1bHQgfSBmcm9tICcuLi90eXBlcydcbmltcG9ydCB7IEFzdEJ1aWxkZXIgfSBmcm9tICcuLi91dGlscy9hc3QtYnVpbGRlcidcbmltcG9ydCB7IGRldGVjdExhbmd1YWdlIH0gZnJvbSAnLi4vdXRpbHMvbGFuZ3VhZ2UtZGV0ZWN0J1xuXG4vKipcbiAqIFdvcmQg5paH5qGj6Kej5p6Q5Zmo57G7XG4gKi9cbmV4cG9ydCBjbGFzcyBEb2N4UGFyc2VyIGltcGxlbWVudHMgSVBhcnNlciB7XG4gIHN1cHBvcnRlZEZvcm1hdHM6IERvY3VtZW50Rm9ybWF0W10gPSBbJ2RvY3gnLCAnZG9jJ11cblxuICAvKipcbiAgICog6Kej5p6QIFdvcmQg5paH5qGjXG4gICAqIEBwYXJhbSBpbnB1dCBXb3JkIOaWh+S7tueahCBCdWZmZXJcbiAgICogQHBhcmFtIG9wdGlvbnMg6Kej5p6Q6YCJ6aG5XG4gICAqL1xuICBhc3luYyBwYXJzZShpbnB1dDogQnVmZmVyIHwgc3RyaW5nLCBvcHRpb25zPzogUGFyc2VyT3B0aW9ucyk6IFByb21pc2U8UGFyc2VSZXN1bHQ+IHtcbiAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpXG5cbiAgICB0cnkge1xuICAgICAgLy8g56Gu5L+d6L6T5YWl5pivIEJ1ZmZlclxuICAgICAgY29uc3QgYnVmZmVyID0gdHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJyA/IEJ1ZmZlci5mcm9tKGlucHV0LCAnYmFzZTY0JykgOiBpbnB1dFxuXG4gICAgICAvLyDkvb/nlKggbWFtbW90aCDovazmjaLkuLogSFRNTFxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgbWFtbW90aC5jb252ZXJ0VG9IdG1sKHsgYnVmZmVyIH0sIHtcbiAgICAgICAgc3R5bGVNYXA6IFtcbiAgICAgICAgICBcInBbc3R5bGUtbmFtZT0nSGVhZGluZyAxJ10gPT4gaDE6ZnJlc2hcIixcbiAgICAgICAgICBcInBbc3R5bGUtbmFtZT0nSGVhZGluZyAyJ10gPT4gaDI6ZnJlc2hcIixcbiAgICAgICAgICBcInBbc3R5bGUtbmFtZT0nSGVhZGluZyAzJ10gPT4gaDM6ZnJlc2hcIixcbiAgICAgICAgICBcInBbc3R5bGUtbmFtZT0nSGVhZGluZyA0J10gPT4gaDQ6ZnJlc2hcIixcbiAgICAgICAgICBcInBbc3R5bGUtbmFtZT0nSGVhZGluZyA1J10gPT4gaDU6ZnJlc2hcIixcbiAgICAgICAgICBcInBbc3R5bGUtbmFtZT0nSGVhZGluZyA2J10gPT4gaDY6ZnJlc2hcIixcbiAgICAgICAgICBcInBbc3R5bGUtbmFtZT0nVGl0bGUnXSA9PiBoMTpmcmVzaFwiLFxuICAgICAgICAgIFwicFtzdHlsZS1uYW1lPSdTdWJ0aXRsZSddID0+IGgyOmZyZXNoXCIsXG4gICAgICAgIF0sXG4gICAgICB9KVxuXG4gICAgICBjb25zdCBodG1sID0gcmVzdWx0LnZhbHVlXG4gICAgICBjb25zdCBtZXNzYWdlcyA9IHJlc3VsdC5tZXNzYWdlc1xuXG4gICAgICAvLyDorrDlvZXorablkYrkv6Hmga9cbiAgICAgIGlmIChtZXNzYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignV29yZCDop6PmnpDorablkYo6JywgbWVzc2FnZXMubWFwKChtKSA9PiBtLm1lc3NhZ2UpLmpvaW4oJzsgJykpXG4gICAgICB9XG5cbiAgICAgIC8vIOino+aekCBIVE1MXG4gICAgICBjb25zdCAkID0gY2hlZXJpby5sb2FkKGh0bWwpXG5cbiAgICAgIC8vIOaPkOWPlue6r+aWh+acrOeUqOS6juivreiogOajgOa1i1xuICAgICAgY29uc3QgcGxhaW5UZXh0ID0gJC50ZXh0KClcblxuICAgICAgLy8g5qOA5rWL6K+t6KiAXG4gICAgICBsZXQgZGV0ZWN0ZWRMYW5ndWFnZSA9ICd1bmQnXG4gICAgICBpZiAob3B0aW9ucz8uZGV0ZWN0TGFuZ3VhZ2UgIT09IGZhbHNlICYmIHBsYWluVGV4dC5sZW5ndGggPiA1MCkge1xuICAgICAgICBjb25zdCBsYW5nUmVzdWx0ID0gZGV0ZWN0TGFuZ3VhZ2UocGxhaW5UZXh0KVxuICAgICAgICBkZXRlY3RlZExhbmd1YWdlID0gbGFuZ1Jlc3VsdC5jb2RlXG4gICAgICB9XG5cbiAgICAgIC8vIOaehOW7uiBBU1RcbiAgICAgIGNvbnN0IGJ1aWxkZXIgPSBuZXcgQXN0QnVpbGRlcignZG9jdW1lbnQuZG9jeCcpXG4gICAgICBidWlsZGVyLnNldE1ldGFkYXRhKHtcbiAgICAgICAgbGFuZ3VhZ2U6IGRldGVjdGVkTGFuZ3VhZ2UsXG4gICAgICB9KVxuXG4gICAgICAvLyDop6PmnpAgSFRNTCDlhoXlrrlcbiAgICAgIHRoaXMucGFyc2VIdG1sQ29udGVudCgkLCBidWlsZGVyLCBvcHRpb25zKVxuXG4gICAgICBjb25zdCBhc3QgPSBidWlsZGVyLmJ1aWxkKClcbiAgICAgIGNvbnN0IHBhcnNlVGltZSA9IERhdGUubm93KCkgLSBzdGFydFRpbWVcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgYXN0LFxuICAgICAgICBtZXRhZGF0YToge1xuICAgICAgICAgIHBhcnNlVGltZSxcbiAgICAgICAgICBtZXRob2Q6ICd0ZXh0JyxcbiAgICAgICAgICBkZXRlY3RlZExhbmd1YWdlLFxuICAgICAgICAgIHdvcmRDb3VudDogYXN0Lm1ldGFkYXRhLndvcmRDb3VudCxcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICfop6PmnpAgV29yZCDmlofmoaPlpLHotKUnLFxuICAgICAgICBtZXRhZGF0YToge1xuICAgICAgICAgIHBhcnNlVGltZTogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSxcbiAgICAgICAgICBtZXRob2Q6ICd0ZXh0JyxcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog6Kej5p6QIEhUTUwg5YaF5a65XG4gICAqL1xuICBwcml2YXRlIHBhcnNlSHRtbENvbnRlbnQoXG4gICAgJDogY2hlZXJpby5DaGVlcmlvQVBJLFxuICAgIGJ1aWxkZXI6IEFzdEJ1aWxkZXIsXG4gICAgb3B0aW9ucz86IFBhcnNlck9wdGlvbnNcbiAgKTogdm9pZCB7XG4gICAgLy8g6YGN5Y6G5omA5pyJ6aG257qn5YWD57SgXG4gICAgJCgnYm9keScpLmNoaWxkcmVuKCkuZWFjaCgoXywgZWxlbWVudCkgPT4ge1xuICAgICAgY29uc3QgJGVsID0gJChlbGVtZW50KVxuICAgICAgY29uc3QgdGFnTmFtZSA9IGVsZW1lbnQudGFnTmFtZT8udG9Mb3dlckNhc2UoKVxuXG4gICAgICBzd2l0Y2ggKHRhZ05hbWUpIHtcbiAgICAgICAgY2FzZSAnaDEnOlxuICAgICAgICAgIGJ1aWxkZXIuYWRkSGVhZGluZygkZWwudGV4dCgpLnRyaW0oKSwgMSlcbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlICdoMic6XG4gICAgICAgICAgYnVpbGRlci5hZGRIZWFkaW5nKCRlbC50ZXh0KCkudHJpbSgpLCAyKVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgJ2gzJzpcbiAgICAgICAgICBidWlsZGVyLmFkZEhlYWRpbmcoJGVsLnRleHQoKS50cmltKCksIDMpXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAnaDQnOlxuICAgICAgICAgIGJ1aWxkZXIuYWRkSGVhZGluZygkZWwudGV4dCgpLnRyaW0oKSwgNClcbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlICdoNSc6XG4gICAgICAgICAgYnVpbGRlci5hZGRIZWFkaW5nKCRlbC50ZXh0KCkudHJpbSgpLCA1KVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgJ2g2JzpcbiAgICAgICAgICBidWlsZGVyLmFkZEhlYWRpbmcoJGVsLnRleHQoKS50cmltKCksIDYpXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAncCc6XG4gICAgICAgICAgY29uc3QgdGV4dCA9ICRlbC50ZXh0KCkudHJpbSgpXG4gICAgICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgICAgIGJ1aWxkZXIuYWRkUGFyYWdyYXBoKHRleHQpXG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgJ3VsJzpcbiAgICAgICAgICBjb25zdCB1bEl0ZW1zOiBzdHJpbmdbXSA9IFtdXG4gICAgICAgICAgJGVsLmZpbmQoJ2xpJykuZWFjaCgoXywgbGkpID0+IHtcbiAgICAgICAgICAgIHVsSXRlbXMucHVzaCgkKGxpKS50ZXh0KCkudHJpbSgpKVxuICAgICAgICAgIH0pXG4gICAgICAgICAgaWYgKHVsSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgYnVpbGRlci5hZGRMaXN0KHVsSXRlbXMsIGZhbHNlKVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlICdvbCc6XG4gICAgICAgICAgY29uc3Qgb2xJdGVtczogc3RyaW5nW10gPSBbXVxuICAgICAgICAgICRlbC5maW5kKCdsaScpLmVhY2goKF8sIGxpKSA9PiB7XG4gICAgICAgICAgICBvbEl0ZW1zLnB1c2goJChsaSkudGV4dCgpLnRyaW0oKSlcbiAgICAgICAgICB9KVxuICAgICAgICAgIGlmIChvbEl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGJ1aWxkZXIuYWRkTGlzdChvbEl0ZW1zLCB0cnVlKVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlICd0YWJsZSc6XG4gICAgICAgICAgaWYgKG9wdGlvbnM/LmV4dHJhY3RUYWJsZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICB0aGlzLnBhcnNlVGFibGUoJCwgJGVsLCBidWlsZGVyKVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlICdibG9ja3F1b3RlJzpcbiAgICAgICAgICBidWlsZGVyLmFkZEJsb2NrcXVvdGUoJGVsLnRleHQoKS50cmltKCkpXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAncHJlJzpcbiAgICAgICAgY2FzZSAnY29kZSc6XG4gICAgICAgICAgYnVpbGRlci5hZGRDb2RlQmxvY2soJGVsLnRleHQoKSlcbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlICdpbWcnOlxuICAgICAgICAgIGlmIChvcHRpb25zPy5leHRyYWN0SW1hZ2VzICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgY29uc3Qgc3JjID0gJGVsLmF0dHIoJ3NyYycpXG4gICAgICAgICAgICBjb25zdCBhbHQgPSAkZWwuYXR0cignYWx0JylcbiAgICAgICAgICAgIGlmIChzcmMpIHtcbiAgICAgICAgICAgICAgLy8g5aaC5p6c5pivIGJhc2U2NCDlm77niYfvvIzmt7vliqDkuLrotYTmupBcbiAgICAgICAgICAgICAgaWYgKHNyYy5zdGFydHNXaXRoKCdkYXRhOicpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSBzcmMubWF0Y2goL15kYXRhOihbXjtdKyk7YmFzZTY0LCguKykkLylcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0SWQgPSBidWlsZGVyLmFkZEFzc2V0KHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ltYWdlJyxcbiAgICAgICAgICAgICAgICAgICAgZmlsZW5hbWU6IGBpbWFnZV8ke0RhdGUubm93KCl9LnBuZ2AsXG4gICAgICAgICAgICAgICAgICAgIG1pbWVUeXBlOiBtYXRjaFsxXSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogbWF0Y2hbMl0sXG4gICAgICAgICAgICAgICAgICAgIGNhcHRpb246IGFsdCxcbiAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICBidWlsZGVyLmFkZEltYWdlKGFzc2V0SWQsIGFsdClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAvLyDlhbbku5blhYPntKDvvIzlsJ3or5Xmj5Dlj5bmlofmnKxcbiAgICAgICAgICBjb25zdCBkZWZhdWx0VGV4dCA9ICRlbC50ZXh0KCkudHJpbSgpXG4gICAgICAgICAgaWYgKGRlZmF1bHRUZXh0KSB7XG4gICAgICAgICAgICBidWlsZGVyLmFkZFBhcmFncmFwaChkZWZhdWx0VGV4dClcbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiDop6PmnpDooajmoLxcbiAgICovXG4gIHByaXZhdGUgcGFyc2VUYWJsZShcbiAgICAkOiBjaGVlcmlvLkNoZWVyaW9BUEksXG4gICAgJHRhYmxlOiBjaGVlcmlvLkNoZWVyaW88QW55Tm9kZT4sXG4gICAgYnVpbGRlcjogQXN0QnVpbGRlclxuICApOiB2b2lkIHtcbiAgICBjb25zdCByb3dzOiBzdHJpbmdbXVtdID0gW11cbiAgICBsZXQgaGFzSGVhZGVyID0gZmFsc2VcblxuICAgIC8vIOajgOafpeaYr+WQpuaciSB0aGVhZFxuICAgIGNvbnN0ICR0aGVhZCA9ICR0YWJsZS5maW5kKCd0aGVhZCcpXG4gICAgaWYgKCR0aGVhZC5sZW5ndGggPiAwKSB7XG4gICAgICBoYXNIZWFkZXIgPSB0cnVlXG4gICAgICAkdGhlYWQuZmluZCgndHInKS5lYWNoKChfLCB0cikgPT4ge1xuICAgICAgICBjb25zdCByb3c6IHN0cmluZ1tdID0gW11cbiAgICAgICAgJCh0cikuZmluZCgndGgsIHRkJykuZWFjaCgoXywgY2VsbCkgPT4ge1xuICAgICAgICAgIHJvdy5wdXNoKCQoY2VsbCkudGV4dCgpLnRyaW0oKSlcbiAgICAgICAgfSlcbiAgICAgICAgaWYgKHJvdy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgcm93cy5wdXNoKHJvdylcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG5cbiAgICAvLyDlpITnkIYgdGJvZHkg5oiW55u05o6l55qEIHRyXG4gICAgY29uc3QgJHRib2R5ID0gJHRhYmxlLmZpbmQoJ3Rib2R5JylcbiAgICBjb25zdCAkcm93cyA9ICR0Ym9keS5sZW5ndGggPiAwID8gJHRib2R5LmZpbmQoJ3RyJykgOiAkdGFibGUuZmluZCgndHInKVxuXG4gICAgJHJvd3MuZWFjaCgoXywgdHIpID0+IHtcbiAgICAgIGNvbnN0IHJvdzogc3RyaW5nW10gPSBbXVxuICAgICAgJCh0cikuZmluZCgndGgsIHRkJykuZWFjaCgoXywgY2VsbCkgPT4ge1xuICAgICAgICByb3cucHVzaCgkKGNlbGwpLnRleHQoKS50cmltKCkpXG4gICAgICB9KVxuICAgICAgaWYgKHJvdy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJvd3MucHVzaChyb3cpXG4gICAgICB9XG4gICAgfSlcblxuICAgIGlmIChyb3dzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIOWmguaenOayoeacieaYjuehrueahCB0aGVhZO+8jOajgOafpeesrOS4gOihjOaYr+WQpuWPr+iDveaYr+ihqOWktFxuICAgICAgaWYgKCFoYXNIZWFkZXIgJiYgcm93cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGNvbnN0IGZpcnN0Um93ID0gcm93c1swXVxuICAgICAgICBjb25zdCBzZWNvbmRSb3cgPSByb3dzWzFdXG4gICAgICAgIC8vIOWmguaenOesrOS4gOihjOmDveaYr+efreaWh+acrO+8jOWPr+iDveaYr+ihqOWktFxuICAgICAgICBjb25zdCBhdmdGaXJzdFJvd0xlbmd0aCA9IGZpcnN0Um93LnJlZHVjZSgoc3VtLCBjZWxsKSA9PiBzdW0gKyBjZWxsLmxlbmd0aCwgMCkgLyBmaXJzdFJvdy5sZW5ndGhcbiAgICAgICAgY29uc3QgYXZnU2Vjb25kUm93TGVuZ3RoID0gc2Vjb25kUm93LnJlZHVjZSgoc3VtLCBjZWxsKSA9PiBzdW0gKyBjZWxsLmxlbmd0aCwgMCkgLyBzZWNvbmRSb3cubGVuZ3RoXG4gICAgICAgIGlmIChhdmdGaXJzdFJvd0xlbmd0aCA8IGF2Z1NlY29uZFJvd0xlbmd0aCAqIDAuNSkge1xuICAgICAgICAgIGhhc0hlYWRlciA9IHRydWVcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBidWlsZGVyLmFkZFRhYmxlKHJvd3MsIGhhc0hlYWRlcilcbiAgICB9XG4gIH1cbn1cbiJdfQ==