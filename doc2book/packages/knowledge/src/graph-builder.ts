/**
 * 知识图谱构建器
 */

import { v4 as uuidv4 } from 'uuid'
import type { KnowledgePoint, KnowledgeGraph, KnowledgeGraphNode, KnowledgeGraphEdge } from '@doc2book/shared'
import type { GraphBuildResult } from './types'

export class GraphBuilder {
  build(knowledgePoints: KnowledgePoint[]): GraphBuildResult {
    const startTime = Date.now()

    try {
      const nodes: KnowledgeGraphNode[] = []
      const edges: KnowledgeGraphEdge[] = []
      const conceptMap = new Map<string, string>()

      // 创建节点
      for (const kp of knowledgePoints) {
        const nodeId = uuidv4()
        nodes.push({
          id: nodeId,
          label: kp.content.substring(0, 50),
          type: kp.type === 'concept' ? 'concept' : 'entity',
          properties: { fullContent: kp.content, confidence: kp.confidence },
        })

        // 记录概念
        for (const tag of kp.tags) {
          if (!conceptMap.has(tag)) {
            const conceptId = uuidv4()
            conceptMap.set(tag, conceptId)
            nodes.push({
              id: conceptId,
              label: tag,
              type: 'topic',
              properties: {},
            })
          }
          // 创建边
          edges.push({
            id: uuidv4(),
            source: nodeId,
            target: conceptMap.get(tag)!,
            relation: 'belongs_to',
            weight: kp.confidence,
          })
        }
      }

      return {
        success: true,
        graph: { nodes, edges },
        buildTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '构建失败',
        buildTime: Date.now() - startTime,
      }
    }
  }
}
