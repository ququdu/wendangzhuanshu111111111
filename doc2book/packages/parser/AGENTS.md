# PARSER - 文档解析包

**Generated:** 2026-01-31
**Stack:** TypeScript, Node.js, PDF.js, docx-parser

## OVERVIEW
文档解析模块，支持 6 种格式解析，输出统一 AST。

## STRUCTURE
```
packages/parser/src/
├── parsers/              # 格式-specific 解析器
│   ├── pdf-parser.ts    # PDF（文本 + OCR）
│   ├── docx-parser.ts   # Word 文档
│   ├── markdown-parser.ts
│   ├── html-parser.ts
│   ├── txt-parser.ts
│   └── image-parser.ts  # OCR 图片解析
├── utils/
│   ├── ast-builder.ts   # 统一 AST 构建
│   └── language-detect.ts
├── types.ts             # Parser 专用类型
└── document-parser.ts   # 统一入口
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| PDF 解析 | parsers/pdf-parser.ts | 支持 OCR |
| Word 解析 | parsers/docx-parser.ts | docx-parser 库 |
| 统一入口 | document-parser.ts | 自动格式检测 |
| AST 构建 | utils/ast-builder.ts | 统一 AST 结构 |

## CONVENTIONS

**Parser 接口:** 所有解析器实现 `IParser` 接口
**输出格式:** 统一 `UnifiedAST`（来自 shared）
**OCR 集成:** Tesseract.js，支持中英文
**错误处理:** 返回 `ParseResult`，包含 success 字段

## ANTI-PATTERNS (PARSER)

- NEVER 直接解析格式 - 使用 `DocumentParser` 统一入口
- NEVER 硬编码解析选项 - 使用 `ParserOptions` 参数化
- NEVER 返回非标准格式 - 必须转换为 `UnifiedAST`
- NEVER 忽略 OCR 配置 - enableOcr 选项控制

## NOTES

- PDF 解析使用 pdf-parse + Tesseract OCR
- 图片解析使用 Tesseract.js
- 语言检测用于优化 OCR 引擎选择
