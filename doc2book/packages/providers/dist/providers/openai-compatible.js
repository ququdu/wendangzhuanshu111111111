"use strict";
/**
 * OpenAI 兼容 Provider
 * 支持任何兼容 OpenAI API 的服务
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAICompatibleProvider = void 0;
const openai_1 = __importDefault(require("openai"));
/**
 * OpenAI 兼容 Provider 实现
 */
class OpenAICompatibleProvider {
    type = 'openai-compatible';
    name;
    client;
    defaultModel;
    availableModels;
    constructor(config) {
        this.client = new openai_1.default({
            apiKey: config.apiKey,
            baseURL: config.baseUrl,
        });
        this.name = config.name || 'OpenAI Compatible';
        this.defaultModel = config.defaultModel || 'gpt-3.5-turbo';
        this.availableModels = config.models || [this.defaultModel];
    }
    /**
     * 检查 Provider 是否可用
     */
    async isAvailable() {
        try {
            // 尝试发送一个简单的请求
            await this.client.chat.completions.create({
                model: this.defaultModel,
                messages: [{ role: 'user', content: 'Hi' }],
                max_tokens: 10,
            });
            return true;
        }
        catch (error) {
            console.error(`${this.name} Provider 不可用:`, error);
            return false;
        }
    }
    /**
     * 获取可用模型列表
     */
    async getModels() {
        try {
            const response = await this.client.models.list();
            return response.data.map((model) => model.id);
        }
        catch (error) {
            // 返回配置的模型列表
            return this.availableModels;
        }
    }
    /**
     * 发送补全请求
     */
    async complete(messages, options) {
        const startTime = Date.now();
        try {
            // 构建消息列表
            const openaiMessages = [];
            // 添加系统消息
            if (options?.systemPrompt) {
                openaiMessages.push({
                    role: 'system',
                    content: options.systemPrompt,
                });
            }
            // 添加用户消息
            for (const msg of messages) {
                openaiMessages.push({
                    role: msg.role,
                    content: msg.content,
                });
            }
            // 发送请求
            const response = await this.client.chat.completions.create({
                model: options?.model || this.defaultModel,
                messages: openaiMessages,
                max_tokens: options?.maxTokens,
                temperature: options?.temperature,
                top_p: options?.topP,
                stop: options?.stopSequences,
            });
            const choice = response.choices[0];
            const content = choice?.message?.content || '';
            return {
                success: true,
                content,
                usage: response.usage
                    ? {
                        promptTokens: response.usage.prompt_tokens,
                        completionTokens: response.usage.completion_tokens,
                        totalTokens: response.usage.total_tokens,
                    }
                    : undefined,
                model: response.model,
                responseTime: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '请求失败',
                responseTime: Date.now() - startTime,
            };
        }
    }
}
exports.OpenAICompatibleProvider = OpenAICompatibleProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlbmFpLWNvbXBhdGlibGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcHJvdmlkZXJzL29wZW5haS1jb21wYXRpYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7Ozs7OztBQUVILG9EQUEyQjtBQXlCM0I7O0dBRUc7QUFDSCxNQUFhLHdCQUF3QjtJQUNuQyxJQUFJLEdBQWlCLG1CQUFtQixDQUFBO0lBQ3hDLElBQUksQ0FBUTtJQUVKLE1BQU0sQ0FBUTtJQUNkLFlBQVksQ0FBUTtJQUNwQixlQUFlLENBQVU7SUFFakMsWUFBWSxNQUFzQztRQUNoRCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksZ0JBQU0sQ0FBQztZQUN2QixNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU07WUFDckIsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPO1NBQ3hCLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksSUFBSSxtQkFBbUIsQ0FBQTtRQUM5QyxJQUFJLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxZQUFZLElBQUksZUFBZSxDQUFBO1FBQzFELElBQUksQ0FBQyxlQUFlLEdBQUcsTUFBTSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUM3RCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsV0FBVztRQUNmLElBQUksQ0FBQztZQUNILGNBQWM7WUFDZCxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUM7Z0JBQ3hDLEtBQUssRUFBRSxJQUFJLENBQUMsWUFBWTtnQkFDeEIsUUFBUSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQztnQkFDM0MsVUFBVSxFQUFFLEVBQUU7YUFDZixDQUFDLENBQUE7WUFDRixPQUFPLElBQUksQ0FB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QUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNO2dCQUN0RCxZQUFZLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLFNBQVM7YUFDckMsQ0FBQTtRQUNILENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUFoSEQsNERBZ0hDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBPcGVuQUkg5YW85a65IFByb3ZpZGVyXG4gKiDmlK/mjIHku7vkvZXlhbzlrrkgT3BlbkFJIEFQSSDnmoTmnI3liqFcbiAqL1xuXG5pbXBvcnQgT3BlbkFJIGZyb20gJ29wZW5haSdcbmltcG9ydCB0eXBlIHsgUHJvdmlkZXJUeXBlIH0gZnJvbSAnQGRvYzJib29rL3NoYXJlZCdcbmltcG9ydCB0eXBlIHtcbiAgSVByb3ZpZGVyLFxuICBQcm92aWRlck1lc3NhZ2UsXG4gIFByb3ZpZGVyUmVzcG9uc2UsXG4gIENvbXBsZXRpb25PcHRpb25zLFxufSBmcm9tICcuLi90eXBlcydcblxuLyoqXG4gKiBPcGVuQUkg5YW85a65IFByb3ZpZGVyIOmFjee9rlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE9wZW5BSUNvbXBhdGlibGVQcm92aWRlckNvbmZpZyB7XG4gIC8qKiBBUEkg5a+G6ZKlICovXG4gIGFwaUtleTogc3RyaW5nXG4gIC8qKiBBUEkg5Z+656GAIFVSTCAqL1xuICBiYXNlVXJsOiBzdHJpbmdcbiAgLyoqIFByb3ZpZGVyIOWQjeensCAqL1xuICBuYW1lPzogc3RyaW5nXG4gIC8qKiDpu5jorqTmqKHlnosgKi9cbiAgZGVmYXVsdE1vZGVsPzogc3RyaW5nXG4gIC8qKiDlj6/nlKjmqKHlnovliJfooaggKi9cbiAgbW9kZWxzPzogc3RyaW5nW11cbn1cblxuLyoqXG4gKiBPcGVuQUkg5YW85a65IFByb3ZpZGVyIOWunueOsFxuICovXG5leHBvcnQgY2xhc3MgT3BlbkFJQ29tcGF0aWJsZVByb3ZpZGVyIGltcGxlbWVudHMgSVByb3ZpZGVyIHtcbiAgdHlwZTogUHJvdmlkZXJUeXBlID0gJ29wZW5haS1jb21wYXRpYmxlJ1xuICBuYW1lOiBzdHJpbmdcblxuICBwcml2YXRlIGNsaWVudDogT3BlbkFJXG4gIHByaXZhdGUgZGVmYXVsdE1vZGVsOiBzdHJpbmdcbiAgcHJpdmF0ZSBhdmFpbGFibGVNb2RlbHM6IHN0cmluZ1tdXG5cbiAgY29uc3RydWN0b3IoY29uZmlnOiBPcGVuQUlDb21wYXRpYmxlUHJvdmlkZXJDb25maWcpIHtcbiAgICB0aGlzLmNsaWVudCA9IG5ldyBPcGVuQUkoe1xuICAgICAgYXBpS2V5OiBjb25maWcuYXBpS2V5LFxuICAgICAgYmFzZVVSTDogY29uZmlnLmJhc2VVcmwsXG4gICAgfSlcbiAgICB0aGlzLm5hbWUgPSBjb25maWcubmFtZSB8fCAnT3BlbkFJIENvbXBhdGlibGUnXG4gICAgdGhpcy5kZWZhdWx0TW9kZWwgPSBjb25maWcuZGVmYXVsdE1vZGVsIHx8ICdncHQtMy41LXR1cmJvJ1xuICAgIHRoaXMuYXZhaWxhYmxlTW9kZWxzID0gY29uZmlnLm1vZGVscyB8fCBbdGhpcy5kZWZhdWx0TW9kZWxdXG4gIH1cblxuICAvKipcbiAgICog5qOA5p+lIFByb3ZpZGVyIOaYr+WQpuWPr+eUqFxuICAgKi9cbiAgYXN5bmMgaXNBdmFpbGFibGUoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIOWwneivleWPkemAgeS4gOS4queugOWNleeahOivt+axglxuICAgICAgYXdhaXQgdGhpcy5jbGllbnQuY2hhdC5jb21wbGV0aW9ucy5jcmVhdGUoe1xuICAgICAgICBtb2RlbDogdGhpcy5kZWZhdWx0TW9kZWwsXG4gICAgICAgIG1lc3NhZ2VzOiBbeyByb2xlOiAndXNlcicsIGNvbnRlbnQ6ICdIaScgfV0sXG4gICAgICAgIG1heF90b2tlbnM6IDEwLFxuICAgICAgfSlcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYCR7dGhpcy5uYW1lfSBQcm92aWRlciDkuI3lj6/nlKg6YCwgZXJyb3IpXG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog6I635Y+W5Y+v55So5qih5Z6L5YiX6KGoXG4gICAqL1xuICBhc3luYyBnZXRNb2RlbHMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuY2xpZW50Lm1vZGVscy5saXN0KClcbiAgICAgIHJldHVybiByZXNwb25zZS5kYXRhLm1hcCgobW9kZWwpID0+IG1vZGVsLmlkKVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAvLyDov5Tlm57phY3nva7nmoTmqKHlnovliJfooahcbiAgICAgIHJldHVybiB0aGlzLmF2YWlsYWJsZU1vZGVsc1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDlj5HpgIHooaXlhajor7fmsYJcbiAgICovXG4gIGFzeW5jIGNvbXBsZXRlKFxuICAgIG1lc3NhZ2VzOiBQcm92aWRlck1lc3NhZ2VbXSxcbiAgICBvcHRpb25zPzogQ29tcGxldGlvbk9wdGlvbnNcbiAgKTogUHJvbWlzZTxQcm92aWRlclJlc3BvbnNlPiB7XG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKVxuXG4gICAgdHJ5IHtcbiAgICAgIC8vIOaehOW7uua2iOaBr+WIl+ihqFxuICAgICAgY29uc3Qgb3BlbmFpTWVzc2FnZXM6IE9wZW5BSS5DaGF0LkNoYXRDb21wbGV0aW9uTWVzc2FnZVBhcmFtW10gPSBbXVxuXG4gICAgICAvLyDmt7vliqDns7vnu5/mtojmga9cbiAgICAgIGlmIChvcHRpb25zPy5zeXN0ZW1Qcm9tcHQpIHtcbiAgICAgICAgb3BlbmFpTWVzc2FnZXMucHVzaCh7XG4gICAgICAgICAgcm9sZTogJ3N5c3RlbScsXG4gICAgICAgICAgY29udGVudDogb3B0aW9ucy5zeXN0ZW1Qcm9tcHQsXG4gICAgICAgIH0pXG4gICAgICB9XG5cbiAgICAgIC8vIOa3u+WKoOeUqOaIt+a2iOaBr1xuICAgICAgZm9yIChjb25zdCBtc2cgb2YgbWVzc2FnZXMpIHtcbiAgICAgICAgb3BlbmFpTWVzc2FnZXMucHVzaCh7XG4gICAgICAgICAgcm9sZTogbXNnLnJvbGUsXG4gICAgICAgICAgY29udGVudDogbXNnLmNvbnRlbnQsXG4gICAgICAgIH0pXG4gICAgICB9XG5cbiAgICAgIC8vIOWPkemAgeivt+axglxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmNsaWVudC5jaGF0LmNvbXBsZXRpb25zLmNyZWF0ZSh7XG4gICAgICAgIG1vZGVsOiBvcHRpb25zPy5tb2RlbCB8fCB0aGlzLmRlZmF1bHRNb2RlbCxcbiAgICAgICAgbWVzc2FnZXM6IG9wZW5haU1lc3NhZ2VzLFxuICAgICAgICBtYXhfdG9rZW5zOiBvcHRpb25zPy5tYXhUb2tlbnMsXG4gICAgICAgIHRlbXBlcmF0dXJlOiBvcHRpb25zPy50ZW1wZXJhdHVyZSxcbiAgICAgICAgdG9wX3A6IG9wdGlvbnM/LnRvcFAsXG4gICAgICAgIHN0b3A6IG9wdGlvbnM/LnN0b3BTZXF1ZW5jZXMsXG4gICAgICB9KVxuXG4gICAgICBjb25zdCBjaG9pY2UgPSByZXNwb25zZS5jaG9pY2VzWzBdXG4gICAgICBjb25zdCBjb250ZW50ID0gY2hvaWNlPy5tZXNzYWdlPy5jb250ZW50IHx8ICcnXG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIGNvbnRlbnQsXG4gICAgICAgIHVzYWdlOiByZXNwb25zZS51c2FnZVxuICAgICAgICAgID8ge1xuICAgICAgICAgICAgICBwcm9tcHRUb2tlbnM6IHJlc3BvbnNlLnVzYWdlLnByb21wdF90b2tlbnMsXG4gICAgICAgICAgICAgIGNvbXBsZXRpb25Ub2tlbnM6IHJlc3BvbnNlLnVzYWdlLmNvbXBsZXRpb25fdG9rZW5zLFxuICAgICAgICAgICAgICB0b3RhbFRva2VuczogcmVzcG9uc2UudXNhZ2UudG90YWxfdG9rZW5zLFxuICAgICAgICAgICAgfVxuICAgICAgICAgIDogdW5kZWZpbmVkLFxuICAgICAgICBtb2RlbDogcmVzcG9uc2UubW9kZWwsXG4gICAgICAgIHJlc3BvbnNlVGltZTogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSxcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICfor7fmsYLlpLHotKUnLFxuICAgICAgICByZXNwb25zZVRpbWU6IERhdGUubm93KCkgLSBzdGFydFRpbWUsXG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iXX0=