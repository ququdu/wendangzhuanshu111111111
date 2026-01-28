# WEB FRONTEND - React/Next.js Application

**Generated:** 2026-01-27
**Stack:** Next.js 14, React 18, TypeScript, Zustand, shadcn/ui, Tailwind

## OVERVIEW
React frontend for document-to-book conversion pipeline with real-time task monitoring.

## STRUCTURE
```
apps/web/src/
├── app/              # Next.js App Router pages
│   ├── project/      # Project management pages
│   ├── settings/     # Application settings
│   └── logs/         # System logs view
├── components/
│   ├── ui/           # shadcn/ui components (14 files)
│   ├── layout/       # Layout components
│   └── *.tsx         # Feature components
├── hooks/            # Custom React hooks
├── lib/              # Utility functions
├── services/         # API client layer
└── stores/           # Zustand state management
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| UI Components | components/ui/ | shadcn/ui, CVA patterns |
| State Management | stores/ | Zustand stores |
| API Integration | services/api.ts | Centralized API client |
| Custom Hooks | hooks/ | useApi, useToast |
| Utilities | lib/utils.ts | cn(), formatters |
| Pages | app/ | Next.js App Router |

## CONVENTIONS

**Components:** PascalCase, forwardRef, displayName
**UI Library:** shadcn/ui + Radix UI + class-variance-authority
**Styling:** Tailwind + cn() utility, CSS variables for theme
**State:** Zustand stores, no Context API
**API:** Centralized ApiService class with error handling
**Types:** Interface definitions in api.ts

## ANTI-PATTERNS (FRONTEND)

- NEVER use Context API - use Zustand stores instead
- NEVER bypass ApiService - all API calls through api singleton
- NEVER use inline styles - use Tailwind classes + cn()
- NEVER ignore TypeScript errors - strict mode enabled
- NEVER mix business logic in components - use services/stores