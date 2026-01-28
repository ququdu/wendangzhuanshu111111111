"use strict";
/**
 * 相似度检测器
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimilarityChecker = void 0;
class SimilarityChecker {
    providerManager;
    constructor(providerManager) {
        this.providerManager = providerManager;
    }
    /**
     * 检查文本相似度
     */
    async check(text, sources, options) {
        const startTime = Date.now();
        const threshold = options?.threshold || 0.8;
        const chunkSize = options?.chunkSize || 500;
        try {
            // 将文本分块
            const chunks = this.splitIntoChunks(text, chunkSize);
            const matches = [];
            let totalSimilarity = 0;
            for (const chunk of chunks) {
                for (const source of sources) {
                    const similarity = await this.calculateSimilarity(chunk, source, options);
                    if (similarity >= threshold) {
                        matches.push({
                            sourceText: chunk,
                            matchedText: this.findMatchingSection(chunk, source),
                            similarity,
                        });
                    }
                    totalSimilarity = Math.max(totalSimilarity, similarity);
                }
            }
            // 限制匹配数量
            const maxMatches = options?.maxMatches || 10;
            const topMatches = matches
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, maxMatches);
            return {
                success: true,
                score: totalSimilarity,
                matches: topMatches,
                checkTime: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '检测失败',
                score: 0,
                matches: [],
                checkTime: Date.now() - startTime,
            };
        }
    }
    /**
     * 使用 AI 计算相似度
     */
    async calculateSimilarity(text1, text2, options) {
        // 首先使用简单的字符串相似度
        const simpleSimilarity = this.jaroWinkler(text1, text2);
        // 如果简单相似度很低，直接返回
        if (simpleSimilarity < 0.3) {
            return simpleSimilarity;
        }
        // 使用 AI 进行更精确的语义相似度检测
        const prompt = `比较以下两段文本的语义相似度，返回一个 0-1 之间的数字（0 表示完全不同，1 表示完全相同）。只返回数字，不要其他内容。

文本1：
${text1.substring(0, 1000)}

文本2：
${text2.substring(0, 1000)}`;
        const response = await this.providerManager.complete([{ role: 'user', content: prompt }], { providerId: options?.providerId, temperature: 0, maxTokens: 10 });
        if (response.success && response.content) {
            const score = parseFloat(response.content.trim());
            if (!isNaN(score) && score >= 0 && score <= 1) {
                return score;
            }
        }
        return simpleSimilarity;
    }
    /**
     * Jaro-Winkler 相似度算法
     */
    jaroWinkler(s1, s2) {
        if (s1 === s2)
            return 1;
        const len1 = s1.length;
        const len2 = s2.length;
        if (len1 === 0 || len2 === 0)
            return 0;
        const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
        const s1Matches = new Array(len1).fill(false);
        const s2Matches = new Array(len2).fill(false);
        let matches = 0;
        let transpositions = 0;
        for (let i = 0; i < len1; i++) {
            const start = Math.max(0, i - matchDistance);
            const end = Math.min(i + matchDistance + 1, len2);
            for (let j = start; j < end; j++) {
                if (s2Matches[j] || s1[i] !== s2[j])
                    continue;
                s1Matches[i] = true;
                s2Matches[j] = true;
                matches++;
                break;
            }
        }
        if (matches === 0)
            return 0;
        let k = 0;
        for (let i = 0; i < len1; i++) {
            if (!s1Matches[i])
                continue;
            while (!s2Matches[k])
                k++;
            if (s1[i] !== s2[k])
                transpositions++;
            k++;
        }
        const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
        // Winkler 修正
        let prefix = 0;
        for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
            if (s1[i] === s2[i])
                prefix++;
            else
                break;
        }
        return jaro + prefix * 0.1 * (1 - jaro);
    }
    /**
     * 将文本分块
     */
    splitIntoChunks(text, chunkSize) {
        const chunks = [];
        const sentences = text.split(/[。！？.!?]+/);
        let currentChunk = '';
        for (const sentence of sentences) {
            if (currentChunk.length + sentence.length > chunkSize) {
                if (currentChunk)
                    chunks.push(currentChunk.trim());
                currentChunk = sentence;
            }
            else {
                currentChunk += sentence;
            }
        }
        if (currentChunk)
            chunks.push(currentChunk.trim());
        return chunks.filter(c => c.length > 50);
    }
    /**
     * 在源文本中找到匹配的部分
     */
    findMatchingSection(chunk, source) {
        // 简化实现：返回源文本中与 chunk 最相似的部分
        const sourceChunks = this.splitIntoChunks(source, chunk.length);
        let bestMatch = '';
        let bestScore = 0;
        for (const sourceChunk of sourceChunks) {
            const score = this.jaroWinkler(chunk, sourceChunk);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = sourceChunk;
            }
        }
        return bestMatch;
    }
}
exports.SimilarityChecker = SimilarityChecker;
