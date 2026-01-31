"use strict";
/**
 * 实体检测器
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityDetector = void 0;
class EntityDetector {
    providerManager;
    constructor(providerManager) {
        this.providerManager = providerManager;
    }
    async detect(text, options) {
        const startTime = Date.now();
        try {
            // 规则检测
            const ruleEntities = this.detectByRules(text, options);
            // AI 辅助检测
            if (options?.useAI) {
                const aiEntities = await this.detectByAI(text, options);
                return {
                    success: true,
                    entities: [...ruleEntities, ...(aiEntities || [])],
                    detectionTime: Date.now() - startTime,
                };
            }
            return {
                success: true,
                entities: ruleEntities,
                detectionTime: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '检测失败',
                detectionTime: Date.now() - startTime,
            };
        }
    }
    detectByRules(text, options) {
        const entities = [];
        const types = options?.entityTypes || ['person', 'brand', 'company', 'contact', 'ad', 'url'];
        // URL 检测
        if (types.includes('url')) {
            const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
            let match;
            while ((match = urlRegex.exec(text)) !== null) {
                entities.push({
                    type: 'url',
                    text: match[0],
                    position: { start: match.index, end: match.index + match[0].length },
                    confidence: 1.0,
                });
            }
        }
        // 联系方式检测
        if (types.includes('contact')) {
            // 邮箱
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            let match;
            while ((match = emailRegex.exec(text)) !== null) {
                entities.push({
                    type: 'contact',
                    text: match[0],
                    position: { start: match.index, end: match.index + match[0].length },
                    confidence: 1.0,
                });
            }
            // 电话
            const phoneRegex = /(?:\+?86)?1[3-9]\d{9}|(?:\d{3,4}-)?\d{7,8}/g;
            while ((match = phoneRegex.exec(text)) !== null) {
                entities.push({
                    type: 'contact',
                    text: match[0],
                    position: { start: match.index, end: match.index + match[0].length },
                    confidence: 0.9,
                });
            }
        }
        // 广告检测
        if (types.includes('ad')) {
            const adPatterns = [
                /(?:购买|订购|立即|点击|扫码|关注|加入|领取|免费|优惠|折扣|促销|限时|抢购)/g,
                /(?:微信|公众号|小程序|抖音|快手|淘宝|京东|拼多多)[:：]?\s*[a-zA-Z0-9_]+/g,
            ];
            for (const pattern of adPatterns) {
                let match;
                while ((match = pattern.exec(text)) !== null) {
                    entities.push({
                        type: 'ad',
                        text: match[0],
                        position: { start: match.index, end: match.index + match[0].length },
                        confidence: 0.7,
                    });
                }
            }
        }
        return entities;
    }
    async detectByAI(text, options) {
        const prompt = `请识别以下文本中的敏感实体（人名、品牌、公司名、联系方式、广告内容），以 JSON 数组返回：

${text.substring(0, 5000)}

每个实体包含：type, text, confidence(0-1)

只返回 JSON 数组。
${options.instruction ? `\n附加要求：\n${options.instruction}` : ''}`;
        const response = await this.providerManager.complete([{ role: 'user', content: prompt }], { providerId: options.providerId, temperature: 0.2, maxTokens: 1000 });
        if (!response.success || !response.content)
            return [];
        try {
            const match = response.content.match(/\[[\s\S]*\]/);
            if (!match)
                return [];
            const data = JSON.parse(match[0]);
            return data.map((item) => ({
                type: item.type,
                text: item.text,
                position: { start: text.indexOf(item.text), end: text.indexOf(item.text) + item.text.length },
                confidence: item.confidence || 0.8,
            })).filter((e) => e.position.start >= 0);
        }
        catch {
            return [];
        }
    }
}
exports.EntityDetector = EntityDetector;
