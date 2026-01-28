"use strict";
/**
 * 图片解析器
 * 使用 Tesseract.js 进行 OCR 识别
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageParser = void 0;
const tesseract_js_1 = __importDefault(require("tesseract.js"));
const ast_builder_1 = require("../utils/ast-builder");
const language_detect_1 = require("../utils/language-detect");
/**
 * 图片解析器类
 */
class ImageParser {
    supportedFormats = ['image'];
    // Tesseract worker 实例
    worker = null;
    /**
     * 解析图片（OCR）
     * @param input 图片数据（Buffer 或 base64 字符串）
     * @param options 解析选项
     */
    async parse(input, options) {
        const startTime = Date.now();
        try {
            // 确定 OCR 语言
            const ocrLanguage = options?.ocrLanguage || 'chi_sim+eng';
            // 初始化 worker
            if (!this.worker) {
                this.worker = await tesseract_js_1.default.createWorker(ocrLanguage);
            }
            // 准备图片数据
            let imageData;
            if (typeof input === 'string') {
                // 如果是 base64 字符串
                if (input.startsWith('data:')) {
                    imageData = input;
                }
                else {
                    imageData = `data:image/png;base64,${input}`;
                }
            }
            else {
                imageData = input;
            }
            // 执行 OCR
            const result = await this.worker.recognize(imageData);
            const text = result.data.text;
            // 检测语言
            let detectedLanguage = 'und';
            if (options?.detectLanguage !== false && text.length > 50) {
                const langResult = (0, language_detect_1.detectLanguage)(text);
                detectedLanguage = langResult.code;
            }
            // 构建 AST
            const builder = new ast_builder_1.AstBuilder('image.png');
            builder.setMetadata({
                language: detectedLanguage,
            });
            // 解析 OCR 结果
            this.parseOcrResult(result.data, builder);
            const ast = builder.build();
            const parseTime = Date.now() - startTime;
            return {
                success: true,
                ast,
                metadata: {
                    parseTime,
                    method: 'ocr',
                    detectedLanguage,
                    wordCount: ast.metadata.wordCount,
                },
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'OCR 识别失败',
                metadata: {
                    parseTime: Date.now() - startTime,
                    method: 'ocr',
                },
            };
        }
    }
    /**
     * 解析 OCR 结果
     */
    parseOcrResult(data, builder) {
        // 按段落分组
        const paragraphs = [];
        let currentParagraph = [];
        for (const block of data.blocks || []) {
            for (const paragraph of block.paragraphs || []) {
                const lines = [];
                for (const line of paragraph.lines || []) {
                    const lineText = line.words?.map((w) => w.text).join(' ') || '';
                    if (lineText.trim()) {
                        lines.push(lineText.trim());
                    }
                }
                if (lines.length > 0) {
                    // 检查是否是新段落
                    const paragraphText = lines.join(' ');
                    if (paragraphText.trim()) {
                        paragraphs.push(paragraphText);
                    }
                }
            }
        }
        // 如果没有段落结构，使用纯文本
        if (paragraphs.length === 0 && data.text) {
            const textParagraphs = data.text.split(/\n{2,}/);
            for (const p of textParagraphs) {
                const trimmed = p.trim();
                if (trimmed) {
                    paragraphs.push(trimmed);
                }
            }
        }
        // 添加到 AST
        for (const paragraph of paragraphs) {
            // 检测是否是标题
            if (this.isLikelyHeading(paragraph)) {
                builder.addHeading(paragraph, 2);
            }
            else {
                builder.addParagraph(paragraph);
            }
        }
    }
    /**
     * 判断是否可能是标题
     */
    isLikelyHeading(text) {
        // 太长不太可能是标题
        if (text.length > 100)
            return false;
        // 全大写（英文）
        if (/^[A-Z\s\d]+$/.test(text) && text.length > 3 && text.length < 80)
            return true;
        // 以章节编号开头
        if (/^(第[一二三四五六七八九十百千]+[章节篇部]|Chapter\s+\d+|CHAPTER\s+\d+|\d+\.\s)/i.test(text)) {
            return true;
        }
        return false;
    }
    /**
     * 终止 worker
     */
    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
        }
    }
}
exports.ImageParser = ImageParser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1hZ2UtcGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3BhcnNlcnMvaW1hZ2UtcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7Ozs7OztBQUVILGdFQUFvQztBQUdwQyxzREFBaUQ7QUFDakQsOERBQXlEO0FBRXpEOztHQUVHO0FBQ0gsTUFBYSxXQUFXO0lBQ3RCLGdCQUFnQixHQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBRTlDLHNCQUFzQjtJQUNkLE1BQU0sR0FBNEIsSUFBSSxDQUFBO0lBRTlDOzs7O09BSUc7SUFDSCxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQXNCLEVBQUUsT0FBdUI7UUFDekQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBRTVCLElBQUksQ0FBQztZQUNILFlBQVk7WUFDWixNQUFNLFdBQVcsR0FBRyxPQUFPLEVBQUUsV0FBVyxJQUFJLGFBQWEsQ0FBQTtZQUV6RCxhQUFhO1lBQ2IsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDakIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLHNCQUFTLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQ3pELENBQUM7WUFFRCxTQUFTO1lBQ1QsSUFBSSxTQUEwQixDQUFBO1lBQzlCLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQzlCLGlCQUFpQjtnQkFDakIsSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7b0JBQzlCLFNBQVMsR0FBRyxLQUFLLENBQUE7Z0JBQ25CLENBQUM7cUJBQU0sQ0FBQztvQkFDTixTQUFTLEdBQUcseUJBQXlCLEtBQUssRUFBRSxDQUFBO2dCQUM5QyxDQUFDO1lBQ0gsQ0FBQztpQkFBTSxDQUFDO2dCQUNOLFNBQVMsR0FBRyxLQUFLLENBQUE7WUFDbkIsQ0FBQztZQUVELFNBQVM7WUFDVCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ3JELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFBO1lBRTdCLE9BQU87WUFDUCxJQUFJLGdCQUFnQixHQUFHLEtBQUssQ0FBQTtZQUM1QixJQUFJLE9BQU8sRUFBRSxjQUFjLEtBQUssS0FBSyxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxFQUFFLENBQUM7Z0JBQzFELE1BQU0sVUFBVSxHQUFHLElBQUEsZ0NBQWMsRUFBQyxJQUFJLENBQUMsQ0FBQTtnQkFDdkMsZ0JBQWdCLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQTtZQUNwQyxDQUFDO1lBRUQsU0FBUztZQUNULE1BQU0sT0FBTyxHQUFHLElBQUksd0JBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUMzQyxPQUFPLENBQUMsV0FBVyxDQUFDO2dCQUNsQixRQUFRLEVBQUUsZ0JBQWdCO2FBQzNCLENBQUMsQ0FBQTtZQUVGLFlBQVk7WUFDWixJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFFekMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQzNCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUE7WUFFeEMsT0FBTztnQkFDTCxPQUFPLEVBQUUsSUFBSTtnQkFDYixHQUFHO2dCQUNILFFBQVEsRUFBRTtvQkFDUixTQUFTO29CQUNULE1BQU0sRUFBRSxLQUFLO29CQUNiLGdCQUFnQjtvQkFDaEIsU0FBUyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsU0FBUztpQkFDbEM7YUFDRixDQUFBO1FBQ0gsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPO2dCQUNMLE9BQU8sRUFBRSxLQUFLO2dCQUNkLEtBQUssRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxVQUFVO2dCQUMxRCxRQUFRLEVBQUU7b0JBQ1IsU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxTQUFTO29CQUNqQyxNQUFNLEVBQUUsS0FBSztpQkFDZDthQUNGLENBQUE7UUFDSCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ssY0FBYyxDQUFDLElBQW9CLEVBQUUsT0FBbUI7UUFDOUQsUUFBUTtRQUNSLE1BQU0sVUFBVSxHQUFhLEVBQUUsQ0FBQTtRQUMvQixJQUFJLGdCQUFnQixHQUFhLEVBQUUsQ0FBQTtRQUVuQyxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksRUFBRSxFQUFFLENBQUM7WUFDdEMsS0FBSyxNQUFNLFNBQVMsSUFBSSxLQUFLLENBQUMsVUFBVSxJQUFJLEVBQUUsRUFBRSxDQUFDO2dCQUMvQyxNQUFNLEtBQUssR0FBYSxFQUFFLENBQUE7Z0JBQzFCLEtBQUssTUFBTSxJQUFJLElBQUksU0FBUyxDQUFDLEtBQUssSUFBSSxFQUFFLEVBQUUsQ0FBQztvQkFDekMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFBO29CQUMvRCxJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO3dCQUNwQixLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO29CQUM3QixDQUFDO2dCQUNILENBQUM7Z0JBRUQsSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUNyQixXQUFXO29CQUNYLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7b0JBQ3JDLElBQUksYUFBYSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7d0JBQ3pCLFVBQVUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7b0JBQ2hDLENBQUM7Z0JBQ0gsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO1FBRUQsaUJBQWlCO1FBQ2pCLElBQUksVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3pDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ2hELEtBQUssTUFBTSxDQUFDLElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQy9CLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtnQkFDeEIsSUFBSSxPQUFPLEVBQUUsQ0FBQztvQkFDWixVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUMxQixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxVQUFVO1FBQ1YsS0FBSyxNQUFNLFNBQVMsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNuQyxVQUFVO1lBQ1YsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BDLE9BQU8sQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ2xDLENBQUM7aUJBQU0sQ0FBQztnQkFDTixPQUFPLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ2pDLENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ssZUFBZSxDQUFDLElBQVk7UUFDbEMsWUFBWTtRQUNaLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxHQUFHO1lBQUUsT0FBTyxLQUFLLENBQUE7UUFFbkMsVUFBVTtRQUNWLElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUU7WUFBRSxPQUFPLElBQUksQ0FBQTtRQUVqRixVQUFVO1FBQ1YsSUFBSSxnRUFBZ0UsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNoRixPQUFPLElBQUksQ0FBQTtRQUNiLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQTtJQUNkLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxTQUFTO1FBQ2IsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDaEIsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFBO1lBQzdCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFBO1FBQ3BCLENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUE5SkQsa0NBOEpDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiDlm77niYfop6PmnpDlmahcbiAqIOS9v+eUqCBUZXNzZXJhY3QuanMg6L+b6KGMIE9DUiDor4bliKtcbiAqL1xuXG5pbXBvcnQgVGVzc2VyYWN0IGZyb20gJ3Rlc3NlcmFjdC5qcydcbmltcG9ydCB0eXBlIHsgRG9jdW1lbnRGb3JtYXQgfSBmcm9tICdAZG9jMmJvb2svc2hhcmVkJ1xuaW1wb3J0IHR5cGUgeyBJUGFyc2VyLCBQYXJzZXJPcHRpb25zLCBQYXJzZVJlc3VsdCB9IGZyb20gJy4uL3R5cGVzJ1xuaW1wb3J0IHsgQXN0QnVpbGRlciB9IGZyb20gJy4uL3V0aWxzL2FzdC1idWlsZGVyJ1xuaW1wb3J0IHsgZGV0ZWN0TGFuZ3VhZ2UgfSBmcm9tICcuLi91dGlscy9sYW5ndWFnZS1kZXRlY3QnXG5cbi8qKlxuICog5Zu+54mH6Kej5p6Q5Zmo57G7XG4gKi9cbmV4cG9ydCBjbGFzcyBJbWFnZVBhcnNlciBpbXBsZW1lbnRzIElQYXJzZXIge1xuICBzdXBwb3J0ZWRGb3JtYXRzOiBEb2N1bWVudEZvcm1hdFtdID0gWydpbWFnZSddXG5cbiAgLy8gVGVzc2VyYWN0IHdvcmtlciDlrp7kvotcbiAgcHJpdmF0ZSB3b3JrZXI6IFRlc3NlcmFjdC5Xb3JrZXIgfCBudWxsID0gbnVsbFxuXG4gIC8qKlxuICAgKiDop6PmnpDlm77niYfvvIhPQ1LvvIlcbiAgICogQHBhcmFtIGlucHV0IOWbvueJh+aVsOaNru+8iEJ1ZmZlciDmiJYgYmFzZTY0IOWtl+espuS4su+8iVxuICAgKiBAcGFyYW0gb3B0aW9ucyDop6PmnpDpgInpoblcbiAgICovXG4gIGFzeW5jIHBhcnNlKGlucHV0OiBCdWZmZXIgfCBzdHJpbmcsIG9wdGlvbnM/OiBQYXJzZXJPcHRpb25zKTogUHJvbWlzZTxQYXJzZVJlc3VsdD4ge1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KClcblxuICAgIHRyeSB7XG4gICAgICAvLyDnoa7lrpogT0NSIOivreiogFxuICAgICAgY29uc3Qgb2NyTGFuZ3VhZ2UgPSBvcHRpb25zPy5vY3JMYW5ndWFnZSB8fCAnY2hpX3NpbStlbmcnXG5cbiAgICAgIC8vIOWIneWni+WMliB3b3JrZXJcbiAgICAgIGlmICghdGhpcy53b3JrZXIpIHtcbiAgICAgICAgdGhpcy53b3JrZXIgPSBhd2FpdCBUZXNzZXJhY3QuY3JlYXRlV29ya2VyKG9jckxhbmd1YWdlKVxuICAgICAgfVxuXG4gICAgICAvLyDlh4blpIflm77niYfmlbDmja5cbiAgICAgIGxldCBpbWFnZURhdGE6IHN0cmluZyB8IEJ1ZmZlclxuICAgICAgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgLy8g5aaC5p6c5pivIGJhc2U2NCDlrZfnrKbkuLJcbiAgICAgICAgaWYgKGlucHV0LnN0YXJ0c1dpdGgoJ2RhdGE6JykpIHtcbiAgICAgICAgICBpbWFnZURhdGEgPSBpbnB1dFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGltYWdlRGF0YSA9IGBkYXRhOmltYWdlL3BuZztiYXNlNjQsJHtpbnB1dH1gXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGltYWdlRGF0YSA9IGlucHV0XG4gICAgICB9XG5cbiAgICAgIC8vIOaJp+ihjCBPQ1JcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMud29ya2VyLnJlY29nbml6ZShpbWFnZURhdGEpXG4gICAgICBjb25zdCB0ZXh0ID0gcmVzdWx0LmRhdGEudGV4dFxuXG4gICAgICAvLyDmo4DmtYvor63oqIBcbiAgICAgIGxldCBkZXRlY3RlZExhbmd1YWdlID0gJ3VuZCdcbiAgICAgIGlmIChvcHRpb25zPy5kZXRlY3RMYW5ndWFnZSAhPT0gZmFsc2UgJiYgdGV4dC5sZW5ndGggPiA1MCkge1xuICAgICAgICBjb25zdCBsYW5nUmVzdWx0ID0gZGV0ZWN0TGFuZ3VhZ2UodGV4dClcbiAgICAgICAgZGV0ZWN0ZWRMYW5ndWFnZSA9IGxhbmdSZXN1bHQuY29kZVxuICAgICAgfVxuXG4gICAgICAvLyDmnoTlu7ogQVNUXG4gICAgICBjb25zdCBidWlsZGVyID0gbmV3IEFzdEJ1aWxkZXIoJ2ltYWdlLnBuZycpXG4gICAgICBidWlsZGVyLnNldE1ldGFkYXRhKHtcbiAgICAgICAgbGFuZ3VhZ2U6IGRldGVjdGVkTGFuZ3VhZ2UsXG4gICAgICB9KVxuXG4gICAgICAvLyDop6PmnpAgT0NSIOe7k+aenFxuICAgICAgdGhpcy5wYXJzZU9jclJlc3VsdChyZXN1bHQuZGF0YSwgYnVpbGRlcilcblxuICAgICAgY29uc3QgYXN0ID0gYnVpbGRlci5idWlsZCgpXG4gICAgICBjb25zdCBwYXJzZVRpbWUgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lXG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIGFzdCxcbiAgICAgICAgbWV0YWRhdGE6IHtcbiAgICAgICAgICBwYXJzZVRpbWUsXG4gICAgICAgICAgbWV0aG9kOiAnb2NyJyxcbiAgICAgICAgICBkZXRlY3RlZExhbmd1YWdlLFxuICAgICAgICAgIHdvcmRDb3VudDogYXN0Lm1ldGFkYXRhLndvcmRDb3VudCxcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdPQ1Ig6K+G5Yir5aSx6LSlJyxcbiAgICAgICAgbWV0YWRhdGE6IHtcbiAgICAgICAgICBwYXJzZVRpbWU6IERhdGUubm93KCkgLSBzdGFydFRpbWUsXG4gICAgICAgICAgbWV0aG9kOiAnb2NyJyxcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog6Kej5p6QIE9DUiDnu5PmnpxcbiAgICovXG4gIHByaXZhdGUgcGFyc2VPY3JSZXN1bHQoZGF0YTogVGVzc2VyYWN0LlBhZ2UsIGJ1aWxkZXI6IEFzdEJ1aWxkZXIpOiB2b2lkIHtcbiAgICAvLyDmjInmrrXokL3liIbnu4RcbiAgICBjb25zdCBwYXJhZ3JhcGhzOiBzdHJpbmdbXSA9IFtdXG4gICAgbGV0IGN1cnJlbnRQYXJhZ3JhcGg6IHN0cmluZ1tdID0gW11cblxuICAgIGZvciAoY29uc3QgYmxvY2sgb2YgZGF0YS5ibG9ja3MgfHwgW10pIHtcbiAgICAgIGZvciAoY29uc3QgcGFyYWdyYXBoIG9mIGJsb2NrLnBhcmFncmFwaHMgfHwgW10pIHtcbiAgICAgICAgY29uc3QgbGluZXM6IHN0cmluZ1tdID0gW11cbiAgICAgICAgZm9yIChjb25zdCBsaW5lIG9mIHBhcmFncmFwaC5saW5lcyB8fCBbXSkge1xuICAgICAgICAgIGNvbnN0IGxpbmVUZXh0ID0gbGluZS53b3Jkcz8ubWFwKCh3KSA9PiB3LnRleHQpLmpvaW4oJyAnKSB8fCAnJ1xuICAgICAgICAgIGlmIChsaW5lVGV4dC50cmltKCkpIHtcbiAgICAgICAgICAgIGxpbmVzLnB1c2gobGluZVRleHQudHJpbSgpKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChsaW5lcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgLy8g5qOA5p+l5piv5ZCm5piv5paw5q616JC9XG4gICAgICAgICAgY29uc3QgcGFyYWdyYXBoVGV4dCA9IGxpbmVzLmpvaW4oJyAnKVxuICAgICAgICAgIGlmIChwYXJhZ3JhcGhUZXh0LnRyaW0oKSkge1xuICAgICAgICAgICAgcGFyYWdyYXBocy5wdXNoKHBhcmFncmFwaFRleHQpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8g5aaC5p6c5rKh5pyJ5q616JC957uT5p6E77yM5L2/55So57qv5paH5pysXG4gICAgaWYgKHBhcmFncmFwaHMubGVuZ3RoID09PSAwICYmIGRhdGEudGV4dCkge1xuICAgICAgY29uc3QgdGV4dFBhcmFncmFwaHMgPSBkYXRhLnRleHQuc3BsaXQoL1xcbnsyLH0vKVxuICAgICAgZm9yIChjb25zdCBwIG9mIHRleHRQYXJhZ3JhcGhzKSB7XG4gICAgICAgIGNvbnN0IHRyaW1tZWQgPSBwLnRyaW0oKVxuICAgICAgICBpZiAodHJpbW1lZCkge1xuICAgICAgICAgIHBhcmFncmFwaHMucHVzaCh0cmltbWVkKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8g5re75Yqg5YiwIEFTVFxuICAgIGZvciAoY29uc3QgcGFyYWdyYXBoIG9mIHBhcmFncmFwaHMpIHtcbiAgICAgIC8vIOajgOa1i+aYr+WQpuaYr+agh+mimFxuICAgICAgaWYgKHRoaXMuaXNMaWtlbHlIZWFkaW5nKHBhcmFncmFwaCkpIHtcbiAgICAgICAgYnVpbGRlci5hZGRIZWFkaW5nKHBhcmFncmFwaCwgMilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJ1aWxkZXIuYWRkUGFyYWdyYXBoKHBhcmFncmFwaClcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog5Yik5pat5piv5ZCm5Y+v6IO95piv5qCH6aKYXG4gICAqL1xuICBwcml2YXRlIGlzTGlrZWx5SGVhZGluZyh0ZXh0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAvLyDlpKrplb/kuI3lpKrlj6/og73mmK/moIfpophcbiAgICBpZiAodGV4dC5sZW5ndGggPiAxMDApIHJldHVybiBmYWxzZVxuXG4gICAgLy8g5YWo5aSn5YaZ77yI6Iux5paH77yJXG4gICAgaWYgKC9eW0EtWlxcc1xcZF0rJC8udGVzdCh0ZXh0KSAmJiB0ZXh0Lmxlbmd0aCA+IDMgJiYgdGV4dC5sZW5ndGggPCA4MCkgcmV0dXJuIHRydWVcblxuICAgIC8vIOS7peeroOiKgue8luWPt+W8gOWktFxuICAgIGlmICgvXijnrKxb5LiA5LqM5LiJ5Zub5LqU5YWt5LiD5YWr5Lmd5Y2B55m+5Y2DXStb56ug6IqC56+H6YOoXXxDaGFwdGVyXFxzK1xcZCt8Q0hBUFRFUlxccytcXGQrfFxcZCtcXC5cXHMpL2kudGVzdCh0ZXh0KSkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIC8qKlxuICAgKiDnu4jmraIgd29ya2VyXG4gICAqL1xuICBhc3luYyB0ZXJtaW5hdGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMud29ya2VyKSB7XG4gICAgICBhd2FpdCB0aGlzLndvcmtlci50ZXJtaW5hdGUoKVxuICAgICAgdGhpcy53b3JrZXIgPSBudWxsXG4gICAgfVxuICB9XG59XG4iXX0=