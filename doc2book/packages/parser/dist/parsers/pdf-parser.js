"use strict";
/**
 * PDF 解析器
 * 支持文本提取和 OCR 识别
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfParser = void 0;
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const ast_builder_1 = require("../utils/ast-builder");
const language_detect_1 = require("../utils/language-detect");
/**
 * PDF 解析器类
 */
class PdfParser {
    supportedFormats = ['pdf'];
    /**
     * 解析 PDF 文档
     * @param input PDF 文件的 Buffer
     * @param options 解析选项
     */
    async parse(input, options) {
        const startTime = Date.now();
        try {
            // 确保输入是 Buffer
            const buffer = typeof input === 'string' ? Buffer.from(input, 'base64') : input;
            // 使用 pdf-parse 提取文本
            const pdfData = await (0, pdf_parse_1.default)(buffer, {
                max: options?.maxPages || 0, // 0 表示不限制
            });
            const text = pdfData.text;
            const pageCount = pdfData.numpages;
            // 计算文本密度（字符数/页数）
            const textDensity = pageCount > 0 ? text.length / pageCount : 0;
            const threshold = options?.textDensityThreshold || 100;
            // 判断是否需要 OCR
            let method = 'text';
            let finalText = text;
            if (options?.enableOcr && textDensity < threshold) {
                // 文本密度太低，可能是扫描版 PDF，需要 OCR
                // 注意：这里只是标记，实际 OCR 需要在 ImageParser 中处理
                method = 'ocr';
                // TODO: 实现 PDF 页面转图片 + OCR
                console.warn('PDF 文本密度过低，建议使用 OCR 模式');
            }
            // 检测语言
            let detectedLanguage = 'und';
            if (options?.detectLanguage !== false && text.length > 50) {
                const langResult = (0, language_detect_1.detectLanguage)(text);
                detectedLanguage = langResult.code;
            }
            // 构建 AST
            const builder = new ast_builder_1.AstBuilder('document.pdf');
            builder.setMetadata({
                title: pdfData.info?.Title || undefined,
                author: pdfData.info?.Author || undefined,
                language: detectedLanguage,
                pageCount,
            });
            // 解析文本内容
            this.parseContent(finalText, builder);
            const ast = builder.build();
            const parseTime = Date.now() - startTime;
            return {
                success: true,
                ast,
                metadata: {
                    parseTime,
                    method,
                    textDensity,
                    detectedLanguage,
                    pageCount,
                    wordCount: ast.metadata.wordCount,
                },
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '解析 PDF 失败',
                metadata: {
                    parseTime: Date.now() - startTime,
                    method: 'text',
                },
            };
        }
    }
    /**
     * 解析文本内容，识别结构
     */
    parseContent(text, builder) {
        // 按页分割（pdf-parse 用 \n\n 分隔页面）
        const pages = text.split(/\n{3,}/);
        for (const page of pages) {
            const lines = page.split('\n');
            let currentParagraph = [];
            const flushParagraph = () => {
                if (currentParagraph.length > 0) {
                    const paragraphText = currentParagraph.join(' ').trim();
                    if (paragraphText) {
                        builder.addParagraph(paragraphText);
                    }
                    currentParagraph = [];
                }
            };
            for (const line of lines) {
                const trimmedLine = line.trim();
                // 空行：结束当前段落
                if (!trimmedLine) {
                    flushParagraph();
                    continue;
                }
                // 检测可能的标题（短行、全大写、或以数字开头）
                if (this.isLikelyHeading(trimmedLine, lines)) {
                    flushParagraph();
                    const level = this.detectHeadingLevel(trimmedLine);
                    builder.addHeading(trimmedLine, level);
                    continue;
                }
                // 检测列表项
                if (this.isListItem(trimmedLine)) {
                    flushParagraph();
                    const listText = trimmedLine.replace(/^[-*•●○]\s*/, '').replace(/^\d+[.)]\s*/, '');
                    builder.addList([listText], /^\d+[.)]/.test(trimmedLine));
                    continue;
                }
                // 普通文本
                currentParagraph.push(trimmedLine);
            }
            flushParagraph();
        }
    }
    /**
     * 判断是否可能是标题
     */
    isLikelyHeading(line, allLines) {
        // 太长不太可能是标题
        if (line.length > 100)
            return false;
        // 全大写（英文）
        if (/^[A-Z\s\d]+$/.test(line) && line.length > 3)
            return true;
        // 以章节编号开头
        if (/^(第[一二三四五六七八九十百千]+[章节篇部]|Chapter\s+\d+|CHAPTER\s+\d+|\d+\.\s)/i.test(line)) {
            return true;
        }
        // 短行且后面跟着较长的段落
        const lineIndex = allLines.indexOf(line);
        if (line.length < 50 && lineIndex < allLines.length - 1) {
            const nextLine = allLines[lineIndex + 1]?.trim();
            if (nextLine && nextLine.length > line.length * 2) {
                return true;
            }
        }
        return false;
    }
    /**
     * 检测标题级别
     */
    detectHeadingLevel(line) {
        // 第X章 -> 1级
        if (/^第[一二三四五六七八九十百千]+章/.test(line))
            return 1;
        // 第X节 -> 2级
        if (/^第[一二三四五六七八九十百千]+节/.test(line))
            return 2;
        // Chapter X -> 1级
        if (/^(Chapter|CHAPTER)\s+\d+/i.test(line))
            return 1;
        // X.Y.Z 格式
        const dotMatch = line.match(/^(\d+\.)+/);
        if (dotMatch) {
            const dots = (dotMatch[0].match(/\./g) || []).length;
            return Math.min(dots + 1, 6);
        }
        // 默认 2 级
        return 2;
    }
    /**
     * 判断是否是列表项
     */
    isListItem(line) {
        return /^[-*•●○]\s/.test(line) || /^\d+[.)]\s/.test(line);
    }
}
exports.PdfParser = PdfParser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGRmLXBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9wYXJzZXJzL3BkZi1wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7Ozs7O0FBRUgsMERBQWdDO0FBR2hDLHNEQUFpRDtBQUNqRCw4REFBeUQ7QUFFekQ7O0dBRUc7QUFDSCxNQUFhLFNBQVM7SUFDcEIsZ0JBQWdCLEdBQXFCLENBQUMsS0FBSyxDQUFDLENBQUE7SUFFNUM7Ozs7T0FJRztJQUNILEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBc0IsRUFBRSxPQUF1QjtRQUN6RCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUE7UUFFNUIsSUFBSSxDQUFDO1lBQ0gsZUFBZTtZQUNmLE1BQU0sTUFBTSxHQUFHLE9BQU8sS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtZQUUvRSxvQkFBb0I7WUFDcEIsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFBLG1CQUFRLEVBQUMsTUFBTSxFQUFFO2dCQUNyQyxHQUFHLEVBQUUsT0FBTyxFQUFFLFFBQVEsSUFBSSxDQUFDLEVBQUUsVUFBVTthQUN4QyxDQUFDLENBQUE7WUFFRixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFBO1lBQ3pCLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUE7WUFFbEMsaUJBQWlCO1lBQ2pCLE1BQU0sV0FBVyxHQUFHLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDL0QsTUFBTSxTQUFTLEdBQUcsT0FBTyxFQUFFLG9CQUFvQixJQUFJLEdBQUcsQ0FBQTtZQUV0RCxhQUFhO1lBQ2IsSUFBSSxNQUFNLEdB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S0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3hDLElBQUksUUFBUSxFQUFFLENBQUM7WUFDYixNQUFNLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFBO1lBQ3BELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlCLENBQUM7UUFDRCxTQUFTO1FBQ1QsT0FBTyxDQUFDLENBQUE7SUFDVixDQUFDO0lBRUQ7O09BRUc7SUFDSyxVQUFVLENBQUMsSUFBWTtRQUM3QixPQUFPLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMzRCxDQUFDO0NBQ0Y7QUFoTUQsOEJBZ01DIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBQREYg6Kej5p6Q5ZmoXG4gKiDmlK/mjIHmlofmnKzmj5Dlj5blkowgT0NSIOivhuWIq1xuICovXG5cbmltcG9ydCBwZGZQYXJzZSBmcm9tICdwZGYtcGFyc2UnXG5pbXBvcnQgdHlwZSB7IERvY3VtZW50Rm9ybWF0IH0gZnJvbSAnQGRvYzJib29rL3NoYXJlZCdcbmltcG9ydCB0eXBlIHsgSVBhcnNlciwgUGFyc2VyT3B0aW9ucywgUGFyc2VSZXN1bHQsIFRleHRCbG9jayB9IGZyb20gJy4uL3R5cGVzJ1xuaW1wb3J0IHsgQXN0QnVpbGRlciB9IGZyb20gJy4uL3V0aWxzL2FzdC1idWlsZGVyJ1xuaW1wb3J0IHsgZGV0ZWN0TGFuZ3VhZ2UgfSBmcm9tICcuLi91dGlscy9sYW5ndWFnZS1kZXRlY3QnXG5cbi8qKlxuICogUERGIOino+aekOWZqOexu1xuICovXG5leHBvcnQgY2xhc3MgUGRmUGFyc2VyIGltcGxlbWVudHMgSVBhcnNlciB7XG4gIHN1cHBvcnRlZEZvcm1hdHM6IERvY3VtZW50Rm9ybWF0W10gPSBbJ3BkZiddXG5cbiAgLyoqXG4gICAqIOino+aekCBQREYg5paH5qGjXG4gICAqIEBwYXJhbSBpbnB1dCBQREYg5paH5Lu255qEIEJ1ZmZlclxuICAgKiBAcGFyYW0gb3B0aW9ucyDop6PmnpDpgInpoblcbiAgICovXG4gIGFzeW5jIHBhcnNlKGlucHV0OiBCdWZmZXIgfCBzdHJpbmcsIG9wdGlvbnM/OiBQYXJzZXJPcHRpb25zKTogUHJvbWlzZTxQYXJzZVJlc3VsdD4ge1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KClcblxuICAgIHRyeSB7XG4gICAgICAvLyDnoa7kv53ovpPlhaXmmK8gQnVmZmVyXG4gICAgICBjb25zdCBidWZmZXIgPSB0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnID8gQnVmZmVyLmZyb20oaW5wdXQsICdiYXNlNjQnKSA6IGlucHV0XG5cbiAgICAgIC8vIOS9v+eUqCBwZGYtcGFyc2Ug5o+Q5Y+W5paH5pysXG4gICAgICBjb25zdCBwZGZEYXRhID0gYXdhaXQgcGRmUGFyc2UoYnVmZmVyLCB7XG4gICAgICAgIG1heDogb3B0aW9ucz8ubWF4UGFnZXMgfHwgMCwgLy8gMCDooajnpLrkuI3pmZDliLZcbiAgICAgIH0pXG5cbiAgICAgIGNvbnN0IHRleHQgPSBwZGZEYXRhLnRleHRcbiAgICAgIGNvbnN0IHBhZ2VDb3VudCA9IHBkZkRhdGEubnVtcGFnZXNcblxuICAgICAgLy8g6K6h566X5paH5pys5a+G5bqm77yI5a2X56ym5pWwL+mhteaVsO+8iVxuICAgICAgY29uc3QgdGV4dERlbnNpdHkgPSBwYWdlQ291bnQgPiAwID8gdGV4dC5sZW5ndGggLyBwYWdlQ291bnQgOiAwXG4gICAgICBjb25zdCB0aHJlc2hvbGQgPSBvcHRpb25zPy50ZXh0RGVuc2l0eVRocmVzaG9sZCB8fCAxMDBcblxuICAgICAgLy8g5Yik5pat5piv5ZCm6ZyA6KaBIE9DUlxuICAgICAgbGV0IG1ldGhvZDogJ3RleHQnIHwgJ29jcicgfCAnaHlicmlkJyA9ICd0ZXh0J1xuICAgICAgbGV0IGZpbmFsVGV4dCA9IHRleHRcblxuICAgICAgaWYgKG9wdGlvbnM/LmVuYWJsZU9jciAmJiB0ZXh0RGVuc2l0eSA8IHRocmVzaG9sZCkge1xuICAgICAgICAvLyDmlofmnKzlr4bluqblpKrkvY7vvIzlj6/og73mmK/miavmj4/niYggUERG77yM6ZyA6KaBIE9DUlxuICAgICAgICAvLyDms6jmhI/vvJrov5nph4zlj6rmmK/moIforrDvvIzlrp7pmYUgT0NSIOmcgOimgeWcqCBJbWFnZVBhcnNlciDkuK3lpITnkIZcbiAgICAgICAgbWV0aG9kID0gJ29jcidcbiAgICAgICAgLy8gVE9ETzog5a6e546wIFBERiDpobXpnaLovazlm77niYcgKyBPQ1JcbiAgICAgICAgY29uc29sZS53YXJuKCdQREYg5paH5pys5a+G5bqm6L+H5L2O77yM5bu66K6u5L2/55SoIE9DUiDmqKHlvI8nKVxuICAgICAgfVxuXG4gICAgICAvLyDmo4DmtYvor63oqIBcbiAgICAgIGxldCBkZXRlY3RlZExhbmd1YWdlID0gJ3VuZCdcbiAgICAgIGlmIChvcHRpb25zPy5kZXRlY3RMYW5ndWFnZSAhPT0gZmFsc2UgJiYgdGV4dC5sZW5ndGggPiA1MCkge1xuICAgICAgICBjb25zdCBsYW5nUmVzdWx0ID0gZGV0ZWN0TGFuZ3VhZ2UodGV4dClcbiAgICAgICAgZGV0ZWN0ZWRMYW5ndWFnZSA9IGxhbmdSZXN1bHQuY29kZVxuICAgICAgfVxuXG4gICAgICAvLyDmnoTlu7ogQVNUXG4gICAgICBjb25zdCBidWlsZGVyID0gbmV3IEFzdEJ1aWxkZXIoJ2RvY3VtZW50LnBkZicpXG4gICAgICBidWlsZGVyLnNldE1ldGFkYXRhKHtcbiAgICAgICAgdGl0bGU6IHBkZkRhdGEuaW5mbz8uVGl0bGUgfHwgdW5kZWZpbmVkLFxuICAgICAgICBhdXRob3I6IHBkZkRhdGEuaW5mbz8uQXV0aG9yIHx8IHVuZGVmaW5lZCxcbiAgICAgICAgbGFuZ3VhZ2U6IGRldGVjdGVkTGFuZ3VhZ2UsXG4gICAgICAgIHBhZ2VDb3VudCxcbiAgICAgIH0pXG5cbiAgICAgIC8vIOino+aekOaWh+acrOWGheWuuVxuICAgICAgdGhpcy5wYXJzZUNvbnRlbnQoZmluYWxUZXh0LCBidWlsZGVyKVxuXG4gICAgICBjb25zdCBhc3QgPSBidWlsZGVyLmJ1aWxkKClcbiAgICAgIGNvbnN0IHBhcnNlVGltZSA9IERhdGUubm93KCkgLSBzdGFydFRpbWVcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgYXN0LFxuICAgICAgICBtZXRhZGF0YToge1xuICAgICAgICAgIHBhcnNlVGltZSxcbiAgICAgICAgICBtZXRob2QsXG4gICAgICAgICAgdGV4dERlbnNpdHksXG4gICAgICAgICAgZGV0ZWN0ZWRMYW5ndWFnZSxcbiAgICAgICAgICBwYWdlQ291bnQsXG4gICAgICAgICAgd29yZENvdW50OiBhc3QubWV0YWRhdGEud29yZENvdW50LFxuICAgICAgICB9LFxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ+ino+aekCBQREYg5aSx6LSlJyxcbiAgICAgICAgbWV0YWRhdGE6IHtcbiAgICAgICAgICBwYXJzZVRpbWU6IERhdGUubm93KCkgLSBzdGFydFRpbWUsXG4gICAgICAgICAgbWV0aG9kOiAndGV4dCcsXG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOino+aekOaWh+acrOWGheWuue+8jOivhuWIq+e7k+aehFxuICAgKi9cbiAgcHJpdmF0ZSBwYXJzZUNvbnRlbnQodGV4dDogc3RyaW5nLCBidWlsZGVyOiBBc3RCdWlsZGVyKTogdm9pZCB7XG4gICAgLy8g5oyJ6aG15YiG5Ymy77yIcGRmLXBhcnNlIOeUqCBcXG5cXG4g5YiG6ZqU6aG16Z2i77yJXG4gICAgY29uc3QgcGFnZXMgPSB0ZXh0LnNwbGl0KC9cXG57Myx9LylcblxuICAgIGZvciAoY29uc3QgcGFnZSBvZiBwYWdlcykge1xuICAgICAgY29uc3QgbGluZXMgPSBwYWdlLnNwbGl0KCdcXG4nKVxuICAgICAgbGV0IGN1cnJlbnRQYXJhZ3JhcGg6IHN0cmluZ1tdID0gW11cblxuICAgICAgY29uc3QgZmx1c2hQYXJhZ3JhcGggPSAoKSA9PiB7XG4gICAgICAgIGlmIChjdXJyZW50UGFyYWdyYXBoLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjb25zdCBwYXJhZ3JhcGhUZXh0ID0gY3VycmVudFBhcmFncmFwaC5qb2luKCcgJykudHJpbSgpXG4gICAgICAgICAgaWYgKHBhcmFncmFwaFRleHQpIHtcbiAgICAgICAgICAgIGJ1aWxkZXIuYWRkUGFyYWdyYXBoKHBhcmFncmFwaFRleHQpXG4gICAgICAgICAgfVxuICAgICAgICAgIGN1cnJlbnRQYXJhZ3JhcGggPSBbXVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xuICAgICAgICBjb25zdCB0cmltbWVkTGluZSA9IGxpbmUudHJpbSgpXG5cbiAgICAgICAgLy8g56m66KGM77ya57uT5p2f5b2T5YmN5q616JC9XG4gICAgICAgIGlmICghdHJpbW1lZExpbmUpIHtcbiAgICAgICAgICBmbHVzaFBhcmFncmFwaCgpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOajgOa1i+WPr+iDveeahOagh+mimO+8iOefreihjOOAgeWFqOWkp+WGmeOAgeaIluS7peaVsOWtl+W8gOWktO+8iVxuICAgICAgICBpZiAodGhpcy5pc0xpa2VseUhlYWRpbmcodHJpbW1lZExpbmUsIGxpbmVzKSkge1xuICAgICAgICAgIGZsdXNoUGFyYWdyYXBoKClcbiAgICAgICAgICBjb25zdCBsZXZlbCA9IHRoaXMuZGV0ZWN0SGVhZGluZ0xldmVsKHRyaW1tZWRMaW5lKVxuICAgICAgICAgIGJ1aWxkZXIuYWRkSGVhZGluZyh0cmltbWVkTGluZSwgbGV2ZWwpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOajgOa1i+WIl+ihqOmhuVxuICAgICAgICBpZiAodGhpcy5pc0xpc3RJdGVtKHRyaW1tZWRMaW5lKSkge1xuICAgICAgICAgIGZsdXNoUGFyYWdyYXBoKClcbiAgICAgICAgICBjb25zdCBsaXN0VGV4dCA9IHRyaW1tZWRMaW5lLnJlcGxhY2UoL15bLSrigKLil4/il4tdXFxzKi8sICcnKS5yZXBsYWNlKC9eXFxkK1suKV1cXHMqLywgJycpXG4gICAgICAgICAgYnVpbGRlci5hZGRMaXN0KFtsaXN0VGV4dF0sIC9eXFxkK1suKV0vLnRlc3QodHJpbW1lZExpbmUpKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyDmma7pgJrmlofmnKxcbiAgICAgICAgY3VycmVudFBhcmFncmFwaC5wdXNoKHRyaW1tZWRMaW5lKVxuICAgICAgfVxuXG4gICAgICBmbHVzaFBhcmFncmFwaCgpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOWIpOaWreaYr+WQpuWPr+iDveaYr+agh+mimFxuICAgKi9cbiAgcHJpdmF0ZSBpc0xpa2VseUhlYWRpbmcobGluZTogc3RyaW5nLCBhbGxMaW5lczogc3RyaW5nW10pOiBib29sZWFuIHtcbiAgICAvLyDlpKrplb/kuI3lpKrlj6/og73mmK/moIfpophcbiAgICBpZiAobGluZS5sZW5ndGggPiAxMDApIHJldHVybiBmYWxzZVxuXG4gICAgLy8g5YWo5aSn5YaZ77yI6Iux5paH77yJXG4gICAgaWYgKC9eW0EtWlxcc1xcZF0rJC8udGVzdChsaW5lKSAmJiBsaW5lLmxlbmd0aCA+IDMpIHJldHVybiB0cnVlXG5cbiAgICAvLyDku6Xnq6DoioLnvJblj7flvIDlpLRcbiAgICBpZiAoL14o56ysW+S4gOS6jOS4ieWbm+S6lOWFreS4g+WFq+S5neWNgeeZvuWNg10rW+eroOiKguevh+mDqF18Q2hhcHRlclxccytcXGQrfENIQVBURVJcXHMrXFxkK3xcXGQrXFwuXFxzKS9pLnRlc3QobGluZSkpIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuXG4gICAgLy8g55+t6KGM5LiU5ZCO6Z2i6Lef552A6L6D6ZW/55qE5q616JC9XG4gICAgY29uc3QgbGluZUluZGV4ID0gYWxsTGluZXMuaW5kZXhPZihsaW5lKVxuICAgIGlmIChsaW5lLmxlbmd0aCA8IDUwICYmIGxpbmVJbmRleCA8IGFsbExpbmVzLmxlbmd0aCAtIDEpIHtcbiAgICAgIGNvbnN0IG5leHRMaW5lID0gYWxsTGluZXNbbGluZUluZGV4ICsgMV0/LnRyaW0oKVxuICAgICAgaWYgKG5leHRMaW5lICYmIG5leHRMaW5lLmxlbmd0aCA+IGxpbmUubGVuZ3RoICogMikge1xuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgLyoqXG4gICAqIOajgOa1i+agh+mimOe6p+WIq1xuICAgKi9cbiAgcHJpdmF0ZSBkZXRlY3RIZWFkaW5nTGV2ZWwobGluZTogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAvLyDnrKxY56ugIC0+IDHnuqdcbiAgICBpZiAoL17nrKxb5LiA5LqM5LiJ5Zub5LqU5YWt5LiD5YWr5Lmd5Y2B55m+5Y2DXSvnq6AvLnRlc3QobGluZSkpIHJldHVybiAxXG4gICAgLy8g56ysWOiKgiAtPiAy57qnXG4gICAgaWYgKC9e56ysW+S4gOS6jOS4ieWbm+S6lOWFreS4g+WFq+S5neWNgeeZvuWNg10r6IqCLy50ZXN0KGxpbmUpKSByZXR1cm4gMlxuICAgIC8vIENoYXB0ZXIgWCAtPiAx57qnXG4gICAgaWYgKC9eKENoYXB0ZXJ8Q0hBUFRFUilcXHMrXFxkKy9pLnRlc3QobGluZSkpIHJldHVybiAxXG4gICAgLy8gWC5ZLlog5qC85byPXG4gICAgY29uc3QgZG90TWF0Y2ggPSBsaW5lLm1hdGNoKC9eKFxcZCtcXC4pKy8pXG4gICAgaWYgKGRvdE1hdGNoKSB7XG4gICAgICBjb25zdCBkb3RzID0gKGRvdE1hdGNoWzBdLm1hdGNoKC9cXC4vZykgfHwgW10pLmxlbmd0aFxuICAgICAgcmV0dXJuIE1hdGgubWluKGRvdHMgKyAxLCA2KVxuICAgIH1cbiAgICAvLyDpu5jorqQgMiDnuqdcbiAgICByZXR1cm4gMlxuICB9XG5cbiAgLyoqXG4gICAqIOWIpOaWreaYr+WQpuaYr+WIl+ihqOmhuVxuICAgKi9cbiAgcHJpdmF0ZSBpc0xpc3RJdGVtKGxpbmU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAvXlstKuKAouKXj+KXi11cXHMvLnRlc3QobGluZSkgfHwgL15cXGQrWy4pXVxccy8udGVzdChsaW5lKVxuICB9XG59XG4iXX0=