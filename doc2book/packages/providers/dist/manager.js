"use strict";
/**
 * Provider 管理器
 * 统一管理多个 AI Provider，支持故障转移和负载均衡
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderManager = void 0;
exports.createProviderManager = createProviderManager;
const anthropic_1 = require("./providers/anthropic");
const openai_1 = require("./providers/openai");
const openai_compatible_1 = require("./providers/openai-compatible");
const deepl_1 = require("./providers/deepl");
const rate_limiter_1 = require("./rate-limiter");
/**
 * Provider 管理器类
 */
class ProviderManager {
    providers = new Map();
    rateLimiters = new Map();
    providerConfigs = new Map();
    defaultProviderId;
    fallbackChain;
    retryAttempts;
    timeout;
    constructor(config) {
        this.defaultProviderId = config.defaultProvider;
        this.fallbackChain = config.fallbackChain || [];
        this.retryAttempts = config.retryAttempts || 3;
        this.timeout = config.timeout || 30000;
        // 初始化所有 Provider
        for (const providerConfig of config.providers) {
            if (providerConfig.enabled) {
                this.addProvider(providerConfig);
            }
        }
    }
    /**
     * 添加 Provider
     */
    addProvider(config) {
        const provider = this.createProvider(config);
        if (provider) {
            this.providers.set(config.id, provider);
            this.providerConfigs.set(config.id, config);
            // 创建速率限制器
            if (config.rateLimit) {
                this.rateLimiters.set(config.id, new rate_limiter_1.RateLimiter({
                    requestsPerMinute: config.rateLimit.requestsPerMinute,
                    tokensPerMinute: config.rateLimit.tokensPerMinute,
                }));
            }
        }
    }
    /**
     * 移除 Provider
     */
    removeProvider(id) {
        this.providers.delete(id);
        this.providerConfigs.delete(id);
        this.rateLimiters.delete(id);
    }
    /**
     * 获取 Provider
     */
    getProvider(id) {
        return this.providers.get(id);
    }
    /**
     * 获取所有 Provider 状态
     */
    async getProviderStatuses() {
        const statuses = [];
        for (const [id, provider] of this.providers) {
            const startTime = Date.now();
            let available = false;
            let error;
            try {
                available = await Promise.race([
                    provider.isAvailable(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('超时')), 5000)),
                ]);
            }
            catch (e) {
                error = e instanceof Error ? e.message : '检查失败';
            }
            statuses.push({
                id,
                name: provider.name,
                available,
                latency: Date.now() - startTime,
                lastCheck: new Date(),
                error,
            });
        }
        return statuses;
    }
    /**
     * 发送补全请求
     */
    async complete(messages, options) {
        // 确定使用的 Provider
        const providerId = options?.providerId || this.defaultProviderId;
        const providerChain = [providerId, ...this.fallbackChain.filter((id) => id !== providerId)];
        // 尝试每个 Provider
        for (const id of providerChain) {
            const provider = this.providers.get(id);
            if (!provider)
                continue;
            // 检查速率限制
            const rateLimiter = this.rateLimiters.get(id);
            if (rateLimiter) {
                await rateLimiter.waitForSlot();
                rateLimiter.startRequest();
            }
            try {
                // 发送请求
                const response = await this.executeWithRetry(() => provider.complete(messages, options), this.retryAttempts);
                // 更新速率限制
                if (rateLimiter && response.usage) {
                    rateLimiter.endRequest(response.usage.totalTokens);
                }
                if (response.success) {
                    return response;
                }
                // 如果失败，尝试下一个 Provider
                console.warn(`Provider ${id} 失败:`, response.error);
            }
            catch (error) {
                if (rateLimiter) {
                    rateLimiter.endRequest(0);
                }
                console.error(`Provider ${id} 异常:`, error);
            }
        }
        return {
            success: false,
            error: '所有 Provider 都失败了',
        };
    }
    /**
     * 翻译文本
     */
    async translate(text, options) {
        // 优先使用 DeepL
        const providerId = options.providerId || this.findTranslationProvider();
        if (!providerId) {
            return {
                success: false,
                error: '没有可用的翻译 Provider',
            };
        }
        const provider = this.providers.get(providerId);
        if (!provider || !provider.translate) {
            return {
                success: false,
                error: `Provider ${providerId} 不支持翻译`,
            };
        }
        // 检查速率限制
        const rateLimiter = this.rateLimiters.get(providerId);
        if (rateLimiter) {
            await rateLimiter.waitForSlot();
            rateLimiter.startRequest();
        }
        try {
            const result = await provider.translate(text, options);
            if (rateLimiter) {
                rateLimiter.endRequest(text.length);
            }
            return result;
        }
        catch (error) {
            if (rateLimiter) {
                rateLimiter.endRequest(0);
            }
            return {
                success: false,
                error: error instanceof Error ? error.message : '翻译失败',
            };
        }
    }
    /**
     * 使用 AI 进行翻译（通过补全 API）
     */
    async translateWithAI(text, options) {
        const basePrompt = `你是一个专业的翻译专家。请将以下文本翻译成${options.targetLanguage}。
要求：
1. 保持原文的语气和风格
2. 确保翻译准确、流畅、自然
3. 只输出翻译结果，不要添加任何解释或注释
${options.preserveFormatting ? '4. 保持原文的格式（段落、列表等）' : ''}`;
        const systemPrompt = options.systemPrompt
            ? options.systemPrompt
            : options.instruction
                ? `${basePrompt}

附加要求：
${options.instruction}`
                : basePrompt;
        const response = await this.complete([{ role: 'user', content: text }], {
            systemPrompt,
            providerId: options.providerId,
            temperature: 0.3,
        });
        if (response.success && response.content) {
            return {
                success: true,
                translatedText: response.content,
            };
        }
        return {
            success: false,
            error: response.error || '翻译失败',
        };
    }
    /**
     * 创建 Provider 实例
     */
    createProvider(config) {
        switch (config.type) {
            case 'anthropic':
                return new anthropic_1.AnthropicProvider({
                    apiKey: config.apiKey,
                    baseUrl: config.baseUrl,
                    defaultModel: config.defaultModel,
                });
            case 'openai':
                return new openai_1.OpenAIProvider({
                    apiKey: config.apiKey,
                    baseUrl: config.baseUrl,
                    defaultModel: config.defaultModel,
                });
            case 'openai-compatible':
                return new openai_compatible_1.OpenAICompatibleProvider({
                    apiKey: config.apiKey,
                    baseUrl: config.baseUrl,
                    name: config.name,
                    defaultModel: config.defaultModel,
                    models: config.models,
                });
            case 'deepl':
                return new deepl_1.DeepLProvider({
                    apiKey: config.apiKey,
                    useFreeApi: config.baseUrl?.includes('api-free'),
                });
            case 'google':
                // TODO: 实现 Google Gemini Provider
                console.warn('Google Gemini Provider 尚未实现');
                return null;
            default:
                console.warn(`未知的 Provider 类型: ${config.type}`);
                return null;
        }
    }
    /**
     * 查找翻译 Provider
     */
    findTranslationProvider() {
        // 优先使用 DeepL
        for (const [id, provider] of this.providers) {
            if (provider.type === 'deepl') {
                return id;
            }
        }
        // 其次使用任何支持翻译的 Provider
        for (const [id, provider] of this.providers) {
            if (provider.translate) {
                return id;
            }
        }
        // 最后使用默认 Provider（通过 AI 翻译）
        return this.defaultProviderId;
    }
    /**
     * 带重试的执行
     */
    async executeWithRetry(fn, maxRetries) {
        let lastError = null;
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                // 指数退避
                if (i < maxRetries - 1) {
                    await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
                }
            }
        }
        throw lastError || new Error('重试失败');
    }
}
exports.ProviderManager = ProviderManager;
/**
 * 创建 Provider 管理器
 */
