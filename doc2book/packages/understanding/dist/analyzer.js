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
        if (options?.instruction) {
            prompt += `\n\n附加要求：\n${options.instruction}`;
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl6ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvYW5hbHl6ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7O0FBV0g7O0dBRUc7QUFDSCxNQUFhLGVBQWU7SUFDbEIsZUFBZSxDQUFpQjtJQUV4QyxZQUFZLGVBQWdDO1FBQzFDLElBQUksQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFBO0lBQ3hDLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBZSxFQUFFLE9BQXlCO1FBQ3RELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUU1QixJQUFJLENBQUM7WUFDSCxTQUFTO1lBQ1QsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7WUFFakQsSUFBSSxXQUFXLENBQUMsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDO2dCQUM3QixPQUFPO29CQUNMLE9BQU8sRUFBRSxLQUFLO29CQUNkLEtBQUssRUFBRSxpQkFBaUI7b0JBQ3hCLFlBQVksRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsU0FBUztpQkFDckMsQ0FBQTtZQUNILENBQUM7WUFFRCxTQUFTO1lBQ1QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUU3RCxhQUFhO1lBQ2IsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FDbEQsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQ25DO2dCQUNFLFlBQVksRUFBRSxJQUFJLENBQUMsZUFBZSxFQUFFO2dCQUNwQyxVQUFVLEVBQUUsT0FBTyxFQUFFLFVBQVU7Z0JBQy9CLFdBQVcsRUFBRSxHQUFHO2dCQUNoQixTQUFTLEVBQUUs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QUFJLEVBQUU7b0JBQ3hCLElBQUksRUFBRSxNQUFNO29CQUNaLFVBQVUsRUFBRSxDQUFDO2lCQUNkLENBQUMsQ0FBQTtZQUNKLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTztZQUNMLFNBQVMsRUFBRSxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTO1NBQ3hELENBQUE7SUFDSCxDQUFDO0NBQ0Y7QUE3TEQsMENBNkxDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiDlhoXlrrnliIbmnpDlmahcbiAqIOa3seW6pueQhuino+aWh+aho+WGheWuue+8jOaPkOWPluaguOW/g+S/oeaBr1xuICovXG5cbmltcG9ydCB0eXBlIHsgVW5pZmllZEFTVCwgQ29udGVudE5vZGUgfSBmcm9tICdAZG9jMmJvb2svc2hhcmVkJ1xuaW1wb3J0IHR5cGUgeyBQcm92aWRlck1hbmFnZXIgfSBmcm9tICdAZG9jMmJvb2svcHJvdmlkZXJzJ1xuaW1wb3J0IHR5cGUge1xuICBBbmFseXNpc1Jlc3VsdCxcbiAgQW5hbHlzaXNPcHRpb25zLFxuICBEb2N1bWVudFRoZW1lLFxuICBLZXlQb2ludCxcbn0gZnJvbSAnLi90eXBlcydcblxuLyoqXG4gKiDlhoXlrrnliIbmnpDlmajnsbtcbiAqL1xuZXhwb3J0IGNsYXNzIENvbnRlbnRBbmFseXplciB7XG4gIHByaXZhdGUgcHJvdmlkZXJNYW5hZ2VyOiBQcm92aWRlck1hbmFnZXJcblxuICBjb25zdHJ1Y3Rvcihwcm92aWRlck1hbmFnZXI6IFByb3ZpZGVyTWFuYWdlcikge1xuICAgIHRoaXMucHJvdmlkZXJNYW5hZ2VyID0gcHJvdmlkZXJNYW5hZ2VyXG4gIH1cblxuICAvKipcbiAgICog5YiG5p6Q5paH5qGj5YaF5a65XG4gICAqL1xuICBhc3luYyBhbmFseXplKGFzdDogVW5pZmllZEFTVCwgb3B0aW9ucz86IEFuYWx5c2lzT3B0aW9ucyk6IFByb21pc2U8QW5hbHlzaXNSZXN1bHQ+IHtcbiAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpXG5cbiAgICB0cnkge1xuICAgICAgLy8g5o+Q5Y+W5paH5pys5YaF5a65XG4gICAgICBjb25zdCB0ZXh0Q29udGVudCA9IHRoaXMuZXh0cmFjdFRleHQoYXN0LmNvbnRlbnQpXG5cbiAgICAgIGlmICh0ZXh0Q29udGVudC5sZW5ndGggPCAxMDApIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBlcnJvcjogJ+aWh+aho+WGheWuueWkquefre+8jOaXoOazlei/m+ihjOacieaViOWIhuaekCcsXG4gICAgICAgICAgYW5hbHlzaXNUaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIOaehOW7uuWIhuaekOaPkOekulxuICAgICAgY29uc3QgcHJvbXB0ID0gdGhpcy5idWlsZEFuYWx5c2lzUHJvbXB0KHRleHRDb250ZW50LCBvcHRpb25zKVxuXG4gICAgICAvLyDosIPnlKggQUkg6L+b6KGM5YiG5p6QXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMucHJvdmlkZXJNYW5hZ2VyLmNvbXBsZXRlKFxuICAgICAgICBbeyByb2xlOiAndXNlcicsIGNvbnRlbnQ6IHByb21wdCB9XSxcbiAgICAgICAge1xuICAgICAgICAgIHN5c3RlbVByb21wdDogdGhpcy5nZXRTeXN0ZW1Qcm9tcHQoKSxcbiAgICAgICAgICBwcm92aWRlcklkOiBvcHRpb25zPy5wcm92aWRlcklkLFxuICAgICAgICAgIHRlbXBlcmF0dXJlOiAwLjMsXG4gICAgICAgICAgbWF4VG9rZW5zOiAyMDAwLFxuICAgICAgICB9XG4gICAgICApXG5cbiAgICAgIGlmICghcmVzcG9uc2Uuc3VjY2VzcyB8fCAhcmVzcG9uc2UuY29udGVudCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgIGVycm9yOiByZXNwb25zZS5lcnJvciB8fCAn5YiG5p6Q5aSx6LSlJyxcbiAgICAgICAgICBhbmFseXNpc1RpbWU6IERhdGUubm93KCkgLSBzdGFydFRpbWUsXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8g6Kej5p6QIEFJIOWTjeW6lFxuICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5wYXJzZUFuYWx5c2lzUmVzcG9uc2UocmVzcG9uc2UuY29udGVudClcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgLi4ucmVzdWx0LFxuICAgICAgICBhbmFseXNpc1RpbWU6IERhdGUubm93KCkgLSBzdGFydFRpbWUsXG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAn5YiG5p6Q5aSx6LSlJyxcbiAgICAgICAgYW5hbHlzaXNUaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDmj5Dlj5bmlofmnKzlhoXlrrlcbiAgICovXG4gIHByaXZhdGUgZXh0cmFjdFRleHQobm9kZXM6IENvbnRlbnROb2RlW10pOiBzdHJpbmcge1xuICAgIGNvbnN0IHRleHRzOiBzdHJpbmdbXSA9IFtdXG5cbiAgICBmb3IgKGNvbnN0IG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgIGlmIChub2RlLnRleHQpIHtcbiAgICAgICAgdGV4dHMucHVzaChub2RlLnRleHQpXG4gICAgICB9XG4gICAgICBpZiAobm9kZS5jaGlsZHJlbikge1xuICAgICAgICB0ZXh0cy5wdXNoKHRoaXMuZXh0cmFjdFRleHQobm9kZS5jaGlsZHJlbikpXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRleHRzLmpvaW4oJ1xcblxcbicpXG4gIH1cblxuICAvKipcbiAgICog6I635Y+W57O757uf5o+Q56S6XG4gICAqL1xuICBwcml2YXRlIGdldFN5c3RlbVByb21wdCgpOiBzdHJpbmcge1xuICAgIHJldHVybiBg5L2g5piv5LiA5Liq5LiT5Lia55qE5YaF5a655YiG5p6Q5LiT5a6244CC5L2g55qE5Lu75Yqh5piv5rex5bqm5YiG5p6Q5paH5qGj5YaF5a6577yM5o+Q5Y+W5qC45b+D5L+h5oGv44CCXG5cbuivt+S7pSBKU09OIOagvOW8j+i/lOWbnuWIhuaekOe7k+aenO+8jOWMheWQq+S7peS4i+Wtl+aute+8mlxuLSBtYWluVGhlbWU6IOS4u+imgeS4u+mimCB7IG5hbWUsIGRlc2NyaXB0aW9uLCBrZXl3b3Jkc1tdLCBjb25maWRlbmNlIH1cbi0gc3ViVGhlbWVzOiDmrKHopoHkuLvpopjmlbDnu4Rcbi0ga2V5UG9pbnRzOiDlhbPplK7ngrnmlbDnu4QgeyBjb250ZW50LCB0eXBlLCBpbXBvcnRhbmNlIH1cbi0gdGFyZ2V0QXVkaWVuY2U6IOebruagh+ivu+iAheaPj+i/sFxuLSBkb2N1bWVudFR5cGU6IOaWh+aho+exu+WeiyAoYWNhZGVtaWMvdGVjaG5pY2FsL2J1c2luZXNzL25hcnJhdGl2ZS9pbnN0cnVjdGlvbmFsL290aGVyKVxuLSB3cml0aW5nU3R5bGU6IOWGmeS9nOmjjuagvCAoZm9ybWFsL2luZm9ybWFsL3RlY2huaWNhbC9jb252ZXJzYXRpb25hbClcblxu56Gu5L+d6L+U5Zue5pyJ5pWI55qEIEpTT04g5qC85byP44CCYFxuICB9XG5cbiAgLyoqXG4gICAqIOaehOW7uuWIhuaekOaPkOekulxuICAgKi9cbiAgcHJpdmF0ZSBidWlsZEFuYWx5c2lzUHJvbXB0KHRleHQ6IHN0cmluZywgb3B0aW9ucz86IEFuYWx5c2lzT3B0aW9ucyk6IHN0cmluZyB7XG4gICAgLy8g5aaC5p6c5paH5pys5aSq6ZW/77yM5oiq5Y+W5YmN6Z2i6YOo5YiGXG4gICAgY29uc3QgbWF4TGVuZ3RoID0gMTAwMDBcbiAgICBjb25zdCB0cnVuY2F0ZWRUZXh0ID0gdGV4dC5sZW5ndGggPiBtYXhMZW5ndGhcbiAgICAgID8gdGV4dC5zdWJzdHJpbmcoMCwgbWF4TGVuZ3RoKSArICdcXG5cXG5b5paH5qGj5YaF5a655bey5oiq5patLi4uXSdcbiAgICAgIDogdGV4dFxuXG4gICAgbGV0IHByb21wdCA9IGDor7fliIbmnpDku6XkuIvmlofmoaPlhoXlrrnvvJpcblxuLS0tXG4ke3RydW5jYXRlZFRleHR9XG4tLS1cblxuYFxuXG4gICAgaWYgKG9wdGlvbnM/LmV4dHJhY3RLZXlQb2ludHMpIHtcbiAgICAgIHByb21wdCArPSBg6K+35o+Q5Y+W5pyA5aSaICR7b3B0aW9ucy5tYXhLZXlQb2ludHMgfHwgMTB9IOS4quWFs+mUrueCueOAglxcbmBcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucz8uaWRlbnRpZnlUaGVtZXMpIHtcbiAgICAgIHByb21wdCArPSBg6K+36K+G5Yir5paH5qGj55qE5Li76KaB5Li76aKY5ZKM5qyh6KaB5Li76aKY44CCXFxuYFxuICAgIH1cblxuICAgIGlmIChvcHRpb25zPy5hbmFseXplU3R5bGUpIHtcbiAgICAgIHByb21wdCArPSBg6K+35YiG5p6Q5paH5qGj55qE5YaZ5L2c6aOO5qC844CCXFxuYFxuICAgIH1cblxuICAgIHByb21wdCArPSBgXFxu6K+35LulIEpTT04g5qC85byP6L+U5Zue5YiG5p6Q57uT5p6c44CCYFxuXG4gICAgaWYgKG9wdGlvbnM/Lmluc3RydWN0aW9uKSB7XG4gICAgICBwcm9tcHQgKz0gYFxcblxcbumZhOWKoOimgeaxgu+8mlxcbiR7b3B0aW9ucy5pbnN0cnVjdGlvbn1gXG4gICAgfVxuXG4gICAgcmV0dXJuIHByb21wdFxuICB9XG5cbiAgLyoqXG4gICAqIOino+aekCBBSSDlk43lupRcbiAgICovXG4gIHByaXZhdGUgcGFyc2VBbmFseXNpc1Jlc3BvbnNlKGNvbnRlbnQ6IHN0cmluZyk6IFBhcnRpYWw8QW5hbHlzaXNSZXN1bHQ+IHtcbiAgICB0cnkge1xuICAgICAgLy8g5bCd6K+V5o+Q5Y+WIEpTT05cbiAgICAgIGNvbnN0IGpzb25NYXRjaCA9IGNvbnRlbnQubWF0Y2goL1xce1tcXHNcXFNdKlxcfS8pXG4gICAgICBpZiAoIWpzb25NYXRjaCkge1xuICAgICAgICByZXR1cm4gdGhpcy5wYXJzZVRleHRSZXNwb25zZShjb250ZW50KVxuICAgICAgfVxuXG4gICAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShqc29uTWF0Y2hbMF0pXG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIG1haW5UaGVtZTogZGF0YS5tYWluVGhlbWUsXG4gICAgICAgIHN1YlRoZW1lczogZGF0YS5zdWJUaGVtZXMsXG4gICAgICAgIGtleVBvaW50czogZGF0YS5rZXlQb2ludHMsXG4gICAgICAgIHRhcmdldEF1ZGllbmNlOiBkYXRhLnRhcmdldEF1ZGllbmNlLFxuICAgICAgICBkb2N1bWVudFR5cGU6IGRhdGEuZG9jdW1lbnRUeXBlLFxuICAgICAgICB3cml0aW5nU3R5bGU6IGRhdGEud3JpdGluZ1N0eWxlLFxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAvLyBKU09OIOino+aekOWksei0pe+8jOWwneivleaWh+acrOino+aekFxuICAgICAgcmV0dXJuIHRoaXMucGFyc2VUZXh0UmVzcG9uc2UoY29udGVudClcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog6Kej5p6Q5paH5pys5ZON5bqU77yI5aSH55So5pa55qGI77yJXG4gICAqL1xuICBwcml2YXRlIHBhcnNlVGV4dFJlc3BvbnNlKGNvbnRlbnQ6IHN0cmluZyk6IFBhcnRpYWw8QW5hbHlzaXNSZXN1bHQ+IHtcbiAgICAvLyDnroDljZXnmoTmlofmnKzop6PmnpBcbiAgICBjb25zdCBrZXlQb2ludHM6IEtleVBvaW50W10gPSBbXVxuXG4gICAgLy8g5o+Q5Y+W6KaB54K577yI5Lul5pWw5a2X5oiW56C05oqY5Y+35byA5aS055qE6KGM77yJXG4gICAgY29uc3QgbGluZXMgPSBjb250ZW50LnNwbGl0KCdcXG4nKVxuICAgIGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xuICAgICAgY29uc3QgbWF0Y2ggPSBsaW5lLm1hdGNoKC9eW1xcZFxcLVxcKuKAol1cXHMqKC4rKSQvKVxuICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgIGtleVBvaW50cy5wdXNoKHtcbiAgICAgICAgICBjb250ZW50OiBtYXRjaFsxXS50cmltKCksXG4gICAgICAgICAgdHlwZTogJ2ZhY3QnLFxuICAgICAgICAgIGltcG9ydGFuY2U6IDMsXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGtleVBvaW50czoga2V5UG9pbnRzLmxlbmd0aCA+IDAgPyBrZXlQb2ludHMgOiB1bmRlZmluZWQsXG4gICAgfVxuICB9XG59XG4iXX0=