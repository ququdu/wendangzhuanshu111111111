/**
 * 向量存储
 * 用于存储和检索文本向量，支持相似度搜索
 */

import { v4 as uuidv4 } from 'uuid'
import type { ProviderManager } from '@doc2book/providers'
import type { VectorEntry } from './types'

/**
 * 向量存储配置
 */
export interface VectorStoreConfig {
  /** 向量维度 */
  dimensions?: number
  /** 相似度阈值 */
  similarityThreshold?: number
}

/**
 * 向量存储类
 * 简单的内存向量存储实现
 */
export class VectorStore {
  private entries: Map<string, VectorEntry> = new Map()
  private providerManager: ProviderManager
  private dimensions: number
  private similarityThreshold: number

  constructor(providerManager: ProviderManager, config?: VectorStoreConfig) {
    this.providerManager = providerManager
    this.dimensions = config?.dimensions || 1536
    this.similarityThreshold = config?.similarityThreshold || 0.8
  }

  /**
   * 添加文本到向量存储
   */
  async add(text: string, metadata?: Record<string, any>): Promise<string> {
    const id = uuidv4()
    const vector = await this.getEmbedding(text)

    this.entries.set(id, {
      id,
      text,
      vector,
      metadata,
    })

    return id
  }

  /**
   * 批量添加文本
   */
  async addBatch(
    items: Array<{ text: string; metadata?: Record<string, any> }>
  ): Promise<string[]> {
    const ids: string[] = []

    for (const item of items) {
      const id = await this.add(item.text, item.metadata)
      ids.push(id)
    }

    return ids
  }

  /**
   * 搜索相似文本
   */
  async search(
    query: string,
    options?: { limit?: number; threshold?: number }
  ): Promise<Array<{ entry: VectorEntry; similarity: number }>> {
    const queryVector = await this.getEmbedding(query)
    const threshold = options?.threshold || this.similarityThreshold
    const limit = options?.limit || 10

    const results: Array<{ entry: VectorEntry; similarity: number }> = []

    for (const entry of this.entries.values()) {
      const similarity = this.cosineSimilarity(queryVector, entry.vector)
      if (similarity >= threshold) {
        results.push({ entry, similarity })
      }
    }

    // 按相似度排序
    results.sort((a, b) => b.similarity - a.similarity)

    return results.slice(0, limit)
  }

  /**
   * 检查文本是否与存储中的内容相似
   */
  async checkSimilarity(
    text: string,
    threshold?: number
  ): Promise<{ isSimilar: boolean; matches: Array<{ entry: VectorEntry; similarity: number }> }> {
    const matches = await this.search(text, { threshold })
    return {
      isSimilar: matches.length > 0,
      matches,
    }
  }

  /**
   * 删除条目
   */
  delete(id: string): boolean {
    return this.entries.delete(id)
  }

  /**
   * 清空存储
   */
  clear(): void {
    this.entries.clear()
  }

  /**
   * 获取条目数量
   */
  size(): number {
    return this.entries.size
  }

  /**
   * 获取所有条目
   */
  getAll(): VectorEntry[] {
    return Array.from(this.entries.values())
  }

  /**
   * 获取文本的嵌入向量
   */
  private async getEmbedding(text: string): Promise<number[]> {
    // 使用 AI 生成简单的文本特征向量
    // 注意：这是一个简化实现，实际应用中应使用专门的嵌入模型
    const prompt = `将以下文本转换为一个数值特征向量。返回一个包含 ${this.dimensions} 个浮点数的 JSON 数组，每个数值在 -1 到 1 之间。只返回 JSON 数组，不要其他内容。

文本：${text.substring(0, 500)}`

    try {
      const response = await this.providerManager.complete(
        [{ role: 'user', content: prompt }],
        { temperature: 0, maxTokens: this.dimensions * 10 }
      )

      if (response.success && response.content) {
        const match = response.content.match(/\[[\s\S]*\]/)
        if (match) {
          const vector = JSON.parse(match[0])
          if (Array.isArray(vector) && vector.length > 0) {
            // 确保向量长度正确
            return this.normalizeVector(vector.slice(0, this.dimensions))
          }
        }
      }
    } catch (error) {
      console.warn('获取嵌入向量失败，使用简单哈希:', error)
    }

    // 备用方案：使用简单的文本哈希生成向量
    return this.simpleTextHash(text)
  }

  /**
   * 简单的文本哈希向量
   */
  private simpleTextHash(text: string): number[] {
    const vector: number[] = new Array(this.dimensions).fill(0)

    // 使用字符编码生成简单的向量
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i)
      const index = i % this.dimensions
      vector[index] += charCode / 65536
    }

    return this.normalizeVector(vector)
  }

  /**
   * 归一化向量
   */
  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
    if (magnitude === 0) return vector
    return vector.map((val) => val / magnitude)
  }

  /**
   * 计算余弦相似度
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      // 调整长度
      const minLen = Math.min(a.length, b.length)
      a = a.slice(0, minLen)
      b = b.slice(0, minLen)
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
    if (magnitude === 0) return 0

    return dotProduct / magnitude
  }

  /**
   * 导出存储数据
   */
  export(): VectorEntry[] {
    return Array.from(this.entries.values())
  }

  /**
   * 导入存储数据
   */
  import(entries: VectorEntry[]): void {
    for (const entry of entries) {
      this.entries.set(entry.id, entry)
    }
  }
}
