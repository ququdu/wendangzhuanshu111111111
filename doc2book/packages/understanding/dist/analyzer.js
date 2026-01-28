"use strict";
/**
 * 内容分析器
 * 深度理解文档内容，提取核心信息
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentAnalyzer = void 0;
/**
 * 内容分析器类
 */
class ContentAnalyzer {
    providerManager;
    constructor(providerManager) {
        this.providerManager = providerManager;
    }
    /**
     * 分析文档内容
     */
    async analyze(ast, options) {
        const startTime = Date.now();
        try {
            // 提取文本内容
            const textContent = this.extractText(ast.content);
            if (textContent.length < 100) {
                return {
                    success: false,
                    error: '文档内容太短，无法进行有效分析',
                    analysisTime: Date.now() - startTime,
                };
            }
            // 构建分析提示
            const prompt = this.buildAnalysisPrompt(textContent, options);
            // 调用 AI 进行分析
            const response = await this.providerManager.complete([{ role: 'user', content: prompt }], {
                systemPrompt: this.getSystemPrompt(),
                providerId: options?.providerId,
                temperature: 0.3,
                maxTokens: 2000,
            });
            if (!response.success || !response.content) {
                return {
                    success: false,
                    error: response.error || '分析失败',
                    analysisTime: Date.now() - startTime,
                };
            }
            // 解析 AI 响应
            const result = this.parseAnalysisResponse(response.content);
            return {
                success: true,
                ...result,
                analysisTime: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '分析失败',
                analysisTime: Date.now() - startTime,
            };
        }
    }
    /**
     * 提取文本内容
     */
    extractText(nodes) {
        const texts = [];
        for (const node of nodes) {
            if (node.text) {
                texts.push(node.text);
            }
            if (node.children) {
                texts.push(this.extractText(node.children));
            }
        }
        return texts.join('\n\n');
    }
    /**
     * 获取系统提示
     */
    getSystemPrompt() {
        return `你是一个专业的内容分析专家。你的任务是深度分析文档内容，提取核心信息。

请以 JSON 格式返回分析结果，包含以下字段：
- mainTheme: 主要主题 { name, description, keywords[], confidence }
- subThemes: 次要主题数组
- keyPoints: 关键点数组 { content, type, importance }
- targetAudience: 目标读者描述
- documentType: 文档类型 (academic/technical/business/narrative/instructional/other)
- writingStyle: 写作风格 (formal/informal/technical/conversational)

确保返回有效的 JSON 格式。`;
    }
    /**
     * 构建分析提示
     */
    buildAnalysisPrompt(text, options) {
        // 如果文本太长，截取前面部分
        const maxLength = 10000;
        const truncatedText = text.length > maxLength
            ? text.substring(0, maxLength) + '\n\n[文档内容已截断...]'
            : text;
        let prompt = `请分析以下文档内容：

---
${truncatedText}
---

`;
        if (options?.extractKeyPoints) {
            prompt += `请提取最多 ${options.maxKeyPoints || 10} 个关键点。\n`;
        }
        if (options?.identifyThemes) {
            prompt += `请识别文档的主要主题和次要主题。\n`;
        }
        if (options?.analyzeStyle) {
            prompt += `请分析文档的写作风格。\n`;
        }
        prompt += `\n请以 JSON 格式返回分析结果。`;
        return prompt;
    }
    /**
     * 解析 AI 响应
     */
    parseAnalysisResponse(content) {
        try {
            // 尝试提取 JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return this.parseTextResponse(content);
            }
            const data = JSON.parse(jsonMatch[0]);
            return {
                mainTheme: data.mainTheme,
                subThemes: data.subThemes,
                keyPoints: data.keyPoints,
                targetAudience: data.targetAudience,
                documentType: data.documentType,
                writingStyle: data.writingStyle,
            };
        }
        catch (error) {
            // JSON 解析失败，尝试文本解析
            return this.parseTextResponse(content);
        }
    }
    /**
     * 解析文本响应（备用方案）
     */
    parseTextResponse(content) {
        // 简单的文本解析
        const keyPoints = [];
        // 提取要点（以数字或破折号开头的行）
        const lines = content.split('\n');
        for (const line of lines) {
            const match = line.match(/^[\d\-\*•]\s*(.+)$/);
            if (match) {
                keyPoints.push({
                    content: match[1].trim(),
                    type: 'fact',
                    importance: 3,
                });
            }
        }
        return {
            keyPoints: keyPoints.length > 0 ? keyPoints : undefined,
        };
    }
}
exports.ContentAnalyzer = ContentAnalyzer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl6ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvYW5hbHl6ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7O0FBV0g7O0dBRUc7QUFDSCxNQUFhLGVBQWU7SUFDbEIsZUFBZSxDQUFpQjtJQUV4QyxZQUFZLGVBQWdDO1FBQzFDLElBQUksQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFBO0lBQ3hDLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBZSxFQUFFLE9BQXlCO1FBQ3RELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUU1QixJQUFJLENBQUM7WUFDSCxTQUFTO1lBQ1QsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7WUFFakQsSUFBSSxXQUFXLENBQUMsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDO2dCQUM3QixPQUFPO29CQUNMLE9BQU8sRUFBRSxLQUFLO29CQUNkLEtBQUssRUFBRSxpQkFBaUI7b0JBQ3hCLFlBQVksRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsU0FBUztpQkFDckMsQ0FBQTtZQUNILENBQUM7WUFFRCxTQUFTO1lBQ1QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUU3RCxhQUFhO1lBQ2IsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FDbEQsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQ25DO2dCQUNFLFlBQVksRUFBRSxJQUFJLENBQUMsZUFBZSxFQUFFO2dCQUNwQyxVQUFVLEVBQUUsT0FBTyxFQUFFLFVBQVU7Z0JBQy9CLFdBQVcsRUFBRSxHQUFHO2dCQUNoQixTQUFTLEVBQUUs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LE9BQU87WUFDTCxTQUFTLEVBQUUsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUztTQUN4RCxDQUFBO0lBQ0gsQ0FBQztDQUNGO0FBekxELDBDQXlMQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICog5YaF5a655YiG5p6Q5ZmoXG4gKiDmt7HluqbnkIbop6PmlofmoaPlhoXlrrnvvIzmj5Dlj5bmoLjlv4Pkv6Hmga9cbiAqL1xuXG5pbXBvcnQgdHlwZSB7IFVuaWZpZWRBU1QsIENvbnRlbnROb2RlIH0gZnJvbSAnQGRvYzJib29rL3NoYXJlZCdcbmltcG9ydCB0eXBlIHsgUHJvdmlkZXJNYW5hZ2VyIH0gZnJvbSAnQGRvYzJib29rL3Byb3ZpZGVycydcbmltcG9ydCB0eXBlIHtcbiAgQW5hbHlzaXNSZXN1bHQsXG4gIEFuYWx5c2lzT3B0aW9ucyxcbiAgRG9jdW1lbnRUaGVtZSxcbiAgS2V5UG9pbnQsXG59IGZyb20gJy4vdHlwZXMnXG5cbi8qKlxuICog5YaF5a655YiG5p6Q5Zmo57G7XG4gKi9cbmV4cG9ydCBjbGFzcyBDb250ZW50QW5hbHl6ZXIge1xuICBwcml2YXRlIHByb3ZpZGVyTWFuYWdlcjogUHJvdmlkZXJNYW5hZ2VyXG5cbiAgY29uc3RydWN0b3IocHJvdmlkZXJNYW5hZ2VyOiBQcm92aWRlck1hbmFnZXIpIHtcbiAgICB0aGlzLnByb3ZpZGVyTWFuYWdlciA9IHByb3ZpZGVyTWFuYWdlclxuICB9XG5cbiAgLyoqXG4gICAqIOWIhuaekOaWh+aho+WGheWuuVxuICAgKi9cbiAgYXN5bmMgYW5hbHl6ZShhc3Q6IFVuaWZpZWRBU1QsIG9wdGlvbnM/OiBBbmFseXNpc09wdGlvbnMpOiBQcm9taXNlPEFuYWx5c2lzUmVzdWx0PiB7XG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKVxuXG4gICAgdHJ5IHtcbiAgICAgIC8vIOaPkOWPluaWh+acrOWGheWuuVxuICAgICAgY29uc3QgdGV4dENvbnRlbnQgPSB0aGlzLmV4dHJhY3RUZXh0KGFzdC5jb250ZW50KVxuXG4gICAgICBpZiAodGV4dENvbnRlbnQubGVuZ3RoIDwgMTAwKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgZXJyb3I6ICfmlofmoaPlhoXlrrnlpKrnn63vvIzml6Dms5Xov5vooYzmnInmlYjliIbmnpAnLFxuICAgICAgICAgIGFuYWx5c2lzVGltZTogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSxcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyDmnoTlu7rliIbmnpDmj5DnpLpcbiAgICAgIGNvbnN0IHByb21wdCA9IHRoaXMuYnVpbGRBbmFseXNpc1Byb21wdCh0ZXh0Q29udGVudCwgb3B0aW9ucylcblxuICAgICAgLy8g6LCD55SoIEFJIOi/m+ihjOWIhuaekFxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnByb3ZpZGVyTWFuYWdlci5jb21wbGV0ZShcbiAgICAgICAgW3sgcm9sZTogJ3VzZXInLCBjb250ZW50OiBwcm9tcHQgfV0sXG4gICAgICAgIHtcbiAgICAgICAgICBzeXN0ZW1Qcm9tcHQ6IHRoaXMuZ2V0U3lzdGVtUHJvbXB0KCksXG4gICAgICAgICAgcHJvdmlkZXJJZDogb3B0aW9ucz8ucHJvdmlkZXJJZCxcbiAgICAgICAgICB0ZW1wZXJhdHVyZTogMC4zLFxuICAgICAgICAgIG1heFRva2VuczogMjAwMCxcbiAgICAgICAgfVxuICAgICAgKVxuXG4gICAgICBpZiAoIXJlc3BvbnNlLnN1Y2Nlc3MgfHwgIXJlc3BvbnNlLmNvbnRlbnQpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBlcnJvcjogcmVzcG9uc2UuZXJyb3IgfHwgJ+WIhuaekOWksei0pScsXG4gICAgICAgICAgYW5hbHlzaXNUaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIOino+aekCBBSSDlk43lupRcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMucGFyc2VBbmFseXNpc1Jlc3BvbnNlKHJlc3BvbnNlLmNvbnRlbnQpXG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIC4uLnJlc3VsdCxcbiAgICAgICAgYW5hbHlzaXNUaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ+WIhuaekOWksei0pScsXG4gICAgICAgIGFuYWx5c2lzVGltZTogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSxcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog5o+Q5Y+W5paH5pys5YaF5a65XG4gICAqL1xuICBwcml2YXRlIGV4dHJhY3RUZXh0KG5vZGVzOiBDb250ZW50Tm9kZVtdKTogc3RyaW5nIHtcbiAgICBjb25zdCB0ZXh0czogc3RyaW5nW10gPSBbXVxuXG4gICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgICBpZiAobm9kZS50ZXh0KSB7XG4gICAgICAgIHRleHRzLnB1c2gobm9kZS50ZXh0KVxuICAgICAgfVxuICAgICAgaWYgKG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgdGV4dHMucHVzaCh0aGlzLmV4dHJhY3RUZXh0KG5vZGUuY2hpbGRyZW4pKVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0ZXh0cy5qb2luKCdcXG5cXG4nKVxuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPluezu+e7n+aPkOekulxuICAgKi9cbiAgcHJpdmF0ZSBnZXRTeXN0ZW1Qcm9tcHQoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYOS9oOaYr+S4gOS4quS4k+S4mueahOWGheWuueWIhuaekOS4k+WutuOAguS9oOeahOS7u+WKoeaYr+a3seW6puWIhuaekOaWh+aho+WGheWuue+8jOaPkOWPluaguOW/g+S/oeaBr+OAglxuXG7or7fku6UgSlNPTiDmoLzlvI/ov5Tlm57liIbmnpDnu5PmnpzvvIzljIXlkKvku6XkuIvlrZfmrrXvvJpcbi0gbWFpblRoZW1lOiDkuLvopoHkuLvpopggeyBuYW1lLCBkZXNjcmlwdGlvbiwga2V5d29yZHNbXSwgY29uZmlkZW5jZSB9XG4tIHN1YlRoZW1lczog5qyh6KaB5Li76aKY5pWw57uEXG4tIGtleVBvaW50czog5YWz6ZSu54K55pWw57uEIHsgY29udGVudCwgdHlwZSwgaW1wb3J0YW5jZSB9XG4tIHRhcmdldEF1ZGllbmNlOiDnm67moIfor7vogIXmj4/ov7Bcbi0gZG9jdW1lbnRUeXBlOiDmlofmoaPnsbvlnosgKGFjYWRlbWljL3RlY2huaWNhbC9idXNpbmVzcy9uYXJyYXRpdmUvaW5zdHJ1Y3Rpb25hbC9vdGhlcilcbi0gd3JpdGluZ1N0eWxlOiDlhpnkvZzpo47moLwgKGZvcm1hbC9pbmZvcm1hbC90ZWNobmljYWwvY29udmVyc2F0aW9uYWwpXG5cbuehruS/nei/lOWbnuacieaViOeahCBKU09OIOagvOW8j+OAgmBcbiAgfVxuXG4gIC8qKlxuICAgKiDmnoTlu7rliIbmnpDmj5DnpLpcbiAgICovXG4gIHByaXZhdGUgYnVpbGRBbmFseXNpc1Byb21wdCh0ZXh0OiBzdHJpbmcsIG9wdGlvbnM/OiBBbmFseXNpc09wdGlvbnMpOiBzdHJpbmcge1xuICAgIC8vIOWmguaenOaWh+acrOWkqumVv++8jOaIquWPluWJjemdoumDqOWIhlxuICAgIGNvbnN0IG1heExlbmd0aCA9IDEwMDAwXG4gICAgY29uc3QgdHJ1bmNhdGVkVGV4dCA9IHRleHQubGVuZ3RoID4gbWF4TGVuZ3RoXG4gICAgICA/IHRleHQuc3Vic3RyaW5nKDAsIG1heExlbmd0aCkgKyAnXFxuXFxuW+aWh+aho+WGheWuueW3suaIquaWrS4uLl0nXG4gICAgICA6IHRleHRcblxuICAgIGxldCBwcm9tcHQgPSBg6K+35YiG5p6Q5Lul5LiL5paH5qGj5YaF5a6577yaXG5cbi0tLVxuJHt0cnVuY2F0ZWRUZXh0fVxuLS0tXG5cbmBcblxuICAgIGlmIChvcHRpb25zPy5leHRyYWN0S2V5UG9pbnRzKSB7XG4gICAgICBwcm9tcHQgKz0gYOivt+aPkOWPluacgOWkmiAke29wdGlvbnMubWF4S2V5UG9pbnRzIHx8IDEwfSDkuKrlhbPplK7ngrnjgIJcXG5gXG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnM/LmlkZW50aWZ5VGhlbWVzKSB7XG4gICAgICBwcm9tcHQgKz0gYOivt+ivhuWIq+aWh+aho+eahOS4u+imgeS4u+mimOWSjOasoeimgeS4u+mimOOAglxcbmBcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucz8uYW5hbHl6ZVN0eWxlKSB7XG4gICAgICBwcm9tcHQgKz0gYOivt+WIhuaekOaWh+aho+eahOWGmeS9nOmjjuagvOOAglxcbmBcbiAgICB9XG5cbiAgICBwcm9tcHQgKz0gYFxcbuivt+S7pSBKU09OIOagvOW8j+i/lOWbnuWIhuaekOe7k+aenOOAgmBcblxuICAgIHJldHVybiBwcm9tcHRcbiAgfVxuXG4gIC8qKlxuICAgKiDop6PmnpAgQUkg5ZON5bqUXG4gICAqL1xuICBwcml2YXRlIHBhcnNlQW5hbHlzaXNSZXNwb25zZShjb250ZW50OiBzdHJpbmcpOiBQYXJ0aWFsPEFuYWx5c2lzUmVzdWx0PiB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIOWwneivleaPkOWPliBKU09OXG4gICAgICBjb25zdCBqc29uTWF0Y2ggPSBjb250ZW50Lm1hdGNoKC9cXHtbXFxzXFxTXSpcXH0vKVxuICAgICAgaWYgKCFqc29uTWF0Y2gpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGFyc2VUZXh0UmVzcG9uc2UoY29udGVudClcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UoanNvbk1hdGNoWzBdKVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBtYWluVGhlbWU6IGRhdGEubWFpblRoZW1lLFxuICAgICAgICBzdWJUaGVtZXM6IGRhdGEuc3ViVGhlbWVzLFxuICAgICAgICBrZXlQb2ludHM6IGRhdGEua2V5UG9pbnRzLFxuICAgICAgICB0YXJnZXRBdWRpZW5jZTogZGF0YS50YXJnZXRBdWRpZW5jZSxcbiAgICAgICAgZG9jdW1lbnRUeXBlOiBkYXRhLmRvY3VtZW50VHlwZSxcbiAgICAgICAgd3JpdGluZ1N0eWxlOiBkYXRhLndyaXRpbmdTdHlsZSxcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgLy8gSlNPTiDop6PmnpDlpLHotKXvvIzlsJ3or5XmlofmnKzop6PmnpBcbiAgICAgIHJldHVybiB0aGlzLnBhcnNlVGV4dFJlc3BvbnNlKGNvbnRlbnQpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOino+aekOaWh+acrOWTjeW6lO+8iOWkh+eUqOaWueahiO+8iVxuICAgKi9cbiAgcHJpdmF0ZSBwYXJzZVRleHRSZXNwb25zZShjb250ZW50OiBzdHJpbmcpOiBQYXJ0aWFsPEFuYWx5c2lzUmVzdWx0PiB7XG4gICAgLy8g566A5Y2V55qE5paH5pys6Kej5p6QXG4gICAgY29uc3Qga2V5UG9pbnRzOiBLZXlQb2ludFtdID0gW11cblxuICAgIC8vIOaPkOWPluimgeeCue+8iOS7peaVsOWtl+aIluegtOaKmOWPt+W8gOWktOeahOihjO+8iVxuICAgIGNvbnN0IGxpbmVzID0gY29udGVudC5zcGxpdCgnXFxuJylcbiAgICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICAgIGNvbnN0IG1hdGNoID0gbGluZS5tYXRjaCgvXltcXGRcXC1cXCrigKJdXFxzKiguKykkLylcbiAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICBrZXlQb2ludHMucHVzaCh7XG4gICAgICAgICAgY29udGVudDogbWF0Y2hbMV0udHJpbSgpLFxuICAgICAgICAgIHR5cGU6ICdmYWN0JyxcbiAgICAgICAgICBpbXBvcnRhbmNlOiAzLFxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBrZXlQb2ludHM6IGtleVBvaW50cy5sZW5ndGggPiAwID8ga2V5UG9pbnRzIDogdW5kZWZpbmVkLFxuICAgIH1cbiAgfVxufVxuIl19