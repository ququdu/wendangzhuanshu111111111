"use strict";
/**
 * DeepL 翻译 Provider
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepLProvider = void 0;
/**
 * DeepL 支持的语言
 */
const DEEPL_LANGUAGES = {
    zh: 'ZH',
    en: 'EN',
    de: 'DE',
    fr: 'FR',
    es: 'ES',
    pt: 'PT',
    it: 'IT',
    nl: 'NL',
    pl: 'PL',
    ru: 'RU',
    ja: 'JA',
    ko: 'KO',
};
/**
 * DeepL Provider 实现
 */
class DeepLProvider {
    type = 'deepl';
    name = 'DeepL Translator';
    apiKey;
    baseUrl;
    constructor(config) {
        this.apiKey = config.apiKey;
        this.baseUrl = config.useFreeApi
            ? 'https://api-free.deepl.com/v2'
            : 'https://api.deepl.com/v2';
    }
    /**
     * 检查 Provider 是否可用
     */
    async isAvailable() {
        try {
            const response = await fetch(`${this.baseUrl}/usage`, {
                headers: {
                    Authorization: `DeepL-Auth-Key ${this.apiKey}`,
                },
            });
            return response.ok;
        }
        catch (error) {
            console.error('DeepL Provider 不可用:', error);
            return false;
        }
    }
    /**
     * 获取可用模型列表（DeepL 不使用模型概念）
     */
    async getModels() {
        return ['deepl-translate'];
    }
    /**
     * 发送补全请求（DeepL 不支持，返回错误）
     */
    async complete(messages, options) {
        return {
            success: false,
            error: 'DeepL 不支持文本补全，请使用 translate 方法',
        };
    }
    /**
     * 翻译文本
     */
    async translate(text, options) {
        try {
            // 转换语言代码
            const targetLang = DEEPL_LANGUAGES[options.targetLanguage] || options.targetLanguage.toUpperCase();
            const sourceLang = options.sourceLanguage
                ? DEEPL_LANGUAGES[options.sourceLanguage] || options.sourceLanguage.toUpperCase()
                : undefined;
            // 构建请求参数
            const params = new URLSearchParams({
                text,
                target_lang: targetLang,
            });
            if (sourceLang) {
                params.append('source_lang', sourceLang);
            }
            if (options.preserveFormatting) {
                params.append('preserve_formatting', '1');
            }
            if (options.formality && options.formality !== 'default') {
                params.append('formality', options.formality);
            }
            // 发送请求
            const response = await fetch(`${this.baseUrl}/translate`, {
                method: 'POST',
                headers: {
                    Authorization: `DeepL-Auth-Key ${this.apiKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString(),
            });
            if (!response.ok) {
                const errorText = await response.text();
                return {
                    success: false,
                    error: `DeepL API 错误: ${response.status} - ${errorText}`,
                };
            }
            const data = await response.json();
            const translation = data.translations?.[0];
            if (!translation) {
                return {
                    success: false,
                    error: '翻译结果为空',
                };
            }
            return {
                success: true,
                translatedText: translation.text,
                detectedSourceLanguage: translation.detected_source_language?.toLowerCase(),
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '翻译失败',
            };
        }
    }
    /**
     * 获取使用量信息
     */
    async getUsage() {
        try {
            const response = await fetch(`${this.baseUrl}/usage`, {
                headers: {
                    Authorization: `DeepL-Auth-Key ${this.apiKey}`,
                },
            });
            if (!response.ok) {
                return null;
            }
            const data = await response.json();
            return {
                characterCount: data.character_count,
                characterLimit: data.character_limit,
            };
        }
        catch (error) {
            return null;
        }
    }
    /**
     * 获取支持的语言列表
     */
    async getSupportedLanguages() {
        try {
            const response = await fetch(`${this.baseUrl}/languages`, {
                headers: {
                    Authorization: `DeepL-Auth-Key ${this.apiKey}`,
                },
            });
            if (!response.ok) {
                return [];
            }
            const data = await response.json();
            return data.map((lang) => ({
                code: lang.language.toLowerCase(),
                name: lang.name,
            }));
        }
        catch (error) {
            return [];
        }
    }
}
exports.DeepLProvider = DeepLProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVlcGwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcHJvdmlkZXJzL2RlZXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7R0FFRzs7O0FBc0JIOztHQUVHO0FBQ0gsTUFBTSxlQUFlLEdBQTJCO0lBQzlDLEVBQUUsRUFBRSxJQUFJO0lBQ1IsRUFBRSxFQUFFLElBQUk7SUFDUixFQUFFLEVBQUUsSUFBSTtJQUNSLEVBQUUsRUFBRSxJQUFJO0lBQ1IsRUFBRSxFQUFFLElBQUk7SUFDUixFQUFFLEVBQUUsSUFBSTtJQUNSLEVBQUUsRUFBRSxJQUFJO0lBQ1IsRUFBRSxFQUFFLElBQUk7SUFDUixFQUFFLEVBQUUsSUFBSTtJQUNSLEVBQUUsRUFBRSxJQUFJO0lBQ1IsRUFBRSxFQUFFLElBQUk7SUFDUixFQUFFLEVBQUUsSUFBSTtDQUNULENBQUE7QUFFRDs7R0FFRztBQUNILE1BQWEsYUFBYTtJQUN4QixJQUFJLEdBQWlCLE9BQU8sQ0FBQTtJQUM1QixJQUFJLEdBQUcsa0JBQWtCLENBQUE7SUFFakIsTUFBTSxDQUFRO0lBQ2QsT0FBTyxDQUFRO0lBRXZCLFlBQVksTUFBMkI7UUFDckMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFBO1FBQzNCLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLFVBQVU7WUFDOUIsQ0FBQyxDQUFDLCtCQUErQjtZQUNqQyxDQUFDLENBQUMsMEJBQTBCLENBQUE7SUFDaEMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFdBQVc7UUFDZixJQUFJLENBQUM7WUFDSCxNQUFNLFFBQVEsR0FBRyxNQUFNLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLFFBQVEsRUFBRTtnQkFDcEQsT0FBTyxFQUFFO29CQUNQLGFBQWEsRUFBRSxrQkFBa0IsSUFBSSxDQUFDLE1BQU0sRUFBRTtpQkFDL0M7YUFDRixDQUFDLENBQUE7WUFDRixPQUFPLFFBQVEsQ0FB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QUFDLENBQUE7WUFFRixJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNqQixPQUFPLEVBQUUsQ0FBQTtZQUNYLENBQUM7WUFFRCxNQUFNLElBQUksR0FBRyxNQUFNLFFBQVEsQ0FBQyxJQUFJLEVBQStDLENBQUE7WUFDL0UsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUN6QixJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUU7Z0JBQ2pDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTthQUNoQixDQUFDLENBQUMsQ0FBQTtRQUNMLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxFQUFFLENBQUE7UUFDWCxDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBMUtELHNDQTBLQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogRGVlcEwg57+76K+RIFByb3ZpZGVyXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBQcm92aWRlclR5cGUgfSBmcm9tICdAZG9jMmJvb2svc2hhcmVkJ1xuaW1wb3J0IHR5cGUge1xuICBJUHJvdmlkZXIsXG4gIFByb3ZpZGVyTWVzc2FnZSxcbiAgUHJvdmlkZXJSZXNwb25zZSxcbiAgQ29tcGxldGlvbk9wdGlvbnMsXG4gIFRyYW5zbGF0aW9uT3B0aW9ucyxcbiAgVHJhbnNsYXRpb25SZXN1bHQsXG59IGZyb20gJy4uL3R5cGVzJ1xuXG4vKipcbiAqIERlZXBMIFByb3ZpZGVyIOmFjee9rlxuICovXG5leHBvcnQgaW50ZXJmYWNlIERlZXBMUHJvdmlkZXJDb25maWcge1xuICAvKiogQVBJIOWvhumSpSAqL1xuICBhcGlLZXk6IHN0cmluZ1xuICAvKiog5piv5ZCm5L2/55So5YWN6LS554mIIEFQSSAqL1xuICB1c2VGcmVlQXBpPzogYm9vbGVhblxufVxuXG4vKipcbiAqIERlZXBMIOaUr+aMgeeahOivreiogFxuICovXG5jb25zdCBERUVQTF9MQU5HVUFHRVM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIHpoOiAnWkgnLFxuICBlbjogJ0VOJyxcbiAgZGU6ICdERScsXG4gIGZyOiAnRlInLFxuICBlczogJ0VTJyxcbiAgcHQ6ICdQVCcsXG4gIGl0OiAnSVQnLFxuICBubDogJ05MJyxcbiAgcGw6ICdQTCcsXG4gIHJ1OiAnUlUnLFxuICBqYTogJ0pBJyxcbiAga286ICdLTycsXG59XG5cbi8qKlxuICogRGVlcEwgUHJvdmlkZXIg5a6e546wXG4gKi9cbmV4cG9ydCBjbGFzcyBEZWVwTFByb3ZpZGVyIGltcGxlbWVudHMgSVByb3ZpZGVyIHtcbiAgdHlwZTogUHJvdmlkZXJUeXBlID0gJ2RlZXBsJ1xuICBuYW1lID0gJ0RlZXBMIFRyYW5zbGF0b3InXG5cbiAgcHJpdmF0ZSBhcGlLZXk6IHN0cmluZ1xuICBwcml2YXRlIGJhc2VVcmw6IHN0cmluZ1xuXG4gIGNvbnN0cnVjdG9yKGNvbmZpZzogRGVlcExQcm92aWRlckNvbmZpZykge1xuICAgIHRoaXMuYXBpS2V5ID0gY29uZmlnLmFwaUtleVxuICAgIHRoaXMuYmFzZVVybCA9IGNvbmZpZy51c2VGcmVlQXBpXG4gICAgICA/ICdodHRwczovL2FwaS1mcmVlLmRlZXBsLmNvbS92MidcbiAgICAgIDogJ2h0dHBzOi8vYXBpLmRlZXBsLmNvbS92MidcbiAgfVxuXG4gIC8qKlxuICAgKiDmo4Dmn6UgUHJvdmlkZXIg5piv5ZCm5Y+v55SoXG4gICAqL1xuICBhc3luYyBpc0F2YWlsYWJsZSgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHt0aGlzLmJhc2VVcmx9L3VzYWdlYCwge1xuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgQXV0aG9yaXphdGlvbjogYERlZXBMLUF1dGgtS2V5ICR7dGhpcy5hcGlLZXl9YCxcbiAgICAgICAgfSxcbiAgICAgIH0pXG4gICAgICByZXR1cm4gcmVzcG9uc2Uub2tcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignRGVlcEwgUHJvdmlkZXIg5LiN5Y+v55SoOicsIGVycm9yKVxuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPluWPr+eUqOaooeWei+WIl+ihqO+8iERlZXBMIOS4jeS9v+eUqOaooeWei+amguW/te+8iVxuICAgKi9cbiAgYXN5bmMgZ2V0TW9kZWxzKCk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICByZXR1cm4gWydkZWVwbC10cmFuc2xhdGUnXVxuICB9XG5cbiAgLyoqXG4gICAqIOWPkemAgeihpeWFqOivt+axgu+8iERlZXBMIOS4jeaUr+aMge+8jOi/lOWbnumUmeivr++8iVxuICAgKi9cbiAgYXN5bmMgY29tcGxldGUoXG4gICAgbWVzc2FnZXM6IFByb3ZpZGVyTWVzc2FnZVtdLFxuICAgIG9wdGlvbnM/OiBDb21wbGV0aW9uT3B0aW9uc1xuICApOiBQcm9taXNlPFByb3ZpZGVyUmVzcG9uc2U+IHtcbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICBlcnJvcjogJ0RlZXBMIOS4jeaUr+aMgeaWh+acrOihpeWFqO+8jOivt+S9v+eUqCB0cmFuc2xhdGUg5pa55rOVJyxcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog57+76K+R5paH5pysXG4gICAqL1xuICBhc3luYyB0cmFuc2xhdGUodGV4dDogc3RyaW5nLCBvcHRpb25zOiBUcmFuc2xhdGlvbk9wdGlvbnMpOiBQcm9taXNlPFRyYW5zbGF0aW9uUmVzdWx0PiB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIOi9rOaNouivreiogOS7o+eggVxuICAgICAgY29uc3QgdGFyZ2V0TGFuZyA9IERFRVBMX0xBTkdVQUdFU1tvcHRpb25zLnRhcmdldExhbmd1YWdlXSB8fCBvcHRpb25zLnRhcmdldExhbmd1YWdlLnRvVXBwZXJDYXNlKClcbiAgICAgIGNvbnN0IHNvdXJjZUxhbmcgPSBvcHRpb25zLnNvdXJjZUxhbmd1YWdlXG4gICAgICAgID8gREVFUExfTEFOR1VBR0VTW29wdGlvbnMuc291cmNlTGFuZ3VhZ2VdIHx8IG9wdGlvbnMuc291cmNlTGFuZ3VhZ2UudG9VcHBlckNhc2UoKVxuICAgICAgICA6IHVuZGVmaW5lZFxuXG4gICAgICAvLyDmnoTlu7ror7fmsYLlj4LmlbBcbiAgICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoe1xuICAgICAgICB0ZXh0LFxuICAgICAgICB0YXJnZXRfbGFuZzogdGFyZ2V0TGFuZyxcbiAgICAgIH0pXG5cbiAgICAgIGlmIChzb3VyY2VMYW5nKSB7XG4gICAgICAgIHBhcmFtcy5hcHBlbmQoJ3NvdXJjZV9sYW5nJywgc291cmNlTGFuZylcbiAgICAgIH1cblxuICAgICAgaWYgKG9wdGlvbnMucHJlc2VydmVGb3JtYXR0aW5nKSB7XG4gICAgICAgIHBhcmFtcy5hcHBlbmQoJ3ByZXNlcnZlX2Zvcm1hdHRpbmcnLCAnMScpXG4gICAgICB9XG5cbiAgICAgIGlmIChvcHRpb25zLmZvcm1hbGl0eSAmJiBvcHRpb25zLmZvcm1hbGl0eSAhPT0gJ2RlZmF1bHQnKSB7XG4gICAgICAgIHBhcmFtcy5hcHBlbmQoJ2Zvcm1hbGl0eScsIG9wdGlvbnMuZm9ybWFsaXR5KVxuICAgICAgfVxuXG4gICAgICAvLyDlj5HpgIHor7fmsYJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7dGhpcy5iYXNlVXJsfS90cmFuc2xhdGVgLCB7XG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgQXV0aG9yaXphdGlvbjogYERlZXBMLUF1dGgtS2V5ICR7dGhpcy5hcGlLZXl9YCxcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcsXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IHBhcmFtcy50b1N0cmluZygpLFxuICAgICAgfSlcblxuICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICBjb25zdCBlcnJvclRleHQgPSBhd2FpdCByZXNwb25zZS50ZXh0KClcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBlcnJvcjogYERlZXBMIEFQSSDplJnor686ICR7cmVzcG9uc2Uuc3RhdHVzfSAtICR7ZXJyb3JUZXh0fWAsXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKSBhcyB7IHRyYW5zbGF0aW9ucz86IEFycmF5PHsgdGV4dDogc3RyaW5nOyBkZXRlY3RlZF9zb3VyY2VfbGFuZ3VhZ2U/OiBzdHJpbmcgfT4gfVxuICAgICAgY29uc3QgdHJhbnNsYXRpb24gPSBkYXRhLnRyYW5zbGF0aW9ucz8uWzBdXG5cbiAgICAgIGlmICghdHJhbnNsYXRpb24pIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBlcnJvcjogJ+e/u+ivkee7k+aenOS4uuepuicsXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgdHJhbnNsYXRlZFRleHQ6IHRyYW5zbGF0aW9uLnRleHQsXG4gICAgICAgIGRldGVjdGVkU291cmNlTGFuZ3VhZ2U6IHRyYW5zbGF0aW9uLmRldGVjdGVkX3NvdXJjZV9sYW5ndWFnZT8udG9Mb3dlckNhc2UoKSxcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICfnv7vor5HlpLHotKUnLFxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDojrflj5bkvb/nlKjph4/kv6Hmga9cbiAgICovXG4gIGFzeW5jIGdldFVzYWdlKCk6IFByb21pc2U8eyBjaGFyYWN0ZXJDb3VudDogbnVtYmVyOyBjaGFyYWN0ZXJMaW1pdDogbnVtYmVyIH0gfCBudWxsPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7dGhpcy5iYXNlVXJsfS91c2FnZWAsIHtcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIEF1dGhvcml6YXRpb246IGBEZWVwTC1BdXRoLUtleSAke3RoaXMuYXBpS2V5fWAsXG4gICAgICAgIH0sXG4gICAgICB9KVxuXG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgIHJldHVybiBudWxsXG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCkgYXMgeyBjaGFyYWN0ZXJfY291bnQ6IG51bWJlcjsgY2hhcmFjdGVyX2xpbWl0OiBudW1iZXIgfVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY2hhcmFjdGVyQ291bnQ6IGRhdGEuY2hhcmFjdGVyX2NvdW50LFxuICAgICAgICBjaGFyYWN0ZXJMaW1pdDogZGF0YS5jaGFyYWN0ZXJfbGltaXQsXG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJldHVybiBudWxsXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPluaUr+aMgeeahOivreiogOWIl+ihqFxuICAgKi9cbiAgYXN5bmMgZ2V0U3VwcG9ydGVkTGFuZ3VhZ2VzKCk6IFByb21pc2U8QXJyYXk8eyBjb2RlOiBzdHJpbmc7IG5hbWU6IHN0cmluZyB9Pj4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke3RoaXMuYmFzZVVybH0vbGFuZ3VhZ2VzYCwge1xuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgQXV0aG9yaXphdGlvbjogYERlZXBMLUF1dGgtS2V5ICR7dGhpcy5hcGlLZXl9YCxcbiAgICAgICAgfSxcbiAgICAgIH0pXG5cbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgcmV0dXJuIFtdXG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCkgYXMgQXJyYXk8eyBsYW5ndWFnZTogc3RyaW5nOyBuYW1lOiBzdHJpbmcgfT5cbiAgICAgIHJldHVybiBkYXRhLm1hcCgobGFuZykgPT4gKHtcbiAgICAgICAgY29kZTogbGFuZy5sYW5ndWFnZS50b0xvd2VyQ2FzZSgpLFxuICAgICAgICBuYW1lOiBsYW5nLm5hbWUsXG4gICAgICB9KSlcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIFtdXG4gICAgfVxuICB9XG59XG4iXX0=