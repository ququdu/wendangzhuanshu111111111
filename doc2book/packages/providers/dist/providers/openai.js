"use strict";
/**
 * OpenAI Provider
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const openai_1 = __importDefault(require("openai"));
/**
 * OpenAI Provider 实现
 */
class OpenAIProvider {
    type = 'openai';
    name = 'OpenAI GPT';
    client;
    defaultModel;
    constructor(config) {
        this.client = new openai_1.default({
            apiKey: config.apiKey,
            baseURL: config.baseUrl,
            organization: config.organization,
        });
        this.defaultModel = config.defaultModel || 'gpt-4-turbo-preview';
    }
    /**
     * 检查 Provider 是否可用
     */
    async isAvailable() {
        try {
            await this.client.models.list();
            return true;
        }
        catch (error) {
            console.error('OpenAI Provider 不可用:', error);
            return false;
        }
    }
    /**
     * 获取可用模型列表
     */
    async getModels() {
        try {
            const response = await this.client.models.list();
            return response.data
                .filter((model) => model.id.startsWith('gpt'))
                .map((model) => model.id)
                .sort();
        }
        catch (error) {
            // 返回默认模型列表
            return [
                'gpt-4-turbo-preview',
                'gpt-4-0125-preview',
                'gpt-4-1106-preview',
                'gpt-4',
                'gpt-3.5-turbo',
                'gpt-3.5-turbo-16k',
            ];
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
exports.OpenAIProvider = OpenAIProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlbmFpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3Byb3ZpZGVycy9vcGVuYWkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOzs7Ozs7QUFFSCxvREFBMkI7QUFtQjNCOztHQUVHO0FBQ0gsTUFBYSxjQUFjO0lBQ3pCLElBQUksR0FBaUIsUUFBUSxDQUFBO0lBQzdCLElBQUksR0FBRyxZQUFZLENBQUE7SUFFWCxNQUFNLENBQVE7SUFDZCxZQUFZLENBQVE7SUFFNUIsWUFBWSxNQUE0QjtRQUN0QyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksZ0JBQU0sQ0FBQztZQUN2QixNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU07WUFDckIsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPO1lBQ3ZCLFlBQVksRUFBRSxNQUFNLENBQUMsWUFBWTtTQUNsQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxZQUFZLElBQUkscUJBQXFCLENBQUE7SUFDbEUsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFdBQVc7UUFDZixJQUFJLENBQUM7WUFDSCxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFBO1lBQy9CLE9BQU8sSUFBSSxDQUFBO1FBQ2IsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQzVDLE9BQU8sS0FBSyxDQUFBO1FBQ2QsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxTQUFTO1FBQ2IsSUFBSSxDQUFDO1lBQ0gsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUNoRCxPQUFPLFFBQVEsQ0FBQyxJQUFJO2lCQUNqQixNQUFNLENBQUMs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ZXNDb250ZW50IjpbIi8qKlxuICogT3BlbkFJIFByb3ZpZGVyXG4gKi9cblxuaW1wb3J0IE9wZW5BSSBmcm9tICdvcGVuYWknXG5pbXBvcnQgdHlwZSB7IFByb3ZpZGVyVHlwZSB9IGZyb20gJ0Bkb2MyYm9vay9zaGFyZWQnXG5pbXBvcnQgdHlwZSB7XG4gIElQcm92aWRlcixcbiAgUHJvdmlkZXJNZXNzYWdlLFxuICBQcm92aWRlclJlc3BvbnNlLFxuICBDb21wbGV0aW9uT3B0aW9ucyxcbn0gZnJvbSAnLi4vdHlwZXMnXG5cbi8qKlxuICogT3BlbkFJIFByb3ZpZGVyIOmFjee9rlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE9wZW5BSVByb3ZpZGVyQ29uZmlnIHtcbiAgYXBpS2V5OiBzdHJpbmdcbiAgYmFzZVVybD86IHN0cmluZ1xuICBvcmdhbml6YXRpb24/OiBzdHJpbmdcbiAgZGVmYXVsdE1vZGVsPzogc3RyaW5nXG59XG5cbi8qKlxuICogT3BlbkFJIFByb3ZpZGVyIOWunueOsFxuICovXG5leHBvcnQgY2xhc3MgT3BlbkFJUHJvdmlkZXIgaW1wbGVtZW50cyBJUHJvdmlkZXIge1xuICB0eXBlOiBQcm92aWRlclR5cGUgPSAnb3BlbmFpJ1xuICBuYW1lID0gJ09wZW5BSSBHUFQnXG5cbiAgcHJpdmF0ZSBjbGllbnQ6IE9wZW5BSVxuICBwcml2YXRlIGRlZmF1bHRNb2RlbDogc3RyaW5nXG5cbiAgY29uc3RydWN0b3IoY29uZmlnOiBPcGVuQUlQcm92aWRlckNvbmZpZykge1xuICAgIHRoaXMuY2xpZW50ID0gbmV3IE9wZW5BSSh7XG4gICAgICBhcGlLZXk6IGNvbmZpZy5hcGlLZXksXG4gICAgICBiYXNlVVJMOiBjb25maWcuYmFzZVVybCxcbiAgICAgIG9yZ2FuaXphdGlvbjogY29uZmlnLm9yZ2FuaXphdGlvbixcbiAgICB9KVxuICAgIHRoaXMuZGVmYXVsdE1vZGVsID0gY29uZmlnLmRlZmF1bHRNb2RlbCB8fCAnZ3B0LTQtdHVyYm8tcHJldmlldydcbiAgfVxuXG4gIC8qKlxuICAgKiDmo4Dmn6UgUHJvdmlkZXIg5piv5ZCm5Y+v55SoXG4gICAqL1xuICBhc3luYyBpc0F2YWlsYWJsZSgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5jbGllbnQubW9kZWxzLmxpc3QoKVxuICAgICAgcmV0dXJuIHRydWVcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignT3BlbkFJIFByb3ZpZGVyIOS4jeWPr+eUqDonLCBlcnJvcilcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDojrflj5blj6/nlKjmqKHlnovliJfooahcbiAgICovXG4gIGFzeW5jIGdldE1vZGVscygpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5jbGllbnQubW9kZWxzLmxpc3QoKVxuICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGFcbiAgICAgICAgLmZpbHRlcigobW9kZWwpID0+IG1vZGVsLmlkLnN0YXJ0c1dpdGgoJ2dwdCcpKVxuICAgICAgICAubWFwKChtb2RlbCkgPT4gbW9kZWwuaWQpXG4gICAgICAgIC5zb3J0KClcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgLy8g6L+U5Zue6buY6K6k5qih5Z6L5YiX6KGoXG4gICAgICByZXR1cm4gW1xuICAgICAgICAnZ3B0LTQtdHVyYm8tcHJldmlldycsXG4gICAgICAgICdncHQtNC0wMTI1LXByZXZpZXcnLFxuICAgICAgICAnZ3B0LTQtMTEwNi1wcmV2aWV3JyxcbiAgICAgICAgJ2dwdC00JyxcbiAgICAgICAgJ2dwdC0zLjUtdHVyYm8nLFxuICAgICAgICAnZ3B0LTMuNS10dXJiby0xNmsnLFxuICAgICAgXVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDlj5HpgIHooaXlhajor7fmsYJcbiAgICovXG4gIGFzeW5jIGNvbXBsZXRlKFxuICAgIG1lc3NhZ2VzOiBQcm92aWRlck1lc3NhZ2VbXSxcbiAgICBvcHRpb25zPzogQ29tcGxldGlvbk9wdGlvbnNcbiAgKTogUHJvbWlzZTxQcm92aWRlclJlc3BvbnNlPiB7XG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKVxuXG4gICAgdHJ5IHtcbiAgICAgIC8vIOaehOW7uua2iOaBr+WIl+ihqFxuICAgICAgY29uc3Qgb3BlbmFpTWVzc2FnZXM6IE9wZW5BSS5DaGF0LkNoYXRDb21wbGV0aW9uTWVzc2FnZVBhcmFtW10gPSBbXVxuXG4gICAgICAvLyDmt7vliqDns7vnu5/mtojmga9cbiAgICAgIGlmIChvcHRpb25zPy5zeXN0ZW1Qcm9tcHQpIHtcbiAgICAgICAgb3BlbmFpTWVzc2FnZXMucHVzaCh7XG4gICAgICAgICAgcm9sZTogJ3N5c3RlbScsXG4gICAgICAgICAgY29udGVudDogb3B0aW9ucy5zeXN0ZW1Qcm9tcHQsXG4gICAgICAgIH0pXG4gICAgICB9XG5cbiAgICAgIC8vIOa3u+WKoOeUqOaIt+a2iOaBr1xuICAgICAgZm9yIChjb25zdCBtc2cgb2YgbWVzc2FnZXMpIHtcbiAgICAgICAgb3BlbmFpTWVzc2FnZXMucHVzaCh7XG4gICAgICAgICAgcm9sZTogbXNnLnJvbGUsXG4gICAgICAgICAgY29udGVudDogbXNnLmNvbnRlbnQsXG4gICAgICAgIH0pXG4gICAgICB9XG5cbiAgICAgIC8vIOWPkemAgeivt+axglxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmNsaWVudC5jaGF0LmNvbXBsZXRpb25zLmNyZWF0ZSh7XG4gICAgICAgIG1vZGVsOiBvcHRpb25zPy5tb2RlbCB8fCB0aGlzLmRlZmF1bHRNb2RlbCxcbiAgICAgICAgbWVzc2FnZXM6IG9wZW5haU1lc3NhZ2VzLFxuICAgICAgICBtYXhfdG9rZW5zOiBvcHRpb25zPy5tYXhUb2tlbnMsXG4gICAgICAgIHRlbXBlcmF0dXJlOiBvcHRpb25zPy50ZW1wZXJhdHVyZSxcbiAgICAgICAgdG9wX3A6IG9wdGlvbnM/LnRvcFAsXG4gICAgICAgIHN0b3A6IG9wdGlvbnM/LnN0b3BTZXF1ZW5jZXMsXG4gICAgICB9KVxuXG4gICAgICBjb25zdCBjaG9pY2UgPSByZXNwb25zZS5jaG9pY2VzWzBdXG4gICAgICBjb25zdCBjb250ZW50ID0gY2hvaWNlPy5tZXNzYWdlPy5jb250ZW50IHx8ICcnXG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIGNvbnRlbnQsXG4gICAgICAgIHVzYWdlOiByZXNwb25zZS51c2FnZVxuICAgICAgICAgID8ge1xuICAgICAgICAgICAgICBwcm9tcHRUb2tlbnM6IHJlc3BvbnNlLnVzYWdlLnByb21wdF90b2tlbnMsXG4gICAgICAgICAgICAgIGNvbXBsZXRpb25Ub2tlbnM6IHJlc3BvbnNlLnVzYWdlLmNvbXBsZXRpb25fdG9rZW5zLFxuICAgICAgICAgICAgICB0b3RhbFRva2VuczogcmVzcG9uc2UudXNhZ2UudG90YWxfdG9rZW5zLFxuICAgICAgICAgICAgfVxuICAgICAgICAgIDogdW5kZWZpbmVkLFxuICAgICAgICBtb2RlbDogcmVzcG9uc2UubW9kZWwsXG4gICAgICAgIHJlc3BvbnNlVGltZTogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSxcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICfor7fmsYLlpLHotKUnLFxuICAgICAgICByZXNwb25zZVRpbWU6IERhdGUubm93KCkgLSBzdGFydFRpbWUsXG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iXX0=