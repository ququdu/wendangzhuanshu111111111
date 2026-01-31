# 🚀 Doc2Book 服务运行状态

**启动时间**: 2026-01-29 12:51

## ✅ 所有服务已成功启动！

### 服务列表

| 服务 | 状态 | 地址 | 说明 |
|------|------|------|------|
| **API 后端** | ✅ 运行中 | http://localhost:8000 | FastAPI + SQLite |
| **Processor** | ✅ 运行中 | http://localhost:8001 | 文档处理服务 |
| **Web 前端** | ✅ 运行中 | http://localhost:3000 | Next.js 应用 |

### 数据库状态

- **类型**: SQLite
- **位置**: `apps/api/doc2book.db`
- **大小**: 60 KB
- **状态**: ✅ 已初始化

### 存储功能

你的项目**完全支持数据持久化**：

#### 1. 数据库存储
- ✅ **项目信息** - 项目名称、描述、设置
- ✅ **文档记录** - 上传的文档元数据
- ✅ **任务历史** - 所有处理任务的记录
- ✅ **书籍草稿** - 可编辑的书籍内容
- ✅ **翻译任务** - 多语言翻译记录
- ✅ **导出记录** - 生成的文件信息

#### 2. 文件存储
- ✅ **上传文件** - `apps/api/uploads/{project_id}/`
- ✅ **导出文件** - `apps/api/exports/{project_id}/`
- ✅ **支持格式**: PDF, DOCX, Markdown, TXT, 图片

#### 3. 断点续传
- ✅ **检查点系统** - 任务可以从中断处恢复
- ✅ **重试机制** - 失败任务自动重试（最多3次）
- ✅ **心跳监控** - 检测任务是否异常中断

## 📊 数据模型

### 核心表结构

```
projects (项目)
├── documents (文档)
├── tasks (任务)
├── book_drafts (书籍草稿)
├── translation_jobs (翻译任务)
└── exports (导出记录)
```

### 工作流程

```
1. 上传文档 → 保存到 uploads/
2. 解析文档 → 存储 parsed_content
3. 清洗内容 → 存储 sanitized_content
4. 深度理解 → 存储 analysis_result
5. 内容创作 → 存储 rewritten_content
6. 生成草稿 → 保存到 book_drafts
7. 用户审阅 → 可编辑草稿内容
8. 翻译 → 创建多语言版本
9. 生成书籍 → 导出 EPUB/PDF 到 exports/
```

## 🔗 快速访问

### Web 界面
打开浏览器访问: **http://localhost:3000**

### API 文档
查看 API 接口: **http://localhost:8000/docs**

### 测试 API
```bash
# 健康检查
curl http://localhost:8000/health

# 获取项目列表
curl http://localhost:8000/api/projects

# 获取设置
curl http://localhost:8000/api/settings
```

## 📁 数据存储位置

```
doc2book/apps/api/
├── doc2book.db          # SQLite 数据库（60 KB）
├── uploads/             # 上传的文档
│   └── {project_id}/
│       └── {file_id}.{ext}
└── exports/             # 导出的书籍
    └── {project_id}/
        ├── book.epub
        └── book.pdf
```

## 🎯 功能特性

### 已实现的存储功能

1. **项目管理**
   - 创建、查询、更新、删除项目
   - 项目设置持久化
   - 多项目支持

2. **文档管理**
   - 文档上传和存储
   - 解析结果缓存
   - 文档状态追踪

3. **任务系统**
   - 任务队列管理
   - 进度实时更新
   - 错误日志记录
   - 断点续传支持

4. **草稿系统**
   - 书籍内容可编辑
   - 版本管理
   - 多语言草稿

5. **导出管理**
   - EPUB/PDF 生成
   - 文件持久化存储
   - KDP 格式验证

## 💡 使用提示

### 创建新项目
1. 访问 http://localhost:3000
2. 点击"新建项目"
3. 上传文档
4. 系统自动保存所有数据

### 查看已有数据
```bash
# 查看数据库
cd apps/api
sqlite3 doc2book.db
> .tables
> SELECT * FROM projects;
```

### 备份数据
```bash
# 备份数据库
copy apps\api\doc2book.db backup\doc2book_backup.db

# 备份上传文件
xcopy apps\api\uploads backup\uploads /E /I

# 备份导出文件
xcopy apps\api\exports backup\exports /E /I
```

## 🛑 停止服务

如需停止服务，在启动服务的终端窗口按 `Ctrl+C`

或者关闭对应的命令行窗口。

## 📝 注意事项

1. **数据持久化**: 所有数据都保存在数据库和文件系统中，重启服务不会丢失
2. **并发处理**: 支持多个项目同时处理
3. **错误恢复**: 任务失败会自动重试，可从断点继续
4. **文件安全**: 上传的文件按项目隔离存储

---

**服务状态**: ✅ 全部正常运行  
**数据存储**: ✅ 完全支持  
**准备就绪**: 可以开始使用！
