import { describe, it, expect } from "vitest"
import { ContentReplacer } from "./replacer"

describe("ContentReplacer", () => {
  it("replaces entities with defaults and custom map", () => {
    const replacer = new ContentReplacer()
    const text = "请联系 test@example.com 或访问 https://example.com"

    const entities = [
      {
        type: "contact" as const,
        text: "test@example.com",
        position: { start: 4, end: 20 },
        confidence: 1,
      },
      {
        type: "url" as const,
        text: "https://example.com",
        position: { start: 24, end: 43 },
        confidence: 1,
      },
    ]

    const result = replacer.replace(text, entities, {
      replacementMap: {
        "test@example.com": "[邮箱已隐藏]",
      },
    })

    expect(result.sanitizedText).toContain("[邮箱已隐藏]")
    expect(result.sanitizedText).toContain("[链接已移除]")
    expect(result.replacements.length).toBe(2)
  })
})
