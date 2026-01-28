"use strict";
/**
 * 结构检测器
 * 识别文档的层次结构
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StructureDetector = void 0;
/**
 * 结构检测器类
 */
class StructureDetector {
    providerManager;
    constructor(providerManager) {
        this.providerManager = providerManager;
    }
    /**
     * 检测文档结构
     */
    async detect(ast, options) {
        const startTime = Date.now();
        try {
            // 首先使用规则检测
            const ruleBasedStructure = this.detectByRules(ast.content);
            // 如果启用 AI 辅助，进一步优化
            if (options?.useAI && ruleBasedStructure.length > 0) {
                const aiEnhanced = await this.enhanceWithAI(ast.content, ruleBasedStructure, options);
                if (aiEnhanced) {
                    return {
                        success: true,
                        title: ast.metadata.title || this.extractTitle(ruleBasedStructure),
                        structure: aiEnhanced,
                        tableOfContents: this.generateTOC(aiEnhanced),
                        detectionTime: Date.now() - startTime,
                    };
                }
            }
            return {
                success: true,
                title: ast.metadata.title || this.extractTitle(ruleBasedStructure),
                structure: ruleBasedStructure,
                tableOfContents: this.generateTOC(ruleBasedStructure),
                detectionTime: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '结构检测失败',
                detectionTime: Date.now() - startTime,
            };
        }
    }
    /**
     * 基于规则检测结构
     */
    detectByRules(nodes) {
        const structure = [];
        let currentChapter = null;
        let currentSection = null;
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (node.type === 'heading') {
                const level = node.level || 1;
                const title = node.text || '';
                const element = {
                    type: level === 1 ? 'chapter' : level === 2 ? 'section' : 'subsection',
                    title,
                    level,
                    startIndex: i,
                    endIndex: i,
                    children: [],
                    preview: this.getPreview(nodes, i),
                };
                if (level === 1) {
                    // 新章节
                    if (currentChapter) {
                        currentChapter.endIndex = i - 1;
                    }
                    currentChapter = element;
                    currentSection = null;
                    structure.push(element);
                }
                else if (level === 2) {
                    // 新节
                    if (currentSection) {
                        currentSection.endIndex = i - 1;
                    }
                    currentSection = element;
                    if (currentChapter) {
                        currentChapter.children = currentChapter.children || [];
                        currentChapter.children.push(element);
                    }
                    else {
                        structure.push(element);
                    }
                }
                else {
                    // 小节
                    if (currentSection) {
                        currentSection.children = currentSection.children || [];
                        currentSection.children.push(element);
                    }
                    else if (currentChapter) {
                        currentChapter.children = currentChapter.children || [];
                        currentChapter.children.push(element);
                    }
                    else {
                        structure.push(element);
                    }
                }
            }
        }
        // 更新最后一个元素的结束索引
        if (currentChapter) {
            currentChapter.endIndex = nodes.length - 1;
        }
        if (currentSection) {
            currentSection.endIndex = nodes.length - 1;
        }
        return structure;
    }
    /**
     * 使用 AI 增强结构检测
     */
    async enhanceWithAI(nodes, ruleBasedStructure, options) {
        // 提取文本用于 AI 分析
        const textContent = this.extractText(nodes);
        const prompt = `请分析以下文档的结构，并以 JSON 格式返回优化后的结构：

文档内容：
${this.truncateText(textContent, 5000)}

当前检测到的结构：
${JSON.stringify(ruleBasedStructure.map(s => ({ title: s.title, level: s.level })), null, 2)}

请返回优化后的结构，格式如下：
{
  "structure": [
    {
      "title": "章节标题",
      "level": 1,
      "suggestedTitle": "建议的标题（如果原标题不够好）"
    }
  ]
}

只返回 JSON，不要其他内容。`;
        const response = await this.providerManager.complete([{ role: 'user', content: prompt }], {
            providerId: options.providerId,
            temperature: 0.2,
            maxTokens: 1000,
        });
        if (!response.success || !response.content) {
            return null;
        }
        try {
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (!jsonMatch)
                return null;
            const data = JSON.parse(jsonMatch[0]);
            if (!data.structure || !Array.isArray(data.structure))
                return null;
            // 合并 AI 建议到原结构
            return ruleBasedStructure.map((element, index) => {
                const aiSuggestion = data.structure[index];
                if (aiSuggestion?.suggestedTitle) {
                    return {
                        ...element,
                        title: aiSuggestion.suggestedTitle,
                    };
                }
                return element;
            });
        }
        catch {
            return null;
        }
    }
    /**
     * 生成目录
     */
    generateTOC(structure) {
        const toc = [];
        const traverse = (elements) => {
            for (const element of elements) {
                if (element.title) {
                    toc.push({
                        title: element.title,
                        level: element.level,
                        index: element.startIndex,
                    });
                }
                if (element.children) {
                    traverse(element.children);
                }
            }
        };
        traverse(structure);
        return toc;
    }
    /**
     * 提取标题
     */
    extractTitle(structure) {
        // 查找第一个一级标题
        for (const element of structure) {
            if (element.level === 1 && element.title) {
                return element.title;
            }
        }
        return undefined;
    }
    /**
     * 获取预览文本
     */
    getPreview(nodes, startIndex) {
        const previewLength = 200;
        let preview = '';
        for (let i = startIndex + 1; i < nodes.length && preview.length < previewLength; i++) {
            const node = nodes[i];
            if (node.type === 'heading')
                break;
            if (node.text) {
                preview += node.text + ' ';
            }
        }
        return preview.trim().substring(0, previewLength);
    }
    /**
     * 提取文本
     */
    extractText(nodes) {
        return nodes
            .map((node) => {
            if (node.text)
                return node.text;
            if (node.children)
                return this.extractText(node.children);
            return '';
        })
            .join('\n');
    }
    /**
     * 截断文本
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength)
            return text;
        return text.substring(0, maxLength) + '...';
    }
}
exports.StructureDetector = StructureDetector;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RydWN0dXJlLWRldGVjdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3N0cnVjdHVyZS1kZXRlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7QUFNSDs7R0FFRztBQUNILE1BQWEsaUJBQWlCO0lBQ3BCLGVBQWUsQ0FBaUI7SUFFeEMsWUFBWSxlQUFnQztRQUMxQyxJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQTtJQUN4QyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQWUsRUFBRSxPQUEwQjtRQUN0RCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUE7UUFFNUIsSUFBSSxDQUFDO1lBQ0gsV0FBVztZQUNYLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7WUFFMUQsbUJBQW1CO1lBQ25CLElBQUksT0FBTyxFQUFFLEtBQUssSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BELE1BQU0sVUFBVSxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxDQUFBO2dCQUNyRixJQUFJLFVBQVUsRUFBRSxDQUFDO29CQUNmLE9BQU87d0JBQ0wsT0FBTyxFQUFFLElBQUk7d0JBQ2IsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsa0JBQWtCLENBQUM7d0JBQ2xFLFNBQVMsRUFBRSxVQUFVO3dCQUNyQixlQUFlLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUM7d0JBQzdDLGFBQWEsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsU0FBUztxQkFDdEMsQ0FBQTtnQkFDSCxDQUFDO1lBQ0gsQ0FB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QUMsTUFBTSxJQUFJLFNBQVM7WUFBRSxPQUFPLElBQUksQ0FBQTtRQUN6QyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxHQUFHLEtBQUssQ0FBQTtJQUM3QyxDQUFDO0NBQ0Y7QUF4UUQsOENBd1FDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiDnu5PmnoTmo4DmtYvlmahcbiAqIOivhuWIq+aWh+aho+eahOWxguasoee7k+aehFxuICovXG5cbmltcG9ydCB0eXBlIHsgVW5pZmllZEFTVCwgQ29udGVudE5vZGUgfSBmcm9tICdAZG9jMmJvb2svc2hhcmVkJ1xuaW1wb3J0IHR5cGUgeyBQcm92aWRlck1hbmFnZXIgfSBmcm9tICdAZG9jMmJvb2svcHJvdmlkZXJzJ1xuaW1wb3J0IHR5cGUgeyBTdHJ1Y3R1cmVSZXN1bHQsIFN0cnVjdHVyZUVsZW1lbnQsIFN0cnVjdHVyZU9wdGlvbnMgfSBmcm9tICcuL3R5cGVzJ1xuXG4vKipcbiAqIOe7k+aehOajgOa1i+WZqOexu1xuICovXG5leHBvcnQgY2xhc3MgU3RydWN0dXJlRGV0ZWN0b3Ige1xuICBwcml2YXRlIHByb3ZpZGVyTWFuYWdlcjogUHJvdmlkZXJNYW5hZ2VyXG5cbiAgY29uc3RydWN0b3IocHJvdmlkZXJNYW5hZ2VyOiBQcm92aWRlck1hbmFnZXIpIHtcbiAgICB0aGlzLnByb3ZpZGVyTWFuYWdlciA9IHByb3ZpZGVyTWFuYWdlclxuICB9XG5cbiAgLyoqXG4gICAqIOajgOa1i+aWh+aho+e7k+aehFxuICAgKi9cbiAgYXN5bmMgZGV0ZWN0KGFzdDogVW5pZmllZEFTVCwgb3B0aW9ucz86IFN0cnVjdHVyZU9wdGlvbnMpOiBQcm9taXNlPFN0cnVjdHVyZVJlc3VsdD4ge1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KClcblxuICAgIHRyeSB7XG4gICAgICAvLyDpppblhYjkvb/nlKjop4TliJnmo4DmtYtcbiAgICAgIGNvbnN0IHJ1bGVCYXNlZFN0cnVjdHVyZSA9IHRoaXMuZGV0ZWN0QnlSdWxlcyhhc3QuY29udGVudClcblxuICAgICAgLy8g5aaC5p6c5ZCv55SoIEFJIOi+heWKqe+8jOi/m+S4gOatpeS8mOWMllxuICAgICAgaWYgKG9wdGlvbnM/LnVzZUFJICYmIHJ1bGVCYXNlZFN0cnVjdHVyZS5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnN0IGFpRW5oYW5jZWQgPSBhd2FpdCB0aGlzLmVuaGFuY2VXaXRoQUkoYXN0LmNvbnRlbnQsIHJ1bGVCYXNlZFN0cnVjdHVyZSwgb3B0aW9ucylcbiAgICAgICAgaWYgKGFpRW5oYW5jZWQpIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIHRpdGxlOiBhc3QubWV0YWRhdGEudGl0bGUgfHwgdGhpcy5leHRyYWN0VGl0bGUocnVsZUJhc2VkU3RydWN0dXJlKSxcbiAgICAgICAgICAgIHN0cnVjdHVyZTogYWlFbmhhbmNlZCxcbiAgICAgICAgICAgIHRhYmxlT2ZDb250ZW50czogdGhpcy5nZW5lcmF0ZVRPQyhhaUVuaGFuY2VkKSxcbiAgICAgICAgICAgIGRldGVjdGlvblRpbWU6IERhdGUubm93KCkgLSBzdGFydFRpbWUsXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIHRpdGxlOiBhc3QubWV0YWRhdGEudGl0bGUgfHwgdGhpcy5leHRyYWN0VGl0bGUocnVsZUJhc2VkU3RydWN0dXJlKSxcbiAgICAgICAgc3RydWN0dXJlOiBydWxlQmFzZWRTdHJ1Y3R1cmUsXG4gICAgICAgIHRhYmxlT2ZDb250ZW50czogdGhpcy5nZW5lcmF0ZVRPQyhydWxlQmFzZWRTdHJ1Y3R1cmUpLFxuICAgICAgICBkZXRlY3Rpb25UaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ+e7k+aehOajgOa1i+Wksei0pScsXG4gICAgICAgIGRldGVjdGlvblRpbWU6IERhdGUubm93KCkgLSBzdGFydFRpbWUsXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOWfuuS6juinhOWImeajgOa1i+e7k+aehFxuICAgKi9cbiAgcHJpdmF0ZSBkZXRlY3RCeVJ1bGVzKG5vZGVzOiBDb250ZW50Tm9kZVtdKTogU3RydWN0dXJlRWxlbWVudFtdIHtcbiAgICBjb25zdCBzdHJ1Y3R1cmU6IFN0cnVjdHVyZUVsZW1lbnRbXSA9IFtdXG4gICAgbGV0IGN1cnJlbnRDaGFwdGVyOiBTdHJ1Y3R1cmVFbGVtZW50IHwgbnVsbCA9IG51bGxcbiAgICBsZXQgY3VycmVudFNlY3Rpb246IFN0cnVjdHVyZUVsZW1lbnQgfCBudWxsID0gbnVsbFxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3Qgbm9kZSA9IG5vZGVzW2ldXG5cbiAgICAgIGlmIChub2RlLnR5cGUgPT09ICdoZWFkaW5nJykge1xuICAgICAgICBjb25zdCBsZXZlbCA9IG5vZGUubGV2ZWwgfHwgMVxuICAgICAgICBjb25zdCB0aXRsZSA9IG5vZGUudGV4dCB8fCAnJ1xuXG4gICAgICAgIGNvbnN0IGVsZW1lbnQ6IFN0cnVjdHVyZUVsZW1lbnQgPSB7XG4gICAgICAgICAgdHlwZTogbGV2ZWwgPT09IDEgPyAnY2hhcHRlcicgOiBsZXZlbCA9PT0gMiA/ICdzZWN0aW9uJyA6ICdzdWJzZWN0aW9uJyxcbiAgICAgICAgICB0aXRsZSxcbiAgICAgICAgICBsZXZlbCxcbiAgICAgICAgICBzdGFydEluZGV4OiBpLFxuICAgICAgICAgIGVuZEluZGV4OiBpLFxuICAgICAgICAgIGNoaWxkcmVuOiBbXSxcbiAgICAgICAgICBwcmV2aWV3OiB0aGlzLmdldFByZXZpZXcobm9kZXMsIGkpLFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxldmVsID09PSAxKSB7XG4gICAgICAgICAgLy8g5paw56ug6IqCXG4gICAgICAgICAgaWYgKGN1cnJlbnRDaGFwdGVyKSB7XG4gICAgICAgICAgICBjdXJyZW50Q2hhcHRlci5lbmRJbmRleCA9IGkgLSAxXG4gICAgICAgICAgfVxuICAgICAgICAgIGN1cnJlbnRDaGFwdGVyID0gZWxlbWVudFxuICAgICAgICAgIGN1cnJlbnRTZWN0aW9uID0gbnVsbFxuICAgICAgICAgIHN0cnVjdHVyZS5wdXNoKGVsZW1lbnQpXG4gICAgICAgIH0gZWxzZSBpZiAobGV2ZWwgPT09IDIpIHtcbiAgICAgICAgICAvLyDmlrDoioJcbiAgICAgICAgICBpZiAoY3VycmVudFNlY3Rpb24pIHtcbiAgICAgICAgICAgIGN1cnJlbnRTZWN0aW9uLmVuZEluZGV4ID0gaSAtIDFcbiAgICAgICAgICB9XG4gICAgICAgICAgY3VycmVudFNlY3Rpb24gPSBlbGVtZW50XG4gICAgICAgICAgaWYgKGN1cnJlbnRDaGFwdGVyKSB7XG4gICAgICAgICAgICBjdXJyZW50Q2hhcHRlci5jaGlsZHJlbiA9IGN1cnJlbnRDaGFwdGVyLmNoaWxkcmVuIHx8IFtdXG4gICAgICAgICAgICBjdXJyZW50Q2hhcHRlci5jaGlsZHJlbi5wdXNoKGVsZW1lbnQpXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN0cnVjdHVyZS5wdXNoKGVsZW1lbnQpXG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIOWwj+iKglxuICAgICAgICAgIGlmIChjdXJyZW50U2VjdGlvbikge1xuICAgICAgICAgICAgY3VycmVudFNlY3Rpb24uY2hpbGRyZW4gPSBjdXJyZW50U2VjdGlvbi5jaGlsZHJlbiB8fCBbXVxuICAgICAgICAgICAgY3VycmVudFNlY3Rpb24uY2hpbGRyZW4ucHVzaChlbGVtZW50KVxuICAgICAgICAgIH0gZWxzZSBpZiAoY3VycmVudENoYXB0ZXIpIHtcbiAgICAgICAgICAgIGN1cnJlbnRDaGFwdGVyLmNoaWxkcmVuID0gY3VycmVudENoYXB0ZXIuY2hpbGRyZW4gfHwgW11cbiAgICAgICAgICAgIGN1cnJlbnRDaGFwdGVyLmNoaWxkcmVuLnB1c2goZWxlbWVudClcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3RydWN0dXJlLnB1c2goZWxlbWVudClcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyDmm7TmlrDmnIDlkI7kuIDkuKrlhYPntKDnmoTnu5PmnZ/ntKLlvJVcbiAgICBpZiAoY3VycmVudENoYXB0ZXIpIHtcbiAgICAgIGN1cnJlbnRDaGFwdGVyLmVuZEluZGV4ID0gbm9kZXMubGVuZ3RoIC0gMVxuICAgIH1cbiAgICBpZiAoY3VycmVudFNlY3Rpb24pIHtcbiAgICAgIGN1cnJlbnRTZWN0aW9uLmVuZEluZGV4ID0gbm9kZXMubGVuZ3RoIC0gMVxuICAgIH1cblxuICAgIHJldHVybiBzdHJ1Y3R1cmVcbiAgfVxuXG4gIC8qKlxuICAgKiDkvb/nlKggQUkg5aKe5by657uT5p6E5qOA5rWLXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGVuaGFuY2VXaXRoQUkoXG4gICAgbm9kZXM6IENvbnRlbnROb2RlW10sXG4gICAgcnVsZUJhc2VkU3RydWN0dXJlOiBTdHJ1Y3R1cmVFbGVtZW50W10sXG4gICAgb3B0aW9uczogU3RydWN0dXJlT3B0aW9uc1xuICApOiBQcm9taXNlPFN0cnVjdHVyZUVsZW1lbnRbXSB8IG51bGw+IHtcbiAgICAvLyDmj5Dlj5bmlofmnKznlKjkuo4gQUkg5YiG5p6QXG4gICAgY29uc3QgdGV4dENvbnRlbnQgPSB0aGlzLmV4dHJhY3RUZXh0KG5vZGVzKVxuXG4gICAgY29uc3QgcHJvbXB0ID0gYOivt+WIhuaekOS7peS4i+aWh+aho+eahOe7k+aehO+8jOW5tuS7pSBKU09OIOagvOW8j+i/lOWbnuS8mOWMluWQjueahOe7k+aehO+8mlxuXG7mlofmoaPlhoXlrrnvvJpcbiR7dGhpcy50cnVuY2F0ZVRleHQodGV4dENvbnRlbnQsIDUwMDApfVxuXG7lvZPliY3mo4DmtYvliLDnmoTnu5PmnoTvvJpcbiR7SlNPTi5zdHJpbmdpZnkocnVsZUJhc2VkU3RydWN0dXJlLm1hcChzID0+ICh7IHRpdGxlOiBzLnRpdGxlLCBsZXZlbDogcy5sZXZlbCB9KSksIG51bGwsIDIpfVxuXG7or7fov5Tlm57kvJjljJblkI7nmoTnu5PmnoTvvIzmoLzlvI/lpoLkuIvvvJpcbntcbiAgXCJzdHJ1Y3R1cmVcIjogW1xuICAgIHtcbiAgICAgIFwidGl0bGVcIjogXCLnq6DoioLmoIfpophcIixcbiAgICAgIFwibGV2ZWxcIjogMSxcbiAgICAgIFwic3VnZ2VzdGVkVGl0bGVcIjogXCLlu7rorq7nmoTmoIfpopjvvIjlpoLmnpzljp/moIfpopjkuI3lpJ/lpb3vvIlcIlxuICAgIH1cbiAgXVxufVxuXG7lj6rov5Tlm54gSlNPTu+8jOS4jeimgeWFtuS7luWGheWuueOAgmBcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5wcm92aWRlck1hbmFnZXIuY29tcGxldGUoXG4gICAgICBbeyByb2xlOiAndXNlcicsIGNvbnRlbnQ6IHByb21wdCB9XSxcbiAgICAgIHtcbiAgICAgICAgcHJvdmlkZXJJZDogb3B0aW9ucy5wcm92aWRlcklkLFxuICAgICAgICB0ZW1wZXJhdHVyZTogMC4yLFxuICAgICAgICBtYXhUb2tlbnM6IDEwMDAsXG4gICAgICB9XG4gICAgKVxuXG4gICAgaWYgKCFyZXNwb25zZS5zdWNjZXNzIHx8ICFyZXNwb25zZS5jb250ZW50KSB7XG4gICAgICByZXR1cm4gbnVsbFxuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBqc29uTWF0Y2ggPSByZXNwb25zZS5jb250ZW50Lm1hdGNoKC9cXHtbXFxzXFxTXSpcXH0vKVxuICAgICAgaWYgKCFqc29uTWF0Y2gpIHJldHVybiBudWxsXG5cbiAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKGpzb25NYXRjaFswXSlcbiAgICAgIGlmICghZGF0YS5zdHJ1Y3R1cmUgfHwgIUFycmF5LmlzQXJyYXkoZGF0YS5zdHJ1Y3R1cmUpKSByZXR1cm4gbnVsbFxuXG4gICAgICAvLyDlkIjlubYgQUkg5bu66K6u5Yiw5Y6f57uT5p6EXG4gICAgICByZXR1cm4gcnVsZUJhc2VkU3RydWN0dXJlLm1hcCgoZWxlbWVudCwgaW5kZXgpID0+IHtcbiAgICAgICAgY29uc3QgYWlTdWdnZXN0aW9uID0gZGF0YS5zdHJ1Y3R1cmVbaW5kZXhdXG4gICAgICAgIGlmIChhaVN1Z2dlc3Rpb24/LnN1Z2dlc3RlZFRpdGxlKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIC4uLmVsZW1lbnQsXG4gICAgICAgICAgICB0aXRsZTogYWlTdWdnZXN0aW9uLnN1Z2dlc3RlZFRpdGxlLFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZWxlbWVudFxuICAgICAgfSlcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBudWxsXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOeUn+aIkOebruW9lVxuICAgKi9cbiAgcHJpdmF0ZSBnZW5lcmF0ZVRPQyhcbiAgICBzdHJ1Y3R1cmU6IFN0cnVjdHVyZUVsZW1lbnRbXVxuICApOiBBcnJheTx7IHRpdGxlOiBzdHJpbmc7IGxldmVsOiBudW1iZXI7IGluZGV4OiBudW1iZXIgfT4ge1xuICAgIGNvbnN0IHRvYzogQXJyYXk8eyB0aXRsZTogc3RyaW5nOyBsZXZlbDogbnVtYmVyOyBpbmRleDogbnVtYmVyIH0+ID0gW11cblxuICAgIGNvbnN0IHRyYXZlcnNlID0gKGVsZW1lbnRzOiBTdHJ1Y3R1cmVFbGVtZW50W10pID0+IHtcbiAgICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiBlbGVtZW50cykge1xuICAgICAgICBpZiAoZWxlbWVudC50aXRsZSkge1xuICAgICAgICAgIHRvYy5wdXNoKHtcbiAgICAgICAgICAgIHRpdGxlOiBlbGVtZW50LnRpdGxlLFxuICAgICAgICAgICAgbGV2ZWw6IGVsZW1lbnQubGV2ZWwsXG4gICAgICAgICAgICBpbmRleDogZWxlbWVudC5zdGFydEluZGV4LFxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVsZW1lbnQuY2hpbGRyZW4pIHtcbiAgICAgICAgICB0cmF2ZXJzZShlbGVtZW50LmNoaWxkcmVuKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdHJhdmVyc2Uoc3RydWN0dXJlKVxuICAgIHJldHVybiB0b2NcbiAgfVxuXG4gIC8qKlxuICAgKiDmj5Dlj5bmoIfpophcbiAgICovXG4gIHByaXZhdGUgZXh0cmFjdFRpdGxlKHN0cnVjdHVyZTogU3RydWN0dXJlRWxlbWVudFtdKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICAvLyDmn6Xmib7nrKzkuIDkuKrkuIDnuqfmoIfpophcbiAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2Ygc3RydWN0dXJlKSB7XG4gICAgICBpZiAoZWxlbWVudC5sZXZlbCA9PT0gMSAmJiBlbGVtZW50LnRpdGxlKSB7XG4gICAgICAgIHJldHVybiBlbGVtZW50LnRpdGxlXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWRcbiAgfVxuXG4gIC8qKlxuICAgKiDojrflj5bpooTop4jmlofmnKxcbiAgICovXG4gIHByaXZhdGUgZ2V0UHJldmlldyhub2RlczogQ29udGVudE5vZGVbXSwgc3RhcnRJbmRleDogbnVtYmVyKTogc3RyaW5nIHtcbiAgICBjb25zdCBwcmV2aWV3TGVuZ3RoID0gMjAwXG4gICAgbGV0IHByZXZpZXcgPSAnJ1xuXG4gICAgZm9yIChsZXQgaSA9IHN0YXJ0SW5kZXggKyAxOyBpIDwgbm9kZXMubGVuZ3RoICYmIHByZXZpZXcubGVuZ3RoIDwgcHJldmlld0xlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBub2RlID0gbm9kZXNbaV1cbiAgICAgIGlmIChub2RlLnR5cGUgPT09ICdoZWFkaW5nJykgYnJlYWtcbiAgICAgIGlmIChub2RlLnRleHQpIHtcbiAgICAgICAgcHJldmlldyArPSBub2RlLnRleHQgKyAnICdcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcHJldmlldy50cmltKCkuc3Vic3RyaW5nKDAsIHByZXZpZXdMZW5ndGgpXG4gIH1cblxuICAvKipcbiAgICog5o+Q5Y+W5paH5pysXG4gICAqL1xuICBwcml2YXRlIGV4dHJhY3RUZXh0KG5vZGVzOiBDb250ZW50Tm9kZVtdKTogc3RyaW5nIHtcbiAgICByZXR1cm4gbm9kZXNcbiAgICAgIC5tYXAoKG5vZGUpID0+IHtcbiAgICAgICAgaWYgKG5vZGUudGV4dCkgcmV0dXJuIG5vZGUudGV4dFxuICAgICAgICBpZiAobm9kZS5jaGlsZHJlbikgcmV0dXJuIHRoaXMuZXh0cmFjdFRleHQobm9kZS5jaGlsZHJlbilcbiAgICAgICAgcmV0dXJuICcnXG4gICAgICB9KVxuICAgICAgLmpvaW4oJ1xcbicpXG4gIH1cblxuICAvKipcbiAgICog5oiq5pat5paH5pysXG4gICAqL1xuICBwcml2YXRlIHRydW5jYXRlVGV4dCh0ZXh0OiBzdHJpbmcsIG1heExlbmd0aDogbnVtYmVyKTogc3RyaW5nIHtcbiAgICBpZiAodGV4dC5sZW5ndGggPD0gbWF4TGVuZ3RoKSByZXR1cm4gdGV4dFxuICAgIHJldHVybiB0ZXh0LnN1YnN0cmluZygwLCBtYXhMZW5ndGgpICsgJy4uLidcbiAgfVxufVxuIl19