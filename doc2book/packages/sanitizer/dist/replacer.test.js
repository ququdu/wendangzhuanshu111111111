"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const replacer_1 = require("./replacer");
(0, vitest_1.describe)("ContentReplacer", () => {
    (0, vitest_1.it)("replaces entities with defaults and custom map", () => {
        const replacer = new replacer_1.ContentReplacer();
        const text = "请联系 test@example.com 或访问 https://example.com";
        const entities = [
            {
                type: "contact",
                text: "test@example.com",
                position: { start: 4, end: 20 },
                confidence: 1,
            },
            {
                type: "url",
                text: "https://example.com",
                position: { start: 24, end: 43 },
                confidence: 1,
            },
        ];
        const result = replacer.replace(text, entities, {
            replacementMap: {
                "test@example.com": "[邮箱已隐藏]",
            },
        });
        (0, vitest_1.expect)(result.sanitizedText).toContain("[邮箱已隐藏]");
        (0, vitest_1.expect)(result.sanitizedText).toContain("[链接已移除]");
        (0, vitest_1.expect)(result.replacements.length).toBe(2);
    });
});
