# PACKAGES - TypeScript Processing Pipeline

**Generated:** 2026-01-31
**Stack:** TypeScript, Node.js, Vitest, pnpm workspaces

## OVERVIEW
TypeScript packages implementing document processing pipeline with AI.

## STRUCTURE integration and workspace dependencies
```
packages/
├── shared/           # Common types and utilities
├── providers/        # AI provider abstractions
│   └── providers/   # Specific AI integrations
├── parser/          # Document parsing (PDF, Word, MD)
│   ├── parsers/     # Format-specific parsers
│   ├── types/       # Parser type definitions
│   └── utils/       # Parsing utilities
├── understanding/    # AI-powered content analysis
├── sanitizer/       # Content cleaning & validation
├── creator/         # Book structure creation
├── generator/       # Final content generation
├── plagiarism/      # Plagiarism detection
└── knowledge/      # Knowledge base integration
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Core Types | shared/src/ | Interfaces used across packages |
| AI Integration | providers/src/ | Abstract + specific providers |
| Document Parsing | packages/parser/AGENTS.md | Format-specific logic |
| Book Generation | packages/generator/AGENTS.md | EPUB/PDF + KDP |
| Content Analysis | understanding/src/ | AI-powered understanding |
| Book Creation | creator/src/ | Structure and outline generation |
| Content Generation | generator/src/ | Final book output |
| Testing | */src/*.test.ts | Vitest test suites |

## PACKAGE AGENTS.md
以下 packages 拥有独立的 AGENTS.md 文件：

- `packages/parser/AGENTS.md` - 12 文件，6 种格式解析器
- `packages/providers/AGENTS.md` - 8 文件，多 Provider 管理
- `packages/generator/AGENTS.md` - 8 文件，EPUB/PDF 生成

## CONVENTIONS

**Workspace:** Use workspace:* dependencies for internal packages
**Exports:** index.ts barrel exports for clean public APIs
**Types:** All interfaces in shared/ for cross-package usage
**Testing:** Vitest with describe/it patterns, mock external services
**Build:** TypeScript compilation to dist/, strict mode enabled
**Versioning:** Semantic versioning, peer dependencies for shared types

## PACKAGE BOUNDARIES

- shared: Base types, no external dependencies
- providers: AI abstractions, integrations in subdirectory
- parser: Format-specific logic, output standardized structures
- understanding: AI analysis, providers dependency
- sanitizer: Content cleaning, pure functions
- creator: Book structure, understanding + shared dependency
- generator: Final output, all upstream dependencies

## ANTI-PATTERNS (PACKAGES)

- NEVER break package boundaries - use proper dependencies
- NEVER duplicate types - use shared/ for common interfaces
- NEVER create circular dependencies - follow pipeline direction
- NEVER bypass workspace dependencies - use workspace:* references
- NEVER mix concerns in single package - maintain domain separation
- NEVER import from dist/ - always use source imports