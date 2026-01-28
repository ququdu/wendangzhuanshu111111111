"use strict";
/**
 * Markdown 解析器
 * 使用 marked 解析 Markdown 文档
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownParser = void 0;
const marked_1 = require("marked");
const ast_builder_1 = require("../utils/ast-builder");
const language_detect_1 = require("../utils/language-detect");
/**
 * Markdown 解析器类
 */
class MarkdownParser {
    supportedFormats = ['md', 'markdown'];
    /**
     * 解析 Markdown 文档
     * @param input Markdown 文本内容
     * @param options 解析选项
     */
    async parse(input, options) {
        const startTime = Date.now();
        try {
            // 确保输入是字符串
            const text = typeof input === 'string' ? input : input.toString('utf-8');
            // 检测语言
            let detectedLanguage = 'und';
            if (options?.detectLanguage !== false && text.length > 50) {
                const langResult = (0, language_detect_1.detectLanguage)(text);
                detectedLanguage = langResult.code;
            }
            // 构建 AST
            const builder = new ast_builder_1.AstBuilder('document.md');
            builder.setMetadata({
                language: detectedLanguage,
            });
            // 使用 marked 的 lexer 解析为 tokens
            const tokens = marked_1.marked.lexer(text);
            // 解析 tokens
            this.parseTokens(tokens, builder, options);
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
                error: error instanceof Error ? error.message : '解析 Markdown 失败',
                metadata: {
                    parseTime: Date.now() - startTime,
                    method: 'text',
                },
            };
        }
    }
    /**
     * 解析 marked tokens
     */
    parseTokens(tokens, builder, options) {
        for (const token of tokens) {
            this.parseToken(token, builder, options);
        }
    }
    /**
     * 解析单个 token
     */
    parseToken(token, builder, options) {
        switch (token.type) {
            case 'heading':
                builder.addHeading(token.text, token.depth);
                break;
            case 'paragraph':
                builder.addParagraph(token.text);
                break;
            case 'list':
                const items = token.items.map((item) => item.text);
                builder.addList(items, token.ordered);
                break;
            case 'code':
                builder.addCodeBlock(token.text, token.lang);
                break;
            case 'blockquote':
                // blockquote 可能包含多个 token
                const quoteText = this.extractText(token);
                builder.addBlockquote(quoteText);
                break;
            case 'table':
                if (options?.extractTables !== false && token.type === 'table') {
                    this.parseTable(token, builder);
                }
                break;
            case 'hr':
                // 水平线，可以作为分隔符
                builder.addNode({
                    type: 'paragraph',
                    text: '---',
                    attributes: { isHorizontalRule: true },
                });
                break;
            case 'html':
                // HTML 块，尝试提取文本
                const htmlText = token.text.replace(/<[^>]+>/g, '').trim();
                if (htmlText) {
                    builder.addParagraph(htmlText);
                }
                break;
            case 'space':
                // 空白，忽略
                break;
            default:
                // 其他类型，尝试提取文本
                if ('text' in token && typeof token.text === 'string') {
                    builder.addParagraph(token.text);
                }
        }
    }
    /**
     * 从 token 中提取纯文本
     */
    extractText(token) {
        if ('text' in token && typeof token.text === 'string') {
            return token.text;
        }
        if ('tokens' in token && Array.isArray(token.tokens)) {
            return token.tokens.map((t) => this.extractText(t)).join(' ');
        }
        if ('items' in token && Array.isArray(token.items)) {
            return token.items.map((item) => this.extractText(item)).join('\n');
        }
        return '';
    }
    /**
     * 解析表格
     */
    parseTable(token, builder) {
        const rows = [];
        // 添加表头
        if (token.header && token.header.length > 0) {
            const headerRow = token.header.map((cell) => cell.text);
            rows.push(headerRow);
        }
        // 添加表格内容
        for (const row of token.rows) {
            const rowData = row.map((cell) => cell.text);
            rows.push(rowData);
        }
        if (rows.length > 0) {
            builder.addTable(rows, token.header && token.header.length > 0);
        }
    }
}
exports.MarkdownParser = MarkdownParser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24tcGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3BhcnNlcnMvbWFya2Rvd24tcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7OztBQUVILG1DQUEwRDtBQUcxRCxzREFBaUQ7QUFDakQsOERBQXlEO0FBRXpEOztHQUVHO0FBQ0gsTUFBYSxjQUFjO0lBQ3pCLGdCQUFnQixHQUFxQixDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUV2RDs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFzQixFQUFFLE9BQXVCO1FBQ3pELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUU1QixJQUFJLENBQUM7WUFDSCxXQUFXO1lBQ1gsTUFBTSxJQUFJLEdBQUcsT0FBTyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUE7WUFFeEUsT0FBTztZQUNQLElBQUksZ0JBQWdCLEdBQUcsS0FBSyxDQUFBO1lBQzVCLElBQUksT0FBTyxFQUFFLGNBQWMsS0FBSyxLQUFLLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLEVBQUUsQ0FBQztnQkFDMUQsTUFBTSxVQUFVLEdBQUcsSUFBQSxnQ0FBYyxFQUFDLElBQUksQ0FBQyxDQUFBO2dCQUN2QyxnQkFBZ0IsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFBO1lBQ3BDLENBQUM7WUFFRCxTQUFTO1lBQ1QsTUFBTSxPQUFPLEdBQUcsSUFBSSx3QkFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1lBQzdDLE9BQU8sQ0FBQyxXQUFXLENBQUM7Z0JBQ2xCLFFBQVEsRUFBRSxnQkFBZ0I7YUFDM0IsQ0FBQyxDQUFBO1lBRUYsK0JBQStCO1lBQy9CLE1BQU0sTUFBTSxHQUFHLGVBQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7WUFFakMsWUFBWTtZQUNaLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUUxQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDM0IsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLFNBQVMsQ0FBQTtZQUV4QyxPQUFPO2dCQUNMLE9BQU8sRUFBRSxJQUFJO2dCQUNiLEdBQUc7Z0JBQ0gsUUFBUSxFQUFFO29CQUNSLFNBQVM7b0JBQ1QsTUFBTSxFQUFFLE1BQU07b0JBQ2QsZ0JBQWdCO29CQUNoQixTQUFTLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTO2lCQUNsQzthQUNGLENBQUE7UUFDSCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE9BQU87Z0JBQ0wsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsS0FBSyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGdCQUFnQjtnQkFDaEUsUUFBUSxFQUFFO29CQUNSLFNBQVMsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsU0FBUztvQkFDakMsTUFBTSxFQUFFLE1BQU07aUJBQ2Y7YUFDRixDQUFBO1FBQ0gsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNLLFdBQVcsQ0FDakIsTUFBa0IsRUFDbEIsT0FBbUIsRUFDbkIsT0FBdUI7UUFFdkIsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDMUMsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNLLFVBQVUsQ0FDaEIsS0FBWSxFQUNaLE9BQW1CLEVBQ25CLE9BQXVCO1FBRXZCLFFBQVEsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ25CLEtBQUssU0FBUztnQkFDWixPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUMzQyxNQUFLO1lBRVAsS0FBSyxXQUFXO2dCQUNkLE9BQU8sQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNoQyxNQUFLO1lBRVAsS0FBSyxNQUFNO2dCQUNULE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBcUIsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNuRSxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7Z0JBQ3JDLE1BQUs7WUFFUCxLQUFLLE1BQU07Z0JBQ1QsT0FBTyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDNUMsTUFBSztZQUVQLEtBQUssWUFBWTtnQkFDZiwwQkFBMEI7Z0JBQzFCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ3pDLE9BQU8sQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQ2hDLE1BQUs7WUFFUCxLQUFLLE9BQU87Z0JBQ1YsSUFBSSxPQUFPLEVBQUUsYUFBYSxLQUFLLEtBQUssSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRSxDQUFDO29CQUMvRCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQXFCLEVBQUUsT0FBTyxDQUFDLENBQUE7Z0JBQ2pELENBQUM7Z0JBQ0QsTUFBSztZQUVQLEtBQUssSUFBSTtnQkFDUCxjQUFjO2dCQUNkLE9BQU8sQ0FBQyxPQUFPLENBQUM7b0JBQ2QsSUFBSSxFQUFFLFdBQVc7b0JBQ2pCLElBQUksRUFBRSxLQUFLO29CQUNYLFVBQVUsRUFBRSxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRTtpQkFDdkMsQ0FBQyxDQUFBO2dCQUNGLE1BQUs7WUFFUCxLQUFLLE1BQU07Z0JBQ1QsZ0JBQWdCO2dCQUNoQixNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBQzFELElBQUksUUFBUSxFQUFFLENBQUM7b0JBQ2IsT0FBTyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQTtnQkFDaEMsQ0FBQztnQkFDRCxNQUFLO1lBRVAsS0FBSyxPQUFPO2dCQUNWLFFBQVE7Z0JBQ1IsTUFBSztZQUVQO2dCQUNFLGNBQWM7Z0JBQ2QsSUFBSSxNQUFNLElBQUksS0FBSyxJQUFJLE9BQU8sS0FBSyxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztvQkFDdEQsT0FBTyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ2xDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ssV0FBVyxDQUFDLEtBQVk7UUFDOUIsSUFBSSxNQUFNLElBQUksS0FBSyxJQUFJLE9BQU8sS0FBSyxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUN0RCxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFDbkIsQ0FBQztRQUNELElBQUksUUFBUSxJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ3JELE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFRLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDdEUsQ0FBQztRQUNELElBQUksT0FBTyxJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ25ELE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFXLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDNUUsQ0FBQztRQUNELE9BQU8sRUFBRSxDQUFBO0lBQ1gsQ0FBQztJQUVEOztPQUVHO0lBQ0ssVUFBVSxDQUFDLEtBQW1CLEVBQUUsT0FBbUI7UUFDekQsTUFBTSxJQUFJLEdBQWUsRUFBRSxDQUFBO1FBRTNCLE9BQU87UUFDUCxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDNUMsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUN2RCxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3RCLENBQUM7UUFFRCxTQUFTO1FBQ1QsS0FBSyxNQUFNLEdBQUcsSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDN0IsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzVDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDcEIsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNwQixPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2pFLENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUFqTEQsd0NBaUxDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBNYXJrZG93biDop6PmnpDlmahcbiAqIOS9v+eUqCBtYXJrZWQg6Kej5p6QIE1hcmtkb3duIOaWh+aho1xuICovXG5cbmltcG9ydCB7IG1hcmtlZCwgVG9rZW5zLCBUb2tlbiwgVG9rZW5zTGlzdCB9IGZyb20gJ21hcmtlZCdcbmltcG9ydCB0eXBlIHsgRG9jdW1lbnRGb3JtYXQgfSBmcm9tICdAZG9jMmJvb2svc2hhcmVkJ1xuaW1wb3J0IHR5cGUgeyBJUGFyc2VyLCBQYXJzZXJPcHRpb25zLCBQYXJzZVJlc3VsdCB9IGZyb20gJy4uL3R5cGVzJ1xuaW1wb3J0IHsgQXN0QnVpbGRlciB9IGZyb20gJy4uL3V0aWxzL2FzdC1idWlsZGVyJ1xuaW1wb3J0IHsgZGV0ZWN0TGFuZ3VhZ2UgfSBmcm9tICcuLi91dGlscy9sYW5ndWFnZS1kZXRlY3QnXG5cbi8qKlxuICogTWFya2Rvd24g6Kej5p6Q5Zmo57G7XG4gKi9cbmV4cG9ydCBjbGFzcyBNYXJrZG93blBhcnNlciBpbXBsZW1lbnRzIElQYXJzZXIge1xuICBzdXBwb3J0ZWRGb3JtYXRzOiBEb2N1bWVudEZvcm1hdFtdID0gWydtZCcsICdtYXJrZG93biddXG5cbiAgLyoqXG4gICAqIOino+aekCBNYXJrZG93biDmlofmoaNcbiAgICogQHBhcmFtIGlucHV0IE1hcmtkb3duIOaWh+acrOWGheWuuVxuICAgKiBAcGFyYW0gb3B0aW9ucyDop6PmnpDpgInpoblcbiAgICovXG4gIGFzeW5jIHBhcnNlKGlucHV0OiBCdWZmZXIgfCBzdHJpbmcsIG9wdGlvbnM/OiBQYXJzZXJPcHRpb25zKTogUHJvbWlzZTxQYXJzZVJlc3VsdD4ge1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KClcblxuICAgIHRyeSB7XG4gICAgICAvLyDnoa7kv53ovpPlhaXmmK/lrZfnrKbkuLJcbiAgICAgIGNvbnN0IHRleHQgPSB0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnID8gaW5wdXQgOiBpbnB1dC50b1N0cmluZygndXRmLTgnKVxuXG4gICAgICAvLyDmo4DmtYvor63oqIBcbiAgICAgIGxldCBkZXRlY3RlZExhbmd1YWdlID0gJ3VuZCdcbiAgICAgIGlmIChvcHRpb25zPy5kZXRlY3RMYW5ndWFnZSAhPT0gZmFsc2UgJiYgdGV4dC5sZW5ndGggPiA1MCkge1xuICAgICAgICBjb25zdCBsYW5nUmVzdWx0ID0gZGV0ZWN0TGFuZ3VhZ2UodGV4dClcbiAgICAgICAgZGV0ZWN0ZWRMYW5ndWFnZSA9IGxhbmdSZXN1bHQuY29kZVxuICAgICAgfVxuXG4gICAgICAvLyDmnoTlu7ogQVNUXG4gICAgICBjb25zdCBidWlsZGVyID0gbmV3IEFzdEJ1aWxkZXIoJ2RvY3VtZW50Lm1kJylcbiAgICAgIGJ1aWxkZXIuc2V0TWV0YWRhdGEoe1xuICAgICAgICBsYW5ndWFnZTogZGV0ZWN0ZWRMYW5ndWFnZSxcbiAgICAgIH0pXG5cbiAgICAgIC8vIOS9v+eUqCBtYXJrZWQg55qEIGxleGVyIOino+aekOS4uiB0b2tlbnNcbiAgICAgIGNvbnN0IHRva2VucyA9IG1hcmtlZC5sZXhlcih0ZXh0KVxuXG4gICAgICAvLyDop6PmnpAgdG9rZW5zXG4gICAgICB0aGlzLnBhcnNlVG9rZW5zKHRva2VucywgYnVpbGRlciwgb3B0aW9ucylcblxuICAgICAgY29uc3QgYXN0ID0gYnVpbGRlci5idWlsZCgpXG4gICAgICBjb25zdCBwYXJzZVRpbWUgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lXG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIGFzdCxcbiAgICAgICAgbWV0YWRhdGE6IHtcbiAgICAgICAgICBwYXJzZVRpbWUsXG4gICAgICAgICAgbWV0aG9kOiAndGV4dCcsXG4gICAgICAgICAgZGV0ZWN0ZWRMYW5ndWFnZSxcbiAgICAgICAgICB3b3JkQ291bnQ6IGFzdC5tZXRhZGF0YS53b3JkQ291bnQsXG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAn6Kej5p6QIE1hcmtkb3duIOWksei0pScsXG4gICAgICAgIG1ldGFkYXRhOiB7XG4gICAgICAgICAgcGFyc2VUaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxuICAgICAgICAgIG1ldGhvZDogJ3RleHQnLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDop6PmnpAgbWFya2VkIHRva2Vuc1xuICAgKi9cbiAgcHJpdmF0ZSBwYXJzZVRva2VucyhcbiAgICB0b2tlbnM6IFRva2Vuc0xpc3QsXG4gICAgYnVpbGRlcjogQXN0QnVpbGRlcixcbiAgICBvcHRpb25zPzogUGFyc2VyT3B0aW9uc1xuICApOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IHRva2VuIG9mIHRva2Vucykge1xuICAgICAgdGhpcy5wYXJzZVRva2VuKHRva2VuLCBidWlsZGVyLCBvcHRpb25zKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDop6PmnpDljZXkuKogdG9rZW5cbiAgICovXG4gIHByaXZhdGUgcGFyc2VUb2tlbihcbiAgICB0b2tlbjogVG9rZW4sXG4gICAgYnVpbGRlcjogQXN0QnVpbGRlcixcbiAgICBvcHRpb25zPzogUGFyc2VyT3B0aW9uc1xuICApOiB2b2lkIHtcbiAgICBzd2l0Y2ggKHRva2VuLnR5cGUpIHtcbiAgICAgIGNhc2UgJ2hlYWRpbmcnOlxuICAgICAgICBidWlsZGVyLmFkZEhlYWRpbmcodG9rZW4udGV4dCwgdG9rZW4uZGVwdGgpXG4gICAgICAgIGJyZWFrXG5cbiAgICAgIGNhc2UgJ3BhcmFncmFwaCc6XG4gICAgICAgIGJ1aWxkZXIuYWRkUGFyYWdyYXBoKHRva2VuLnRleHQpXG4gICAgICAgIGJyZWFrXG5cbiAgICAgIGNhc2UgJ2xpc3QnOlxuICAgICAgICBjb25zdCBpdGVtcyA9IHRva2VuLml0ZW1zLm1hcCgoaXRlbTogVG9rZW5zLkxpc3RJdGVtKSA9PiBpdGVtLnRleHQpXG4gICAgICAgIGJ1aWxkZXIuYWRkTGlzdChpdGVtcywgdG9rZW4ub3JkZXJlZClcbiAgICAgICAgYnJlYWtcblxuICAgICAgY2FzZSAnY29kZSc6XG4gICAgICAgIGJ1aWxkZXIuYWRkQ29kZUJsb2NrKHRva2VuLnRleHQsIHRva2VuLmxhbmcpXG4gICAgICAgIGJyZWFrXG5cbiAgICAgIGNhc2UgJ2Jsb2NrcXVvdGUnOlxuICAgICAgICAvLyBibG9ja3F1b3RlIOWPr+iDveWMheWQq+WkmuS4qiB0b2tlblxuICAgICAgICBjb25zdCBxdW90ZVRleHQgPSB0aGlzLmV4dHJhY3RUZXh0KHRva2VuKVxuICAgICAgICBidWlsZGVyLmFkZEJsb2NrcXVvdGUocXVvdGVUZXh0KVxuICAgICAgICBicmVha1xuXG4gICAgICBjYXNlICd0YWJsZSc6XG4gICAgICAgIGlmIChvcHRpb25zPy5leHRyYWN0VGFibGVzICE9PSBmYWxzZSAmJiB0b2tlbi50eXBlID09PSAndGFibGUnKSB7XG4gICAgICAgICAgdGhpcy5wYXJzZVRhYmxlKHRva2VuIGFzIFRva2Vucy5UYWJsZSwgYnVpbGRlcilcbiAgICAgICAgfVxuICAgICAgICBicmVha1xuXG4gICAgICBjYXNlICdocic6XG4gICAgICAgIC8vIOawtOW5s+e6v++8jOWPr+S7peS9nOS4uuWIhumalOesplxuICAgICAgICBidWlsZGVyLmFkZE5vZGUoe1xuICAgICAgICAgIHR5cGU6ICdwYXJhZ3JhcGgnLFxuICAgICAgICAgIHRleHQ6ICctLS0nLFxuICAgICAgICAgIGF0dHJpYnV0ZXM6IHsgaXNIb3Jpem9udGFsUnVsZTogdHJ1ZSB9LFxuICAgICAgICB9KVxuICAgICAgICBicmVha1xuXG4gICAgICBjYXNlICdodG1sJzpcbiAgICAgICAgLy8gSFRNTCDlnZfvvIzlsJ3or5Xmj5Dlj5bmlofmnKxcbiAgICAgICAgY29uc3QgaHRtbFRleHQgPSB0b2tlbi50ZXh0LnJlcGxhY2UoLzxbXj5dKz4vZywgJycpLnRyaW0oKVxuICAgICAgICBpZiAoaHRtbFRleHQpIHtcbiAgICAgICAgICBidWlsZGVyLmFkZFBhcmFncmFwaChodG1sVGV4dClcbiAgICAgICAgfVxuICAgICAgICBicmVha1xuXG4gICAgICBjYXNlICdzcGFjZSc6XG4gICAgICAgIC8vIOepuueZve+8jOW/veeVpVxuICAgICAgICBicmVha1xuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICAvLyDlhbbku5bnsbvlnovvvIzlsJ3or5Xmj5Dlj5bmlofmnKxcbiAgICAgICAgaWYgKCd0ZXh0JyBpbiB0b2tlbiAmJiB0eXBlb2YgdG9rZW4udGV4dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBidWlsZGVyLmFkZFBhcmFncmFwaCh0b2tlbi50ZXh0KVxuICAgICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOS7jiB0b2tlbiDkuK3mj5Dlj5bnuq/mlofmnKxcbiAgICovXG4gIHByaXZhdGUgZXh0cmFjdFRleHQodG9rZW46IFRva2VuKTogc3RyaW5nIHtcbiAgICBpZiAoJ3RleHQnIGluIHRva2VuICYmIHR5cGVvZiB0b2tlbi50ZXh0ID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIHRva2VuLnRleHRcbiAgICB9XG4gICAgaWYgKCd0b2tlbnMnIGluIHRva2VuICYmIEFycmF5LmlzQXJyYXkodG9rZW4udG9rZW5zKSkge1xuICAgICAgcmV0dXJuIHRva2VuLnRva2Vucy5tYXAoKHQ6IFRva2VuKSA9PiB0aGlzLmV4dHJhY3RUZXh0KHQpKS5qb2luKCcgJylcbiAgICB9XG4gICAgaWYgKCdpdGVtcycgaW4gdG9rZW4gJiYgQXJyYXkuaXNBcnJheSh0b2tlbi5pdGVtcykpIHtcbiAgICAgIHJldHVybiB0b2tlbi5pdGVtcy5tYXAoKGl0ZW06IFRva2VuKSA9PiB0aGlzLmV4dHJhY3RUZXh0KGl0ZW0pKS5qb2luKCdcXG4nKVxuICAgIH1cbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIC8qKlxuICAgKiDop6PmnpDooajmoLxcbiAgICovXG4gIHByaXZhdGUgcGFyc2VUYWJsZSh0b2tlbjogVG9rZW5zLlRhYmxlLCBidWlsZGVyOiBBc3RCdWlsZGVyKTogdm9pZCB7XG4gICAgY29uc3Qgcm93czogc3RyaW5nW11bXSA9IFtdXG5cbiAgICAvLyDmt7vliqDooajlpLRcbiAgICBpZiAodG9rZW4uaGVhZGVyICYmIHRva2VuLmhlYWRlci5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBoZWFkZXJSb3cgPSB0b2tlbi5oZWFkZXIubWFwKChjZWxsKSA9PiBjZWxsLnRleHQpXG4gICAgICByb3dzLnB1c2goaGVhZGVyUm93KVxuICAgIH1cblxuICAgIC8vIOa3u+WKoOihqOagvOWGheWuuVxuICAgIGZvciAoY29uc3Qgcm93IG9mIHRva2VuLnJvd3MpIHtcbiAgICAgIGNvbnN0IHJvd0RhdGEgPSByb3cubWFwKChjZWxsKSA9PiBjZWxsLnRleHQpXG4gICAgICByb3dzLnB1c2gocm93RGF0YSlcbiAgICB9XG5cbiAgICBpZiAocm93cy5sZW5ndGggPiAwKSB7XG4gICAgICBidWlsZGVyLmFkZFRhYmxlKHJvd3MsIHRva2VuLmhlYWRlciAmJiB0b2tlbi5oZWFkZXIubGVuZ3RoID4gMClcbiAgICB9XG4gIH1cbn1cbiJdfQ==