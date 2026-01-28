"use strict";
/**
 * 统一文档解析器
 * 根据文件格式自动选择合适的解析器
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentParser = void 0;
exports.createDocumentParser = createDocumentParser;
const pdf_parser_1 = require("./parsers/pdf-parser");
const docx_parser_1 = require("./parsers/docx-parser");
const markdown_parser_1 = require("./parsers/markdown-parser");
const html_parser_1 = require("./parsers/html-parser");
const txt_parser_1 = require("./parsers/txt-parser");
const image_parser_1 = require("./parsers/image-parser");
/**
 * 文件扩展名到格式的映射
 */
const EXTENSION_MAP = {
    pdf: 'pdf',
    docx: 'docx',
    doc: 'doc',
    md: 'md',
    markdown: 'markdown',
    html: 'html',
    htm: 'html',
    txt: 'txt',
    text: 'txt',
    png: 'image',
    jpg: 'image',
    jpeg: 'image',
    gif: 'image',
    webp: 'image',
    bmp: 'image',
    tiff: 'image',
    tif: 'image',
};
/**
 * MIME 类型到格式的映射
 */
const MIME_MAP = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc',
    'text/markdown': 'md',
    'text/x-markdown': 'markdown',
    'text/html': 'html',
    'application/xhtml+xml': 'html',
    'text/plain': 'txt',
    'image/png': 'image',
    'image/jpeg': 'image',
    'image/gif': 'image',
    'image/webp': 'image',
    'image/bmp': 'image',
    'image/tiff': 'image',
};
/**
 * 统一文档解析器类
 */
class DocumentParser {
    parsers = new Map();
    imageParser;
    constructor() {
        // 初始化所有解析器
        this.parsers.set('pdf', new pdf_parser_1.PdfParser());
        this.parsers.set('docx', new docx_parser_1.DocxParser());
        this.parsers.set('doc', new docx_parser_1.DocxParser()); // doc 也用 docx 解析器
        this.parsers.set('md', new markdown_parser_1.MarkdownParser());
        this.parsers.set('markdown', new markdown_parser_1.MarkdownParser());
        this.parsers.set('html', new html_parser_1.HtmlParser());
        this.parsers.set('txt', new txt_parser_1.TxtParser());
        // 图片解析器单独保存，因为需要管理 worker
        this.imageParser = new image_parser_1.ImageParser();
        this.parsers.set('image', this.imageParser);
    }
    /**
     * 解析文档
     * @param input 文档内容（Buffer 或字符串）
     * @param options 解析选项
     */
    async parse(input, options) {
        // 检测文档格式
        const format = options?.format || this.detectFormat(options?.filename, options?.mimeType);
        if (!format) {
            return {
                success: false,
                error: '无法检测文档格式，请指定 format 参数',
                metadata: {
                    parseTime: 0,
                    method: 'text',
                },
            };
        }
        // 获取对应的解析器
        const parser = this.parsers.get(format);
        if (!parser) {
            return {
                success: false,
                error: `不支持的文档格式: ${format}`,
                metadata: {
                    parseTime: 0,
                    method: 'text',
                },
            };
        }
        // 执行解析
        const result = await parser.parse(input, options);
        // 更新文件名
        if (result.success && result.ast && options?.filename) {
            result.ast.sourceFile = options.filename;
            result.ast.metadata.filename = options.filename;
        }
        return result;
    }
    /**
     * 批量解析文档
     * @param documents 文档列表
     * @param options 解析选项
     */
    async parseMultiple(documents, options) {
        const results = [];
        for (const doc of documents) {
            const result = await this.parse(doc.input, {
                ...options,
                filename: doc.filename,
                mimeType: doc.mimeType,
                format: doc.format,
            });
            results.push(result);
        }
        return results;
    }
    /**
     * 合并多个 AST
     * @param asts AST 列表
     * @param title 合并后的标题
     */
    mergeAsts(asts, title) {
        if (asts.length === 0) {
            throw new Error('没有可合并的 AST');
        }
        if (asts.length === 1) {
            return asts[0];
        }
        // 使用第一个 AST 作为基础
        const merged = {
            ...asts[0],
            id: `merged_${Date.now()}`,
            sourceFile: title || 'merged_document',
            content: [],
            references: [],
            assets: [],
        };
        // 合并所有内容
        for (const ast of asts) {
            // 添加来源标记
            merged.content.push({
                type: 'heading',
                level: 1,
                text: ast.metadata.title || ast.sourceFile,
                sourceLocation: {
                    file: ast.sourceFile,
                },
            });
            // 添加内容
            merged.content.push(...ast.content);
            // 合并引用
            merged.references.push(...ast.references);
            // 合并资源
            merged.assets.push(...ast.assets);
        }
        // 更新元数据
        merged.metadata = {
            ...merged.metadata,
            title: title || '合并文档',
            filename: 'merged_document',
            wordCount: asts.reduce((sum, ast) => sum + (ast.metadata.wordCount || 0), 0),
        };
        return merged;
    }
    /**
     * 检测文档格式
     */
    detectFormat(filename, mimeType) {
        // 优先使用 MIME 类型
        if (mimeType && MIME_MAP[mimeType]) {
            return MIME_MAP[mimeType];
        }
        // 使用文件扩展名
        if (filename) {
            const ext = filename.toLowerCase().split('.').pop();
            if (ext && EXTENSION_MAP[ext]) {
                return EXTENSION_MAP[ext];
            }
        }
        return null;
    }
    /**
     * 获取支持的格式列表
     */
    getSupportedFormats() {
        return Array.from(this.parsers.keys());
    }
    /**
     * 检查是否支持指定格式
     */
    isFormatSupported(format) {
        return this.parsers.has(format);
    }
    /**
     * 清理资源
     */
    async cleanup() {
        await this.imageParser.terminate();
    }
}
exports.DocumentParser = DocumentParser;
/**
 * 创建文档解析器实例
 */