function createProviderManager(config) {
    return new ProviderManager(config);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9tYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7OztBQTZXSCxzREFFQztBQW5XRCxxREFBeUQ7QUFDekQsK0NBQW1EO0FBQ25ELHFFQUF3RTtBQUN4RSw2Q0FBaUQ7QUFDakQsaURBQTRDO0FBRTVDOztHQUVHO0FBQ0gsTUFBYSxlQUFlO0lBQ2xCLFNBQVMsR0FBMkIsSUFBSSxHQUFHLEVBQUUsQ0FBQTtJQUM3QyxZQUFZLEdBQTZCLElBQUksR0FBRyxFQUFFLENBQUE7SUFDbEQsZUFBZSxHQUFnQyxJQUFJLEdBQUcsRUFBRSxDQUFBO0lBQ3hELGlCQUFpQixDQUFRO0lBQ3pCLGFBQWEsQ0FBVTtJQUN2QixhQUFhLENBQVE7SUFDckIsT0FBTyxDQUFRO0lBRXZCLFlBQVksTUFBNkI7UUFDdkMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxlQUFlLENBQUE7UUFDL0MsSUFBSSxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUMsYUFBYSxJQUFJLEVBQUUsQ0FBQTtRQUMvQyxJQUFJLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQyxhQUFhLElBQUksQ0FBQyxDQUFBO1FBQzlDLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUE7UUFFdEMsaUJBQWlCO1FBQ2pCLEtBQUssTUFBTSxjQUFjLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzlDLElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUMzQixJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1lBQ2xDLENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsV0FBVyxDQUFDLE1BQXNCO1FBQ2hDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDNUMs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RUFBRSxDQUFDO2dCQUNmLFNBQVMsR0FBRyxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO2dCQUVyRSxPQUFPO2dCQUNQLElBQUksQ0FBQyxHQUFHLFVBQVUsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDdkIsTUFBTSxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFBO2dCQUM1RSxDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxNQUFNLFNBQVMsSUFBSSxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0NBQ0Y7QUFuVkQsMENBbVZDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQixxQkFBcUIsQ0FBQyxNQUE2QjtJQUNqRSxPQUFPLElBQUksZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0FBQ3BDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFByb3ZpZGVyIOeuoeeQhuWZqFxuICog57uf5LiA566h55CG5aSa5LiqIEFJIFByb3ZpZGVy77yM5pSv5oyB5pWF6Zqc6L2s56e75ZKM6LSf6L295Z2H6KGhXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBQcm92aWRlckNvbmZpZywgUHJvdmlkZXJNYW5hZ2VyQ29uZmlnLCBQcm92aWRlclR5cGUgfSBmcm9tICdAZG9jMmJvb2svc2hhcmVkJ1xuaW1wb3J0IHR5cGUge1xuICBJUHJvdmlkZXIsXG4gIFByb3ZpZGVyTWVzc2FnZSxcbiAgUHJvdmlkZXJSZXNwb25zZSxcbiAgQ29tcGxldGlvbk9wdGlvbnMsXG4gIFByb3ZpZGVyU3RhdHVzLFxuICBUcmFuc2xhdGlvbk9wdGlvbnMsXG4gIFRyYW5zbGF0aW9uUmVzdWx0LFxufSBmcm9tICcuL3R5cGVzJ1xuaW1wb3J0IHsgQW50aHJvcGljUHJvdmlkZXIgfSBmcm9tICcuL3Byb3ZpZGVycy9hbnRocm9waWMnXG5pbXBvcnQgeyBPcGVuQUlQcm92aWRlciB9IGZyb20gJy4vcHJvdmlkZXJzL29wZW5haSdcbmltcG9ydCB7IE9wZW5BSUNvbXBhdGlibGVQcm92aWRlciB9IGZyb20gJy4vcHJvdmlkZXJzL29wZW5haS1jb21wYXRpYmxlJ1xuaW1wb3J0IHsgRGVlcExQcm92aWRlciB9IGZyb20gJy4vcHJvdmlkZXJzL2RlZXBsJ1xuaW1wb3J0IHsgUmF0ZUxpbWl0ZXIgfSBmcm9tICcuL3JhdGUtbGltaXRlcidcblxuLyoqXG4gKiBQcm92aWRlciDnrqHnkIblmajnsbtcbiAqL1xuZXhwb3J0IGNsYXNzIFByb3ZpZGVyTWFuYWdlciB7XG4gIHByaXZhdGUgcHJvdmlkZXJzOiBNYXA8c3RyaW5nLCBJUHJvdmlkZXI+ID0gbmV3IE1hcCgpXG4gIHByaXZhdGUgcmF0ZUxpbWl0ZXJzOiBNYXA8c3RyaW5nLCBSYXRlTGltaXRlcj4gPSBuZXcgTWFwKClcbiAgcHJpdmF0ZSBwcm92aWRlckNvbmZpZ3M6IE1hcDxzdHJpbmcsIFByb3ZpZGVyQ29uZmlnPiA9IG5ldyBNYXAoKVxuICBwcml2YXRlIGRlZmF1bHRQcm92aWRlcklkOiBzdHJpbmdcbiAgcHJpdmF0ZSBmYWxsYmFja0NoYWluOiBzdHJpbmdbXVxuICBwcml2YXRlIHJldHJ5QXR0ZW1wdHM6IG51bWJlclxuICBwcml2YXRlIHRpbWVvdXQ6IG51bWJlclxuXG4gIGNvbnN0cnVjdG9yKGNvbmZpZzogUHJvdmlkZXJNYW5hZ2VyQ29uZmlnKSB7XG4gICAgdGhpcy5kZWZhdWx0UHJvdmlkZXJJZCA9IGNvbmZpZy5kZWZhdWx0UHJvdmlkZXJcbiAgICB0aGlzLmZhbGxiYWNrQ2hhaW4gPSBjb25maWcuZmFsbGJhY2tDaGFpbiB8fCBbXVxuICAgIHRoaXMucmV0cnlBdHRlbXB0cyA9IGNvbmZpZy5yZXRyeUF0dGVtcHRzIHx8IDNcbiAgICB0aGlzLnRpbWVvdXQgPSBjb25maWcudGltZW91dCB8fCAzMDAwMFxuXG4gICAgLy8g5Yid5aeL5YyW5omA5pyJIFByb3ZpZGVyXG4gICAgZm9yIChjb25zdCBwcm92aWRlckNvbmZpZyBvZiBjb25maWcucHJvdmlkZXJzKSB7XG4gICAgICBpZiAocHJvdmlkZXJDb25maWcuZW5hYmxlZCkge1xuICAgICAgICB0aGlzLmFkZFByb3ZpZGVyKHByb3ZpZGVyQ29uZmlnKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDmt7vliqAgUHJvdmlkZXJcbiAgICovXG4gIGFkZFByb3ZpZGVyKGNvbmZpZzogUHJvdmlkZXJDb25maWcpOiB2b2lkIHtcbiAgICBjb25zdCBwcm92aWRlciA9IHRoaXMuY3JlYXRlUHJvdmlkZXIoY29uZmlnKVxuICAgIGlmIChwcm92aWRlcikge1xuICAgICAgdGhpcy5wcm92aWRlcnMuc2V0KGNvbmZpZy5pZCwgcHJvdmlkZXIpXG4gICAgICB0aGlzLnByb3ZpZGVyQ29uZmlncy5zZXQoY29uZmlnLmlkLCBjb25maWcpXG5cbiAgICAgIC8vIOWIm+W7uumAn+eOh+mZkOWItuWZqFxuICAgICAgaWYgKGNvbmZpZy5yYXRlTGltaXQpIHtcbiAgICAgICAgdGhpcy5yYXRlTGltaXRlcnMuc2V0KFxuICAgICAgICAgIGNvbmZpZy5pZCxcbiAgICAgICAgICBuZXcgUmF0ZUxpbWl0ZXIoe1xuICAgICAgICAgICAgcmVxdWVzdHNQZXJNaW51dGU6IGNvbmZpZy5yYXRlTGltaXQucmVxdWVzdHNQZXJNaW51dGUsXG4gICAgICAgICAgICB0b2tlbnNQZXJNaW51dGU6IGNvbmZpZy5yYXRlTGltaXQudG9rZW5zUGVyTWludXRlLFxuICAgICAgICAgIH0pXG4gICAgICAgIClcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog56e76ZmkIFByb3ZpZGVyXG4gICAqL1xuICByZW1vdmVQcm92aWRlcihpZDogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy5wcm92aWRlcnMuZGVsZXRlKGlkKVxuICAgIHRoaXMucHJvdmlkZXJDb25maWdzLmRlbGV0ZShpZClcbiAgICB0aGlzLnJhdGVMaW1pdGVycy5kZWxldGUoaWQpXG4gIH1cblxuICAvKipcbiAgICog6I635Y+WIFByb3ZpZGVyXG4gICAqL1xuICBnZXRQcm92aWRlcihpZDogc3RyaW5nKTogSVByb3ZpZGVyIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5wcm92aWRlcnMuZ2V0KGlkKVxuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPluaJgOaciSBQcm92aWRlciDnirbmgIFcbiAgICovXG4gIGFzeW5jIGdldFByb3ZpZGVyU3RhdHVzZXMoKTogUHJvbWlzZTxQcm92aWRlclN0YXR1c1tdPiB7XG4gICAgY29uc3Qgc3RhdHVzZXM6IFByb3ZpZGVyU3RhdHVzW10gPSBbXVxuXG4gICAgZm9yIChjb25zdCBbaWQsIHByb3ZpZGVyXSBvZiB0aGlzLnByb3ZpZGVycykge1xuICAgICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKVxuICAgICAgbGV0IGF2YWlsYWJsZSA9IGZhbHNlXG4gICAgICBsZXQgZXJyb3I6IHN0cmluZyB8IHVuZGVmaW5lZFxuXG4gICAgICB0cnkge1xuICAgICAgICBhdmFpbGFibGUgPSBhd2FpdCBQcm9taXNlLnJhY2UoW1xuICAgICAgICAgIHByb3ZpZGVyLmlzQXZhaWxhYmxlKCksXG4gICAgICAgICAgbmV3IFByb21pc2U8Ym9vbGVhbj4oKF8sIHJlamVjdCkgPT5cbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gcmVqZWN0KG5ldyBFcnJvcign6LaF5pe2JykpLCA1MDAwKVxuICAgICAgICAgICksXG4gICAgICAgIF0pXG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGVycm9yID0gZSBpbnN0YW5jZW9mIEVycm9yID8gZS5tZXNzYWdlIDogJ+ajgOafpeWksei0pSdcbiAgICAgIH1cblxuICAgICAgc3RhdHVzZXMucHVzaCh7XG4gICAgICAgIGlkLFxuICAgICAgICBuYW1lOiBwcm92aWRlci5uYW1lLFxuICAgICAgICBhdmFpbGFibGUsXG4gICAgICAgIGxhdGVuY3k6IERhdGUubm93KCkgLSBzdGFydFRpbWUsXG4gICAgICAgIGxhc3RDaGVjazogbmV3IERhdGUoKSxcbiAgICAgICAgZXJyb3IsXG4gICAgICB9KVxuICAgIH1cblxuICAgIHJldHVybiBzdGF0dXNlc1xuICB9XG5cbiAgLyoqXG4gICAqIOWPkemAgeihpeWFqOivt+axglxuICAgKi9cbiAgYXN5bmMgY29tcGxldGUoXG4gICAgbWVzc2FnZXM6IFByb3ZpZGVyTWVzc2FnZVtdLFxuICAgIG9wdGlvbnM/OiBDb21wbGV0aW9uT3B0aW9ucyAmIHsgcHJvdmlkZXJJZD86IHN0cmluZyB9XG4gICk6IFByb21pc2U8UHJvdmlkZXJSZXNwb25zZT4ge1xuICAgIC8vIOehruWumuS9v+eUqOeahCBQcm92aWRlclxuICAgIGNvbnN0IHByb3ZpZGVySWQgPSBvcHRpb25zPy5wcm92aWRlcklkIHx8IHRoaXMuZGVmYXVsdFByb3ZpZGVySWRcbiAgICBjb25zdCBwcm92aWRlckNoYWluID0gW3Byb3ZpZGVySWQsIC4uLnRoaXMuZmFsbGJhY2tDaGFpbi5maWx0ZXIoKGlkKSA9PiBpZCAhPT0gcHJvdmlkZXJJZCldXG5cbiAgICAvLyDlsJ3or5Xmr4/kuKogUHJvdmlkZXJcbiAgICBmb3IgKGNvbnN0IGlkIG9mIHByb3ZpZGVyQ2hhaW4pIHtcbiAgICAgIGNvbnN0IHByb3ZpZGVyID0gdGhpcy5wcm92aWRlcnMuZ2V0KGlkKVxuICAgICAgaWYgKCFwcm92aWRlcikgY29udGludWVcblxuICAgICAgLy8g5qOA5p+l6YCf546H6ZmQ5Yi2XG4gICAgICBjb25zdCByYXRlTGltaXRlciA9IHRoaXMucmF0ZUxpbWl0ZXJzLmdldChpZClcbiAgICAgIGlmIChyYXRlTGltaXRlcikge1xuICAgICAgICBhd2FpdCByYXRlTGltaXRlci53YWl0Rm9yU2xvdCgpXG4gICAgICAgIHJhdGVMaW1pdGVyLnN0YXJ0UmVxdWVzdCgpXG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIOWPkemAgeivt+axglxuICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuZXhlY3V0ZVdpdGhSZXRyeShcbiAgICAgICAgICAoKSA9PiBwcm92aWRlci5jb21wbGV0ZShtZXNzYWdlcywgb3B0aW9ucyksXG4gICAgICAgICAgdGhpcy5yZXRyeUF0dGVtcHRzXG4gICAgICAgIClcblxuICAgICAgICAvLyDmm7TmlrDpgJ/njofpmZDliLZcbiAgICAgICAgaWYgKHJhdGVMaW1pdGVyICYmIHJlc3BvbnNlLnVzYWdlKSB7XG4gICAgICAgICAgcmF0ZUxpbWl0ZXIuZW5kUmVxdWVzdChyZXNwb25zZS51c2FnZS50b3RhbFRva2VucylcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZXNwb25zZS5zdWNjZXNzKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc3BvbnNlXG4gICAgICAgIH1cblxuICAgICAgICAvLyDlpoLmnpzlpLHotKXvvIzlsJ3or5XkuIvkuIDkuKogUHJvdmlkZXJcbiAgICAgICAgY29uc29sZS53YXJuKGBQcm92aWRlciAke2lkfSDlpLHotKU6YCwgcmVzcG9uc2UuZXJyb3IpXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBpZiAocmF0ZUxpbWl0ZXIpIHtcbiAgICAgICAgICByYXRlTGltaXRlci5lbmRSZXF1ZXN0KDApXG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5lcnJvcihgUHJvdmlkZXIgJHtpZH0g5byC5bi4OmAsIGVycm9yKVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgIGVycm9yOiAn5omA5pyJIFByb3ZpZGVyIOmDveWksei0peS6hicsXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOe/u+ivkeaWh+acrFxuICAgKi9cbiAgYXN5bmMgdHJhbnNsYXRlKFxuICAgIHRleHQ6IHN0cmluZyxcbiAgICBvcHRpb25zOiBUcmFuc2xhdGlvbk9wdGlvbnMgJiB7IHByb3ZpZGVySWQ/OiBzdHJpbmcgfVxuICApOiBQcm9taXNlPFRyYW5zbGF0aW9uUmVzdWx0PiB7XG4gICAgLy8g5LyY5YWI5L2/55SoIERlZXBMXG4gICAgY29uc3QgcHJvdmlkZXJJZCA9IG9wdGlvbnMucHJvdmlkZXJJZCB8fCB0aGlzLmZpbmRUcmFuc2xhdGlvblByb3ZpZGVyKClcblxuICAgIGlmICghcHJvdmlkZXJJZCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIGVycm9yOiAn5rKh5pyJ5Y+v55So55qE57+76K+RIFByb3ZpZGVyJyxcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBwcm92aWRlciA9IHRoaXMucHJvdmlkZXJzLmdldChwcm92aWRlcklkKVxuICAgIGlmICghcHJvdmlkZXIgfHwgIXByb3ZpZGVyLnRyYW5zbGF0ZSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIGVycm9yOiBgUHJvdmlkZXIgJHtwcm92aWRlcklkfSDkuI3mlK/mjIHnv7vor5FgLFxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIOajgOafpemAn+eOh+mZkOWItlxuICAgIGNvbnN0IHJhdGVMaW1pdGVyID0gdGhpcy5yYXRlTGltaXRlcnMuZ2V0KHByb3ZpZGVySWQpXG4gICAgaWYgKHJhdGVMaW1pdGVyKSB7XG4gICAgICBhd2FpdCByYXRlTGltaXRlci53YWl0Rm9yU2xvdCgpXG4gICAgICByYXRlTGltaXRlci5zdGFydFJlcXVlc3QoKVxuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwcm92aWRlci50cmFuc2xhdGUodGV4dCwgb3B0aW9ucylcblxuICAgICAgaWYgKHJhdGVMaW1pdGVyKSB7XG4gICAgICAgIHJhdGVMaW1pdGVyLmVuZFJlcXVlc3QodGV4dC5sZW5ndGgpXG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXN1bHRcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgaWYgKHJhdGVMaW1pdGVyKSB7XG4gICAgICAgIHJhdGVMaW1pdGVyLmVuZFJlcXVlc3QoMClcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICfnv7vor5HlpLHotKUnLFxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDkvb/nlKggQUkg6L+b6KGM57+76K+R77yI6YCa6L+H6KGl5YWoIEFQSe+8iVxuICAgKi9cbiAgYXN5bmMgdHJhbnNsYXRlV2l0aEFJKFxuICAgIHRleHQ6IHN0cmluZyxcbiAgICBvcHRpb25zOiBUcmFuc2xhdGlvbk9wdGlvbnMgJiB7IHByb3ZpZGVySWQ/OiBzdHJpbmcgfVxuICApOiBQcm9taXNlPFRyYW5zbGF0aW9uUmVzdWx0PiB7XG4gICAgY29uc3QgYmFzZVByb21wdCA9IGDkvaDmmK/kuIDkuKrkuJPkuJrnmoTnv7vor5HkuJPlrrbjgILor7flsIbku6XkuIvmlofmnKznv7vor5HmiJAke29wdGlvbnMudGFyZ2V0TGFuZ3VhZ2V944CCXG7opoHmsYLvvJpcbjEuIOS/neaMgeWOn+aWh+eahOivreawlOWSjOmjjuagvFxuMi4g56Gu5L+d57+76K+R5YeG56Gu44CB5rWB55WF44CB6Ieq54S2XG4zLiDlj6rovpPlh7rnv7vor5Hnu5PmnpzvvIzkuI3opoHmt7vliqDku7vkvZXop6Pph4rmiJbms6jph4pcbiR7b3B0aW9ucy5wcmVzZXJ2ZUZvcm1hdHRpbmcgPyAnNC4g5L+d5oyB5Y6f5paH55qE5qC85byP77yI5q616JC944CB5YiX6KGo562J77yJJyA6ICcnfWBcblxuICAgIGNvbnN0IHN5c3RlbVByb21wdCA9IG9wdGlvbnMuc3lzdGVtUHJvbXB0XG4gICAgICA/IG9wdGlvbnMuc3lzdGVtUHJvbXB0XG4gICAgICA6IG9wdGlvbnMuaW5zdHJ1Y3Rpb25cbiAgICAgID8gYCR7YmFzZVByb21wdH1cblxu6ZmE5Yqg6KaB5rGC77yaXG4ke29wdGlvbnMuaW5zdHJ1Y3Rpb259YFxuICAgICAgOiBiYXNlUHJvbXB0XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuY29tcGxldGUoXG4gICAgICBbeyByb2xlOiAndXNlcicsIGNvbnRlbnQ6IHRleHQgfV0sXG4gICAgICB7XG4gICAgICAgIHN5c3RlbVByb21wdCxcbiAgICAgICAgcHJvdmlkZXJJZDogb3B0aW9ucy5wcm92aWRlcklkLFxuICAgICAgICB0ZW1wZXJhdHVyZTogMC4zLFxuICAgICAgfVxuICAgIClcblxuICAgIGlmIChyZXNwb25zZS5zdWNjZXNzICYmIHJlc3BvbnNlLmNvbnRlbnQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIHRyYW5zbGF0ZWRUZXh0OiByZXNwb25zZS5jb250ZW50LFxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgIGVycm9yOiByZXNwb25zZS5lcnJvciB8fCAn57+76K+R5aSx6LSlJyxcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog5Yib5bu6IFByb3ZpZGVyIOWunuS+i1xuICAgKi9cbiAgcHJpdmF0ZSBjcmVhdGVQcm92aWRlcihjb25maWc6IFByb3ZpZGVyQ29uZmlnKTogSVByb3ZpZGVyIHwgbnVsbCB7XG4gICAgc3dpdGNoIChjb25maWcudHlwZSkge1xuICAgICAgY2FzZSAnYW50aHJvcGljJzpcbiAgICAgICAgcmV0dXJuIG5ldyBBbnRocm9waWNQcm92aWRlcih7XG4gICAgICAgICAgYXBpS2V5OiBjb25maWcuYXBpS2V5LFxuICAgICAgICAgIGJhc2VVcmw6IGNvbmZpZy5iYXNlVXJsLFxuICAgICAgICAgIGRlZmF1bHRNb2RlbDogY29uZmlnLmRlZmF1bHRNb2RlbCxcbiAgICAgICAgfSlcblxuICAgICAgY2FzZSAnb3BlbmFpJzpcbiAgICAgICAgcmV0dXJuIG5ldyBPcGVuQUlQcm92aWRlcih7XG4gICAgICAgICAgYXBpS2V5OiBjb25maWcuYXBpS2V5LFxuICAgICAgICAgIGJhc2VVcmw6IGNvbmZpZy5iYXNlVXJsLFxuICAgICAgICAgIGRlZmF1bHRNb2RlbDogY29uZmlnLmRlZmF1bHRNb2RlbCxcbiAgICAgICAgfSlcblxuICAgICAgY2FzZSAnb3BlbmFpLWNvbXBhdGlibGUnOlxuICAgICAgICByZXR1cm4gbmV3IE9wZW5BSUNvbXBhdGlibGVQcm92aWRlcih7XG4gICAgICAgICAgYXBpS2V5OiBjb25maWcuYXBpS2V5LFxuICAgICAgICAgIGJhc2VVcmw6IGNvbmZpZy5iYXNlVXJsLFxuICAgICAgICAgIG5hbWU6IGNvbmZpZy5uYW1lLFxuICAgICAgICAgIGRlZmF1bHRNb2RlbDogY29uZmlnLmRlZmF1bHRNb2RlbCxcbiAgICAgICAgICBtb2RlbHM6IGNvbmZpZy5tb2RlbHMsXG4gICAgICAgIH0pXG5cbiAgICAgIGNhc2UgJ2RlZXBsJzpcbiAgICAgICAgcmV0dXJuIG5ldyBEZWVwTFByb3ZpZGVyKHtcbiAgICAgICAgICBhcGlLZXk6IGNvbmZpZy5hcGlLZXksXG4gICAgICAgICAgdXNlRnJlZUFwaTogY29uZmlnLmJhc2VVcmw/LmluY2x1ZGVzKCdhcGktZnJlZScpLFxuICAgICAgICB9KVxuXG4gICAgICBjYXNlICdnb29nbGUnOlxuICAgICAgICAvLyBUT0RPOiDlrp7njrAgR29vZ2xlIEdlbWluaSBQcm92aWRlclxuICAgICAgICBjb25zb2xlLndhcm4oJ0dvb2dsZSBHZW1pbmkgUHJvdmlkZXIg5bCa5pyq5a6e546wJylcbiAgICAgICAgcmV0dXJuIG51bGxcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgY29uc29sZS53YXJuKGDmnKrnn6XnmoQgUHJvdmlkZXIg57G75Z6LOiAke2NvbmZpZy50eXBlfWApXG4gICAgICAgIHJldHVybiBudWxsXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOafpeaJvue/u+ivkSBQcm92aWRlclxuICAgKi9cbiAgcHJpdmF0ZSBmaW5kVHJhbnNsYXRpb25Qcm92aWRlcigpOiBzdHJpbmcgfCBudWxsIHtcbiAgICAvLyDkvJjlhYjkvb/nlKggRGVlcExcbiAgICBmb3IgKGNvbnN0IFtpZCwgcHJvdmlkZXJdIG9mIHRoaXMucHJvdmlkZXJzKSB7XG4gICAgICBpZiAocHJvdmlkZXIudHlwZSA9PT0gJ2RlZXBsJykge1xuICAgICAgICByZXR1cm4gaWRcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyDlhbbmrKHkvb/nlKjku7vkvZXmlK/mjIHnv7vor5HnmoQgUHJvdmlkZXJcbiAgICBmb3IgKGNvbnN0IFtpZCwgcHJvdmlkZXJdIG9mIHRoaXMucHJvdmlkZXJzKSB7XG4gICAgICBpZiAocHJvdmlkZXIudHJhbnNsYXRlKSB7XG4gICAgICAgIHJldHVybiBpZFxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIOacgOWQjuS9v+eUqOm7mOiupCBQcm92aWRlcu+8iOmAmui/hyBBSSDnv7vor5HvvIlcbiAgICByZXR1cm4gdGhpcy5kZWZhdWx0UHJvdmlkZXJJZFxuICB9XG5cbiAgLyoqXG4gICAqIOW4pumHjeivleeahOaJp+ihjFxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBleGVjdXRlV2l0aFJldHJ5PFQ+KFxuICAgIGZuOiAoKSA9PiBQcm9taXNlPFQ+LFxuICAgIG1heFJldHJpZXM6IG51bWJlclxuICApOiBQcm9taXNlPFQ+IHtcbiAgICBsZXQgbGFzdEVycm9yOiBFcnJvciB8IG51bGwgPSBudWxsXG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG1heFJldHJpZXM7IGkrKykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IGZuKClcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGxhc3RFcnJvciA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvciA6IG5ldyBFcnJvcihTdHJpbmcoZXJyb3IpKVxuXG4gICAgICAgIC8vIOaMh+aVsOmAgOmBv1xuICAgICAgICBpZiAoaSA8IG1heFJldHJpZXMgLSAxKSB7XG4gICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgTWF0aC5wb3coMiwgaSkgKiAxMDAwKSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHRocm93IGxhc3RFcnJvciB8fCBuZXcgRXJyb3IoJ+mHjeivleWksei0pScpXG4gIH1cbn1cblxuLyoqXG4gKiDliJvlu7ogUHJvdmlkZXIg566h55CG5ZmoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQcm92aWRlck1hbmFnZXIoY29uZmlnOiBQcm92aWRlck1hbmFnZXJDb25maWcpOiBQcm92aWRlck1hbmFnZXIge1xuICByZXR1cm4gbmV3IFByb3ZpZGVyTWFuYWdlcihjb25maWcpXG59XG4iXX0=