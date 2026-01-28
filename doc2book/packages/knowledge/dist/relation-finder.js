"use strict";
/**
 * 关系发现器
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationFinder = void 0;
class RelationFinder {
    providerManager;
    constructor(providerManager) {
        this.providerManager = providerManager;
    }
    async findRelations(knowledgePoints) {
        if (knowledgePoints.length < 2) {
            return { success: true, relations: [] };
        }
        try {
            const contents = knowledgePoints.slice(0, 20).map((kp, i) => `${i}: ${kp.content}`);
            const prompt = `分析以下知识点之间的关系，以 JSON 数组返回：

${contents.join('\n')}

每个关系包含：source(索引), target(索引), type(关系类型), confidence(0-1)

只返回 JSON 数组。`;
            const response = await this.providerManager.complete([{ role: 'user', content: prompt }], { temperature: 0.3, maxTokens: 1000 });
            if (!response.success || !response.content) {
                return { success: false, error: response.error };
            }
            const match = response.content.match(/\[[\s\S]*\]/);
            if (!match)
                return { success: true, relations: [] };
            const data = JSON.parse(match[0]);
            const relations = data.map((r) => ({
                source: knowledgePoints[r.source]?.id || '',
                target: knowledgePoints[r.target]?.id || '',
                type: r.type || 'related',
                confidence: r.confidence || 0.5,
            })).filter((r) => r.source && r.target);
            return { success: true, relations };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : '发现关系失败' };
        }
    }
}
exports.RelationFinder = RelationFinder;
