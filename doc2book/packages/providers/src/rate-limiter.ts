/**
 * 速率限制器
 */

import type { RateLimitConfig, RateLimitStatus } from './types'

/**
 * 速率限制器类
 */
export class RateLimiter {
  private requestsPerMinute: number
  private tokensPerMinute: number
  private maxConcurrent: number

  private requestCount: number = 0
  private tokenCount: number = 0
  private concurrentCount: number = 0
  private windowStart: number = Date.now()

  constructor(config: RateLimitConfig) {
    this.requestsPerMinute = config.requestsPerMinute
    this.tokensPerMinute = config.tokensPerMinute
    this.maxConcurrent = config.maxConcurrent || 10
  }

  /**
   * 检查是否可以发送请求
   */
  canRequest(estimatedTokens: number = 0): boolean {
    this.resetWindowIfNeeded()

    // 检查并发限制
    if (this.concurrentCount >= this.maxConcurrent) {
      return false
    }

    // 检查请求数限制
    if (this.requestCount >= this.requestsPerMinute) {
      return false
    }

    // 检查 token 限制
    if (this.tokenCount + estimatedTokens > this.tokensPerMinute) {
      return false
    }

    return true
  }

  /**
   * 等待直到可以发送请求
   */
  async waitForSlot(estimatedTokens: number = 0): Promise<void> {
    while (!this.canRequest(estimatedTokens)) {
      const waitTime = this.getWaitTime()
      await this.sleep(waitTime)
      this.resetWindowIfNeeded()
    }
  }

  /**
   * 记录请求开始
   */
  startRequest(): void {
    this.resetWindowIfNeeded()
    this.requestCount++
    this.concurrentCount++
  }

  /**
   * 记录请求结束
   */
  endRequest(tokensUsed: number = 0): void {
    this.concurrentCount = Math.max(0, this.concurrentCount - 1)
    this.tokenCount += tokensUsed
  }

  /**
   * 获取当前状态
   */
  getStatus(): RateLimitStatus {
    this.resetWindowIfNeeded()

    return {
      remainingRequests: Math.max(0, this.requestsPerMinute - this.requestCount),
      remainingTokens: Math.max(0, this.tokensPerMinute - this.tokenCount),
      resetTime: new Date(this.windowStart + 60000),
      isLimited: !this.canRequest(),
    }
  }

  /**
   * 获取等待时间（毫秒）
   */
  private getWaitTime(): number {
    const elapsed = Date.now() - this.windowStart
    const remaining = 60000 - elapsed

    if (remaining <= 0) {
      return 0
    }

    // 如果是并发限制，等待较短时间
    if (this.concurrentCount >= this.maxConcurrent) {
      return 100
    }

    // 否则等待到窗口重置
    return remaining
  }

  /**
   * 如果需要，重置时间窗口
   */
  private resetWindowIfNeeded(): void {
    const now = Date.now()
    if (now - this.windowStart >= 60000) {
      this.windowStart = now
      this.requestCount = 0
      this.tokenCount = 0
    }
  }

  /**
   * 睡眠指定时间
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 重置限制器
   */
  reset(): void {
    this.windowStart = Date.now()
    this.requestCount = 0
    this.tokenCount = 0
    this.concurrentCount = 0
  }
}
