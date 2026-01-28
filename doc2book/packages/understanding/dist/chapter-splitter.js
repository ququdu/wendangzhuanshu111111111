"use strict";
/**
 * 章节分割器
 * 智能分割文档为章节
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChapterSplitter = void 0;
const uuid_1 = require("uuid");
/**
 * 章节分割器类
 */
class ChapterSplitter {
    providerManager;
    constructor(providerManager) {
        this.providerManager = providerManager;
    }
    /**
     * 分割文档为章节
     */
    async split(ast, options) {
        const startTime = Date.now();
        try {
            // 首先使用规则分割
            let chapters = this.splitByRules(ast.content, options);
            // 如果启用 AI 辅助，进一步优化
            if (options?.useAI) {
                chapters = await this.optimizeWithAI(ast.content, chapters, options);
            }
            // 生成建议的书籍结构
            const suggestedStructure = this.generateSuggestedStructure(chapters);
            return {
                success: true,
                chapters,
                suggestedStructure,
                splitTime: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '章节分割失败',
                splitTime: Date.now() - startTime,
            };
        }
    }
    /**
     * 基于规则分割章节
     */
    splitByRules(nodes, options) {
        const chapters = [];
        let currentChapter = null;
        let currentContent = [];
        const minLength = options?.minChapterLength || 500;
        const maxLength = options?.maxChapterLength || 50000;
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            // 检测章节边界
            if (this.isChapterBoundary(node)) {
                // 保存当前章节
                if (currentChapter && currentContent.length > 0) {
                    currentChapter.content = currentContent;
                    currentChapter.wordCount = this.countWords(currentContent);
                    chapters.push(currentChapter);
                }
                // 开始新章节
                currentChapter = {
                    id: (0, uuid_1.v4)(),
                    title: node.text || `第 ${chapters.length + 1} 章`,
                    level: 1,
                    content: [],
                    wordCount: 0,
                    status: 'draft',
                };
                currentContent = [];
            }
            else {
                currentContent.push(node);
            }
        }
        // 保存最后一个章节
        if (currentChapter && currentContent.length > 0) {
            currentChapter.content = currentContent;
            currentChapter.wordCount = this.countWords(currentContent);
            chapters.push(currentChapter);
        }
        // 如果没有检测到章节，将整个文档作为一个章节
        if (chapters.length === 0 && nodes.length > 0) {
            chapters.push({
                id: (0, uuid_1.v4)(),
                title: '正文',
                level: 1,
                content: nodes,
                wordCount: this.countWords(nodes),
                status: 'draft',
            });
        }
        // 处理过长或过短的章节
        return this.balanceChapters(chapters, minLength, maxLength);
    }
    /**
     * 判断是否是章节边界
     */
    isChapterBoundary(node) {
        if (node.type !== 'heading')
            return false;
        if (node.level !== 1)
            return false;
        const text = node.text || '';
        // 检测常见的章节标题模式
        const patterns = [
            /^第[一二三四五六七八九十百千]+章/,
            /^第\d+章/,
            /^Chapter\s+\d+/i,
            /^CHAPTER\s+\d+/,
            /^Part\s+\d+/i,
            /^PART\s+\d+/,
            /^\d+\.\s+/,
        ];
        return patterns.some((pattern) => pattern.test(text));
    }
    /**
     * 平衡章节长度
     */
    balanceChapters(chapters, minLength, maxLength) {
        const balanced = [];
        for (const chapter of chapters) {
            if (chapter.wordCount < minLength && balanced.length > 0) {
                // 合并到上一章
                const lastChapter = balanced[balanced.length - 1];
                lastChapter.content.push(...chapter.content);
                lastChapter.wordCount += chapter.wordCount;
            }
            else if (chapter.wordCount > maxLength) {
                // 拆分章节
                const splitChapters = this.splitLongChapter(chapter, maxLength);
                balanced.push(...splitChapters);
            }
            else {
                balanced.push(chapter);
            }
        }
        return balanced;
    }
    /**
     * 拆分过长的章节
     */
    splitLongChapter(chapter, maxLength) {
        const result = [];
        let currentContent = [];
        let currentWordCount = 0;
        let partIndex = 1;
        for (const node of chapter.content) {
            const nodeWordCount = this.countWords([node]);
            if (currentWordCount + nodeWordCount > maxLength && currentContent.length > 0) {
                // 创建新章节
                result.push({
                    id: (0, uuid_1.v4)(),
                    title: `${chapter.title}（${partIndex}）`,
                    level: chapter.level,
                    content: currentContent,
                    wordCount: currentWordCount,
                    status: 'draft',
                });
                currentContent = [];
                currentWordCount = 0;
                partIndex++;
            }
            currentContent.push(node);
            currentWordCount += nodeWordCount;
        }
        // 添加最后一部分
        if (currentContent.length > 0) {
            result.push({
                id: (0, uuid_1.v4)(),
                title: partIndex > 1 ? `${chapter.title}（${partIndex}）` : chapter.title,
                level: chapter.level,
                content: currentContent,
                wordCount: currentWordCount,
                status: 'draft',
            });
        }
        return result;
    }
    /**
     * 使用 AI 优化章节分割
     */
    async optimizeWithAI(nodes, chapters, options) {
        // 提取章节标题用于 AI 分析
        const chapterTitles = chapters.map((c, i) => ({
            index: i,
            title: c.title,
            wordCount: c.wordCount,
        }));
        const prompt = `请分析以下章节结构，并提供优化建议：

当前章节：
${JSON.stringify(chapterTitles, null, 2)}

请以 JSON 格式返回优化建议：
{
  "suggestions": [
    {
      "index": 0,
      "suggestedTitle": "建议的标题",
      "shouldMergeWith": null 或 下一章索引,
      "shouldSplit": false
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
            return chapters;
        }
        try {
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (!jsonMatch)
                return chapters;
            const data = JSON.parse(jsonMatch[0]);
            if (!data.suggestions || !Array.isArray(data.suggestions))
                return chapters;
            // 应用建议
            return chapters.map((chapter, index) => {
                const suggestion = data.suggestions.find((s) => s.index === index);
                if (suggestion?.suggestedTitle) {
                    return {
                        ...chapter,
                        title: suggestion.suggestedTitle,
                    };
                }
                return chapter;
            });
        }
        catch {
            return chapters;
        }
    }
    /**
     * 生成建议的书籍结构
     */
    generateSuggestedStructure(chapters) {
        const totalWordCount = chapters.reduce((sum, c) => sum + c.wordCount, 0);
        return {
            needsPreface: totalWordCount > 10000,
            needsIntroduction: chapters.length > 3,
            needsConclusion: chapters.length > 3,
            needsAppendix: false,
            suggestedParts: this.suggestParts(chapters),
        };
    }
    /**
     * 建议部分划分
     */
    suggestParts(chapters) {
        if (chapters.length < 6)
            return undefined;
        // 简单地将章节分为几个部分
        const partsCount = Math.ceil(chapters.length / 4);
        const chaptersPerPart = Math.ceil(chapters.length / partsCount);
        const parts = [];
        for (let i = 0; i < partsCount; i++) {
            const startIndex = i * chaptersPerPart;
            const endIndex = Math.min(startIndex + chaptersPerPart, chapters.length);
            const partChapters = chapters.slice(startIndex, endIndex);
            parts.push({
                title: `第${this.toChineseNumber(i + 1)}部分`,
                chapterIds: partChapters.map((c) => c.id),
            });
        }
        return parts;
    }
    /**
     * 计算字数
     */
    countWords(nodes) {
        let count = 0;
        for (const node of nodes) {
            if (node.text) {
                // 中文按字符计数，英文按单词计数
                const chineseChars = (node.text.match(/[\u4e00-\u9fa5]/g) || []).length;
                const englishWords = (node.text.match(/[a-zA-Z]+/g) || []).length;
                count += chineseChars + englishWords;
            }
            if (node.children) {
                count += this.countWords(node.children);
            }
        }
        return count;
    }
    /**
     * 数字转中文
     */
    toChineseNumber(num) {
        const chars = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
        if (num <= 10)
            return chars[num];
        if (num < 20)
            return '十' + (num % 10 === 0 ? '' : chars[num % 10]);
        return num.toString();
    }
}
exports.ChapterSplitter = ChapterSplitter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcHRlci1zcGxpdHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9jaGFwdGVyLXNwbGl0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7OztBQUVILCtCQUFtQztBQUtuQzs7R0FFRztBQUNILE1BQWEsZUFBZTtJQUNsQixlQUFlLENBQWlCO0lBRXhDLFlBQVksZUFBZ0M7UUFDMUMsSUFBSSxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUE7SUFDeEMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFlLEVBQUUsT0FBNkI7UUFDeEQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBRTVCLElBQUksQ0FBQztZQUNILFdBQVc7WUFDWCxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFFdEQsbUJBQW1CO1lBQ25CLElBQUksT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDO2dCQUNuQixRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ3RFLENBQUM7WUFFRCxZQUFZO1lBQ1osTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsUUFBUSxDQUFDLENBQUE7WUFFcEUsT0FBTztnQkFDTCxPQUFPLEVBQUUsSUFBSTtnQkFDYixRQUFRO2dCQUNSLGtCQUFrQjtnQkFDbEIsU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxTQUFTO2FBQ2xDLENBQUE7UUFDSCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE9BQU87Z0JBQ0wsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsS0FBSyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtB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R0FBRyxDQUFDLENBQUE7UUFDckUsSUFBSSxHQUFHLElBQUksRUFBRTtZQUFFLE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2hDLElBQUksR0FBRyxHQUFHLEVBQUU7WUFBRSxPQUFPLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsRSxPQUFPLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUN2QixDQUFDO0NBQ0Y7QUFuVkQsMENBbVZDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiDnq6DoioLliIblibLlmahcbiAqIOaZuuiDveWIhuWJsuaWh+aho+S4uueroOiKglxuICovXG5cbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gJ3V1aWQnXG5pbXBvcnQgdHlwZSB7IFVuaWZpZWRBU1QsIENvbnRlbnROb2RlLCBDaGFwdGVyIH0gZnJvbSAnQGRvYzJib29rL3NoYXJlZCdcbmltcG9ydCB0eXBlIHsgUHJvdmlkZXJNYW5hZ2VyIH0gZnJvbSAnQGRvYzJib29rL3Byb3ZpZGVycydcbmltcG9ydCB0eXBlIHsgQ2hhcHRlclNwbGl0UmVzdWx0LCBDaGFwdGVyU3BsaXRPcHRpb25zIH0gZnJvbSAnLi90eXBlcydcblxuLyoqXG4gKiDnq6DoioLliIblibLlmajnsbtcbiAqL1xuZXhwb3J0IGNsYXNzIENoYXB0ZXJTcGxpdHRlciB7XG4gIHByaXZhdGUgcHJvdmlkZXJNYW5hZ2VyOiBQcm92aWRlck1hbmFnZXJcblxuICBjb25zdHJ1Y3Rvcihwcm92aWRlck1hbmFnZXI6IFByb3ZpZGVyTWFuYWdlcikge1xuICAgIHRoaXMucHJvdmlkZXJNYW5hZ2VyID0gcHJvdmlkZXJNYW5hZ2VyXG4gIH1cblxuICAvKipcbiAgICog5YiG5Ymy5paH5qGj5Li656ug6IqCXG4gICAqL1xuICBhc3luYyBzcGxpdChhc3Q6IFVuaWZpZWRBU1QsIG9wdGlvbnM/OiBDaGFwdGVyU3BsaXRPcHRpb25zKTogUHJvbWlzZTxDaGFwdGVyU3BsaXRSZXN1bHQ+IHtcbiAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpXG5cbiAgICB0cnkge1xuICAgICAgLy8g6aaW5YWI5L2/55So6KeE5YiZ5YiG5YmyXG4gICAgICBsZXQgY2hhcHRlcnMgPSB0aGlzLnNwbGl0QnlSdWxlcyhhc3QuY29udGVudCwgb3B0aW9ucylcblxuICAgICAgLy8g5aaC5p6c5ZCv55SoIEFJIOi+heWKqe+8jOi/m+S4gOatpeS8mOWMllxuICAgICAgaWYgKG9wdGlvbnM/LnVzZUFJKSB7XG4gICAgICAgIGNoYXB0ZXJzID0gYXdhaXQgdGhpcy5vcHRpbWl6ZVdpdGhBSShhc3QuY29udGVudCwgY2hhcHRlcnMsIG9wdGlvbnMpXG4gICAgICB9XG5cbiAgICAgIC8vIOeUn+aIkOW7uuiurueahOS5puexjee7k+aehFxuICAgICAgY29uc3Qgc3VnZ2VzdGVkU3RydWN0dXJlID0gdGhpcy5nZW5lcmF0ZVN1Z2dlc3RlZFN0cnVjdHVyZShjaGFwdGVycylcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgY2hhcHRlcnMsXG4gICAgICAgIHN1Z2dlc3RlZFN0cnVjdHVyZSxcbiAgICAgICAgc3BsaXRUaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ+eroOiKguWIhuWJsuWksei0pScsXG4gICAgICAgIHNwbGl0VGltZTogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSxcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog5Z+65LqO6KeE5YiZ5YiG5Ymy56ug6IqCXG4gICAqL1xuICBwcml2YXRlIHNwbGl0QnlSdWxlcyhub2RlczogQ29udGVudE5vZGVbXSwgb3B0aW9ucz86IENoYXB0ZXJTcGxpdE9wdGlvbnMpOiBDaGFwdGVyW10ge1xuICAgIGNvbnN0IGNoYXB0ZXJzOiBDaGFwdGVyW10gPSBbXVxuICAgIGxldCBjdXJyZW50Q2hhcHRlcjogQ2hhcHRlciB8IG51bGwgPSBudWxsXG4gICAgbGV0IGN1cnJlbnRDb250ZW50OiBDb250ZW50Tm9kZVtdID0gW11cblxuICAgIGNvbnN0IG1pbkxlbmd0aCA9IG9wdGlvbnM/Lm1pbkNoYXB0ZXJMZW5ndGggfHwgNTAwXG4gICAgY29uc3QgbWF4TGVuZ3RoID0gb3B0aW9ucz8ubWF4Q2hhcHRlckxlbmd0aCB8fCA1MDAwMFxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3Qgbm9kZSA9IG5vZGVzW2ldXG5cbiAgICAgIC8vIOajgOa1i+eroOiKgui+ueeVjFxuICAgICAgaWYgKHRoaXMuaXNDaGFwdGVyQm91bmRhcnkobm9kZSkpIHtcbiAgICAgICAgLy8g5L+d5a2Y5b2T5YmN56ug6IqCXG4gICAgICAgIGlmIChjdXJyZW50Q2hhcHRlciAmJiBjdXJyZW50Q29udGVudC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY3VycmVudENoYXB0ZXIuY29udGVudCA9IGN1cnJlbnRDb250ZW50XG4gICAgICAgICAgY3VycmVudENoYXB0ZXIud29yZENvdW50ID0gdGhpcy5jb3VudFdvcmRzKGN1cnJlbnRDb250ZW50KVxuICAgICAgICAgIGNoYXB0ZXJzLnB1c2goY3VycmVudENoYXB0ZXIpXG4gICAgICAgIH1cblxuICAgICAgICAvLyDlvIDlp4vmlrDnq6DoioJcbiAgICAgICAgY3VycmVudENoYXB0ZXIgPSB7XG4gICAgICAgICAgaWQ6IHV1aWR2NCgpLFxuICAgICAgICAgIHRpdGxlOiBub2RlLnRleHQgfHwgYOesrCAke2NoYXB0ZXJzLmxlbmd0aCArIDF9IOeroGAsXG4gICAgICAgICAgbGV2ZWw6IDEsXG4gICAgICAgICAgY29udGVudDogW10sXG4gICAgICAgICAgd29yZENvdW50OiAwLFxuICAgICAgICAgIHN0YXR1czogJ2RyYWZ0JyxcbiAgICAgICAgfVxuICAgICAgICBjdXJyZW50Q29udGVudCA9IFtdXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjdXJyZW50Q29udGVudC5wdXNoKG5vZGUpXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8g5L+d5a2Y5pyA5ZCO5LiA5Liq56ug6IqCXG4gICAgaWYgKGN1cnJlbnRDaGFwdGVyICYmIGN1cnJlbnRDb250ZW50Lmxlbmd0aCA+IDApIHtcbiAgICAgIGN1cnJlbnRDaGFwdGVyLmNvbnRlbnQgPSBjdXJyZW50Q29udGVudFxuICAgICAgY3VycmVudENoYXB0ZXIud29yZENvdW50ID0gdGhpcy5jb3VudFdvcmRzKGN1cnJlbnRDb250ZW50KVxuICAgICAgY2hhcHRlcnMucHVzaChjdXJyZW50Q2hhcHRlcilcbiAgICB9XG5cbiAgICAvLyDlpoLmnpzmsqHmnInmo4DmtYvliLDnq6DoioLvvIzlsIbmlbTkuKrmlofmoaPkvZzkuLrkuIDkuKrnq6DoioJcbiAgICBpZiAoY2hhcHRlcnMubGVuZ3RoID09PSAwICYmIG5vZGVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGNoYXB0ZXJzLnB1c2goe1xuICAgICAgICBpZDogdXVpZHY0KCksXG4gICAgICAgIHRpdGxlOiAn5q2j5paHJyxcbiAgICAgICAgbGV2ZWw6IDEsXG4gICAgICAgIGNvbnRlbnQ6IG5vZGVzLFxuICAgICAgICB3b3JkQ291bnQ6IHRoaXMuY291bnRXb3Jkcyhub2RlcyksXG4gICAgICAgIHN0YXR1czogJ2RyYWZ0JyxcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgLy8g5aSE55CG6L+H6ZW/5oiW6L+H55+t55qE56ug6IqCXG4gICAgcmV0dXJuIHRoaXMuYmFsYW5jZUNoYXB0ZXJzKGNoYXB0ZXJzLCBtaW5MZW5ndGgsIG1heExlbmd0aClcbiAgfVxuXG4gIC8qKlxuICAgKiDliKTmlq3mmK/lkKbmmK/nq6DoioLovrnnlYxcbiAgICovXG4gIHByaXZhdGUgaXNDaGFwdGVyQm91bmRhcnkobm9kZTogQ29udGVudE5vZGUpOiBib29sZWFuIHtcbiAgICBpZiAobm9kZS50eXBlICE9PSAnaGVhZGluZycpIHJldHVybiBmYWxzZVxuICAgIGlmIChub2RlLmxldmVsICE9PSAxKSByZXR1cm4gZmFsc2VcblxuICAgIGNvbnN0IHRleHQgPSBub2RlLnRleHQgfHwgJydcblxuICAgIC8vIOajgOa1i+W4uOingeeahOeroOiKguagh+mimOaooeW8j1xuICAgIGNvbnN0IHBhdHRlcm5zID0gW1xuICAgICAgL17nrKxb5LiA5LqM5LiJ5Zub5LqU5YWt5LiD5YWr5Lmd5Y2B55m+5Y2DXSvnq6AvLFxuICAgICAgL17nrKxcXGQr56ugLyxcbiAgICAgIC9eQ2hhcHRlclxccytcXGQrL2ksXG4gICAgICAvXkNIQVBURVJcXHMrXFxkKy8sXG4gICAgICAvXlBhcnRcXHMrXFxkKy9pLFxuICAgICAgL15QQVJUXFxzK1xcZCsvLFxuICAgICAgL15cXGQrXFwuXFxzKy8sXG4gICAgXVxuXG4gICAgcmV0dXJuIHBhdHRlcm5zLnNvbWUoKHBhdHRlcm4pID0+IHBhdHRlcm4udGVzdCh0ZXh0KSlcbiAgfVxuXG4gIC8qKlxuICAgKiDlubPooaHnq6DoioLplb/luqZcbiAgICovXG4gIHByaXZhdGUgYmFsYW5jZUNoYXB0ZXJzKFxuICAgIGNoYXB0ZXJzOiBDaGFwdGVyW10sXG4gICAgbWluTGVuZ3RoOiBudW1iZXIsXG4gICAgbWF4TGVuZ3RoOiBudW1iZXJcbiAgKTogQ2hhcHRlcltdIHtcbiAgICBjb25zdCBiYWxhbmNlZDogQ2hhcHRlcltdID0gW11cblxuICAgIGZvciAoY29uc3QgY2hhcHRlciBvZiBjaGFwdGVycykge1xuICAgICAgaWYgKGNoYXB0ZXIud29yZENvdW50IDwgbWluTGVuZ3RoICYmIGJhbGFuY2VkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgLy8g5ZCI5bm25Yiw5LiK5LiA56ugXG4gICAgICAgIGNvbnN0IGxhc3RDaGFwdGVyID0gYmFsYW5jZWRbYmFsYW5jZWQubGVuZ3RoIC0gMV1cbiAgICAgICAgbGFzdENoYXB0ZXIuY29udGVudC5wdXNoKC4uLmNoYXB0ZXIuY29udGVudClcbiAgICAgICAgbGFzdENoYXB0ZXIud29yZENvdW50ICs9IGNoYXB0ZXIud29yZENvdW50XG4gICAgICB9IGVsc2UgaWYgKGNoYXB0ZXIud29yZENvdW50ID4gbWF4TGVuZ3RoKSB7XG4gICAgICAgIC8vIOaLhuWIhueroOiKglxuICAgICAgICBjb25zdCBzcGxpdENoYXB0ZXJzID0gdGhpcy5zcGxpdExvbmdDaGFwdGVyKGNoYXB0ZXIsIG1heExlbmd0aClcbiAgICAgICAgYmFsYW5jZWQucHVzaCguLi5zcGxpdENoYXB0ZXJzKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYmFsYW5jZWQucHVzaChjaGFwdGVyKVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBiYWxhbmNlZFxuICB9XG5cbiAgLyoqXG4gICAqIOaLhuWIhui/h+mVv+eahOeroOiKglxuICAgKi9cbiAgcHJpdmF0ZSBzcGxpdExvbmdDaGFwdGVyKGNoYXB0ZXI6IENoYXB0ZXIsIG1heExlbmd0aDogbnVtYmVyKTogQ2hhcHRlcltdIHtcbiAgICBjb25zdCByZXN1bHQ6IENoYXB0ZXJbXSA9IFtdXG4gICAgbGV0IGN1cnJlbnRDb250ZW50OiBDb250ZW50Tm9kZVtdID0gW11cbiAgICBsZXQgY3VycmVudFdvcmRDb3VudCA9IDBcbiAgICBsZXQgcGFydEluZGV4ID0gMVxuXG4gICAgZm9yIChjb25zdCBub2RlIG9mIGNoYXB0ZXIuY29udGVudCkge1xuICAgICAgY29uc3Qgbm9kZVdvcmRDb3VudCA9IHRoaXMuY291bnRXb3Jkcyhbbm9kZV0pXG5cbiAgICAgIGlmIChjdXJyZW50V29yZENvdW50ICsgbm9kZVdvcmRDb3VudCA+IG1heExlbmd0aCAmJiBjdXJyZW50Q29udGVudC5sZW5ndGggPiAwKSB7XG4gICAgICAgIC8vIOWIm+W7uuaWsOeroOiKglxuICAgICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgICAgaWQ6IHV1aWR2NCgpLFxuICAgICAgICAgIHRpdGxlOiBgJHtjaGFwdGVyLnRpdGxlfe+8iCR7cGFydEluZGV4fe+8iWAsXG4gICAgICAgICAgbGV2ZWw6IGNoYXB0ZXIubGV2ZWwsXG4gICAgICAgICAgY29udGVudDogY3VycmVudENvbnRlbnQsXG4gICAgICAgICAgd29yZENvdW50OiBjdXJyZW50V29yZENvdW50LFxuICAgICAgICAgIHN0YXR1czogJ2RyYWZ0JyxcbiAgICAgICAgfSlcblxuICAgICAgICBjdXJyZW50Q29udGVudCA9IFtdXG4gICAgICAgIGN1cnJlbnRXb3JkQ291bnQgPSAwXG4gICAgICAgIHBhcnRJbmRleCsrXG4gICAgICB9XG5cbiAgICAgIGN1cnJlbnRDb250ZW50LnB1c2gobm9kZSlcbiAgICAgIGN1cnJlbnRXb3JkQ291bnQgKz0gbm9kZVdvcmRDb3VudFxuICAgIH1cblxuICAgIC8vIOa3u+WKoOacgOWQjuS4gOmDqOWIhlxuICAgIGlmIChjdXJyZW50Q29udGVudC5sZW5ndGggPiAwKSB7XG4gICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgIGlkOiB1dWlkdjQoKSxcbiAgICAgICAgdGl0bGU6IHBhcnRJbmRleCA+IDEgPyBgJHtjaGFwdGVyLnRpdGxlfe+8iCR7cGFydEluZGV4fe+8iWAgOiBjaGFwdGVyLnRpdGxlLFxuICAgICAgICBsZXZlbDogY2hhcHRlci5sZXZlbCxcbiAgICAgICAgY29udGVudDogY3VycmVudENvbnRlbnQsXG4gICAgICAgIHdvcmRDb3VudDogY3VycmVudFdvcmRDb3VudCxcbiAgICAgICAgc3RhdHVzOiAnZHJhZnQnLFxuICAgICAgfSlcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cblxuICAvKipcbiAgICog5L2/55SoIEFJIOS8mOWMlueroOiKguWIhuWJslxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBvcHRpbWl6ZVdpdGhBSShcbiAgICBub2RlczogQ29udGVudE5vZGVbXSxcbiAgICBjaGFwdGVyczogQ2hhcHRlcltdLFxuICAgIG9wdGlvbnM6IENoYXB0ZXJTcGxpdE9wdGlvbnNcbiAgKTogUHJvbWlzZTxDaGFwdGVyW10+IHtcbiAgICAvLyDmj5Dlj5bnq6DoioLmoIfpopjnlKjkuo4gQUkg5YiG5p6QXG4gICAgY29uc3QgY2hhcHRlclRpdGxlcyA9IGNoYXB0ZXJzLm1hcCgoYywgaSkgPT4gKHtcbiAgICAgIGluZGV4OiBpLFxuICAgICAgdGl0bGU6IGMudGl0bGUsXG4gICAgICB3b3JkQ291bnQ6IGMud29yZENvdW50LFxuICAgIH0pKVxuXG4gICAgY29uc3QgcHJvbXB0ID0gYOivt+WIhuaekOS7peS4i+eroOiKgue7k+aehO+8jOW5tuaPkOS+m+S8mOWMluW7uuiuru+8mlxuXG7lvZPliY3nq6DoioLvvJpcbiR7SlNPTi5zdHJpbmdpZnkoY2hhcHRlclRpdGxlcywgbnVsbCwgMil9XG5cbuivt+S7pSBKU09OIOagvOW8j+i/lOWbnuS8mOWMluW7uuiuru+8mlxue1xuICBcInN1Z2dlc3Rpb25zXCI6IFtcbiAgICB7XG4gICAgICBcImluZGV4XCI6IDAsXG4gICAgICBcInN1Z2dlc3RlZFRpdGxlXCI6IFwi5bu66K6u55qE5qCH6aKYXCIsXG4gICAgICBcInNob3VsZE1lcmdlV2l0aFwiOiBudWxsIOaIliDkuIvkuIDnq6DntKLlvJUsXG4gICAgICBcInNob3VsZFNwbGl0XCI6IGZhbHNlXG4gICAgfVxuICBdXG59XG5cbuWPqui/lOWbniBKU09O77yM5LiN6KaB5YW25LuW5YaF5a6544CCYFxuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnByb3ZpZGVyTWFuYWdlci5jb21wbGV0ZShcbiAgICAgIFt7IHJvbGU6ICd1c2VyJywgY29udGVudDogcHJvbXB0IH1dLFxuICAgICAge1xuICAgICAgICBwcm92aWRlcklkOiBvcHRpb25zLnByb3ZpZGVySWQsXG4gICAgICAgIHRlbXBlcmF0dXJlOiAwLjIsXG4gICAgICAgIG1heFRva2VuczogMTAwMCxcbiAgICAgIH1cbiAgICApXG5cbiAgICBpZiAoIXJlc3BvbnNlLnN1Y2Nlc3MgfHwgIXJlc3BvbnNlLmNvbnRlbnQpIHtcbiAgICAgIHJldHVybiBjaGFwdGVyc1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBqc29uTWF0Y2ggPSByZXNwb25zZS5jb250ZW50Lm1hdGNoKC9cXHtbXFxzXFxTXSpcXH0vKVxuICAgICAgaWYgKCFqc29uTWF0Y2gpIHJldHVybiBjaGFwdGVyc1xuXG4gICAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShqc29uTWF0Y2hbMF0pXG4gICAgICBpZiAoIWRhdGEuc3VnZ2VzdGlvbnMgfHwgIUFycmF5LmlzQXJyYXkoZGF0YS5zdWdnZXN0aW9ucykpIHJldHVybiBjaGFwdGVyc1xuXG4gICAgICAvLyDlupTnlKjlu7rorq5cbiAgICAgIHJldHVybiBjaGFwdGVycy5tYXAoKGNoYXB0ZXIsIGluZGV4KSA9PiB7XG4gICAgICAgIGNvbnN0IHN1Z2dlc3Rpb24gPSBkYXRhLnN1Z2dlc3Rpb25zLmZpbmQoKHM6IGFueSkgPT4gcy5pbmRleCA9PT0gaW5kZXgpXG4gICAgICAgIGlmIChzdWdnZXN0aW9uPy5zdWdnZXN0ZWRUaXRsZSkge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAuLi5jaGFwdGVyLFxuICAgICAgICAgICAgdGl0bGU6IHN1Z2dlc3Rpb24uc3VnZ2VzdGVkVGl0bGUsXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjaGFwdGVyXG4gICAgICB9KVxuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIGNoYXB0ZXJzXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOeUn+aIkOW7uuiurueahOS5puexjee7k+aehFxuICAgKi9cbiAgcHJpdmF0ZSBnZW5lcmF0ZVN1Z2dlc3RlZFN0cnVjdHVyZShjaGFwdGVyczogQ2hhcHRlcltdKTogQ2hhcHRlclNwbGl0UmVzdWx0WydzdWdnZXN0ZWRTdHJ1Y3R1cmUnXSB7XG4gICAgY29uc3QgdG90YWxXb3JkQ291bnQgPSBjaGFwdGVycy5yZWR1Y2UoKHN1bSwgYykgPT4gc3VtICsgYy53b3JkQ291bnQsIDApXG5cbiAgICByZXR1cm4ge1xuICAgICAgbmVlZHNQcmVmYWNlOiB0b3RhbFdvcmRDb3VudCA+IDEwMDAwLFxuICAgICAgbmVlZHNJbnRyb2R1Y3Rpb246IGNoYXB0ZXJzLmxlbmd0aCA+IDMsXG4gICAgICBuZWVkc0NvbmNsdXNpb246IGNoYXB0ZXJzLmxlbmd0aCA+IDMsXG4gICAgICBuZWVkc0FwcGVuZGl4OiBmYWxzZSxcbiAgICAgIHN1Z2dlc3RlZFBhcnRzOiB0aGlzLnN1Z2dlc3RQYXJ0cyhjaGFwdGVycyksXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOW7uuiurumDqOWIhuWIkuWIhlxuICAgKi9cbiAgcHJpdmF0ZSBzdWdnZXN0UGFydHMoY2hhcHRlcnM6IENoYXB0ZXJbXSk6IEFycmF5PHsgdGl0bGU6IHN0cmluZzsgY2hhcHRlcklkczogc3RyaW5nW10gfT4gfCB1bmRlZmluZWQge1xuICAgIGlmIChjaGFwdGVycy5sZW5ndGggPCA2KSByZXR1cm4gdW5kZWZpbmVkXG5cbiAgICAvLyDnroDljZXlnLDlsIbnq6DoioLliIbkuLrlh6DkuKrpg6jliIZcbiAgICBjb25zdCBwYXJ0c0NvdW50ID0gTWF0aC5jZWlsKGNoYXB0ZXJzLmxlbmd0aCAvIDQpXG4gICAgY29uc3QgY2hhcHRlcnNQZXJQYXJ0ID0gTWF0aC5jZWlsKGNoYXB0ZXJzLmxlbmd0aCAvIHBhcnRzQ291bnQpXG4gICAgY29uc3QgcGFydHM6IEFycmF5PHsgdGl0bGU6IHN0cmluZzsgY2hhcHRlcklkczogc3RyaW5nW10gfT4gPSBbXVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJ0c0NvdW50OyBpKyspIHtcbiAgICAgIGNvbnN0IHN0YXJ0SW5kZXggPSBpICogY2hhcHRlcnNQZXJQYXJ0XG4gICAgICBjb25zdCBlbmRJbmRleCA9IE1hdGgubWluKHN0YXJ0SW5kZXggKyBjaGFwdGVyc1BlclBhcnQsIGNoYXB0ZXJzLmxlbmd0aClcbiAgICAgIGNvbnN0IHBhcnRDaGFwdGVycyA9IGNoYXB0ZXJzLnNsaWNlKHN0YXJ0SW5kZXgsIGVuZEluZGV4KVxuXG4gICAgICBwYXJ0cy5wdXNoKHtcbiAgICAgICAgdGl0bGU6IGDnrKwke3RoaXMudG9DaGluZXNlTnVtYmVyKGkgKyAxKX3pg6jliIZgLFxuICAgICAgICBjaGFwdGVySWRzOiBwYXJ0Q2hhcHRlcnMubWFwKChjKSA9PiBjLmlkKSxcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcnRzXG4gIH1cblxuICAvKipcbiAgICog6K6h566X5a2X5pWwXG4gICAqL1xuICBwcml2YXRlIGNvdW50V29yZHMobm9kZXM6IENvbnRlbnROb2RlW10pOiBudW1iZXIge1xuICAgIGxldCBjb3VudCA9IDBcblxuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgaWYgKG5vZGUudGV4dCkge1xuICAgICAgICAvLyDkuK3mlofmjInlrZfnrKborqHmlbDvvIzoi7HmlofmjInljZXor43orqHmlbBcbiAgICAgICAgY29uc3QgY2hpbmVzZUNoYXJzID0gKG5vZGUudGV4dC5tYXRjaCgvW1xcdTRlMDAtXFx1OWZhNV0vZykgfHwgW10pLmxlbmd0aFxuICAgICAgICBjb25zdCBlbmdsaXNoV29yZHMgPSAobm9kZS50ZXh0Lm1hdGNoKC9bYS16QS1aXSsvZykgfHwgW10pLmxlbmd0aFxuICAgICAgICBjb3VudCArPSBjaGluZXNlQ2hhcnMgKyBlbmdsaXNoV29yZHNcbiAgICAgIH1cbiAgICAgIGlmIChub2RlLmNoaWxkcmVuKSB7XG4gICAgICAgIGNvdW50ICs9IHRoaXMuY291bnRXb3Jkcyhub2RlLmNoaWxkcmVuKVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjb3VudFxuICB9XG5cbiAgLyoqXG4gICAqIOaVsOWtl+i9rOS4reaWh1xuICAgKi9cbiAgcHJpdmF0ZSB0b0NoaW5lc2VOdW1iZXIobnVtOiBudW1iZXIpOiBzdHJpbmcge1xuICAgIGNvbnN0IGNoYXJzID0gWyfpm7YnLCAn5LiAJywgJ+S6jCcsICfkuIknLCAn5ZubJywgJ+S6lCcsICflha0nLCAn5LiDJywgJ+WFqycsICfkuZ0nLCAn5Y2BJ11cbiAgICBpZiAobnVtIDw9IDEwKSByZXR1cm4gY2hhcnNbbnVtXVxuICAgIGlmIChudW0gPCAyMCkgcmV0dXJuICfljYEnICsgKG51bSAlIDEwID09PSAwID8gJycgOiBjaGFyc1tudW0gJSAxMF0pXG4gICAgcmV0dXJuIG51bS50b1N0cmluZygpXG4gIH1cbn1cbiJdfQ==