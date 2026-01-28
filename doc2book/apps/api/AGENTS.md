# API BACKEND - FastAPI Python Service

**Generated:** 2026-01-27
**Stack:** Python 3.9+, FastAPI, SQLAlchemy, SQLite, Pydantic

## OVERVIEW
FastAPI backend handling document uploads, processing pipeline orchestration, and real-time task management.

## STRUCTURE
```
apps/api/
├── routers/           # FastAPI route handlers (8 files)
│   ├── projects.py    # Project CRUD operations
│   ├── documents.py   # Document upload/management
│   ├── tasks.py       # Task monitoring/control
│   └── *.py          # Other API endpoints
├── services/          # Business logic layer (5 files)
│   ├── logger.py      # Centralized logging system
│   ├── database.py    # Database session management
│   ├── project_service.py
│   └── processor_client.py
├── models/           # SQLAlchemy ORM models
├── exports/          # Response/export utilities
└── uploads/          # File upload storage
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| API Routes | routers/ | FastAPI endpoints with Pydantic models |
| Business Logic | services/ | Core processing logic |
| Database Models | models/ | SQLAlchemy model definitions |
| Logging | services/logger.py | LogManager class |
| Database Setup | services/database.py | Async session handling |
| File Uploads | uploads/ directory | Document storage |

## CONVENTIONS

**Async:** All routes and database operations use async/await
**Database:** SQLAlchemy with async sessions, automatic commit/rollback
**Logging:** Centralized LogManager with module-based categorization
**Error Handling:** Custom exception handlers with proper HTTP status codes
**Validation:** Pydantic models for request/response validation
**Sessions:** Async context managers for database operations

## ANTI-PATTERNS (BACKEND)

- NEVER use sync database operations - always async
- NEVER bypass service layer - routers delegate to services
- NEVER ignore database transactions - always use context managers
- NEVER use global database connections - use dependency injection
- NEVER mix sync and async code in same function
- NEVER hardcode database URLs - use environment variables