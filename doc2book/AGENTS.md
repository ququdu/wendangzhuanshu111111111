# DOC2BOOK - 文档转商业书籍系统

**Generated:** 2026-01-27
**Structure:** Turbo Monorepo
**Stack:** TypeScript, React, Python, FastAPI, Zustand, shadcn/ui

## OVERVIEW
Multi-service monorepo for converting documents into commercially viable books with AI-powered analysis, rewriting, and generation pipeline.

## STRUCTURE
```
doc2book/
├── apps/
│   ├── web/          # React frontend (Next.js)
│   ├── api/          # Python backend (FastAPI)
│   └── processor/    # Document processing service (Node.js)
├── packages/
│   ├── understanding/ # Content analysis & understanding
│   ├── parser/       # Document parsing (PDF, Word, MD)
│   ├── creator/      # Book creation & structure
│   ├── generator/    # Final content generation
│   ├── sanitizer/    # Content cleaning & validation
│   ├── plagiarism/   # Plagiarism detection
│   ├── knowledge/    # Knowledge base integration
│   ├── providers/    # AI provider abstractions
│   └── shared/       # Shared types & utilities
├── turbo.json        # Monorepo build orchestration
├── pnpm-workspace.yaml
└── package.json
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Frontend UI | apps/web/src | Next.js, shadcn/ui, Zustand |
| API Endpoints | apps/api/routers | FastAPI routers |
| Document Processing | apps/processor/src | Node.js service |
| Content Analysis | packages/understanding/src | AI-powered understanding |
| Book Generation | packages/generator/src | Final book creation |
| Types & Interfaces | packages/shared/src | Cross-package types |
| AI Integration | packages/providers/src | Provider abstractions |

## CODE MAP

| Symbol | Type | Location | Role |
|--------|------|----------|------|
| Project | Interface | packages/shared/src | Core project entity |
| Document | Interface | packages/shared/src | Document metadata |
| Task | Interface | apps/web/src/services/api.ts | Processing tasks |
| LogEntry | Class | apps/api/services/logger.py | Logging system |
| useTaskStore | Hook | apps/web/src/stores/task-store.ts | State management |

## CONVENTIONS

**Monorepo:** All packages use workspace:* dependencies
**Frontend:** shadcn/ui + Zustand, TypeScript strict mode
**Backend:** FastAPI with async/await, SQLite + SQLAlchemy
**Naming:** kebab-case files, PascalCase types, camelCase functions
**Chinese:** All user-facing content in Chinese

## ANTI-PATTERNS (THIS PROJECT)

- NEVER use @ts-ignore or any - strict TypeScript only
- NEVER bypass async patterns in Python
- NEVER mix languages within packages (TypeScript stays in packages/, Python in apps/api/)
- NEVER commit API keys or sensitive configs
- NEVER use direct database queries without service layer

## UNIQUE STYLES

**Document Pipeline:** Multi-stage processing (parse → understand → sanitize → create → generate)
**Workspace Packages:** Each stage is separate TypeScript package
**Hybrid Architecture:** Python API + Node.js processor + TypeScript packages
**AI Provider Abstraction:** Pluggable AI backends via providers package

## COMMANDS
```bash
# Development
pnpm dev              # Start all services
pnpm dev:web          # Web only
pnpm dev:api          # API only

# Building
pnpm build            # All packages
pnpm build --filter=@doc2book/understanding  # Single package

# Testing
pnpm test             # All tests
pnpm test --filter=@doc2book/understanding   # Package tests

# Linting
pnpm lint             # All packages
```

## NOTES

- Uses pnpm for workspace management
- SQLite for development, configurable for production
- Uploads stored in apps/api/uploads/
- Build artifacts in dist/ and .next/ directories
- Each package has independent test suite (Vitest for TS, pytest for Python)