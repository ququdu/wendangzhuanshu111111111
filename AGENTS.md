# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-31
**Status:** Active Monorepo - doc2book 系统

## OVERVIEW
文档转商业书籍系统，位于 `D:\项目下载解压查看\文档转书`。项目已初始化，包含完整的多服务 monorepo 代码。

## STRUCTURE
```
./
└── doc2book/            # 主项目（Turbo Monorepo）
    ├── apps/
    │   ├── web/        # React 前端
    │   ├── api/        # FastAPI 后端
    │   └── processor/  # Node.js 处理服务
    └── packages/       # TypeScript 处理包（8个）
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| 项目主配置 | doc2book/AGENTS.md | 完整项目文档 |
| 全局配置 | `C:\Users\财务\.config\opencode\AGENTS.md` | 全局开发规范 |
| 前端 | doc2book/apps/web/src/AGENTS.md | React/Next.js |
| 后端 | doc2book/apps/api/AGENTS.md | FastAPI/Python |
| Packages | doc2book/packages/AGENTS.md | 8 个处理包 |

## CONVENTIONS
项目规范继承全局配置，额外约定：

- **语言**: 强制简体中文（文档、注释、日志）
- **包管理器**: pnpm
- **操作系统**: Windows 11
- **文件操作**: 必须使用专用工具，禁止 bash 操作文件

## ANTI-PATTERNS (THIS PROJECT)

继承全局反模式，并增加：

- **根目录禁止**: 直接修改根目录 AGENTS.md，请更新 doc2book/
- **包边界**: 禁止跨 packages 循环依赖

## UNIQUE STYLES

- **层次化文档**: 每个模块独立 AGENTS.md
- **Monorepo 管理**: 使用 Turbo + pnpm workspace
- **混合架构**: TypeScript packages + Python API + Node processor

## COMMANDS
```bash
cd doc2book
pnpm install
pnpm dev
```

## NOTES
1. 所有源代码在 `doc2book/` 目录下
2. 根目录仅包含项目引用和全局配置
3. 请查阅 `doc2book/AGENTS.md` 获取完整项目信息