function createDocumentParser() {
    return new DocumentParser();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jdW1lbnQtcGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2RvY3VtZW50LXBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7QUF1UUgsb0RBRUM7QUFyUUQscURBQWdEO0FBQ2hELHVEQUFrRDtBQUNsRCwrREFBMEQ7QUFDMUQsdURBQWtEO0FBQ2xELHFEQUFnRDtBQUNoRCx5REFBb0Q7QUFFcEQ7O0dBRUc7QUFDSCxNQUFNLGFBQWEsR0FBbUM7SUFDcEQsR0FBRyxFQUFFLEtBQUs7SUFDVixJQUFJLEVBQUUsTUFBTTtJQUNaLEdBQUcsRUFBRSxLQUFLO0lBQ1YsRUFBRSxFQUFFLElBQUk7SUFDUixRQUFRLEVBQUUsVUFBVTtJQUNwQixJQUFJLEVBQUUsTUFBTTtJQUNaLEdBQUcsRUFBRSxNQUFNO0lBQ1gsR0FBRyxFQUFFLEtBQUs7SUFDVixJQUFJLEVBQUUsS0FBSztJQUNYLEdBQUcsRUFBRSxPQUFPO0lBQ1osR0FBRyxFQUFFLE9BQU87SUFDWixJQUFJLEVBQUUsT0FBTztJQUNiLEdBQUcsRUFBRSxPQUFPO0lBQ1osSUFBSSxFQUFFLE9BQU87SUFDYixHQUFHLEVBQUUsT0FBTztJQUNaLElBQUksRUFBRSxPQUFPO0lBQ2IsR0FBRyxFQUFFLE9BQU87Q0FDYixDQUFBO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFFBQVEsR0FBbUM7SUFDL0MsaUJBQWlCLEVBQUUsS0FBSztJQUN4Qix5RUFBeUUsRUFBRSxNQUFNO0lBQ2pGLG9CQUFvQixFQUFFLEtBQUs7SUFDM0IsZUFBZSxFQUFFLElBQUk7SUFDckIsaUJBQWlCLEVBQUUsVUFBVTtJQUM3QixXQUFXLEVBQUUsTUFBTTtJQUNuQix1QkFBdUIsRUFBRSxNQUFNO0lBQy9CLFlBQVksRUFBRSxLQUFLO0lBQ25CLFdBQVcsRUFBRSxPQUFPO0lBQ3BCLFlBQVksRUFBRSxPQUFPO0lBQ3JCLFdBQVcsRUFBRSxPQUFPO0lBQ3BCLFlBQVksRUFBRSxP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QUMsV0FBVyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFBO1lBQ25ELElBQUksR0FBRyxJQUFJLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUM5QixPQUFPLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUMzQixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFBO0lBQ2IsQ0FBQztJQUVEOztPQUVHO0lBQ0gsbUJBQW1CO1FBQ2pCLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7SUFDeEMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsaUJBQWlCLENBQUMsTUFBc0I7UUFDdEMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsT0FBTztRQUNYLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQTtJQUNwQyxDQUFDO0NBQ0Y7QUF6TUQsd0NBeU1DO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQixvQkFBb0I7SUFDbEMsT0FBTyxJQUFJLGNBQWMsRUFBRSxDQUFBO0FBQzdCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIOe7n+S4gOaWh+aho+ino+aekOWZqFxuICog5qC55o2u5paH5Lu25qC85byP6Ieq5Yqo6YCJ5oup5ZCI6YCC55qE6Kej5p6Q5ZmoXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBEb2N1bWVudEZvcm1hdCwgVW5pZmllZEFTVCB9IGZyb20gJ0Bkb2MyYm9vay9zaGFyZWQnXG5pbXBvcnQgdHlwZSB7IFBhcnNlck9wdGlvbnMsIFBhcnNlUmVzdWx0LCBJUGFyc2VyIH0gZnJvbSAnLi90eXBlcydcbmltcG9ydCB7IFBkZlBhcnNlciB9IGZyb20gJy4vcGFyc2Vycy9wZGYtcGFyc2VyJ1xuaW1wb3J0IHsgRG9jeFBhcnNlciB9IGZyb20gJy4vcGFyc2Vycy9kb2N4LXBhcnNlcidcbmltcG9ydCB7IE1hcmtkb3duUGFyc2VyIH0gZnJvbSAnLi9wYXJzZXJzL21hcmtkb3duLXBhcnNlcidcbmltcG9ydCB7IEh0bWxQYXJzZXIgfSBmcm9tICcuL3BhcnNlcnMvaHRtbC1wYXJzZXInXG5pbXBvcnQgeyBUeHRQYXJzZXIgfSBmcm9tICcuL3BhcnNlcnMvdHh0LXBhcnNlcidcbmltcG9ydCB7IEltYWdlUGFyc2VyIH0gZnJvbSAnLi9wYXJzZXJzL2ltYWdlLXBhcnNlcidcblxuLyoqXG4gKiDmlofku7bmianlsZXlkI3liLDmoLzlvI/nmoTmmKDlsIRcbiAqL1xuY29uc3QgRVhURU5TSU9OX01BUDogUmVjb3JkPHN0cmluZywgRG9jdW1lbnRGb3JtYXQ+ID0ge1xuICBwZGY6ICdwZGYnLFxuICBkb2N4OiAnZG9jeCcsXG4gIGRvYzogJ2RvYycsXG4gIG1kOiAnbWQnLFxuICBtYXJrZG93bjogJ21hcmtkb3duJyxcbiAgaHRtbDogJ2h0bWwnLFxuICBodG06ICdodG1sJyxcbiAgdHh0OiAndHh0JyxcbiAgdGV4dDogJ3R4dCcsXG4gIHBuZzogJ2ltYWdlJyxcbiAganBnOiAnaW1hZ2UnLFxuICBqcGVnOiAnaW1hZ2UnLFxuICBnaWY6ICdpbWFnZScsXG4gIHdlYnA6ICdpbWFnZScsXG4gIGJtcDogJ2ltYWdlJyxcbiAgdGlmZjogJ2ltYWdlJyxcbiAgdGlmOiAnaW1hZ2UnLFxufVxuXG4vKipcbiAqIE1JTUUg57G75Z6L5Yiw5qC85byP55qE5pig5bCEXG4gKi9cbmNvbnN0IE1JTUVfTUFQOiBSZWNvcmQ8c3RyaW5nLCBEb2N1bWVudEZvcm1hdD4gPSB7XG4gICdhcHBsaWNhdGlvbi9wZGYnOiAncGRmJyxcbiAgJ2FwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC53b3JkcHJvY2Vzc2luZ21sLmRvY3VtZW50JzogJ2RvY3gnLFxuICAnYXBwbGljYXRpb24vbXN3b3JkJzogJ2RvYycsXG4gICd0ZXh0L21hcmtkb3duJzogJ21kJyxcbiAgJ3RleHQveC1tYXJrZG93bic6ICdtYXJrZG93bicsXG4gICd0ZXh0L2h0bWwnOiAnaHRtbCcsXG4gICdhcHBsaWNhdGlvbi94aHRtbCt4bWwnOiAnaHRtbCcsXG4gICd0ZXh0L3BsYWluJzogJ3R4dCcsXG4gICdpbWFnZS9wbmcnOiAnaW1hZ2UnLFxuICAnaW1hZ2UvanBlZyc6ICdpbWFnZScsXG4gICdpbWFnZS9naWYnOiAnaW1hZ2UnLFxuICAnaW1hZ2Uvd2VicCc6ICdpbWFnZScsXG4gICdpbWFnZS9ibXAnOiAnaW1hZ2UnLFxuICAnaW1hZ2UvdGlmZic6ICdpbWFnZScsXG59XG5cbi8qKlxuICog57uf5LiA5paH5qGj6Kej5p6Q5Zmo57G7XG4gKi9cbmV4cG9ydCBjbGFzcyBEb2N1bWVudFBhcnNlciB7XG4gIHByaXZhdGUgcGFyc2VyczogTWFwPERvY3VtZW50Rm9ybWF0LCBJUGFyc2VyPiA9IG5ldyBNYXAoKVxuICBwcml2YXRlIGltYWdlUGFyc2VyOiBJbWFnZVBhcnNlclxuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIC8vIOWIneWni+WMluaJgOacieino+aekOWZqFxuICAgIHRoaXMucGFyc2Vycy5zZXQoJ3BkZicsIG5ldyBQZGZQYXJzZXIoKSlcbiAgICB0aGlzLnBhcnNlcnMuc2V0KCdkb2N4JywgbmV3IERvY3hQYXJzZXIoKSlcbiAgICB0aGlzLnBhcnNlcnMuc2V0KCdkb2MnLCBuZXcgRG9jeFBhcnNlcigpKSAvLyBkb2Mg5Lmf55SoIGRvY3gg6Kej5p6Q5ZmoXG4gICAgdGhpcy5wYXJzZXJzLnNldCgnbWQnLCBuZXcgTWFya2Rvd25QYXJzZXIoKSlcbiAgICB0aGlzLnBhcnNlcnMuc2V0KCdtYXJrZG93bicsIG5ldyBNYXJrZG93blBhcnNlcigpKVxuICAgIHRoaXMucGFyc2Vycy5zZXQoJ2h0bWwnLCBuZXcgSHRtbFBhcnNlcigpKVxuICAgIHRoaXMucGFyc2Vycy5zZXQoJ3R4dCcsIG5ldyBUeHRQYXJzZXIoKSlcblxuICAgIC8vIOWbvueJh+ino+aekOWZqOWNleeLrOS/neWtmO+8jOWboOS4uumcgOimgeeuoeeQhiB3b3JrZXJcbiAgICB0aGlzLmltYWdlUGFyc2VyID0gbmV3IEltYWdlUGFyc2VyKClcbiAgICB0aGlzLnBhcnNlcnMuc2V0KCdpbWFnZScsIHRoaXMuaW1hZ2VQYXJzZXIpXG4gIH1cblxuICAvKipcbiAgICog6Kej5p6Q5paH5qGjXG4gICAqIEBwYXJhbSBpbnB1dCDmlofmoaPlhoXlrrnvvIhCdWZmZXIg5oiW5a2X56ym5Liy77yJXG4gICAqIEBwYXJhbSBvcHRpb25zIOino+aekOmAiemhuVxuICAgKi9cbiAgYXN5bmMgcGFyc2UoXG4gICAgaW5wdXQ6IEJ1ZmZlciB8IHN0cmluZyxcbiAgICBvcHRpb25zPzogUGFyc2VyT3B0aW9ucyAmIHtcbiAgICAgIC8qKiDmlofku7blkI3vvIjnlKjkuo7mo4DmtYvmoLzlvI/vvIkgKi9cbiAgICAgIGZpbGVuYW1lPzogc3RyaW5nXG4gICAgICAvKiogTUlNRSDnsbvlnovvvIjnlKjkuo7mo4DmtYvmoLzlvI/vvIkgKi9cbiAgICAgIG1pbWVUeXBlPzogc3RyaW5nXG4gICAgICAvKiog5by65Yi25oyH5a6a5qC85byPICovXG4gICAgICBmb3JtYXQ/OiBEb2N1bWVudEZvcm1hdFxuICAgIH1cbiAgKTogUHJvbWlzZTxQYXJzZVJlc3VsdD4ge1xuICAgIC8vIOajgOa1i+aWh+aho+agvOW8j1xuICAgIGNvbnN0IGZvcm1hdCA9IG9wdGlvbnM/LmZvcm1hdCB8fCB0aGlzLmRldGVjdEZvcm1hdChvcHRpb25zPy5maWxlbmFtZSwgb3B0aW9ucz8ubWltZVR5cGUpXG5cbiAgICBpZiAoIWZvcm1hdCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIGVycm9yOiAn5peg5rOV5qOA5rWL5paH5qGj5qC85byP77yM6K+35oyH5a6aIGZvcm1hdCDlj4LmlbAnLFxuICAgICAgICBtZXRhZGF0YToge1xuICAgICAgICAgIHBhcnNlVGltZTogMCxcbiAgICAgICAgICBtZXRob2Q6ICd0ZXh0JyxcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyDojrflj5blr7nlupTnmoTop6PmnpDlmahcbiAgICBjb25zdCBwYXJzZXIgPSB0aGlzLnBhcnNlcnMuZ2V0KGZvcm1hdClcblxuICAgIGlmICghcGFyc2VyKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6IGDkuI3mlK/mjIHnmoTmlofmoaPmoLzlvI86ICR7Zm9ybWF0fWAsXG4gICAgICAgIG1ldGFkYXRhOiB7XG4gICAgICAgICAgcGFyc2VUaW1lOiAwLFxuICAgICAgICAgIG1ldGhvZDogJ3RleHQnLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIOaJp+ihjOino+aekFxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHBhcnNlci5wYXJzZShpbnB1dCwgb3B0aW9ucylcblxuICAgIC8vIOabtOaWsOaWh+S7tuWQjVxuICAgIGlmIChyZXN1bHQuc3VjY2VzcyAmJiByZXN1bHQuYXN0ICYmIG9wdGlvbnM/LmZpbGVuYW1lKSB7XG4gICAgICByZXN1bHQuYXN0LnNvdXJjZUZpbGUgPSBvcHRpb25zLmZpbGVuYW1lXG4gICAgICByZXN1bHQuYXN0Lm1ldGFkYXRhLmZpbGVuYW1lID0gb3B0aW9ucy5maWxlbmFtZVxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHRcbiAgfVxuXG4gIC8qKlxuICAgKiDmibnph4/op6PmnpDmlofmoaNcbiAgICogQHBhcmFtIGRvY3VtZW50cyDmlofmoaPliJfooahcbiAgICogQHBhcmFtIG9wdGlvbnMg6Kej5p6Q6YCJ6aG5XG4gICAqL1xuICBhc3luYyBwYXJzZU11bHRpcGxlKFxuICAgIGRvY3VtZW50czogQXJyYXk8e1xuICAgICAgaW5wdXQ6IEJ1ZmZlciB8IHN0cmluZ1xuICAgICAgZmlsZW5hbWU/OiBzdHJpbmdcbiAgICAgIG1pbWVUeXBlPzogc3RyaW5nXG4gICAgICBmb3JtYXQ/OiBEb2N1bWVudEZvcm1hdFxuICAgIH0+LFxuICAgIG9wdGlvbnM/OiBQYXJzZXJPcHRpb25zXG4gICk6IFByb21pc2U8UGFyc2VSZXN1bHRbXT4ge1xuICAgIGNvbnN0IHJlc3VsdHM6IFBhcnNlUmVzdWx0W10gPSBbXVxuXG4gICAgZm9yIChjb25zdCBkb2Mgb2YgZG9jdW1lbnRzKSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnBhcnNlKGRvYy5pbnB1dCwge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBmaWxlbmFtZTogZG9jLmZpbGVuYW1lLFxuICAgICAgICBtaW1lVHlwZTogZG9jLm1pbWVUeXBlLFxuICAgICAgICBmb3JtYXQ6IGRvYy5mb3JtYXQsXG4gICAgICB9KVxuICAgICAgcmVzdWx0cy5wdXNoKHJlc3VsdClcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0c1xuICB9XG5cbiAgLyoqXG4gICAqIOWQiOW5tuWkmuS4qiBBU1RcbiAgICogQHBhcmFtIGFzdHMgQVNUIOWIl+ihqFxuICAgKiBAcGFyYW0gdGl0bGUg5ZCI5bm25ZCO55qE5qCH6aKYXG4gICAqL1xuICBtZXJnZUFzdHMoYXN0czogVW5pZmllZEFTVFtdLCB0aXRsZT86IHN0cmluZyk6IFVuaWZpZWRBU1Qge1xuICAgIGlmIChhc3RzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCfmsqHmnInlj6/lkIjlubbnmoQgQVNUJylcbiAgICB9XG5cbiAgICBpZiAoYXN0cy5sZW5ndGggPT09IDEpIHtcbiAgICAgIHJldHVybiBhc3RzWzBdXG4gICAgfVxuXG4gICAgLy8g5L2/55So56ys5LiA5LiqIEFTVCDkvZzkuLrln7rnoYBcbiAgICBjb25zdCBtZXJnZWQ6IFVuaWZpZWRBU1QgPSB7XG4gICAgICAuLi5hc3RzWzBdLFxuICAgICAgaWQ6IGBtZXJnZWRfJHtEYXRlLm5vdygpfWAsXG4gICAgICBzb3VyY2VGaWxlOiB0aXRsZSB8fCAnbWVyZ2VkX2RvY3VtZW50JyxcbiAgICAgIGNvbnRlbnQ6IFtdLFxuICAgICAgcmVmZXJlbmNlczogW10sXG4gICAgICBhc3NldHM6IFtdLFxuICAgIH1cblxuICAgIC8vIOWQiOW5tuaJgOacieWGheWuuVxuICAgIGZvciAoY29uc3QgYXN0IG9mIGFzdHMpIHtcbiAgICAgIC8vIOa3u+WKoOadpea6kOagh+iusFxuICAgICAgbWVyZ2VkLmNvbnRlbnQucHVzaCh7XG4gICAgICAgIHR5cGU6ICdoZWFkaW5nJyxcbiAgICAgICAgbGV2ZWw6IDEsXG4gICAgICAgIHRleHQ6IGFzdC5tZXRhZGF0YS50aXRsZSB8fCBhc3Quc291cmNlRmlsZSxcbiAgICAgICAgc291cmNlTG9jYXRpb246IHtcbiAgICAgICAgICBmaWxlOiBhc3Quc291cmNlRmlsZSxcbiAgICAgICAgfSxcbiAgICAgIH0pXG5cbiAgICAgIC8vIOa3u+WKoOWGheWuuVxuICAgICAgbWVyZ2VkLmNvbnRlbnQucHVzaCguLi5hc3QuY29udGVudClcblxuICAgICAgLy8g5ZCI5bm25byV55SoXG4gICAgICBtZXJnZWQucmVmZXJlbmNlcy5wdXNoKC4uLmFzdC5yZWZlcmVuY2VzKVxuXG4gICAgICAvLyDlkIjlubbotYTmupBcbiAgICAgIG1lcmdlZC5hc3NldHMucHVzaCguLi5hc3QuYXNzZXRzKVxuICAgIH1cblxuICAgIC8vIOabtOaWsOWFg+aVsOaNrlxuICAgIG1lcmdlZC5tZXRhZGF0YSA9IHtcbiAgICAgIC4uLm1lcmdlZC5tZXRhZGF0YSxcbiAgICAgIHRpdGxlOiB0aXRsZSB8fCAn5ZCI5bm25paH5qGjJyxcbiAgICAgIGZpbGVuYW1lOiAnbWVyZ2VkX2RvY3VtZW50JyxcbiAgICAgIHdvcmRDb3VudDogYXN0cy5yZWR1Y2UoKHN1bSwgYXN0KSA9PiBzdW0gKyAoYXN0Lm1ldGFkYXRhLndvcmRDb3VudCB8fCAwKSwgMCksXG4gICAgfVxuXG4gICAgcmV0dXJuIG1lcmdlZFxuICB9XG5cbiAgLyoqXG4gICAqIOajgOa1i+aWh+aho+agvOW8j1xuICAgKi9cbiAgcHJpdmF0ZSBkZXRlY3RGb3JtYXQoZmlsZW5hbWU/OiBzdHJpbmcsIG1pbWVUeXBlPzogc3RyaW5nKTogRG9jdW1lbnRGb3JtYXQgfCBudWxsIHtcbiAgICAvLyDkvJjlhYjkvb/nlKggTUlNRSDnsbvlnotcbiAgICBpZiAobWltZVR5cGUgJiYgTUlNRV9NQVBbbWltZVR5cGVdKSB7XG4gICAgICByZXR1cm4gTUlNRV9NQVBbbWltZVR5cGVdXG4gICAgfVxuXG4gICAgLy8g5L2/55So5paH5Lu25omp5bGV5ZCNXG4gICAgaWYgKGZpbGVuYW1lKSB7XG4gICAgICBjb25zdCBleHQgPSBmaWxlbmFtZS50b0xvd2VyQ2FzZSgpLnNwbGl0KCcuJykucG9wKClcbiAgICAgIGlmIChleHQgJiYgRVhURU5TSU9OX01BUFtleHRdKSB7XG4gICAgICAgIHJldHVybiBFWFRFTlNJT05fTUFQW2V4dF1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbFxuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPluaUr+aMgeeahOagvOW8j+WIl+ihqFxuICAgKi9cbiAgZ2V0U3VwcG9ydGVkRm9ybWF0cygpOiBEb2N1bWVudEZvcm1hdFtdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLnBhcnNlcnMua2V5cygpKVxuICB9XG5cbiAgLyoqXG4gICAqIOajgOafpeaYr+WQpuaUr+aMgeaMh+WumuagvOW8j1xuICAgKi9cbiAgaXNGb3JtYXRTdXBwb3J0ZWQoZm9ybWF0OiBEb2N1bWVudEZvcm1hdCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnBhcnNlcnMuaGFzKGZvcm1hdClcbiAgfVxuXG4gIC8qKlxuICAgKiDmuIXnkIbotYTmupBcbiAgICovXG4gIGFzeW5jIGNsZWFudXAoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5pbWFnZVBhcnNlci50ZXJtaW5hdGUoKVxuICB9XG59XG5cbi8qKlxuICog5Yib5bu65paH5qGj6Kej5p6Q5Zmo5a6e5L6LXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVEb2N1bWVudFBhcnNlcigpOiBEb2N1bWVudFBhcnNlciB7XG4gIHJldHVybiBuZXcgRG9jdW1lbnRQYXJzZXIoKVxufVxuIl19