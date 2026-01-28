"use strict";
/**
 * @doc2book/providers
 * AI API Provider 管理模块
 *
 * 支持的 Provider：
 * - Anthropic (Claude)
 * - OpenAI (GPT)
 * - Google (Gemini)
 * - DeepL (翻译)
 * - OpenAI 兼容端点
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = exports.createProviderManager = exports.ProviderManager = exports.DeepLProvider = exports.OpenAICompatibleProvider = exports.OpenAIProvider = exports.AnthropicProvider = void 0;
// Provider 实现
var anthropic_1 = require("./providers/anthropic");
Object.defineProperty(exports, "AnthropicProvider", { enumerable: true, get: function () { return anthropic_1.AnthropicProvider; } });
var openai_1 = require("./providers/openai");
Object.defineProperty(exports, "OpenAIProvider", { enumerable: true, get: function () { return openai_1.OpenAIProvider; } });
var openai_compatible_1 = require("./providers/openai-compatible");
Object.defineProperty(exports, "OpenAICompatibleProvider", { enumerable: true, get: function () { return openai_compatible_1.OpenAICompatibleProvider; } });
var deepl_1 = require("./providers/deepl");
Object.defineProperty(exports, "DeepLProvider", { enumerable: true, get: function () { return deepl_1.DeepLProvider; } });
// Provider 管理器
var manager_1 = require("./manager");
Object.defineProperty(exports, "ProviderManager", { enumerable: true, get: function () { return manager_1.ProviderManager; } });
Object.defineProperty(exports, "createProviderManager", { enumerable: true, get: function () { return manager_1.createProviderManager; } });
// 速率限制
var rate_limiter_1 = require("./rate-limiter");
Object.defineProperty(exports, "RateLimiter", { enumerable: true, get: function () { return rate_limiter_1.RateLimiter; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7O0dBVUc7OztBQUVILGNBQWM7QUFDZCxtREFBeUQ7QUFBaEQsOEdBQUEsaUJBQWlCLE9BQUE7QUFDMUIsNkNBQW1EO0FBQTFDLHdHQUFBLGNBQWMsT0FBQTtBQUN2QixtRUFBd0U7QUFBL0QsNkhBQUEsd0JBQXdCLE9BQUE7QUFDakMsMkNBQWlEO0FBQXhDLHNHQUFBLGFBQWEsT0FBQTtBQUV0QixlQUFlO0FBQ2YscUNBQWtFO0FBQXpELDBHQUFBLGVBQWUsT0FBQTtBQUFFLGdIQUFBLHFCQUFxQixPQUFBO0FBRS9DLE9BQU87QUFDUCwrQ0FBNEM7QUFBbkMsMkdBQUEsV0FBVyxPQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZG9jMmJvb2svcHJvdmlkZXJzXG4gKiBBSSBBUEkgUHJvdmlkZXIg566h55CG5qih5Z2XXG4gKlxuICog5pSv5oyB55qEIFByb3ZpZGVy77yaXG4gKiAtIEFudGhyb3BpYyAoQ2xhdWRlKVxuICogLSBPcGVuQUkgKEdQVClcbiAqIC0gR29vZ2xlIChHZW1pbmkpXG4gKiAtIERlZXBMICjnv7vor5EpXG4gKiAtIE9wZW5BSSDlhbzlrrnnq6/ngrlcbiAqL1xuXG4vLyBQcm92aWRlciDlrp7njrBcbmV4cG9ydCB7IEFudGhyb3BpY1Byb3ZpZGVyIH0gZnJvbSAnLi9wcm92aWRlcnMvYW50aHJvcGljJ1xuZXhwb3J0IHsgT3BlbkFJUHJvdmlkZXIgfSBmcm9tICcuL3Byb3ZpZGVycy9vcGVuYWknXG5leHBvcnQgeyBPcGVuQUlDb21wYXRpYmxlUHJvdmlkZXIgfSBmcm9tICcuL3Byb3ZpZGVycy9vcGVuYWktY29tcGF0aWJsZSdcbmV4cG9ydCB7IERlZXBMUHJvdmlkZXIgfSBmcm9tICcuL3Byb3ZpZGVycy9kZWVwbCdcblxuLy8gUHJvdmlkZXIg566h55CG5ZmoXG5leHBvcnQgeyBQcm92aWRlck1hbmFnZXIsIGNyZWF0ZVByb3ZpZGVyTWFuYWdlciB9IGZyb20gJy4vbWFuYWdlcidcblxuLy8g6YCf546H6ZmQ5Yi2XG5leHBvcnQgeyBSYXRlTGltaXRlciB9IGZyb20gJy4vcmF0ZS1saW1pdGVyJ1xuXG4vLyDnsbvlnotcbmV4cG9ydCB0eXBlIHtcbiAgSVByb3ZpZGVyLFxuICBQcm92aWRlck1lc3NhZ2UsXG4gIFByb3ZpZGVyUmVzcG9uc2UsXG4gIENvbXBsZXRpb25PcHRpb25zLFxuICBUcmFuc2xhdGlvbk9wdGlvbnMsXG4gIFRyYW5zbGF0aW9uUmVzdWx0LFxufSBmcm9tICcuL3R5cGVzJ1xuIl19