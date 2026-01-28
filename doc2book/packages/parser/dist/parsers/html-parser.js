"use strict";
/**
 * HTML 解析器
 * 使用 cheerio 解析 HTML 文档
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HtmlParser = void 0;
const cheerio = __importStar(require("cheerio"));
const ast_builder_1 = require("../utils/ast-builder");
const language_detect_1 = require("../utils/language-detect");
/**
 * HTML 解析器类
 */
class HtmlParser {
    supportedFormats = ['html'];
    /**
     * 解析 HTML 文档
     * @param input HTML 内容
     * @param options 解析选项
     */
    async parse(input, options) {
        const startTime = Date.now();
        try {
            // 确保输入是字符串
            const html = typeof input === 'string' ? input : input.toString('utf-8');
            // 加载 HTML
            const $ = cheerio.load(html);
            // 移除脚本和样式
            $('script, style, noscript').remove();
            // 提取纯文本用于语言检测
            const plainText = $('body').text() || $.text();
            // 检测语言
            let detectedLanguage = 'und';
            if (options?.detectLanguage !== false && plainText.length > 50) {
                const langResult = (0, language_detect_1.detectLanguage)(plainText);
                detectedLanguage = langResult.code;
            }
            // 提取标题
            const title = $('title').text().trim() || $('h1').first().text().trim();
            // 构建 AST
            const builder = new ast_builder_1.AstBuilder('document.html');
            builder.setMetadata({
                title: title || undefined,
                language: detectedLanguage,
            });
            // 解析内容
            // 优先解析 article 或 main 标签
            let $content = $('article, main, .content, #content').first();
            if ($content.length === 0) {
                $content = $('body');
            }
            this.parseElement($, $content, builder, options);
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
                error: error instanceof Error ? error.message : '解析 HTML 失败',
                metadata: {
                    parseTime: Date.now() - startTime,
                    method: 'text',
                },
            };
        }
    }
    /**
     * 递归解析 HTML 元素
     */
    parseElement($, $el, builder, options) {
        $el.children().each((_, element) => {
            const $child = $(element);
            const tagName = element.tagName?.toLowerCase();
            // 跳过隐藏元素
            if ($child.css('display') === 'none' || $child.attr('hidden') !== undefined) {
                return;
            }
            switch (tagName) {
                case 'h1':
                    builder.addHeading($child.text().trim(), 1);
                    break;
                case 'h2':
                    builder.addHeading($child.text().trim(), 2);
                    break;
                case 'h3':
                    builder.addHeading($child.text().trim(), 3);
                    break;
                case 'h4':
                    builder.addHeading($child.text().trim(), 4);
                    break;
                case 'h5':
                    builder.addHeading($child.text().trim(), 5);
                    break;
                case 'h6':
                    builder.addHeading($child.text().trim(), 6);
                    break;
                case 'p':
                    const pText = $child.text().trim();
                    if (pText) {
                        builder.addParagraph(pText);
                    }
                    break;
                case 'ul':
                    const ulItems = [];
                    $child.find('> li').each((_, li) => {
                        const liText = $(li).text().trim();
                        if (liText) {
                            ulItems.push(liText);
                        }
                    });
                    if (ulItems.length > 0) {
                        builder.addList(ulItems, false);
                    }
                    break;
                case 'ol':
                    const olItems = [];
                    $child.find('> li').each((_, li) => {
                        const liText = $(li).text().trim();
                        if (liText) {
                            olItems.push(liText);
                        }
                    });
                    if (olItems.length > 0) {
                        builder.addList(olItems, true);
                    }
                    break;
                case 'table':
                    if (options?.extractTables !== false) {
                        this.parseTable($, $child, builder);
                    }
                    break;
                case 'blockquote':
                    builder.addBlockquote($child.text().trim());
                    break;
                case 'pre':
                    const codeEl = $child.find('code');
                    const code = codeEl.length > 0 ? codeEl.text() : $child.text();
                    const lang = codeEl.attr('class')?.match(/language-(\w+)/)?.[1];
                    builder.addCodeBlock(code, lang);
                    break;
                case 'code':
                    // 行内代码，作为段落处理
                    if ($child.parent().get(0)?.tagName?.toLowerCase() !== 'pre') {
                        builder.addParagraph($child.text());
                    }
                    break;
                case 'img':
                    if (options?.extractImages !== false) {
                        const src = $child.attr('src');
                        const alt = $child.attr('alt');
                        if (src) {
                            // 如果是 base64 图片
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
                            else {
                                // 外部图片，记录 URL
                                const assetId = builder.addAsset({
                                    type: 'image',
                                    filename: src.split('/').pop() || 'image.png',
                                    mimeType: 'image/png',
                                    url: src,
                                    caption: alt,
                                });
                                builder.addImage(assetId, alt);
                            }
                        }
                    }
                    break;
                case 'figure':
                    // 图片容器
                    if (options?.extractImages !== false) {
                        const $img = $child.find('img');
                        const $caption = $child.find('figcaption');
                        if ($img.length > 0) {
                            const src = $img.attr('src');
                            const alt = $img.attr('alt') || $caption.text().trim();
                            if (src) {
                                const assetId = builder.addAsset({
                                    type: 'image',
                                    filename: src.split('/').pop() || 'image.png',
                                    mimeType: 'image/png',
                                    url: src,
                                    caption: alt,
                                });
                                builder.addImage(assetId, alt);
                            }
                        }
                    }
                    break;
                case 'hr':
                    builder.addNode({
                        type: 'paragraph',
                        text: '---',
                        attributes: { isHorizontalRule: true },
                    });
                    break;
                case 'br':
                    // 换行，忽略
                    break;
                case 'div':
                case 'section':
                case 'article':
                case 'aside':
                case 'header':
                case 'footer':
                case 'nav':
                case 'main':
                    // 容器元素，递归解析
                    this.parseElement($, $child, builder, options);
                    break;
                case 'span':
                case 'a':
                case 'strong':
                case 'em':
                case 'b':
                case 'i':
                case 'u':
                    // 行内元素，如果是直接子元素，提取文本
                    const inlineText = $child.text().trim();
                    if (inlineText && $child.parent().get(0)?.tagName?.toLowerCase() === 'body') {
                        builder.addParagraph(inlineText);
                    }
                    break;
                default:
                    // 其他元素，尝试递归或提取文本
                    if ($child.children().length > 0) {
                        this.parseElement($, $child, builder, options);
                    }
                    else {
                        const defaultText = $child.text().trim();
                        if (defaultText) {
                            builder.addParagraph(defaultText);
                        }
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
        const $rows = $tbody.length > 0 ? $tbody.find('tr') : $table.find('> tr');
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
            builder.addTable(rows, hasHeader);
        }
    }
}
exports.HtmlParser = HtmlParser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHRtbC1wYXJzZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcGFyc2Vycy9odG1sLXBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCxpREFBa0M7QUFJbEMsc0RBQWlEO0FBQ2pELDhEQUF5RDtBQUV6RDs7R0FFRztBQUNILE1BQWEsVUFBVTtJQUNyQixnQkFBZ0IsR0FBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUU3Qzs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFzQixFQUFFLE9BQXVCO1FBQ3pELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUU1QixJQUFJLENBQUM7WUFDSCxXQUFXO1lBQ1gsTUFBTSxJQUFJLEdBQUcsT0FBTyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUE7WUFFeEUsVUFBVTtZQUNWLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7WUFFNUIsVUFBVTtZQUNWLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBRXJDLGNBQWM7WUFDZCxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBO1lBRTlDLE9BQU87WUFDUCxJQUFJLGdCQUFnQixHQUFHLEtBQUssQ0FBQTtZQUM1QixJQUFJLE9BQU8sRUFBRSxjQUFjLEtBQUssS0FBSyxJQUFJLFNBQVMsQ0FBQyxNQUFNLEdBQUcsRUFBRSxFQUFFLENBQUM7Z0JBQy9ELE1BQU0sVUFBVSxHQUFHLElBQUEsZ0NBQWMsRUFBQyxTQUFTLENBQUMs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QUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7WUFDakMsQ0FBQyxDQUFDLENBQUE7WUFDRixJQUFJLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ25CLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDaEIsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ25DLENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUFqVUQsZ0NBaVVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBIVE1MIOino+aekOWZqFxuICog5L2/55SoIGNoZWVyaW8g6Kej5p6QIEhUTUwg5paH5qGjXG4gKi9cblxuaW1wb3J0ICogYXMgY2hlZXJpbyBmcm9tICdjaGVlcmlvJ1xuaW1wb3J0IHR5cGUgeyBBbnlOb2RlIH0gZnJvbSAnZG9taGFuZGxlcidcbmltcG9ydCB0eXBlIHsgRG9jdW1lbnRGb3JtYXQgfSBmcm9tICdAZG9jMmJvb2svc2hhcmVkJ1xuaW1wb3J0IHR5cGUgeyBJUGFyc2VyLCBQYXJzZXJPcHRpb25zLCBQYXJzZVJlc3VsdCB9IGZyb20gJy4uL3R5cGVzJ1xuaW1wb3J0IHsgQXN0QnVpbGRlciB9IGZyb20gJy4uL3V0aWxzL2FzdC1idWlsZGVyJ1xuaW1wb3J0IHsgZGV0ZWN0TGFuZ3VhZ2UgfSBmcm9tICcuLi91dGlscy9sYW5ndWFnZS1kZXRlY3QnXG5cbi8qKlxuICogSFRNTCDop6PmnpDlmajnsbtcbiAqL1xuZXhwb3J0IGNsYXNzIEh0bWxQYXJzZXIgaW1wbGVtZW50cyBJUGFyc2VyIHtcbiAgc3VwcG9ydGVkRm9ybWF0czogRG9jdW1lbnRGb3JtYXRbXSA9IFsnaHRtbCddXG5cbiAgLyoqXG4gICAqIOino+aekCBIVE1MIOaWh+aho1xuICAgKiBAcGFyYW0gaW5wdXQgSFRNTCDlhoXlrrlcbiAgICogQHBhcmFtIG9wdGlvbnMg6Kej5p6Q6YCJ6aG5XG4gICAqL1xuICBhc3luYyBwYXJzZShpbnB1dDogQnVmZmVyIHwgc3RyaW5nLCBvcHRpb25zPzogUGFyc2VyT3B0aW9ucyk6IFByb21pc2U8UGFyc2VSZXN1bHQ+IHtcbiAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpXG5cbiAgICB0cnkge1xuICAgICAgLy8g56Gu5L+d6L6T5YWl5piv5a2X56ym5LiyXG4gICAgICBjb25zdCBodG1sID0gdHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJyA/IGlucHV0IDogaW5wdXQudG9TdHJpbmcoJ3V0Zi04JylcblxuICAgICAgLy8g5Yqg6L29IEhUTUxcbiAgICAgIGNvbnN0ICQgPSBjaGVlcmlvLmxvYWQoaHRtbClcblxuICAgICAgLy8g56e76Zmk6ISa5pys5ZKM5qC35byPXG4gICAgICAkKCdzY3JpcHQsIHN0eWxlLCBub3NjcmlwdCcpLnJlbW92ZSgpXG5cbiAgICAgIC8vIOaPkOWPlue6r+aWh+acrOeUqOS6juivreiogOajgOa1i1xuICAgICAgY29uc3QgcGxhaW5UZXh0ID0gJCgnYm9keScpLnRleHQoKSB8fCAkLnRleHQoKVxuXG4gICAgICAvLyDmo4DmtYvor63oqIBcbiAgICAgIGxldCBkZXRlY3RlZExhbmd1YWdlID0gJ3VuZCdcbiAgICAgIGlmIChvcHRpb25zPy5kZXRlY3RMYW5ndWFnZSAhPT0gZmFsc2UgJiYgcGxhaW5UZXh0Lmxlbmd0aCA+IDUwKSB7XG4gICAgICAgIGNvbnN0IGxhbmdSZXN1bHQgPSBkZXRlY3RMYW5ndWFnZShwbGFpblRleHQpXG4gICAgICAgIGRldGVjdGVkTGFuZ3VhZ2UgPSBsYW5nUmVzdWx0LmNvZGVcbiAgICAgIH1cblxuICAgICAgLy8g5o+Q5Y+W5qCH6aKYXG4gICAgICBjb25zdCB0aXRsZSA9ICQoJ3RpdGxlJykudGV4dCgpLnRyaW0oKSB8fCAkKCdoMScpLmZpcnN0KCkudGV4dCgpLnRyaW0oKVxuXG4gICAgICAvLyDmnoTlu7ogQVNUXG4gICAgICBjb25zdCBidWlsZGVyID0gbmV3IEFzdEJ1aWxkZXIoJ2RvY3VtZW50Lmh0bWwnKVxuICAgICAgYnVpbGRlci5zZXRNZXRhZGF0YSh7XG4gICAgICAgIHRpdGxlOiB0aXRsZSB8fCB1bmRlZmluZWQsXG4gICAgICAgIGxhbmd1YWdlOiBkZXRlY3RlZExhbmd1YWdlLFxuICAgICAgfSlcblxuICAgICAgLy8g6Kej5p6Q5YaF5a65XG4gICAgICAvLyDkvJjlhYjop6PmnpAgYXJ0aWNsZSDmiJYgbWFpbiDmoIfnrb5cbiAgICAgIGxldCAkY29udGVudCA9ICQoJ2FydGljbGUsIG1haW4sIC5jb250ZW50LCAjY29udGVudCcpLmZpcnN0KClcbiAgICAgIGlmICgkY29udGVudC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgJGNvbnRlbnQgPSAkKCdib2R5JylcbiAgICAgIH1cblxuICAgICAgdGhpcy5wYXJzZUVsZW1lbnQoJCwgJGNvbnRlbnQsIGJ1aWxkZXIsIG9wdGlvbnMpXG5cbiAgICAgIGNvbnN0IGFzdCA9IGJ1aWxkZXIuYnVpbGQoKVxuICAgICAgY29uc3QgcGFyc2VUaW1lID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICBhc3QsXG4gICAgICAgIG1ldGFkYXRhOiB7XG4gICAgICAgICAgcGFyc2VUaW1lLFxuICAgICAgICAgIG1ldGhvZDogJ3RleHQnLFxuICAgICAgICAgIGRldGVjdGVkTGFuZ3VhZ2UsXG4gICAgICAgICAgd29yZENvdW50OiBhc3QubWV0YWRhdGEud29yZENvdW50LFxuICAgICAgICB9LFxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ+ino+aekCBIVE1MIOWksei0pScsXG4gICAgICAgIG1ldGFkYXRhOiB7XG4gICAgICAgICAgcGFyc2VUaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxuICAgICAgICAgIG1ldGhvZDogJ3RleHQnLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDpgJLlvZLop6PmnpAgSFRNTCDlhYPntKBcbiAgICovXG4gIHByaXZhdGUgcGFyc2VFbGVtZW50KFxuICAgICQ6IGNoZWVyaW8uQ2hlZXJpb0FQSSxcbiAgICAkZWw6IGNoZWVyaW8uQ2hlZXJpbzxBbnlOb2RlPixcbiAgICBidWlsZGVyOiBBc3RCdWlsZGVyLFxuICAgIG9wdGlvbnM/OiBQYXJzZXJPcHRpb25zXG4gICk6IHZvaWQge1xuICAgICRlbC5jaGlsZHJlbigpLmVhY2goKF8sIGVsZW1lbnQpID0+IHtcbiAgICAgIGNvbnN0ICRjaGlsZCA9ICQoZWxlbWVudClcbiAgICAgIGNvbnN0IHRhZ05hbWUgPSBlbGVtZW50LnRhZ05hbWU/LnRvTG93ZXJDYXNlKClcblxuICAgICAgLy8g6Lez6L+H6ZqQ6JeP5YWD57SgXG4gICAgICBpZiAoJGNoaWxkLmNzcygnZGlzcGxheScpID09PSAnbm9uZScgfHwgJGNoaWxkLmF0dHIoJ2hpZGRlbicpICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIHN3aXRjaCAodGFnTmFtZSkge1xuICAgICAgICBjYXNlICdoMSc6XG4gICAgICAgICAgYnVpbGRlci5hZGRIZWFkaW5nKCRjaGlsZC50ZXh0KCkudHJpbSgpLCAxKVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgJ2gyJzpcbiAgICAgICAgICBidWlsZGVyLmFkZEhlYWRpbmcoJGNoaWxkLnRleHQoKS50cmltKCksIDIpXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAnaDMnOlxuICAgICAgICAgIGJ1aWxkZXIuYWRkSGVhZGluZygkY2hpbGQudGV4dCgpLnRyaW0oKSwgMylcbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlICdoNCc6XG4gICAgICAgICAgYnVpbGRlci5hZGRIZWFkaW5nKCRjaGlsZC50ZXh0KCkudHJpbSgpLCA0KVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgJ2g1JzpcbiAgICAgICAgICBidWlsZGVyLmFkZEhlYWRpbmcoJGNoaWxkLnRleHQoKS50cmltKCksIDUpXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAnaDYnOlxuICAgICAgICAgIGJ1aWxkZXIuYWRkSGVhZGluZygkY2hpbGQudGV4dCgpLnRyaW0oKSwgNilcbiAgICAgICAgICBicmVha1xuXG4gICAgICAgIGNhc2UgJ3AnOlxuICAgICAgICAgIGNvbnN0IHBUZXh0ID0gJGNoaWxkLnRleHQoKS50cmltKClcbiAgICAgICAgICBpZiAocFRleHQpIHtcbiAgICAgICAgICAgIGJ1aWxkZXIuYWRkUGFyYWdyYXBoKHBUZXh0KVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuXG4gICAgICAgIGNhc2UgJ3VsJzpcbiAgICAgICAgICBjb25zdCB1bEl0ZW1zOiBzdHJpbmdbXSA9IFtdXG4gICAgICAgICAgJGNoaWxkLmZpbmQoJz4gbGknKS5lYWNoKChfLCBsaSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbGlUZXh0ID0gJChsaSkudGV4dCgpLnRyaW0oKVxuICAgICAgICAgICAgaWYgKGxpVGV4dCkge1xuICAgICAgICAgICAgICB1bEl0ZW1zLnB1c2gobGlUZXh0KVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pXG4gICAgICAgICAgaWYgKHVsSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgYnVpbGRlci5hZGRMaXN0KHVsSXRlbXMsIGZhbHNlKVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuXG4gICAgICAgIGNhc2UgJ29sJzpcbiAgICAgICAgICBjb25zdCBvbEl0ZW1zOiBzdHJpbmdbXSA9IFtdXG4gICAgICAgICAgJGNoaWxkLmZpbmQoJz4gbGknKS5lYWNoKChfLCBsaSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbGlUZXh0ID0gJChsaSkudGV4dCgpLnRyaW0oKVxuICAgICAgICAgICAgaWYgKGxpVGV4dCkge1xuICAgICAgICAgICAgICBvbEl0ZW1zLnB1c2gobGlUZXh0KVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pXG4gICAgICAgICAgaWYgKG9sSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgYnVpbGRlci5hZGRMaXN0KG9sSXRlbXMsIHRydWUpXG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgY2FzZSAndGFibGUnOlxuICAgICAgICAgIGlmIChvcHRpb25zPy5leHRyYWN0VGFibGVzICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgdGhpcy5wYXJzZVRhYmxlKCQsICRjaGlsZCwgYnVpbGRlcilcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcblxuICAgICAgICBjYXNlICdibG9ja3F1b3RlJzpcbiAgICAgICAgICBidWlsZGVyLmFkZEJsb2NrcXVvdGUoJGNoaWxkLnRleHQoKS50cmltKCkpXG4gICAgICAgICAgYnJlYWtcblxuICAgICAgICBjYXNlICdwcmUnOlxuICAgICAgICAgIGNvbnN0IGNvZGVFbCA9ICRjaGlsZC5maW5kKCdjb2RlJylcbiAgICAgICAgICBjb25zdCBjb2RlID0gY29kZUVsLmxlbmd0aCA+IDAgPyBjb2RlRWwudGV4dCgpIDogJGNoaWxkLnRleHQoKVxuICAgICAgICAgIGNvbnN0IGxhbmcgPSBjb2RlRWwuYXR0cignY2xhc3MnKT8ubWF0Y2goL2xhbmd1YWdlLShcXHcrKS8pPy5bMV1cbiAgICAgICAgICBidWlsZGVyLmFkZENvZGVCbG9jayhjb2RlLCBsYW5nKVxuICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgY2FzZSAnY29kZSc6XG4gICAgICAgICAgLy8g6KGM5YaF5Luj56CB77yM5L2c5Li65q616JC95aSE55CGXG4gICAgICAgICAgaWYgKCRjaGlsZC5wYXJlbnQoKS5nZXQoMCk/LnRhZ05hbWU/LnRvTG93ZXJDYXNlKCkgIT09ICdwcmUnKSB7XG4gICAgICAgICAgICBidWlsZGVyLmFkZFBhcmFncmFwaCgkY2hpbGQudGV4dCgpKVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuXG4gICAgICAgIGNhc2UgJ2ltZyc6XG4gICAgICAgICAgaWYgKG9wdGlvbnM/LmV4dHJhY3RJbWFnZXMgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICBjb25zdCBzcmMgPSAkY2hpbGQuYXR0cignc3JjJylcbiAgICAgICAgICAgIGNvbnN0IGFsdCA9ICRjaGlsZC5hdHRyKCdhbHQnKVxuICAgICAgICAgICAgaWYgKHNyYykge1xuICAgICAgICAgICAgICAvLyDlpoLmnpzmmK8gYmFzZTY0IOWbvueJh1xuICAgICAgICAgICAgICBpZiAoc3JjLnN0YXJ0c1dpdGgoJ2RhdGE6JykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBtYXRjaCA9IHNyYy5tYXRjaCgvXmRhdGE6KFteO10rKTtiYXNlNjQsKC4rKSQvKVxuICAgICAgICAgICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgICAgICAgY29uc3QgYXNzZXRJZCA9IGJ1aWxkZXIuYWRkQXNzZXQoe1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW1hZ2UnLFxuICAgICAgICAgICAgICAgICAgICBmaWxlbmFtZTogYGltYWdlXyR7RGF0ZS5ub3coKX0ucG5nYCxcbiAgICAgICAgICAgICAgICAgICAgbWltZVR5cGU6IG1hdGNoWzFdLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBtYXRjaFsyXSxcbiAgICAgICAgICAgICAgICAgICAgY2FwdGlvbjogYWx0LFxuICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgIGJ1aWxkZXIuYWRkSW1hZ2UoYXNzZXRJZCwgYWx0KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyDlpJbpg6jlm77niYfvvIzorrDlvZUgVVJMXG4gICAgICAgICAgICAgICAgY29uc3QgYXNzZXRJZCA9IGJ1aWxkZXIuYWRkQXNzZXQoe1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ2ltYWdlJyxcbiAgICAgICAgICAgICAgICAgIGZpbGVuYW1lOiBzcmMuc3BsaXQoJy8nKS5wb3AoKSB8fCAnaW1hZ2UucG5nJyxcbiAgICAgICAgICAgICAgICAgIG1pbWVUeXBlOiAnaW1hZ2UvcG5nJyxcbiAgICAgICAgICAgICAgICAgIHVybDogc3JjLFxuICAgICAgICAgICAgICAgICAgY2FwdGlvbjogYWx0LFxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgYnVpbGRlci5hZGRJbWFnZShhc3NldElkLCBhbHQpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcblxuICAgICAgICBjYXNlICdmaWd1cmUnOlxuICAgICAgICAgIC8vIOWbvueJh+WuueWZqFxuICAgICAgICAgIGlmIChvcHRpb25zPy5leHRyYWN0SW1hZ2VzICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgY29uc3QgJGltZyA9ICRjaGlsZC5maW5kKCdpbWcnKVxuICAgICAgICAgICAgY29uc3QgJGNhcHRpb24gPSAkY2hpbGQuZmluZCgnZmlnY2FwdGlvbicpXG4gICAgICAgICAgICBpZiAoJGltZy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHNyYyA9ICRpbWcuYXR0cignc3JjJylcbiAgICAgICAgICAgICAgY29uc3QgYWx0ID0gJGltZy5hdHRyKCdhbHQnKSB8fCAkY2FwdGlvbi50ZXh0KCkudHJpbSgpXG4gICAgICAgICAgICAgIGlmIChzcmMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhc3NldElkID0gYnVpbGRlci5hZGRBc3NldCh7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnaW1hZ2UnLFxuICAgICAgICAgICAgICAgICAgZmlsZW5hbWU6IHNyYy5zcGxpdCgnLycpLnBvcCgpIHx8ICdpbWFnZS5wbmcnLFxuICAgICAgICAgICAgICAgICAgbWltZVR5cGU6ICdpbWFnZS9wbmcnLFxuICAgICAgICAgICAgICAgICAgdXJsOiBzcmMsXG4gICAgICAgICAgICAgICAgICBjYXB0aW9uOiBhbHQsXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICBidWlsZGVyLmFkZEltYWdlKGFzc2V0SWQsIGFsdClcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuXG4gICAgICAgIGNhc2UgJ2hyJzpcbiAgICAgICAgICBidWlsZGVyLmFkZE5vZGUoe1xuICAgICAgICAgICAgdHlwZTogJ3BhcmFncmFwaCcsXG4gICAgICAgICAgICB0ZXh0OiAnLS0tJyxcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHsgaXNIb3Jpem9udGFsUnVsZTogdHJ1ZSB9LFxuICAgICAgICAgIH0pXG4gICAgICAgICAgYnJlYWtcblxuICAgICAgICBjYXNlICdicic6XG4gICAgICAgICAgLy8g5o2i6KGM77yM5b+955WlXG4gICAgICAgICAgYnJlYWtcblxuICAgICAgICBjYXNlICdkaXYnOlxuICAgICAgICBjYXNlICdzZWN0aW9uJzpcbiAgICAgICAgY2FzZSAnYXJ0aWNsZSc6XG4gICAgICAgIGNhc2UgJ2FzaWRlJzpcbiAgICAgICAgY2FzZSAnaGVhZGVyJzpcbiAgICAgICAgY2FzZSAnZm9vdGVyJzpcbiAgICAgICAgY2FzZSAnbmF2JzpcbiAgICAgICAgY2FzZSAnbWFpbic6XG4gICAgICAgICAgLy8g5a655Zmo5YWD57Sg77yM6YCS5b2S6Kej5p6QXG4gICAgICAgICAgdGhpcy5wYXJzZUVsZW1lbnQoJCwgJGNoaWxkLCBidWlsZGVyLCBvcHRpb25zKVxuICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgY2FzZSAnc3Bhbic6XG4gICAgICAgIGNhc2UgJ2EnOlxuICAgICAgICBjYXNlICdzdHJvbmcnOlxuICAgICAgICBjYXNlICdlbSc6XG4gICAgICAgIGNhc2UgJ2InOlxuICAgICAgICBjYXNlICdpJzpcbiAgICAgICAgY2FzZSAndSc6XG4gICAgICAgICAgLy8g6KGM5YaF5YWD57Sg77yM5aaC5p6c5piv55u05o6l5a2Q5YWD57Sg77yM5o+Q5Y+W5paH5pysXG4gICAgICAgICAgY29uc3QgaW5saW5lVGV4dCA9ICRjaGlsZC50ZXh0KCkudHJpbSgpXG4gICAgICAgICAgaWYgKGlubGluZVRleHQgJiYgJGNoaWxkLnBhcmVudCgpLmdldCgwKT8udGFnTmFtZT8udG9Mb3dlckNhc2UoKSA9PT0gJ2JvZHknKSB7XG4gICAgICAgICAgICBidWlsZGVyLmFkZFBhcmFncmFwaChpbmxpbmVUZXh0KVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgLy8g5YW25LuW5YWD57Sg77yM5bCd6K+V6YCS5b2S5oiW5o+Q5Y+W5paH5pysXG4gICAgICAgICAgaWYgKCRjaGlsZC5jaGlsZHJlbigpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMucGFyc2VFbGVtZW50KCQsICRjaGlsZCwgYnVpbGRlciwgb3B0aW9ucylcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZGVmYXVsdFRleHQgPSAkY2hpbGQudGV4dCgpLnRyaW0oKVxuICAgICAgICAgICAgaWYgKGRlZmF1bHRUZXh0KSB7XG4gICAgICAgICAgICAgIGJ1aWxkZXIuYWRkUGFyYWdyYXBoKGRlZmF1bHRUZXh0KVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIOino+aekOihqOagvFxuICAgKi9cbiAgcHJpdmF0ZSBwYXJzZVRhYmxlKFxuICAgICQ6IGNoZWVyaW8uQ2hlZXJpb0FQSSxcbiAgICAkdGFibGU6IGNoZWVyaW8uQ2hlZXJpbzxBbnlOb2RlPixcbiAgICBidWlsZGVyOiBBc3RCdWlsZGVyXG4gICk6IHZvaWQge1xuICAgIGNvbnN0IHJvd3M6IHN0cmluZ1tdW10gPSBbXVxuICAgIGxldCBoYXNIZWFkZXIgPSBmYWxzZVxuXG4gICAgLy8g5qOA5p+l5piv5ZCm5pyJIHRoZWFkXG4gICAgY29uc3QgJHRoZWFkID0gJHRhYmxlLmZpbmQoJ3RoZWFkJylcbiAgICBpZiAoJHRoZWFkLmxlbmd0aCA+IDApIHtcbiAgICAgIGhhc0hlYWRlciA9IHRydWVcbiAgICAgICR0aGVhZC5maW5kKCd0cicpLmVhY2goKF8sIHRyKSA9PiB7XG4gICAgICAgIGNvbnN0IHJvdzogc3RyaW5nW10gPSBbXVxuICAgICAgICAkKHRyKS5maW5kKCd0aCwgdGQnKS5lYWNoKChfLCBjZWxsKSA9PiB7XG4gICAgICAgICAgcm93LnB1c2goJChjZWxsKS50ZXh0KCkudHJpbSgpKVxuICAgICAgICB9KVxuICAgICAgICBpZiAocm93Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICByb3dzLnB1c2gocm93KVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cblxuICAgIC8vIOWkhOeQhiB0Ym9keSDmiJbnm7TmjqXnmoQgdHJcbiAgICBjb25zdCAkdGJvZHkgPSAkdGFibGUuZmluZCgndGJvZHknKVxuICAgIGNvbnN0ICRyb3dzID0gJHRib2R5Lmxlbmd0aCA+IDAgPyAkdGJvZHkuZmluZCgndHInKSA6ICR0YWJsZS5maW5kKCc+IHRyJylcblxuICAgICRyb3dzLmVhY2goKF8sIHRyKSA9PiB7XG4gICAgICBjb25zdCByb3c6IHN0cmluZ1tdID0gW11cbiAgICAgICQodHIpLmZpbmQoJ3RoLCB0ZCcpLmVhY2goKF8sIGNlbGwpID0+IHtcbiAgICAgICAgcm93LnB1c2goJChjZWxsKS50ZXh0KCkudHJpbSgpKVxuICAgICAgfSlcbiAgICAgIGlmIChyb3cubGVuZ3RoID4gMCkge1xuICAgICAgICByb3dzLnB1c2gocm93KVxuICAgICAgfVxuICAgIH0pXG5cbiAgICBpZiAocm93cy5sZW5ndGggPiAwKSB7XG4gICAgICBidWlsZGVyLmFkZFRhYmxlKHJvd3MsIGhhc0hlYWRlcilcbiAgICB9XG4gIH1cbn1cbiJdfQ==