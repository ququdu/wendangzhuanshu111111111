/**
 * 速率限制器
 */
import type { RateLimitConfig, RateLimitStatus } from './types';
/**
 * 速率限制器类
 */
export declare class RateLimiter {
    private requestsPerMinute;
    private tokensPerMinute;
    private maxConcurrent;
    private requestCount;
    private tokenCount;
    private concurrentCount;
    private windowStart;
    constructor(config: RateLimitConfig);
    /**
     * 检查是否可以发送请求
     */
    canRequest(estimatedTokens?: number): boolean;
    /**
     * 等待直到可以发送请求
     */
    waitForSlot(estimatedTokens?: number): Promise<void>;
    /**
     * 记录请求开始
     */
    startRequest(): void;
    /**
     * 记录请求结束
     */
    endRequest(tokensUsed?: number): void;
    /**
     * 获取当前状态
     */
    getStatus(): RateLimitStatus;
    /**
     * 获取等待时间（毫秒）
     */
    private getWaitTime;
    /**
     * 如果需要，重置时间窗口
     */
    private resetWindowIfNeeded;
    /**
     * 睡眠指定时间
     */
    private sleep;
    /**
     * 重置限制器
     */
    reset(): void;
}
