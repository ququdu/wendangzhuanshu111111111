"use strict";
/**
 * 知识图谱构建器
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphBuilder = void 0;
const uuid_1 = require("uuid");
class GraphBuilder {
    build(knowledgePoints) {
        const startTime = Date.now();
        try {
            const nodes = [];
            const edges = [];
            const conceptMap = new Map();
            // 创建节点
            for (const kp of knowledgePoints) {
                const nodeId = (0, uuid_1.v4)();
                nodes.push({
                    id: nodeId,
                    label: kp.content.substring(0, 50),
                    type: kp.type === 'concept' ? 'concept' : 'entity',
                    properties: { fullContent: kp.content, confidence: kp.confidence },
                });
                // 记录概念
                for (const tag of kp.tags) {
                    if (!conceptMap.has(tag)) {
                        const conceptId = (0, uuid_1.v4)();
                        conceptMap.set(tag, conceptId);
                        nodes.push({
                            id: conceptId,
                            label: tag,
                            type: 'topic',
                            properties: {},
                        });
                    }
                    // 创建边
                    edges.push({
                        id: (0, uuid_1.v4)(),
                        source: nodeId,
                        target: conceptMap.get(tag),
                        relation: 'belongs_to',
                        weight: kp.confidence,
                    });
                }
            }
            return {
                success: true,
                graph: { nodes, edges },
                buildTime: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '构建失败',
                buildTime: Date.now() - startTime,
            };
        }
    }
}
exports.GraphBuilder = GraphBuilder;
