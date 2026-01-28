"use strict";
/**
 * 知识点提取器
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeExtractor = void 0;
const uuid_1 = require("uuid");
class KnowledgeExtractor {
    providerManager;
    constructor(providerManager) {
        this.providerManager = providerManager;
    }
    async extract(ast) {
        const startTime = Date.now();
        try {
            const textContent = this.extractText(ast.content);
            const prompt = `请从以下文本中提取知识点，以 JSON 数组格式返回：

${textContent.substring(0, 8000)}

每个知识点包含：
- content: 知识点内容
- type: 类型 (fact/concept/opinion/data/example/quote)
- confidence: 置信度 (0-1)
- tags: 标签数组

只返回 JSON 数组，不要其他内容。`;
            const response = await this.providerManager.complete([{ role: 'user', content: prompt }], { temperature: 0.3, maxTokens: 2000 });
            if (!response.success || !response.content) {
                return { success: false, error: response.error, extractionTime: Date.now() - startTime };
            }
            const knowledgePoints = this.parseResponse(response.content, ast.id);
            return {
                success: true,
                knowledgePoints,
                extractionTime: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '提取失败',
                extractionTime: Date.now() - startTime,
            };
        }
    }
    extractText(nodes) {
        return nodes.map(n => n.text || (n.children ? this.extractText(n.children) : '')).join('\n');
    }
    parseResponse(content, documentId) {
        try {
            const match = content.match(/\[[\s\S]*\]/);
            if (!match)
                return [];
            const data = JSON.parse(match[0]);
            return data.map((item) => ({
                id: (0, uuid_1.v4)(),
                type: item.type || 'fact',
                content: item.content,
                confidence: item.confidence || 0.8,
                sourceDocuments: [documentId],
                sourceLocations: [],
                relatedConcepts: [],
                tags: item.tags || [],
            }));
        }
        catch {
            return [];
        }
    }
}
exports.KnowledgeExtractor = KnowledgeExtractor;
