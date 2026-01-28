"use strict";
/**
 * 纯文本解析器
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TxtParser = void 0;
const ast_builder_1 = require("../utils/ast-builder");
const language_detect_1 = require("../utils/language-detect");
/**
 * 纯文本解析器类
 */
class TxtParser {
    supportedFormats = ['txt'];
    /**
     * 解析纯文本文档
     * @param input 文本内容
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
            const builder = new ast_builder_1.AstBuilder('document.txt');
            builder.setMetadata({
                language: detectedLanguage,
            });
            // 解析文本内容
            this.parseText(text, builder);
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
                error: error instanceof Error ? error.message : '解析文本失败',
                metadata: {
                    parseTime: Date.now() - startTime,
                    method: 'text',
                },
            };
        }
    }
    /**
     * 解析文本内容
     */
    parseText(text, builder) {
        // 按段落分割（两个或更多换行符）
        const paragraphs = text.split(/\n{2,}/);
        for (const paragraph of paragraphs) {
            const trimmed = paragraph.trim();
            if (!trimmed)
                continue;
            // 检测是否是标题
            if (this.isLikelyHeading(trimmed)) {
                const level = this.detectHeadingLevel(trimmed);
                builder.addHeading(trimmed, level);
                continue;
            }
            // 检测是否是列表
            const listItems = this.extractListItems(trimmed);
            if (listItems) {
                builder.addList(listItems.items, listItems.ordered);
                continue;
            }
            // 普通段落
            // 合并单个换行符为空格
            const normalizedText = trimmed.replace(/\n/g, ' ').replace(/\s+/g, ' ');
            builder.addParagraph(normalizedText);
        }
    }
    /**
     * 判断是否可能是标题
     */
    isLikelyHeading(text) {
        // 太长不太可能是标题
        if (text.length > 100)
            return false;
        // 不包含换行符
        if (text.includes('\n'))
            return false;
        // 全大写（英文）
        if (/^[A-Z\s\d]+$/.test(text) && text.length > 3 && text.length < 80)
            return true;
        // 以章节编号开头
        if (/^(第[一二三四五六七八九十百千]+[章节篇部]|Chapter\s+\d+|CHAPTER\s+\d+|\d+\.\s)/i.test(text)) {
            return true;
        }
        // 以数字编号开头
        if (/^\d+(\.\d+)*\s+\S/.test(text) && text.length < 80) {
            return true;
        }
        return false;
    }
    /**
     * 检测标题级别
     */
    detectHeadingLevel(text) {
        // 第X章 -> 1级
        if (/^第[一二三四五六七八九十百千]+章/.test(text))
            return 1;
        // 第X节 -> 2级
        if (/^第[一二三四五六七八九十百千]+节/.test(text))
            return 2;
        // 第X篇 -> 1级
        if (/^第[一二三四五六七八九十百千]+篇/.test(text))
            return 1;
        // 第X部 -> 1级
        if (/^第[一二三四五六七八九十百千]+部/.test(text))
            return 1;
        // Chapter X -> 1级
        if (/^(Chapter|CHAPTER)\s+\d+/i.test(text))
            return 1;
        // X.Y.Z 格式
        const dotMatch = text.match(/^(\d+\.)+/);
        if (dotMatch) {
            const dots = (dotMatch[0].match(/\./g) || []).length;
            return Math.min(dots + 1, 6);
        }
        // 纯数字编号
        if (/^\d+\s/.test(text))
            return 2;
        // 默认 2 级
        return 2;
    }
    /**
     * 提取列表项
     */
    extractListItems(text) {
        const lines = text.split('\n');
        // 检测无序列表
        const unorderedPattern = /^[-*•●○]\s+(.+)$/;
        const unorderedItems = [];
        let isUnordered = true;
        for (const line of lines) {
            const match = line.trim().match(unorderedPattern);
            if (match) {
                unorderedItems.push(match[1]);
            }
            else if (line.trim()) {
                isUnordered = false;
                break;
            }
        }
        if (isUnordered && unorderedItems.length > 0) {
            return { items: unorderedItems, ordered: false };
        }
        // 检测有序列表
        const orderedPattern = /^\d+[.)]\s+(.+)$/;
        const orderedItems = [];
        let isOrdered = true;
        for (const line of lines) {
            const match = line.trim().match(orderedPattern);
            if (match) {
                orderedItems.push(match[1]);
            }
            else if (line.trim()) {
                isOrdered = false;
                break;
            }
        }
        if (isOrdered && orderedItems.length > 0) {
            return { items: orderedItems, ordered: true };
        }
        return null;
    }
}
exports.TxtParser = TxtParser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHh0LXBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9wYXJzZXJzL3R4dC1wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOzs7QUFJSCxzREFBaUQ7QUFDakQsOERBQXlEO0FBRXpEOztHQUVHO0FBQ0gsTUFBYSxTQUFTO0lBQ3BCLGdCQUFnQixHQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFBO0lBRTVDOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQXNCLEVBQUUsT0FBdUI7UUFDekQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBRTVCLElBQUksQ0FBQztZQUNILFdBQVc7WUFDWCxNQUFNLElBQUksR0FBRyxPQUFPLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUV4RSxPQUFPO1lBQ1AsSUFBSSxnQkFBZ0IsR0FBRyxLQUFLLENBQUE7WUFDNUIsSUFBSSxPQUFPLEVBQUUsY0FBYyxLQUFLLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsRUFBRSxDQUFDO2dCQUMxRCxNQUFNLFVBQVUsR0FBRyxJQUFBLGdDQUFjLEVBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ3ZDLGdCQUFnQixHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUE7WUFDcEMsQ0FBQztZQUVELFNBQVM7WUFDVCxNQUFNLE9BQU8sR0FBRyxJQUFJLHdCQUFVLENBQUMsY0FBYyxDQUFDLENBQUE7WUFDOUMsT0FBTyxDQUFDLFdBQVcsQ0FBQztnQkFDbEIsUUFBUSxFQUFFLGdCQUFnQjthQUMzQixDQUFDLENBQUE7WUFFRixTQUFTO1lBQ1QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFFN0IsTUFBTSxHQUFHLEdBQUcsT0FBTyxD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Q0FBQztnQkFDdkIsU0FBUyxHQUFHLEtBQUssQ0FBQTtnQkFDakIsTUFBSztZQUNQLENBQUM7UUFDSCxDQUFDO1FBRUQsSUFBSSxTQUFTLElBQUksWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN6QyxPQUFPLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUE7UUFDL0MsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFBO0lBQ2IsQ0FBQztDQUNGO0FBMUxELDhCQTBMQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICog57qv5paH5pys6Kej5p6Q5ZmoXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBEb2N1bWVudEZvcm1hdCB9IGZyb20gJ0Bkb2MyYm9vay9zaGFyZWQnXG5pbXBvcnQgdHlwZSB7IElQYXJzZXIsIFBhcnNlck9wdGlvbnMsIFBhcnNlUmVzdWx0IH0gZnJvbSAnLi4vdHlwZXMnXG5pbXBvcnQgeyBBc3RCdWlsZGVyIH0gZnJvbSAnLi4vdXRpbHMvYXN0LWJ1aWxkZXInXG5pbXBvcnQgeyBkZXRlY3RMYW5ndWFnZSB9IGZyb20gJy4uL3V0aWxzL2xhbmd1YWdlLWRldGVjdCdcblxuLyoqXG4gKiDnuq/mlofmnKzop6PmnpDlmajnsbtcbiAqL1xuZXhwb3J0IGNsYXNzIFR4dFBhcnNlciBpbXBsZW1lbnRzIElQYXJzZXIge1xuICBzdXBwb3J0ZWRGb3JtYXRzOiBEb2N1bWVudEZvcm1hdFtdID0gWyd0eHQnXVxuXG4gIC8qKlxuICAgKiDop6PmnpDnuq/mlofmnKzmlofmoaNcbiAgICogQHBhcmFtIGlucHV0IOaWh+acrOWGheWuuVxuICAgKiBAcGFyYW0gb3B0aW9ucyDop6PmnpDpgInpoblcbiAgICovXG4gIGFzeW5jIHBhcnNlKGlucHV0OiBCdWZmZXIgfCBzdHJpbmcsIG9wdGlvbnM/OiBQYXJzZXJPcHRpb25zKTogUHJvbWlzZTxQYXJzZVJlc3VsdD4ge1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KClcblxuICAgIHRyeSB7XG4gICAgICAvLyDnoa7kv53ovpPlhaXmmK/lrZfnrKbkuLJcbiAgICAgIGNvbnN0IHRleHQgPSB0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnID8gaW5wdXQgOiBpbnB1dC50b1N0cmluZygndXRmLTgnKVxuXG4gICAgICAvLyDmo4DmtYvor63oqIBcbiAgICAgIGxldCBkZXRlY3RlZExhbmd1YWdlID0gJ3VuZCdcbiAgICAgIGlmIChvcHRpb25zPy5kZXRlY3RMYW5ndWFnZSAhPT0gZmFsc2UgJiYgdGV4dC5sZW5ndGggPiA1MCkge1xuICAgICAgICBjb25zdCBsYW5nUmVzdWx0ID0gZGV0ZWN0TGFuZ3VhZ2UodGV4dClcbiAgICAgICAgZGV0ZWN0ZWRMYW5ndWFnZSA9IGxhbmdSZXN1bHQuY29kZVxuICAgICAgfVxuXG4gICAgICAvLyDmnoTlu7ogQVNUXG4gICAgICBjb25zdCBidWlsZGVyID0gbmV3IEFzdEJ1aWxkZXIoJ2RvY3VtZW50LnR4dCcpXG4gICAgICBidWlsZGVyLnNldE1ldGFkYXRhKHtcbiAgICAgICAgbGFuZ3VhZ2U6IGRldGVjdGVkTGFuZ3VhZ2UsXG4gICAgICB9KVxuXG4gICAgICAvLyDop6PmnpDmlofmnKzlhoXlrrlcbiAgICAgIHRoaXMucGFyc2VUZXh0KHRleHQsIGJ1aWxkZXIpXG5cbiAgICAgIGNvbnN0IGFzdCA9IGJ1aWxkZXIuYnVpbGQoKVxuICAgICAgY29uc3QgcGFyc2VUaW1lID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICBhc3QsXG4gICAgICAgIG1ldGFkYXRhOiB7XG4gICAgICAgICAgcGFyc2VUaW1lLFxuICAgICAgICAgIG1ldGhvZDogJ3RleHQnLFxuICAgICAgICAgIGRldGVjdGVkTGFuZ3VhZ2UsXG4gICAgICAgICAgd29yZENvdW50OiBhc3QubWV0YWRhdGEud29yZENvdW50LFxuICAgICAgICB9LFxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ+ino+aekOaWh+acrOWksei0pScsXG4gICAgICAgIG1ldGFkYXRhOiB7XG4gICAgICAgICAgcGFyc2VUaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxuICAgICAgICAgIG1ldGhvZDogJ3RleHQnLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDop6PmnpDmlofmnKzlhoXlrrlcbiAgICovXG4gIHByaXZhdGUgcGFyc2VUZXh0KHRleHQ6IHN0cmluZywgYnVpbGRlcjogQXN0QnVpbGRlcik6IHZvaWQge1xuICAgIC8vIOaMieauteiQveWIhuWJsu+8iOS4pOS4quaIluabtOWkmuaNouihjOespu+8iVxuICAgIGNvbnN0IHBhcmFncmFwaHMgPSB0ZXh0LnNwbGl0KC9cXG57Mix9LylcblxuICAgIGZvciAoY29uc3QgcGFyYWdyYXBoIG9mIHBhcmFncmFwaHMpIHtcbiAgICAgIGNvbnN0IHRyaW1tZWQgPSBwYXJhZ3JhcGgudHJpbSgpXG4gICAgICBpZiAoIXRyaW1tZWQpIGNvbnRpbnVlXG5cbiAgICAgIC8vIOajgOa1i+aYr+WQpuaYr+agh+mimFxuICAgICAgaWYgKHRoaXMuaXNMaWtlbHlIZWFkaW5nKHRyaW1tZWQpKSB7XG4gICAgICAgIGNvbnN0IGxldmVsID0gdGhpcy5kZXRlY3RIZWFkaW5nTGV2ZWwodHJpbW1lZClcbiAgICAgICAgYnVpbGRlci5hZGRIZWFkaW5nKHRyaW1tZWQsIGxldmVsKVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyDmo4DmtYvmmK/lkKbmmK/liJfooahcbiAgICAgIGNvbnN0IGxpc3RJdGVtcyA9IHRoaXMuZXh0cmFjdExpc3RJdGVtcyh0cmltbWVkKVxuICAgICAgaWYgKGxpc3RJdGVtcykge1xuICAgICAgICBidWlsZGVyLmFkZExpc3QobGlzdEl0ZW1zLml0ZW1zLCBsaXN0SXRlbXMub3JkZXJlZClcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8g5pmu6YCa5q616JC9XG4gICAgICAvLyDlkIjlubbljZXkuKrmjaLooYznrKbkuLrnqbrmoLxcbiAgICAgIGNvbnN0IG5vcm1hbGl6ZWRUZXh0ID0gdHJpbW1lZC5yZXBsYWNlKC9cXG4vZywgJyAnKS5yZXBsYWNlKC9cXHMrL2csICcgJylcbiAgICAgIGJ1aWxkZXIuYWRkUGFyYWdyYXBoKG5vcm1hbGl6ZWRUZXh0KVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDliKTmlq3mmK/lkKblj6/og73mmK/moIfpophcbiAgICovXG4gIHByaXZhdGUgaXNMaWtlbHlIZWFkaW5nKHRleHQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIC8vIOWkqumVv+S4jeWkquWPr+iDveaYr+agh+mimFxuICAgIGlmICh0ZXh0Lmxlbmd0aCA+IDEwMCkgcmV0dXJuIGZhbHNlXG5cbiAgICAvLyDkuI3ljIXlkKvmjaLooYznrKZcbiAgICBpZiAodGV4dC5pbmNsdWRlcygnXFxuJykpIHJldHVybiBmYWxzZVxuXG4gICAgLy8g5YWo5aSn5YaZ77yI6Iux5paH77yJXG4gICAgaWYgKC9eW0EtWlxcc1xcZF0rJC8udGVzdCh0ZXh0KSAmJiB0ZXh0Lmxlbmd0aCA+IDMgJiYgdGV4dC5sZW5ndGggPCA4MCkgcmV0dXJuIHRydWVcblxuICAgIC8vIOS7peeroOiKgue8luWPt+W8gOWktFxuICAgIGlmICgvXijnrKxb5LiA5LqM5LiJ5Zub5LqU5YWt5LiD5YWr5Lmd5Y2B55m+5Y2DXStb56ug6IqC56+H6YOoXXxDaGFwdGVyXFxzK1xcZCt8Q0hBUFRFUlxccytcXGQrfFxcZCtcXC5cXHMpL2kudGVzdCh0ZXh0KSkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG5cbiAgICAvLyDku6XmlbDlrZfnvJblj7flvIDlpLRcbiAgICBpZiAoL15cXGQrKFxcLlxcZCspKlxccytcXFMvLnRlc3QodGV4dCkgJiYgdGV4dC5sZW5ndGggPCA4MCkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIC8qKlxuICAgKiDmo4DmtYvmoIfpopjnuqfliKtcbiAgICovXG4gIHByaXZhdGUgZGV0ZWN0SGVhZGluZ0xldmVsKHRleHQ6IHN0cmluZyk6IG51bWJlciB7XG4gICAgLy8g56ysWOeroCAtPiAx57qnXG4gICAgaWYgKC9e56ysW+S4gOS6jOS4ieWbm+S6lOWFreS4g+WFq+S5neWNgeeZvuWNg10r56ugLy50ZXN0KHRleHQpKSByZXR1cm4gMVxuICAgIC8vIOesrFjoioIgLT4gMue6p1xuICAgIGlmICgvXuesrFvkuIDkuozkuInlm5vkupTlha3kuIPlhavkuZ3ljYHnmb7ljYNdK+iKgi8udGVzdCh0ZXh0KSkgcmV0dXJuIDJcbiAgICAvLyDnrKxY56+HIC0+IDHnuqdcbiAgICBpZiAoL17nrKxb5LiA5LqM5LiJ5Zub5LqU5YWt5LiD5YWr5Lmd5Y2B55m+5Y2DXSvnr4cvLnRlc3QodGV4dCkpIHJldHVybiAxXG4gICAgLy8g56ysWOmDqCAtPiAx57qnXG4gICAgaWYgKC9e56ysW+S4gOS6jOS4ieWbm+S6lOWFreS4g+WFq+S5neWNgeeZvuWNg10r6YOoLy50ZXN0KHRleHQpKSByZXR1cm4gMVxuICAgIC8vIENoYXB0ZXIgWCAtPiAx57qnXG4gICAgaWYgKC9eKENoYXB0ZXJ8Q0hBUFRFUilcXHMrXFxkKy9pLnRlc3QodGV4dCkpIHJldHVybiAxXG4gICAgLy8gWC5ZLlog5qC85byPXG4gICAgY29uc3QgZG90TWF0Y2ggPSB0ZXh0Lm1hdGNoKC9eKFxcZCtcXC4pKy8pXG4gICAgaWYgKGRvdE1hdGNoKSB7XG4gICAgICBjb25zdCBkb3RzID0gKGRvdE1hdGNoWzBdLm1hdGNoKC9cXC4vZykgfHwgW10pLmxlbmd0aFxuICAgICAgcmV0dXJuIE1hdGgubWluKGRvdHMgKyAxLCA2KVxuICAgIH1cbiAgICAvLyDnuq/mlbDlrZfnvJblj7dcbiAgICBpZiAoL15cXGQrXFxzLy50ZXN0KHRleHQpKSByZXR1cm4gMlxuICAgIC8vIOm7mOiupCAyIOe6p1xuICAgIHJldHVybiAyXG4gIH1cblxuICAvKipcbiAgICog5o+Q5Y+W5YiX6KGo6aG5XG4gICAqL1xuICBwcml2YXRlIGV4dHJhY3RMaXN0SXRlbXModGV4dDogc3RyaW5nKTogeyBpdGVtczogc3RyaW5nW107IG9yZGVyZWQ6IGJvb2xlYW4gfSB8IG51bGwge1xuICAgIGNvbnN0IGxpbmVzID0gdGV4dC5zcGxpdCgnXFxuJylcblxuICAgIC8vIOajgOa1i+aXoOW6j+WIl+ihqFxuICAgIGNvbnN0IHVub3JkZXJlZFBhdHRlcm4gPSAvXlstKuKAouKXj+KXi11cXHMrKC4rKSQvXG4gICAgY29uc3QgdW5vcmRlcmVkSXRlbXM6IHN0cmluZ1tdID0gW11cbiAgICBsZXQgaXNVbm9yZGVyZWQgPSB0cnVlXG5cbiAgICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICAgIGNvbnN0IG1hdGNoID0gbGluZS50cmltKCkubWF0Y2godW5vcmRlcmVkUGF0dGVybilcbiAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICB1bm9yZGVyZWRJdGVtcy5wdXNoKG1hdGNoWzFdKVxuICAgICAgfSBlbHNlIGlmIChsaW5lLnRyaW0oKSkge1xuICAgICAgICBpc1Vub3JkZXJlZCA9IGZhbHNlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGlzVW5vcmRlcmVkICYmIHVub3JkZXJlZEl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiB7IGl0ZW1zOiB1bm9yZGVyZWRJdGVtcywgb3JkZXJlZDogZmFsc2UgfVxuICAgIH1cblxuICAgIC8vIOajgOa1i+acieW6j+WIl+ihqFxuICAgIGNvbnN0IG9yZGVyZWRQYXR0ZXJuID0gL15cXGQrWy4pXVxccysoLispJC9cbiAgICBjb25zdCBvcmRlcmVkSXRlbXM6IHN0cmluZ1tdID0gW11cbiAgICBsZXQgaXNPcmRlcmVkID0gdHJ1ZVxuXG4gICAgZm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XG4gICAgICBjb25zdCBtYXRjaCA9IGxpbmUudHJpbSgpLm1hdGNoKG9yZGVyZWRQYXR0ZXJuKVxuICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgIG9yZGVyZWRJdGVtcy5wdXNoKG1hdGNoWzFdKVxuICAgICAgfSBlbHNlIGlmIChsaW5lLnRyaW0oKSkge1xuICAgICAgICBpc09yZGVyZWQgPSBmYWxzZVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpc09yZGVyZWQgJiYgb3JkZXJlZEl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiB7IGl0ZW1zOiBvcmRlcmVkSXRlbXMsIG9yZGVyZWQ6IHRydWUgfVxuICAgIH1cblxuICAgIHJldHVybiBudWxsXG4gIH1cbn1cbiJdfQ==