/**
 * Doc2Book 共享类型定义
 * 文档转商业书籍系统
 */
/** 支持的文档格式 */
type DocumentFormat = 'pdf' | 'docx' | 'doc' | 'md' | 'markdown' | 'html' | 'txt' | 'image';
/** 文档元数据 */
interface DocumentMetadata {
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
type ContentNodeType = 'heading' | 'paragraph' | 'list' | 'list-item' | 'table' | 'table-row' | 'table-cell' | 'code' | 'blockquote' | 'image' | 'footnote' | 'reference';
/** 内容节点 */
interface ContentNode {
    type: ContentNodeType;
    level?: number;
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
interface Reference {
    id: string;
    type: 'citation' | 'footnote' | 'endnote' | 'url';
    text: string;
    source?: string;
    url?: string;
    page?: number;
}
/** 资源文件 (图片、表格等) */
interface Asset {
    id: string;
    type: 'image' | 'table' | 'chart' | 'attachment';
    filename: string;
    mimeType: string;
    data?: Buffer | string;
    url?: string;
    caption?: string;
    width?: number;
    height?: number;
}
/** 统一 AST (抽象语法树) */
interface UnifiedAST {
    id: string;
    sourceFile: string;
    parseTime: Date;
    content: ContentNode[];
    metadata: DocumentMetadata;
    references: Reference[];
    assets: Asset[];
}
/** 知识点类型 */
type KnowledgeType = 'fact' | 'concept' | 'opinion' | 'data' | 'example' | 'quote';
/** 知识点 */
interface KnowledgePoint {
    id: string;
    type: KnowledgeType;
    content: string;
    confidence: number;
    sourceDocuments: string[];
    sourceLocations: Array<{
        documentId: string;
        page?: number;
        paragraph?: number;
    }>;
    relatedConcepts: string[];
    tags: string[];
}
/** 知识图谱节点 */
interface KnowledgeGraphNode {
    id: string;
    label: string;
    type: 'concept' | 'entity' | 'topic';
    properties: Record<string, unknown>;
}
/** 知识图谱边 */
interface KnowledgeGraphEdge {
    id: string;
    source: string;
    target: string;
    relation: string;
    weight: number;
}
/** 知识图谱 */
interface KnowledgeGraph {
    nodes: KnowledgeGraphNode[];
    edges: KnowledgeGraphEdge[];
}
/** 需要替换的实体类型 */
type SanitizeEntityType = 'person' | 'brand' | 'company' | 'product' | 'contact' | 'copyright' | 'ad' | 'url';
/** 去痕迹规则 */
interface SanitizeRule {
    id: string;
    entityType: SanitizeEntityType;
    pattern: string | RegExp;
    replacement: string | ((match: string) => string);
    enabled: boolean;
    priority: number;
}
/** 去痕迹结果 */
interface SanitizeResult {
    originalText: string;
    sanitizedText: string;
    replacements: Array<{
        entityType: SanitizeEntityType;
        original: string;
        replacement: string;
        position: {
            start: number;
            end: number;
        };
    }>;
}
/** 书籍元数据 */
interface BookMetadata {
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
interface Chapter {
    id: string;
    title: string;
    subtitle?: string;
    level: number;
    content: ContentNode[];
    children?: Chapter[];
    wordCount: number;
    status: 'draft' | 'review' | 'final';
}
/** 目录项 */
interface TOCEntry {
    id: string;
    title: string;
    level: number;
    page?: number;
    children?: TOCEntry[];
}
/** 术语表项 */
interface GlossaryEntry {
    term: string;
    definition: string;
    relatedTerms?: string[];
}
/** 索引项 */
interface IndexEntry {
    term: string;
    pages: number[];
    subEntries?: IndexEntry[];
}
/** 书籍结构 */
interface BookStructure {
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
/** Provider 类型 */
type ProviderType = 'anthropic' | 'openai' | 'google' | 'deepl' | 'openai-compatible';
/** Provider 配置 */
interface ProviderConfig {
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
        inputTokens: number;
        outputTokens: number;
    };
}
/** Provider 管理器配置 */
interface ProviderManagerConfig {
    providers: ProviderConfig[];
    defaultProvider: string;
    fallbackChain: string[];
    retryAttempts: number;
    timeout: number;
}
/** 任务阶段 */
type TaskStage = 'upload' | 'parse' | 'understand' | 'sanitize' | 'create' | 'plagiarism-check' | 'generate';
/** 任务状态 */
type TaskStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';
/** 检查点 */
interface Checkpoint {
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
interface TaskProgress {
    taskId: string;
    stage: TaskStage;
    status: TaskStatus;
    progress: number;
    message: string;
    startTime: Date;
    endTime?: Date;
    error?: string;
    checkpoint?: Checkpoint;
}
/** 项目配置 */
interface ProjectConfig {
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
interface ProjectState {
    projectId: string;
    documents: DocumentMetadata[];
    knowledgeGraph?: KnowledgeGraph;
    bookStructure?: BookStructure;
    currentStage: TaskStage;
    progress: TaskProgress[];
    checkpoints: Checkpoint[];
}
/** EPUB 配置 */
interface EpubConfig {
    coverImage?: string;
    tocDepth: number;
    embedFonts: boolean;
    splitChapters: boolean;
    cssFile?: string;
}
/** PDF 配置 */
interface PdfConfig {
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
interface ExportConfig {
    format: 'epub' | 'pdf' | 'html' | 'mobi';
    epub?: EpubConfig;
    pdf?: PdfConfig;
    outputPath: string;
}

/**
 * Doc2Book 共享模块入口
 */

declare const VERSION = "1.0.0";
declare const PROJECT_NAME = "Doc2Book";

export { type Asset, type BookMetadata, type BookStructure, type Chapter, type Checkpoint, type ContentNode, type ContentNodeType, type DocumentFormat, type DocumentMetadata, type EpubConfig, type ExportConfig, type GlossaryEntry, type IndexEntry, type KnowledgeGraph, type KnowledgeGraphEdge, type KnowledgeGraphNode, type KnowledgePoint, type KnowledgeType, PROJECT_NAME, type PdfConfig, type ProjectConfig, type ProjectState, type ProviderConfig, type ProviderManagerConfig, type ProviderType, type Reference, type SanitizeEntityType, type SanitizeResult, type SanitizeRule, type TOCEntry, type TaskProgress, type TaskStage, type TaskStatus, type UnifiedAST, VERSION };
