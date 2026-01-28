"use strict";
/**
 * Anthropic (Claude) Provider
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicProvider = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
/**
 * Anthropic Provider 实现
 */
class AnthropicProvider {
    type = 'anthropic';
    name = 'Anthropic Claude';
    client;
    defaultModel;
    constructor(config) {
        this.client = new sdk_1.default({
            apiKey: config.apiKey,
            baseURL: config.baseUrl,
        });
        this.defaultModel = config.defaultModel || 'claude-3-sonnet-20240229';
    }
    /**
     * 检查 Provider 是否可用
     */
    async isAvailable() {
        try {
            // 发送一个简单的请求来检查可用性
            await this.client.messages.create({
                model: this.defaultModel,
                max_tokens: 10,
                messages: [{ role: 'user', content: 'Hi' }],
            });
            return true;
        }
        catch (error) {
            console.error('Anthropic Provider 不可用:', error);
            return false;
        }
    }
    /**
     * 获取可用模型列表
     */
    async getModels() {
        // Anthropic API 目前不提供模型列表接口，返回已知模型
        return [
            'claude-3-opus-20240229',
            'claude-3-sonnet-20240229',
            'claude-3-haiku-20240307',
            'claude-2.1',
            'claude-2.0',
            'claude-instant-1.2',
        ];
    }
    /**
     * 发送补全请求
     */
    async complete(messages, options) {
        const startTime = Date.now();
        try {
            // 分离系统消息和用户消息
            const systemMessage = messages.find((m) => m.role === 'system')?.content ||
                options?.systemPrompt;
            const userMessages = messages
                .filter((m) => m.role !== 'system')
                .map((m) => ({
                role: m.role,
                content: m.content,
            }));
            // 发送请求
            const response = await this.client.messages.create({
                model: options?.model || this.defaultModel,
                max_tokens: options?.maxTokens || 4096,
                temperature: options?.temperature,
                top_p: options?.topP,
                stop_sequences: options?.stopSequences,
                system: systemMessage,
                messages: userMessages,
            });
            // 提取响应内容
            const content = response.content
                .filter((block) => block.type === 'text')
                .map((block) => block.text)
                .join('');
            return {
                success: true,
                content,
                usage: {
                    promptTokens: response.usage.input_tokens,
                    completionTokens: response.usage.output_tokens,
                    totalTokens: response.usage.input_tokens + response.usage.output_tokens,
                },
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
exports.AnthropicProvider = AnthropicProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW50aHJvcGljLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3Byb3ZpZGVycy9hbnRocm9waWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOzs7Ozs7QUFFSCw0REFBeUM7QUFrQnpDOztHQUVHO0FBQ0gsTUFBYSxpQkFBaUI7SUFDNUIsSUFBSSxHQUFpQixXQUFXLENBQUE7SUFDaEMsSUFBSSxHQUFHLGtCQUFrQixDQUFBO0lBRWpCLE1BQU0sQ0FBVztJQUNqQixZQUFZLENBQVE7SUFFNUIsWUFBWSxNQUErQjtRQUN6QyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksYUFBUyxDQUFDO1lBQzFCLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTTtZQUNyQixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU87U0FDeEIsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLFlBQVksR0FBRyxNQUFNLENBQUMsWUFBWSxJQUFJLDBCQUEwQixDQUFBO0lBQ3ZFLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxXQUFXO1FBQ2YsSUFBSSxDQUFDO1lBQ0gsa0JBQWtCO1lBQ2xCLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO2dCQUNoQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFlBQVk7Z0JBQ3hCLFVBQVUsRUFBRSxFQUFFO2dCQUNkLFFBQVEsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUM7YUFDNUMsQ0FBQyxDQUFBO1lBQ0YsT0FBTyxJQUFJLENBQUE7UUFDYixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMseUJBQXlCLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDL0MsT0FBTyxLQUFLLENBQUE7UUFDZCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFNBQVM7UUFDYixtQ0FBbUM7UUFDbkMsT0FBTztZQUNMLHdCQUF3QjtZQUN4QiwwQkFBMEI7WUFDMUIseUJBQXlCO1lBQ3pCLFlBQVk7WUFDWixZQUFZO1lBQ1osb0JBQW9CO1NBQ3JCLENBQUE7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsUUFBUSxDQUNaLFFBQTJCLEVBQzNCLE9BQTJCO1FBRTNCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUU1QixJQUFJLENBQUM7WUFDSCxjQUFjO1lBQ2QsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsRUFBRSxPQUFPO2dCQUN0RSxPQUFPLEVBQUUsWUFBWSxDQUFBO1lBRXZCLE1BQU0sWUFBWSxHQUFHLFFBQVE7aUJBQzFCLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLENBQUM7aUJBQ2xDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDWCxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQTRCO2dCQUNwQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLE9BQU87YUFDbkIsQ0FBQyxDQUFDLENBQUE7WUFFTCxPQUFPO1lBQ1AsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7Z0JBQ2pELEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSyxJQUFJLElBQUksQ0FBQyxZQUFZO2dCQUMxQyxVQUFVLEVBQUUsT0FBTyxFQUFFLFNBQVMsSUFBSSxJQUFJO2dCQUN0QyxXQUFXLEVBQUUsT0FBTyxFQUFFLFdBQVc7Z0JBQ2pDLEtBQUssRUFBRSxPQUFPLEVBQUUsSUFBSTtnQkFDcEIsY0FBYyxFQUFFLE9BQU8sRUFBRSxhQUFhO2dCQUN0QyxNQUFNLEVBQUUsYUFBYTtnQkFDckIsUUFBUSxFQUFFLFlBQVk7YUFDdkIsQ0FBQyxDQUFBO1lBRUYsU0FBUztZQUNULE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxPQUFPO2lCQUM3QixNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFDO2lCQUN4QyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFFLEtBQXdDLENBQUMsSUFBSSxDQUFDO2lCQUM5RCxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7WUFFWCxPQUFPO2dCQUNMLE9BQU8sRUFBRSxJQUFJO2dCQUNiLE9BQU87Z0JBQ1AsS0FBSyxFQUFFO29CQUNMLFlBQVksRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLFlBQVk7b0JBQ3pDLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYTtvQkFDOUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsWUFBWSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYTtpQkFDeEU7Z0JBQ0QsS0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLO2dCQUNyQixZQUFZLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLFNBQVM7YUFDckMsQ0FBQTtRQUNILENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTztnQkFDTCxPQUFPLEVBQUUsS0FBSztnQkFDZCxLQUFLLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTTtnQkFDdEQsWUFBWSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxTQUFTO2FBQ3JDLENBQUE7UUFDSCxDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBekdELDhDQXlHQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQW50aHJvcGljIChDbGF1ZGUpIFByb3ZpZGVyXG4gKi9cblxuaW1wb3J0IEFudGhyb3BpYyBmcm9tICdAYW50aHJvcGljLWFpL3NkaydcbmltcG9ydCB0eXBlIHsgUHJvdmlkZXJUeXBlIH0gZnJvbSAnQGRvYzJib29rL3NoYXJlZCdcbmltcG9ydCB0eXBlIHtcbiAgSVByb3ZpZGVyLFxuICBQcm92aWRlck1lc3NhZ2UsXG4gIFByb3ZpZGVyUmVzcG9uc2UsXG4gIENvbXBsZXRpb25PcHRpb25zLFxufSBmcm9tICcuLi90eXBlcydcblxuLyoqXG4gKiBBbnRocm9waWMgUHJvdmlkZXIg6YWN572uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQW50aHJvcGljUHJvdmlkZXJDb25maWcge1xuICBhcGlLZXk6IHN0cmluZ1xuICBiYXNlVXJsPzogc3RyaW5nXG4gIGRlZmF1bHRNb2RlbD86IHN0cmluZ1xufVxuXG4vKipcbiAqIEFudGhyb3BpYyBQcm92aWRlciDlrp7njrBcbiAqL1xuZXhwb3J0IGNsYXNzIEFudGhyb3BpY1Byb3ZpZGVyIGltcGxlbWVudHMgSVByb3ZpZGVyIHtcbiAgdHlwZTogUHJvdmlkZXJUeXBlID0gJ2FudGhyb3BpYydcbiAgbmFtZSA9ICdBbnRocm9waWMgQ2xhdWRlJ1xuXG4gIHByaXZhdGUgY2xpZW50OiBBbnRocm9waWNcbiAgcHJpdmF0ZSBkZWZhdWx0TW9kZWw6IHN0cmluZ1xuXG4gIGNvbnN0cnVjdG9yKGNvbmZpZzogQW50aHJvcGljUHJvdmlkZXJDb25maWcpIHtcbiAgICB0aGlzLmNsaWVudCA9IG5ldyBBbnRocm9waWMoe1xuICAgICAgYXBpS2V5OiBjb25maWcuYXBpS2V5LFxuICAgICAgYmFzZVVSTDogY29uZmlnLmJhc2VVcmwsXG4gICAgfSlcbiAgICB0aGlzLmRlZmF1bHRNb2RlbCA9IGNvbmZpZy5kZWZhdWx0TW9kZWwgfHwgJ2NsYXVkZS0zLXNvbm5ldC0yMDI0MDIyOSdcbiAgfVxuXG4gIC8qKlxuICAgKiDmo4Dmn6UgUHJvdmlkZXIg5piv5ZCm5Y+v55SoXG4gICAqL1xuICBhc3luYyBpc0F2YWlsYWJsZSgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICB0cnkge1xuICAgICAgLy8g5Y+R6YCB5LiA5Liq566A5Y2V55qE6K+35rGC5p2l5qOA5p+l5Y+v55So5oCnXG4gICAgICBhd2FpdCB0aGlzLmNsaWVudC5tZXNzYWdlcy5jcmVhdGUoe1xuICAgICAgICBtb2RlbDogdGhpcy5kZWZhdWx0TW9kZWwsXG4gICAgICAgIG1heF90b2tlbnM6IDEwLFxuICAgICAgICBtZXNzYWdlczogW3sgcm9sZTogJ3VzZXInLCBjb250ZW50OiAnSGknIH1dLFxuICAgICAgfSlcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0FudGhyb3BpYyBQcm92aWRlciDkuI3lj6/nlKg6JywgZXJyb3IpXG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog6I635Y+W5Y+v55So5qih5Z6L5YiX6KGoXG4gICAqL1xuICBhc3luYyBnZXRNb2RlbHMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIC8vIEFudGhyb3BpYyBBUEkg55uu5YmN5LiN5o+Q5L6b5qih5Z6L5YiX6KGo5o6l5Y+j77yM6L+U5Zue5bey55+l5qih5Z6LXG4gICAgcmV0dXJuIFtcbiAgICAgICdjbGF1ZGUtMy1vcHVzLTIwMjQwMjI5JyxcbiAgICAgICdjbGF1ZGUtMy1zb25uZXQtMjAyNDAyMjknLFxuICAgICAgJ2NsYXVkZS0zLWhhaWt1LTIwMjQwMzA3JyxcbiAgICAgICdjbGF1ZGUtMi4xJyxcbiAgICAgICdjbGF1ZGUtMi4wJyxcbiAgICAgICdjbGF1ZGUtaW5zdGFudC0xLjInLFxuICAgIF1cbiAgfVxuXG4gIC8qKlxuICAgKiDlj5HpgIHooaXlhajor7fmsYJcbiAgICovXG4gIGFzeW5jIGNvbXBsZXRlKFxuICAgIG1lc3NhZ2VzOiBQcm92aWRlck1lc3NhZ2VbXSxcbiAgICBvcHRpb25zPzogQ29tcGxldGlvbk9wdGlvbnNcbiAgKTogUHJvbWlzZTxQcm92aWRlclJlc3BvbnNlPiB7XG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKVxuXG4gICAgdHJ5IHtcbiAgICAgIC8vIOWIhuemu+ezu+e7n+a2iOaBr+WSjOeUqOaIt+a2iOaBr1xuICAgICAgY29uc3Qgc3lzdGVtTWVzc2FnZSA9IG1lc3NhZ2VzLmZpbmQoKG0pID0+IG0ucm9sZSA9PT0gJ3N5c3RlbScpPy5jb250ZW50IHx8XG4gICAgICAgIG9wdGlvbnM/LnN5c3RlbVByb21wdFxuXG4gICAgICBjb25zdCB1c2VyTWVzc2FnZXMgPSBtZXNzYWdlc1xuICAgICAgICAuZmlsdGVyKChtKSA9PiBtLnJvbGUgIT09ICdzeXN0ZW0nKVxuICAgICAgICAubWFwKChtKSA9PiAoe1xuICAgICAgICAgIHJvbGU6IG0ucm9sZSBhcyAndXNlcicgfCAnYXNzaXN0YW50JyxcbiAgICAgICAgICBjb250ZW50OiBtLmNvbnRlbnQsXG4gICAgICAgIH0pKVxuXG4gICAgICAvLyDlj5HpgIHor7fmsYJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5jbGllbnQubWVzc2FnZXMuY3JlYXRlKHtcbiAgICAgICAgbW9kZWw6IG9wdGlvbnM/Lm1vZGVsIHx8IHRoaXMuZGVmYXVsdE1vZGVsLFxuICAgICAgICBtYXhfdG9rZW5zOiBvcHRpb25zPy5tYXhUb2tlbnMgfHwgNDA5NixcbiAgICAgICAgdGVtcGVyYXR1cmU6IG9wdGlvbnM/LnRlbXBlcmF0dXJlLFxuICAgICAgICB0b3BfcDogb3B0aW9ucz8udG9wUCxcbiAgICAgICAgc3RvcF9zZXF1ZW5jZXM6IG9wdGlvbnM/LnN0b3BTZXF1ZW5jZXMsXG4gICAgICAgIHN5c3RlbTogc3lzdGVtTWVzc2FnZSxcbiAgICAgICAgbWVzc2FnZXM6IHVzZXJNZXNzYWdlcyxcbiAgICAgIH0pXG5cbiAgICAgIC8vIOaPkOWPluWTjeW6lOWGheWuuVxuICAgICAgY29uc3QgY29udGVudCA9IHJlc3BvbnNlLmNvbnRlbnRcbiAgICAgICAgLmZpbHRlcigoYmxvY2spID0+IGJsb2NrLnR5cGUgPT09ICd0ZXh0JylcbiAgICAgICAgLm1hcCgoYmxvY2spID0+IChibG9jayBhcyB7IHR5cGU6ICd0ZXh0JzsgdGV4dDogc3RyaW5nIH0pLnRleHQpXG4gICAgICAgIC5qb2luKCcnKVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICBjb250ZW50LFxuICAgICAgICB1c2FnZToge1xuICAgICAgICAgIHByb21wdFRva2VuczogcmVzcG9uc2UudXNhZ2UuaW5wdXRfdG9rZW5zLFxuICAgICAgICAgIGNvbXBsZXRpb25Ub2tlbnM6IHJlc3BvbnNlLnVzYWdlLm91dHB1dF90b2tlbnMsXG4gICAgICAgICAgdG90YWxUb2tlbnM6IHJlc3BvbnNlLnVzYWdlLmlucHV0X3Rva2VucyArIHJlc3BvbnNlLnVzYWdlLm91dHB1dF90b2tlbnMsXG4gICAgICAgIH0sXG4gICAgICAgIG1vZGVsOiByZXNwb25zZS5tb2RlbCxcbiAgICAgICAgcmVzcG9uc2VUaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ+ivt+axguWksei0pScsXG4gICAgICAgIHJlc3BvbnNlVGltZTogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSxcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiJdfQ==