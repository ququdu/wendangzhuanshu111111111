/**
 * Doc2Book 共享类型定义
 * 文档转商业书籍系统
 */

// ============================================
// 文档解析相关类型
// ============================================

/** 支持的文档格式 */
export type DocumentFormat = 'pdf' | 'docx' | 'doc' | 'md' | 'markdown' | 'html' | 'txt' | 'image';

/** 文档元数据 */
export interface DocumentMetadata {
  id: string;
  filename: string;
  format: DocumentFormat;
  size: number;
  language: string;
  createdAt: Date;
  updatedAt: Date;
  pageCount?: number;
  wordCount?: number;
  author?: string;
  title?: string;
}

/** 内容节点类型 */
export type ContentNodeType =
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'list-item'
  | 'table'
  | 'table-row'
  | 'table-cell'
  | 'code'
  | 'blockquote'
  | 'image'
  | 'footnote'
  | 'reference';

/** 内容节点 */
export interface ContentNode {
  type: ContentNodeType;
  level?: number;  // 标题层级 1-6
  text?: string;
  children?: ContentNode[];
  attributes?: Record<string, unknown>;
  sourceLocation?: {
    file: string;
    page?: number;
    line?: number;
  };
}

/** 引用信息 */
export interface Reference {
  id: string;
  type: 'citation' | 'footnote' | 'endnote' | 'url';
  text: string;
  source?: string;
  url?: string;
  page?: number;
}

/** 资源文件 (图片、表格等) */
export interface Asset {
  id: string;
  type: 'image' | 'table' | 'chart' | 'attachment';
  filename: string;
  mimeType: string;
  data?: Buffer | string;  // base64 或 Buffer
  url?: string;
  caption?: string;
  width?: number;
  height?: number;
}

/** 统一 AST (抽象语法树) */
export interface UnifiedAST {
  id: string;
  sourceFile: string;
  parseTime: Date;
  content: ContentNode[];
  metadata: DocumentMetadata;
  references: Reference[];
  assets: Asset[];
}

// ============================================
// 知识提取相关类型
// ============================================

/** 知识点类型 */
export type KnowledgeType =
  | 'fact'       // 事实性信息
  | 'concept'    // 概念定义
  | 'opinion'    // 观点看法
  | 'data'       // 数据统计
  | 'example'    // 案例示例
  | 'quote';     // 引用

/** 知识点 */
export interface KnowledgePoint {
  id: string;
  type: KnowledgeType;
  content: string;
  confidence: number;  // 0-1 置信度
  sourceDocuments: string[];  // 来源文档 ID
  sourceLocations: Array<{
    documentId: string;
    page?: number;
    paragraph?: number;
  }>;
  relatedConcepts: string[];  // 相关概念
  tags: string[];
}

/** 知识图谱节点 */
export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: 'concept' | 'entity' | 'topic';
  properties: Record<string, unknown>;
}

/** 知识图谱边 */
export interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;  // 关系类型
  weight: number;
}

/** 知识图谱 */
export interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

// ============================================
// 去痕迹处理相关类型
// ============================================

/** 需要替换的实体类型 */
export type SanitizeEntityType =
  | 'person'      // 人名
  | 'brand'       // 品牌
  | 'company'     // 公司
  | 'product'     // 产品
  | 'contact'     // 联系方式
  | 'copyright'   // 版权声明
  | 'ad'          // 广告内容
  | 'url';        // 网址

/** 去痕迹规则 */
export interface SanitizeRule {
  id: string;
  entityType: SanitizeEntityType;
  pattern: string | RegExp;
  replacement: string | ((match: string) => string);
  enabled: boolean;
  priority: number;
}

/** 去痕迹结果 */
export interface SanitizeResult {
  originalText: string;
  sanitizedText: string;
  replacements: Array<{
    entityType: SanitizeEntityType;
    original: string;
    replacement: string;
    position: { start: number; end: number };
  }>;
}

// ============================================
// 书籍结构相关类型
// ============================================

/** 书籍元数据 */
export interface BookMetadata {
  title: string;
  subtitle?: string;
  author: string;
  coAuthors?: string[];
  isbn?: string;
  isbnEbook?: string;
  publisher?: string;
  publishDate?: Date;
  edition?: string;
  language: string;
  targetLanguages: string[];
  category: string[];
  keywords: string[];
  description: string;
  copyright: string;
}

/** 章节 */
export interface Chapter {
  id: string;
  title: string;
  subtitle?: string;
  level: number;  // 1 = 章, 2 = 节, 3 = 小节
  content: ContentNode[];
  children?: Chapter[];
  wordCount: number;
  status: 'draft' | 'review' | 'final';
}

/** 目录项 */
export interface TOCEntry {
  id: string;
  title: string;
  level: number;
  page?: number;
  children?: TOCEntry[];
}

/** 术语表项 */
export interface GlossaryEntry {
  term: string;
  definition: string;
  relatedTerms?: string[];
}

/** 索引项 */
export interface IndexEntry {
  term: string;
  pages: number[];
  subEntries?: IndexEntry[];
}

/** 书籍结构 */
export interface BookStructure {
  metadata: BookMetadata;
  frontMatter: {
    titlePage: boolean;
    copyright: boolean;
    dedication?: string;
    tableOfContents: TOCEntry[];
    preface?: Chapter;
    foreword?: Chapter;
    acknowledgments?: string;
  };
  body: {
    introduction?: Chapter;
    parts?: Array<{
      title: string;
      chapters: Chapter[];
    }>;
    chapters: Chapter[];
  };
  backMatter: {
    epilogue?: Chapter;
    appendices: Chapter[];
    glossary: GlossaryEntry[];
    bibliography: Reference[];
    index: IndexEntry[];
    aboutAuthor?: string;
    alsoByAuthor?: string[];
  };
}

// ============================================
// API Provider 相关类型
// ============================================

/** Provider 类型 */
export type ProviderType =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'deepl'
  | 'openai-compatible';

/** Provider 配置 */
export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKey: string;
  models?: string[];
  defaultModel?: string;
  enabled: boolean;
  priority: number;
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  cost?: {
    inputTokens: number;  // 每 1000 tokens 的成本
    outputTokens: number;
  };
}

/** Provider 管理器配置 */
export interface ProviderManagerConfig {
  providers: ProviderConfig[];
  defaultProvider: string;
  fallbackChain: string[];
  retryAttempts: number;
  timeout: number;
}

// ============================================
// 任务和进度相关类型
// ============================================

/** 任务阶段 */
export type TaskStage =
  | 'upload'
  | 'parse'
  | 'understand'
  | 'sanitize'
  | 'create'
  | 'plagiarism-check'
  | 'generate';

/** 任务状态 */
export type TaskStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed';

/** 检查点 */
export interface Checkpoint {
  projectId: string;
  stage: TaskStage;
  progress: {
    totalItems: number;
    completedItems: number;
    currentItem: string;
  };
  state: Record<string, unknown>;
  timestamp: Date;
}

/** 任务进度 */
export interface TaskProgress {
  taskId: string;
  stage: TaskStage;
  status: TaskStatus;
  progress: number;  // 0-100
  message: string;
  startTime: Date;
  endTime?: Date;
  error?: string;
  checkpoint?: Checkpoint;
}

// ============================================
// 项目相关类型
// ============================================

/** 项目配置 */
export interface ProjectConfig {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  settings: {
    sourceLanguage: string;
    targetLanguages: string[];
    outputFormats: ('epub' | 'pdf' | 'html' | 'mobi')[];
    kdpCompliant: boolean;
    sanitizeRules: SanitizeRule[];
    providerConfig: ProviderManagerConfig;
  };
}

/** 项目状态 */
export interface ProjectState {
  projectId: string;
  documents: DocumentMetadata[];
  knowledgeGraph?: KnowledgeGraph;
  bookStructure?: BookStructure;
  currentStage: TaskStage;
  progress: TaskProgress[];
  checkpoints: Checkpoint[];
}

// ============================================
// 导出格式相关类型
// ============================================

/** EPUB 配置 */
export interface EpubConfig {
  coverImage?: string;
  tocDepth: number;
  embedFonts: boolean;
  splitChapters: boolean;
  cssFile?: string;
}

/** PDF 配置 */
export interface PdfConfig {
  pageSize: 'letter' | 'a4' | '6x9' | '5.5x8.5';
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  headerFooter: boolean;
  tocPageNumbers: boolean;
}

/** 导出配置 */
export interface ExportConfig {
  format: 'epub' | 'pdf' | 'html' | 'mobi';
  epub?: EpubConfig;
  pdf?: PdfConfig;
  outputPath: string;
}
