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
        const systemPrompt = `你是一个专业的翻译专家。请将以下文本翻译成${options.targetLanguage}。
要求：
1. 保持原文的语气和风格
2. 确保翻译准确、流畅、自然
3. 只输出翻译结果，不要添加任何解释或注释
${options.preserveFormatting ? '4. 保持原文的格式（段落、列表等）' : ''}`;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9tYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7OztBQW9XSCxzREFFQztBQTFWRCxxREFBeUQ7QUFDekQsK0NBQW1EO0FBQ25ELHFFQUF3RTtBQUN4RSw2Q0FBaUQ7QUFDakQsaURBQTRDO0FBRTVDOztHQUVHO0FBQ0gsTUFBYSxlQUFlO0lBQ2xCLFNBQVMsR0FBMkIsSUFBSSxHQUFHLEVBQUUsQ0FBQTtJQUM3QyxZQUFZLEdBQTZCLElBQUksR0FBRyxFQUFFLENBQUE7SUFDbEQsZUFBZSxHQUFnQyxJQUFJLEdBQUcsRUFBRSxDQUFBO0lBQ3hELGlCQUFpQixDQUFRO0lBQ3pCLGFBQWEsQ0FBVTtJQUN2QixhQUFhLENBQVE7SUFDckIsT0FBTyxDQUFRO0lBRXZCLFlBQVksTUFBNkI7UUFDdkMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxlQUFlLENBQUE7UUFDL0MsSUFBSSxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUMsYUFBYSxJQUFJLEVBQUUsQ0FBQTtRQUMvQyxJQUFJLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQyxhQUFhLElBQUksQ0FBQyxDQUFBO1FBQzlDLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUE7UUFFdEMsaUJBQWlCO1FBQ2pCLEtBQUssTUFBTSxjQUFjLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzlDLElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUMzQixJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1lBQ2xDLENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsV0FBVyxDQUFDLE1BQXNCO1FBQ2hDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDNUMs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b0JBQ3ZCLE1BQU0sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQTtnQkFDNUUsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO1FBRUQsTUFBTSxTQUFTLElBQUksSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDdEMsQ0FBQztDQUNGO0FBMVVELDBDQTBVQztBQUVEOztHQUVHO0FBQ0gsU0FBZ0IscUJBQXFCLENBQUMsTUFBNkI7SUFDakUsT0FBTyxJQUFJLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtBQUNwQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBQcm92aWRlciDnrqHnkIblmahcbiAqIOe7n+S4gOeuoeeQhuWkmuS4qiBBSSBQcm92aWRlcu+8jOaUr+aMgeaVhemanOi9rOenu+WSjOi0n+i9veWdh+ihoVxuICovXG5cbmltcG9ydCB0eXBlIHsgUHJvdmlkZXJDb25maWcsIFByb3ZpZGVyTWFuYWdlckNvbmZpZywgUHJvdmlkZXJUeXBlIH0gZnJvbSAnQGRvYzJib29rL3NoYXJlZCdcbmltcG9ydCB0eXBlIHtcbiAgSVByb3ZpZGVyLFxuICBQcm92aWRlck1lc3NhZ2UsXG4gIFByb3ZpZGVyUmVzcG9uc2UsXG4gIENvbXBsZXRpb25PcHRpb25zLFxuICBQcm92aWRlclN0YXR1cyxcbiAgVHJhbnNsYXRpb25PcHRpb25zLFxuICBUcmFuc2xhdGlvblJlc3VsdCxcbn0gZnJvbSAnLi90eXBlcydcbmltcG9ydCB7IEFudGhyb3BpY1Byb3ZpZGVyIH0gZnJvbSAnLi9wcm92aWRlcnMvYW50aHJvcGljJ1xuaW1wb3J0IHsgT3BlbkFJUHJvdmlkZXIgfSBmcm9tICcuL3Byb3ZpZGVycy9vcGVuYWknXG5pbXBvcnQgeyBPcGVuQUlDb21wYXRpYmxlUHJvdmlkZXIgfSBmcm9tICcuL3Byb3ZpZGVycy9vcGVuYWktY29tcGF0aWJsZSdcbmltcG9ydCB7IERlZXBMUHJvdmlkZXIgfSBmcm9tICcuL3Byb3ZpZGVycy9kZWVwbCdcbmltcG9ydCB7IFJhdGVMaW1pdGVyIH0gZnJvbSAnLi9yYXRlLWxpbWl0ZXInXG5cbi8qKlxuICogUHJvdmlkZXIg566h55CG5Zmo57G7XG4gKi9cbmV4cG9ydCBjbGFzcyBQcm92aWRlck1hbmFnZXIge1xuICBwcml2YXRlIHByb3ZpZGVyczogTWFwPHN0cmluZywgSVByb3ZpZGVyPiA9IG5ldyBNYXAoKVxuICBwcml2YXRlIHJhdGVMaW1pdGVyczogTWFwPHN0cmluZywgUmF0ZUxpbWl0ZXI+ID0gbmV3IE1hcCgpXG4gIHByaXZhdGUgcHJvdmlkZXJDb25maWdzOiBNYXA8c3RyaW5nLCBQcm92aWRlckNvbmZpZz4gPSBuZXcgTWFwKClcbiAgcHJpdmF0ZSBkZWZhdWx0UHJvdmlkZXJJZDogc3RyaW5nXG4gIHByaXZhdGUgZmFsbGJhY2tDaGFpbjogc3RyaW5nW11cbiAgcHJpdmF0ZSByZXRyeUF0dGVtcHRzOiBudW1iZXJcbiAgcHJpdmF0ZSB0aW1lb3V0OiBudW1iZXJcblxuICBjb25zdHJ1Y3Rvcihjb25maWc6IFByb3ZpZGVyTWFuYWdlckNvbmZpZykge1xuICAgIHRoaXMuZGVmYXVsdFByb3ZpZGVySWQgPSBjb25maWcuZGVmYXVsdFByb3ZpZGVyXG4gICAgdGhpcy5mYWxsYmFja0NoYWluID0gY29uZmlnLmZhbGxiYWNrQ2hhaW4gfHwgW11cbiAgICB0aGlzLnJldHJ5QXR0ZW1wdHMgPSBjb25maWcucmV0cnlBdHRlbXB0cyB8fCAzXG4gICAgdGhpcy50aW1lb3V0ID0gY29uZmlnLnRpbWVvdXQgfHwgMzAwMDBcblxuICAgIC8vIOWIneWni+WMluaJgOaciSBQcm92aWRlclxuICAgIGZvciAoY29uc3QgcHJvdmlkZXJDb25maWcgb2YgY29uZmlnLnByb3ZpZGVycykge1xuICAgICAgaWYgKHByb3ZpZGVyQ29uZmlnLmVuYWJsZWQpIHtcbiAgICAgICAgdGhpcy5hZGRQcm92aWRlcihwcm92aWRlckNvbmZpZylcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog5re75YqgIFByb3ZpZGVyXG4gICAqL1xuICBhZGRQcm92aWRlcihjb25maWc6IFByb3ZpZGVyQ29uZmlnKTogdm9pZCB7XG4gICAgY29uc3QgcHJvdmlkZXIgPSB0aGlzLmNyZWF0ZVByb3ZpZGVyKGNvbmZpZylcbiAgICBpZiAocHJvdmlkZXIpIHtcbiAgICAgIHRoaXMucHJvdmlkZXJzLnNldChjb25maWcuaWQsIHByb3ZpZGVyKVxuICAgICAgdGhpcy5wcm92aWRlckNvbmZpZ3Muc2V0KGNvbmZpZy5pZCwgY29uZmlnKVxuXG4gICAgICAvLyDliJvlu7rpgJ/njofpmZDliLblmahcbiAgICAgIGlmIChjb25maWcucmF0ZUxpbWl0KSB7XG4gICAgICAgIHRoaXMucmF0ZUxpbWl0ZXJzLnNldChcbiAgICAgICAgICBjb25maWcuaWQsXG4gICAgICAgICAgbmV3IFJhdGVMaW1pdGVyKHtcbiAgICAgICAgICAgIHJlcXVlc3RzUGVyTWludXRlOiBjb25maWcucmF0ZUxpbWl0LnJlcXVlc3RzUGVyTWludXRlLFxuICAgICAgICAgICAgdG9rZW5zUGVyTWludXRlOiBjb25maWcucmF0ZUxpbWl0LnRva2Vuc1Blck1pbnV0ZSxcbiAgICAgICAgICB9KVxuICAgICAgICApXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOenu+mZpCBQcm92aWRlclxuICAgKi9cbiAgcmVtb3ZlUHJvdmlkZXIoaWQ6IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMucHJvdmlkZXJzLmRlbGV0ZShpZClcbiAgICB0aGlzLnByb3ZpZGVyQ29uZmlncy5kZWxldGUoaWQpXG4gICAgdGhpcy5yYXRlTGltaXRlcnMuZGVsZXRlKGlkKVxuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPliBQcm92aWRlclxuICAgKi9cbiAgZ2V0UHJvdmlkZXIoaWQ6IHN0cmluZyk6IElQcm92aWRlciB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMucHJvdmlkZXJzLmdldChpZClcbiAgfVxuXG4gIC8qKlxuICAgKiDojrflj5bmiYDmnIkgUHJvdmlkZXIg54q25oCBXG4gICAqL1xuICBhc3luYyBnZXRQcm92aWRlclN0YXR1c2VzKCk6IFByb21pc2U8UHJvdmlkZXJTdGF0dXNbXT4ge1xuICAgIGNvbnN0IHN0YXR1c2VzOiBQcm92aWRlclN0YXR1c1tdID0gW11cblxuICAgIGZvciAoY29uc3QgW2lkLCBwcm92aWRlcl0gb2YgdGhpcy5wcm92aWRlcnMpIHtcbiAgICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KClcbiAgICAgIGxldCBhdmFpbGFibGUgPSBmYWxzZVxuICAgICAgbGV0IGVycm9yOiBzdHJpbmcgfCB1bmRlZmluZWRcblxuICAgICAgdHJ5IHtcbiAgICAgICAgYXZhaWxhYmxlID0gYXdhaXQgUHJvbWlzZS5yYWNlKFtcbiAgICAgICAgICBwcm92aWRlci5pc0F2YWlsYWJsZSgpLFxuICAgICAgICAgIG5ldyBQcm9taXNlPGJvb2xlYW4+KChfLCByZWplY3QpID0+XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHJlamVjdChuZXcgRXJyb3IoJ+i2heaXticpKSwgNTAwMClcbiAgICAgICAgICApLFxuICAgICAgICBdKVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBlcnJvciA9IGUgaW5zdGFuY2VvZiBFcnJvciA/IGUubWVzc2FnZSA6ICfmo4Dmn6XlpLHotKUnXG4gICAgICB9XG5cbiAgICAgIHN0YXR1c2VzLnB1c2goe1xuICAgICAgICBpZCxcbiAgICAgICAgbmFtZTogcHJvdmlkZXIubmFtZSxcbiAgICAgICAgYXZhaWxhYmxlLFxuICAgICAgICBsYXRlbmN5OiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxuICAgICAgICBsYXN0Q2hlY2s6IG5ldyBEYXRlKCksXG4gICAgICAgIGVycm9yLFxuICAgICAgfSlcbiAgICB9XG5cbiAgICByZXR1cm4gc3RhdHVzZXNcbiAgfVxuXG4gIC8qKlxuICAgKiDlj5HpgIHooaXlhajor7fmsYJcbiAgICovXG4gIGFzeW5jIGNvbXBsZXRlKFxuICAgIG1lc3NhZ2VzOiBQcm92aWRlck1lc3NhZ2VbXSxcbiAgICBvcHRpb25zPzogQ29tcGxldGlvbk9wdGlvbnMgJiB7IHByb3ZpZGVySWQ/OiBzdHJpbmcgfVxuICApOiBQcm9taXNlPFByb3ZpZGVyUmVzcG9uc2U+IHtcbiAgICAvLyDnoa7lrprkvb/nlKjnmoQgUHJvdmlkZXJcbiAgICBjb25zdCBwcm92aWRlcklkID0gb3B0aW9ucz8ucHJvdmlkZXJJZCB8fCB0aGlzLmRlZmF1bHRQcm92aWRlcklkXG4gICAgY29uc3QgcHJvdmlkZXJDaGFpbiA9IFtwcm92aWRlcklkLCAuLi50aGlzLmZhbGxiYWNrQ2hhaW4uZmlsdGVyKChpZCkgPT4gaWQgIT09IHByb3ZpZGVySWQpXVxuXG4gICAgLy8g5bCd6K+V5q+P5LiqIFByb3ZpZGVyXG4gICAgZm9yIChjb25zdCBpZCBvZiBwcm92aWRlckNoYWluKSB7XG4gICAgICBjb25zdCBwcm92aWRlciA9IHRoaXMucHJvdmlkZXJzLmdldChpZClcbiAgICAgIGlmICghcHJvdmlkZXIpIGNvbnRpbnVlXG5cbiAgICAgIC8vIOajgOafpemAn+eOh+mZkOWItlxuICAgICAgY29uc3QgcmF0ZUxpbWl0ZXIgPSB0aGlzLnJhdGVMaW1pdGVycy5nZXQoaWQpXG4gICAgICBpZiAocmF0ZUxpbWl0ZXIpIHtcbiAgICAgICAgYXdhaXQgcmF0ZUxpbWl0ZXIud2FpdEZvclNsb3QoKVxuICAgICAgICByYXRlTGltaXRlci5zdGFydFJlcXVlc3QoKVxuICAgICAgfVxuXG4gICAgICB0cnkge1xuICAgICAgICAvLyDlj5HpgIHor7fmsYJcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmV4ZWN1dGVXaXRoUmV0cnkoXG4gICAgICAgICAgKCkgPT4gcHJvdmlkZXIuY29tcGxldGUobWVzc2FnZXMsIG9wdGlvbnMpLFxuICAgICAgICAgIHRoaXMucmV0cnlBdHRlbXB0c1xuICAgICAgICApXG5cbiAgICAgICAgLy8g5pu05paw6YCf546H6ZmQ5Yi2XG4gICAgICAgIGlmIChyYXRlTGltaXRlciAmJiByZXNwb25zZS51c2FnZSkge1xuICAgICAgICAgIHJhdGVMaW1pdGVyLmVuZFJlcXVlc3QocmVzcG9uc2UudXNhZ2UudG90YWxUb2tlbnMpXG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVzcG9uc2Uuc3VjY2Vzcykge1xuICAgICAgICAgIHJldHVybiByZXNwb25zZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8g5aaC5p6c5aSx6LSl77yM5bCd6K+V5LiL5LiA5LiqIFByb3ZpZGVyXG4gICAgICAgIGNvbnNvbGUud2FybihgUHJvdmlkZXIgJHtpZH0g5aSx6LSlOmAsIHJlc3BvbnNlLmVycm9yKVxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgaWYgKHJhdGVMaW1pdGVyKSB7XG4gICAgICAgICAgcmF0ZUxpbWl0ZXIuZW5kUmVxdWVzdCgwKVxuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFByb3ZpZGVyICR7aWR9IOW8guW4uDpgLCBlcnJvcilcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICBlcnJvcjogJ+aJgOaciSBQcm92aWRlciDpg73lpLHotKXkuoYnLFxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDnv7vor5HmlofmnKxcbiAgICovXG4gIGFzeW5jIHRyYW5zbGF0ZShcbiAgICB0ZXh0OiBzdHJpbmcsXG4gICAgb3B0aW9uczogVHJhbnNsYXRpb25PcHRpb25zICYgeyBwcm92aWRlcklkPzogc3RyaW5nIH1cbiAgKTogUHJvbWlzZTxUcmFuc2xhdGlvblJlc3VsdD4ge1xuICAgIC8vIOS8mOWFiOS9v+eUqCBEZWVwTFxuICAgIGNvbnN0IHByb3ZpZGVySWQgPSBvcHRpb25zLnByb3ZpZGVySWQgfHwgdGhpcy5maW5kVHJhbnNsYXRpb25Qcm92aWRlcigpXG5cbiAgICBpZiAoIXByb3ZpZGVySWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICBlcnJvcjogJ+ayoeacieWPr+eUqOeahOe/u+ivkSBQcm92aWRlcicsXG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgcHJvdmlkZXIgPSB0aGlzLnByb3ZpZGVycy5nZXQocHJvdmlkZXJJZClcbiAgICBpZiAoIXByb3ZpZGVyIHx8ICFwcm92aWRlci50cmFuc2xhdGUpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICBlcnJvcjogYFByb3ZpZGVyICR7cHJvdmlkZXJJZH0g5LiN5pSv5oyB57+76K+RYCxcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyDmo4Dmn6XpgJ/njofpmZDliLZcbiAgICBjb25zdCByYXRlTGltaXRlciA9IHRoaXMucmF0ZUxpbWl0ZXJzLmdldChwcm92aWRlcklkKVxuICAgIGlmIChyYXRlTGltaXRlcikge1xuICAgICAgYXdhaXQgcmF0ZUxpbWl0ZXIud2FpdEZvclNsb3QoKVxuICAgICAgcmF0ZUxpbWl0ZXIuc3RhcnRSZXF1ZXN0KClcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcHJvdmlkZXIudHJhbnNsYXRlKHRleHQsIG9wdGlvbnMpXG5cbiAgICAgIGlmIChyYXRlTGltaXRlcikge1xuICAgICAgICByYXRlTGltaXRlci5lbmRSZXF1ZXN0KHRleHQubGVuZ3RoKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGlmIChyYXRlTGltaXRlcikge1xuICAgICAgICByYXRlTGltaXRlci5lbmRSZXF1ZXN0KDApXG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAn57+76K+R5aSx6LSlJyxcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog5L2/55SoIEFJIOi/m+ihjOe/u+ivke+8iOmAmui/h+ihpeWFqCBBUEnvvIlcbiAgICovXG4gIGFzeW5jIHRyYW5zbGF0ZVdpdGhBSShcbiAgICB0ZXh0OiBzdHJpbmcsXG4gICAgb3B0aW9uczogVHJhbnNsYXRpb25PcHRpb25zICYgeyBwcm92aWRlcklkPzogc3RyaW5nIH1cbiAgKTogUHJvbWlzZTxUcmFuc2xhdGlvblJlc3VsdD4ge1xuICAgIGNvbnN0IHN5c3RlbVByb21wdCA9IGDkvaDmmK/kuIDkuKrkuJPkuJrnmoTnv7vor5HkuJPlrrbjgILor7flsIbku6XkuIvmlofmnKznv7vor5HmiJAke29wdGlvbnMudGFyZ2V0TGFuZ3VhZ2V944CCXG7opoHmsYLvvJpcbjEuIOS/neaMgeWOn+aWh+eahOivreawlOWSjOmjjuagvFxuMi4g56Gu5L+d57+76K+R5YeG56Gu44CB5rWB55WF44CB6Ieq54S2XG4zLiDlj6rovpPlh7rnv7vor5Hnu5PmnpzvvIzkuI3opoHmt7vliqDku7vkvZXop6Pph4rmiJbms6jph4pcbiR7b3B0aW9ucy5wcmVzZXJ2ZUZvcm1hdHRpbmcgPyAnNC4g5L+d5oyB5Y6f5paH55qE5qC85byP77yI5q616JC944CB5YiX6KGo562J77yJJyA6ICcnfWBcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5jb21wbGV0ZShcbiAgICAgIFt7IHJvbGU6ICd1c2VyJywgY29udGVudDogdGV4dCB9XSxcbiAgICAgIHtcbiAgICAgICAgc3lzdGVtUHJvbXB0LFxuICAgICAgICBwcm92aWRlcklkOiBvcHRpb25zLnByb3ZpZGVySWQsXG4gICAgICAgIHRlbXBlcmF0dXJlOiAwLjMsXG4gICAgICB9XG4gICAgKVxuXG4gICAgaWYgKHJlc3BvbnNlLnN1Y2Nlc3MgJiYgcmVzcG9uc2UuY29udGVudCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgdHJhbnNsYXRlZFRleHQ6IHJlc3BvbnNlLmNvbnRlbnQsXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgZXJyb3I6IHJlc3BvbnNlLmVycm9yIHx8ICfnv7vor5HlpLHotKUnLFxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDliJvlu7ogUHJvdmlkZXIg5a6e5L6LXG4gICAqL1xuICBwcml2YXRlIGNyZWF0ZVByb3ZpZGVyKGNvbmZpZzogUHJvdmlkZXJDb25maWcpOiBJUHJvdmlkZXIgfCBudWxsIHtcbiAgICBzd2l0Y2ggKGNvbmZpZy50eXBlKSB7XG4gICAgICBjYXNlICdhbnRocm9waWMnOlxuICAgICAgICByZXR1cm4gbmV3IEFudGhyb3BpY1Byb3ZpZGVyKHtcbiAgICAgICAgICBhcGlLZXk6IGNvbmZpZy5hcGlLZXksXG4gICAgICAgICAgYmFzZVVybDogY29uZmlnLmJhc2VVcmwsXG4gICAgICAgICAgZGVmYXVsdE1vZGVsOiBjb25maWcuZGVmYXVsdE1vZGVsLFxuICAgICAgICB9KVxuXG4gICAgICBjYXNlICdvcGVuYWknOlxuICAgICAgICByZXR1cm4gbmV3IE9wZW5BSVByb3ZpZGVyKHtcbiAgICAgICAgICBhcGlLZXk6IGNvbmZpZy5hcGlLZXksXG4gICAgICAgICAgYmFzZVVybDogY29uZmlnLmJhc2VVcmwsXG4gICAgICAgICAgZGVmYXVsdE1vZGVsOiBjb25maWcuZGVmYXVsdE1vZGVsLFxuICAgICAgICB9KVxuXG4gICAgICBjYXNlICdvcGVuYWktY29tcGF0aWJsZSc6XG4gICAgICAgIHJldHVybiBuZXcgT3BlbkFJQ29tcGF0aWJsZVByb3ZpZGVyKHtcbiAgICAgICAgICBhcGlLZXk6IGNvbmZpZy5hcGlLZXksXG4gICAgICAgICAgYmFzZVVybDogY29uZmlnLmJhc2VVcmwsXG4gICAgICAgICAgbmFtZTogY29uZmlnLm5hbWUsXG4gICAgICAgICAgZGVmYXVsdE1vZGVsOiBjb25maWcuZGVmYXVsdE1vZGVsLFxuICAgICAgICAgIG1vZGVsczogY29uZmlnLm1vZGVscyxcbiAgICAgICAgfSlcblxuICAgICAgY2FzZSAnZGVlcGwnOlxuICAgICAgICByZXR1cm4gbmV3IERlZXBMUHJvdmlkZXIoe1xuICAgICAgICAgIGFwaUtleTogY29uZmlnLmFwaUtleSxcbiAgICAgICAgICB1c2VGcmVlQXBpOiBjb25maWcuYmFzZVVybD8uaW5jbHVkZXMoJ2FwaS1mcmVlJyksXG4gICAgICAgIH0pXG5cbiAgICAgIGNhc2UgJ2dvb2dsZSc6XG4gICAgICAgIC8vIFRPRE86IOWunueOsCBHb29nbGUgR2VtaW5pIFByb3ZpZGVyXG4gICAgICAgIGNvbnNvbGUud2FybignR29vZ2xlIEdlbWluaSBQcm92aWRlciDlsJrmnKrlrp7njrAnKVxuICAgICAgICByZXR1cm4gbnVsbFxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBjb25zb2xlLndhcm4oYOacquefpeeahCBQcm92aWRlciDnsbvlnos6ICR7Y29uZmlnLnR5cGV9YClcbiAgICAgICAgcmV0dXJuIG51bGxcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog5p+l5om+57+76K+RIFByb3ZpZGVyXG4gICAqL1xuICBwcml2YXRlIGZpbmRUcmFuc2xhdGlvblByb3ZpZGVyKCk6IHN0cmluZyB8IG51bGwge1xuICAgIC8vIOS8mOWFiOS9v+eUqCBEZWVwTFxuICAgIGZvciAoY29uc3QgW2lkLCBwcm92aWRlcl0gb2YgdGhpcy5wcm92aWRlcnMpIHtcbiAgICAgIGlmIChwcm92aWRlci50eXBlID09PSAnZGVlcGwnKSB7XG4gICAgICAgIHJldHVybiBpZFxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIOWFtuasoeS9v+eUqOS7u+S9leaUr+aMgee/u+ivkeeahCBQcm92aWRlclxuICAgIGZvciAoY29uc3QgW2lkLCBwcm92aWRlcl0gb2YgdGhpcy5wcm92aWRlcnMpIHtcbiAgICAgIGlmIChwcm92aWRlci50cmFuc2xhdGUpIHtcbiAgICAgICAgcmV0dXJuIGlkXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8g5pyA5ZCO5L2/55So6buY6K6kIFByb3ZpZGVy77yI6YCa6L+HIEFJIOe/u+ivke+8iVxuICAgIHJldHVybiB0aGlzLmRlZmF1bHRQcm92aWRlcklkXG4gIH1cblxuICAvKipcbiAgICog5bim6YeN6K+V55qE5omn6KGMXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVXaXRoUmV0cnk8VD4oXG4gICAgZm46ICgpID0+IFByb21pc2U8VD4sXG4gICAgbWF4UmV0cmllczogbnVtYmVyXG4gICk6IFByb21pc2U8VD4ge1xuICAgIGxldCBsYXN0RXJyb3I6IEVycm9yIHwgbnVsbCA9IG51bGxcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbWF4UmV0cmllczsgaSsrKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gYXdhaXQgZm4oKVxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgbGFzdEVycm9yID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yIDogbmV3IEVycm9yKFN0cmluZyhlcnJvcikpXG5cbiAgICAgICAgLy8g5oyH5pWw6YCA6YG/XG4gICAgICAgIGlmIChpIDwgbWF4UmV0cmllcyAtIDEpIHtcbiAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gc2V0VGltZW91dChyZXNvbHZlLCBNYXRoLnBvdygyLCBpKSAqIDEwMDApKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhyb3cgbGFzdEVycm9yIHx8IG5ldyBFcnJvcign6YeN6K+V5aSx6LSlJylcbiAgfVxufVxuXG4vKipcbiAqIOWIm+W7uiBQcm92aWRlciDnrqHnkIblmahcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVByb3ZpZGVyTWFuYWdlcihjb25maWc6IFByb3ZpZGVyTWFuYWdlckNvbmZpZyk6IFByb3ZpZGVyTWFuYWdlciB7XG4gIHJldHVybiBuZXcgUHJvdmlkZXJNYW5hZ2VyKGNvbmZpZylcbn1cbiJdfQ==