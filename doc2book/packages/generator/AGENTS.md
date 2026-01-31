# GENERATOR - 书籍生成包

**Generated:** 2026-01-31
**Stack:** TypeScript, EPUBKit, PDFKit

## OVERVIEW
书籍生成模块，输出 KDP 兼容的 EPUB 和 PDF 格式。

## STRUCTURE
```
packages/generator/src/
├── epub-generator.ts   # EPUB 生成
├── pdf-generator.ts    # PDF 生成
├── toc-generator.ts    # 目录生成
├── cover-generator.ts  # 封面生成
├── kdp-validator.ts    # KDP 验证
├── book-generator.ts   # 统一入口
└── types.ts            # 生成类型
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| EPUB 生成 | epub-generator.ts | KDP 兼容 |
| PDF 生成 | pdf-generator.ts | 打印版 |
| 封面生成 | cover-generator.ts | 标题/作者/背景 |
| KDP 验证 | kdp-validator.ts | 格式校验 |
| 统一入口 | book-generator.ts | `createBookGenerator` |

## CONVENTIONS

**输入:** `BookStructure`（来自 shared）
**输出:** `GeneratorResult`，包含 files 数组
**KDP 验证:** 生成后自动验证，或通过 `validateKdp` 选项控制
**文件组织:** 按 format 分离输出

## ANTI-PATTERNS (GENERATOR)

- NEVER 直接生成分格式 - 使用 `BookGenerator` 统一入口
- NEVER 硬编码 KDP 规则 - 使用 `KdpValidator`
- NEVER 忽略字体嵌入 - PDF 需要嵌入字体
- NEVER 混合 EPUB/PDF 逻辑 - 各自独立生成器
- NEVER 生成非 KDP 兼容格式 - 验证通过后才能交付

## NOTES

- EPUB 使用 EPUB 3.0 标准，兼容 KDP
- PDF 支持自定义字体和页码
- 封面生成支持图片背景和文字叠加
- KDP 验证检查文件大小、格式、Metada
