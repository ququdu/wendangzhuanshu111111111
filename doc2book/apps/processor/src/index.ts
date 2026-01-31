/**
 * Node.js 文档处理服务
 * 调用核心 TypeScript 包进行文档处理
 */

import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// 导入核心包
import { DocumentParser } from '@doc2book/parser'
import { Sanitizer } from '@doc2book/sanitizer'
import { ContentAnalyzer, ChapterSplitter, Summarizer } from '@doc2book/understanding'
import { ContentRewriter, Translator, Humanizer } from '@doc2book/creator'
import { BookGenerator } from '@doc2book/generator'
import { createProviderManager, type ProviderManager } from '@doc2book/providers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 全局错误处理 - 防止进程崩溃
process.on('uncaughtException', (error) => {
  console.error('[未捕获的异常]', error)
  // 记录错误但不退出进程
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('[未处理的 Promise 拒绝]', reason)
})

const app = express()
const PORT = process.env.PORT || 8001

// 中间件
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// 请求超时中间件
app.use((req, res, next) => {
  // 设置 2 分钟超时
  res.setTimeout(120000, () => {
    console.error(`[请求超时] ${req.method} ${req.path}`)
    if (!res.headersSent) {
      res.status(408).json({ error: '请求超时', success: false })
    }
  })
  next()
})

// 文件上传配置
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
})

// 创建解析器实例
const parser = new DocumentParser()

// Provider 管理器（延迟初始化）
let providerManager: ProviderManager | null = null
let providerConfigOverride: {
  providers: Array<{
    id: string
    type: 'anthropic' | 'openai' | 'openai-compatible' | 'deepl' | 'google'
    name: string
    apiKey: string
    baseUrl?: string
    defaultModel?: string
    models?: string[]
    enabled: boolean
    priority: number
  }>
  defaultProvider: string
  fallbackChain: string[]
} | null = null

/**
 * 获取或创建 Provider 管理器
 */
function getProviderManager(): ProviderManager {
  if (!providerManager) {
    // 从环境变量读取配置
    const providers = []

    if (providerConfigOverride) {
      providerManager = createProviderManager({
        providers: providerConfigOverride.providers,
        defaultProvider: providerConfigOverride.defaultProvider,
        fallbackChain: providerConfigOverride.fallbackChain,
        retryAttempts: 3,
        timeout: 60000,
      })
      return providerManager
    }

    // Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      providers.push({
        id: 'anthropic',
        type: 'anthropic' as const,
        name: 'Anthropic Claude',
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseUrl: process.env.ANTHROPIC_BASE_URL || '',
        defaultModel: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
        enabled: true,
        priority: 1,
      })
    }

    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      providers.push({
        id: 'openai',
        type: 'openai' as const,
        name: 'OpenAI',
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: process.env.OPENAI_BASE_URL || '',
        defaultModel: process.env.OPENAI_MODEL || 'gpt-4o',
        enabled: true,
        priority: 2,
      })
    }

    // OpenAI Compatible (如 DeepSeek)
    if (process.env.OPENAI_COMPATIBLE_API_KEY) {
      providers.push({
        id: 'openai-compatible',
        type: 'openai-compatible' as const,
        name: process.env.OPENAI_COMPATIBLE_NAME || 'OpenAI Compatible',
        apiKey: process.env.OPENAI_COMPATIBLE_API_KEY,
        baseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL || '',
        defaultModel: process.env.OPENAI_COMPATIBLE_MODEL || 'deepseek-chat',
        enabled: true,
        priority: 3,
      })
    }

    // DeepL
    if (process.env.DEEPL_API_KEY) {
      providers.push({
        id: 'deepl',
        type: 'deepl' as const,
        name: 'DeepL',
        apiKey: process.env.DEEPL_API_KEY,
        baseUrl: process.env.DEEPL_FREE ? 'https://api-free.deepl.com' : '',
        enabled: true,
        priority: 4,
      })
    }

    if (providers.length === 0) {
      throw new Error('没有配置任何 AI Provider，请设置环境变量')
    }

    providerManager = createProviderManager({
      providers,
      defaultProvider: providers[0].id,
      fallbackChain: providers.slice(1).map(p => p.id),
      retryAttempts: 3,
      timeout: 60000,
    })
  }

  return providerManager
}

// 延迟初始化的服务实例
let sanitizer: Sanitizer | null = null
let contentAnalyzer: ContentAnalyzer | null = null
let chapterSplitter: ChapterSplitter | null = null
let summarizer: Summarizer | null = null
let contentRewriter: ContentRewriter | null = null
let translator: Translator | null = null
let humanizer: Humanizer | null = null
let bookGenerator: BookGenerator | null = null

function getSanitizer(): Sanitizer {
  if (!sanitizer) sanitizer = new Sanitizer(getProviderManager())
  return sanitizer
}

function getContentAnalyzer(): ContentAnalyzer {
  if (!contentAnalyzer) contentAnalyzer = new ContentAnalyzer(getProviderManager())
  return contentAnalyzer
}

function getChapterSplitter(): ChapterSplitter {
  if (!chapterSplitter) chapterSplitter = new ChapterSplitter(getProviderManager())
  return chapterSplitter
}

function getSummarizer(): Summarizer {
  if (!summarizer) summarizer = new Summarizer(getProviderManager())
  return summarizer
}

function getContentRewriter(): ContentRewriter {
  if (!contentRewriter) contentRewriter = new ContentRewriter(getProviderManager())
  return contentRewriter
}

function getTranslator(): Translator {
  if (!translator) translator = new Translator(getProviderManager())
  return translator
}

function getHumanizer(): Humanizer {
  if (!humanizer) humanizer = new Humanizer(getProviderManager())
  return humanizer
}

function getBookGenerator(): BookGenerator {
  if (!bookGenerator) bookGenerator = new BookGenerator()
  return bookGenerator
}

/**
 * 健康检查
 */
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'processor' })
})

/**
 * 解析文档
 * POST /parse
 * Body: { filePath: string, format: string }
 */
app.post('/parse', async (req, res) => {
  try {
    const { filePath, format, filename } = req.body

    if (!filePath) {
      return res.status(400).json({ error: '缺少文件路径' })
    }

    // 读取文件
    const fileBuffer = await fs.readFile(filePath)

    // 解析文档
    const result = await parser.parse(fileBuffer, {
      format: format || undefined,
      filename: filename || path.basename(filePath),
      detectLanguage: true,
      extractImages: true,
      extractTables: true,
    })

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || '解析失败'
      })
    }

    res.json({
      success: true,
      ast: result.ast,
      metadata: result.metadata
    })
  } catch (error) {
    console.error('Parse error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '解析失败'
    })
  }
})

/**
 * 解析上传的文件
 * POST /parse/upload
 */
app.post('/parse/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' })
    }

    const { originalname, buffer, mimetype } = req.file

    // 根据 MIME 类型确定格式
    let format: string | undefined = undefined
    if (mimetype === 'application/pdf') format = 'pdf'
    else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') format = 'docx'
    else if (mimetype === 'text/html') format = 'html'
    else if (mimetype === 'text/markdown' || originalname.endsWith('.md')) format = 'md'
    else if (mimetype === 'text/plain') format = 'txt'

    // 解析文档
    const result = await parser.parse(buffer, {
      format: format as any,
      filename: originalname,
      detectLanguage: true,
      extractImages: true,
      extractTables: true,
    })

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || '解析失败'
      })
    }

    res.json({
      success: true,
      ast: result.ast,
      metadata: result.metadata
    })
  } catch (error) {
    console.error('Parse upload error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '解析失败'
    })
  }
})

/**
 * 分析文档结构（不需要 AI 的基础分析）
 * POST /analyze
 */
app.post('/analyze', async (req, res) => {
  try {
    const { ast } = req.body

    if (!ast) {
      return res.status(400).json({ error: '缺少 AST 数据' })
    }

    // 基础结构分析（不需要 AI）
    const analysis = analyzeStructure(ast)

    res.json({
      success: true,
      analysis
    })
  } catch (error) {
    console.error('Analyze error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '分析失败'
    })
  }
})

/**
 * 基础结构分析函数
 */
function analyzeStructure(ast: any) {
  const result = {
    title: ast.metadata?.title || '未命名文档',
    language: ast.metadata?.language || 'und',
    wordCount: ast.metadata?.wordCount || 0,
    structure: {
      headings: [] as Array<{ level: number; text: string }>,
      paragraphCount: 0,
      listCount: 0,
      tableCount: 0,
      imageCount: 0,
      codeBlockCount: 0
    },
    outline: [] as Array<{ level: number; title: string; children: any[] }>
  }

  // 遍历节点统计
  function traverse(nodes: any[]) {
    if (!Array.isArray(nodes)) return

    for (const node of nodes) {
      switch (node.type) {
        case 'heading':
          result.structure.headings.push({
            level: node.level || 1,
            text: node.text || ''
          })
          break
        case 'paragraph':
          result.structure.paragraphCount++
          break
        case 'list':
          result.structure.listCount++
          break
        case 'table':
          result.structure.tableCount++
          break
        case 'image':
          result.structure.imageCount++
          break
        case 'code':
          result.structure.codeBlockCount++
          break
      }

      if (node.children) {
        traverse(node.children)
      }
    }
  }

  if (ast.children) {
    traverse(ast.children)
  }

  // 构建大纲
  const headings = result.structure.headings
  for (const heading of headings) {
    result.outline.push({
      level: heading.level,
      title: heading.text,
      children: []
    })
  }

  return result
}

/**
 * 去痕迹检测（规则检测，不需要 AI）
 * POST /sanitize/detect
 */
app.post('/sanitize/detect', async (req, res) => {
  try {
    const { text } = req.body

    if (!text) {
      return res.status(400).json({ error: '缺少文本内容' })
    }

    const entities = detectEntities(text)

    res.json({
      success: true,
      entities,
      count: entities.length
    })
  } catch (error) {
    console.error('Sanitize detect error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '检测失败'
    })
  }
})

/**
 * 实体检测函数（规则检测）
 */
function detectEntities(text: string) {
  const entities: Array<{
    type: string
    text: string
    position: { start: number; end: number }
    confidence: number
  }> = []

  // URL 检测
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g
  let match
  while ((match = urlRegex.exec(text)) !== null) {
    entities.push({
      type: 'url',
      text: match[0],
      position: { start: match.index, end: match.index + match[0].length },
      confidence: 1.0
    })
  }

  // 邮箱检测
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  while ((match = emailRegex.exec(text)) !== null) {
    entities.push({
      type: 'email',
      text: match[0],
      position: { start: match.index, end: match.index + match[0].length },
      confidence: 1.0
    })
  }

  // 电话检测
  const phoneRegex = /(?:\+?86)?1[3-9]\d{9}|(?:\d{3,4}-)?\d{7,8}/g
  while ((match = phoneRegex.exec(text)) !== null) {
    entities.push({
      type: 'phone',
      text: match[0],
      position: { start: match.index, end: match.index + match[0].length },
      confidence: 0.9
    })
  }

  // 微信/公众号检测
  const wechatRegex = /(?:微信|公众号|小程序)[:：]?\s*[a-zA-Z0-9_]+/g
  while ((match = wechatRegex.exec(text)) !== null) {
    entities.push({
      type: 'social',
      text: match[0],
      position: { start: match.index, end: match.index + match[0].length },
      confidence: 0.8
    })
  }

  return entities
}

/**
 * 去痕迹替换
 * POST /sanitize/replace
 */
app.post('/sanitize/replace', async (req, res) => {
  try {
    const { text, entities, replacements } = req.body

    if (!text) {
      return res.status(400).json({ error: '缺少文本内容' })
    }

    let result = text
    const defaultReplacements: Record<string, string> = {
      url: '[链接已移除]',
      email: '[邮箱已移除]',
      phone: '[电话已移除]',
      social: '[社交账号已移除]'
    }

    // 按位置从后往前替换，避免位置偏移
    const sortedEntities = [...(entities || [])].sort(
      (a, b) => b.position.start - a.position.start
    )

    for (const entity of sortedEntities) {
      const replacement = replacements?.[entity.type] || defaultReplacements[entity.type] || '[已移除]'
      result = result.slice(0, entity.position.start) + replacement + result.slice(entity.position.end)
    }

    res.json({
      success: true,
      text: result,
      replacedCount: sortedEntities.length
    })
  } catch (error) {
    console.error('Sanitize replace error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '替换失败'
    })
  }
})

// ==================== 新增核心包调用端点 ====================

/**
 * 内容清洗（调用 Sanitizer 核心包）
 * POST /sanitize
 */
app.post('/sanitize', async (req, res) => {
  try {
    const { ast, options } = req.body

    if (!ast) {
      return res.status(400).json({ error: '缺少 AST 数据' })
    }

    const sanitizerInstance = getSanitizer()
    const result = await sanitizerInstance.sanitize(ast, options)

    res.json(result)
  } catch (error) {
    console.error('Sanitize error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '清洗失败'
    })
  }
})

/**
 * 批量内容清洗
 * POST /sanitize/batch
 */
app.post('/sanitize/batch', async (req, res) => {
  try {
    const { documents, options } = req.body

    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({ error: '缺少文档数组' })
    }

    const sanitizerInstance = getSanitizer()
    const results = await Promise.all(
      documents.map(doc => sanitizerInstance.sanitize(doc.ast, options))
    )

    res.json({
      success: true,
      results
    })
  } catch (error) {
    console.error('Sanitize batch error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '批量清洗失败'
    })
  }
})

/**
 * 深度内容分析（调用 ContentAnalyzer 核心包，需要 AI）
 * POST /analyze/deep
 */
app.post('/analyze/deep', async (req, res) => {
  try {
    const { ast, options } = req.body

    if (!ast) {
      return res.status(400).json({ error: '缺少 AST 数据' })
    }

    const analyzer = getContentAnalyzer()
    const result = await analyzer.analyze(ast, options)

    res.json(result)
  } catch (error) {
    console.error('Deep analyze error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '深度分析失败'
    })
  }
})

/**
 * 章节分割（调用 ChapterSplitter 核心包）
 * POST /structure
 */
app.post('/structure', async (req, res) => {
  try {
    const { ast, options } = req.body

    if (!ast) {
      return res.status(400).json({ error: '缺少 AST 数据' })
    }

    const splitter = getChapterSplitter()
    const result = await splitter.split(ast, options)

    res.json(result)
  } catch (error) {
    console.error('Structure error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '结构化失败'
    })
  }
})

/**
 * 生成摘要（调用 Summarizer 核心包）
 * POST /summarize
 */
app.post('/summarize', async (req, res) => {
  try {
    const { ast, options } = req.body

    if (!ast) {
      return res.status(400).json({ error: '缺少 AST 数据' })
    }

    const summarizerInstance = getSummarizer()
    const result = await summarizerInstance.summarize(ast, options)

    res.json(result)
  } catch (error) {
    console.error('Summarize error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '摘要生成失败'
    })
  }
})

/**
 * 内容重写（调用 ContentRewriter 核心包）
 * POST /rewrite
 */
app.post('/rewrite', async (req, res) => {
  try {
    const { content, options } = req.body

    if (!content) {
      return res.status(400).json({ error: '缺少内容' })
    }

    const rewriter = getContentRewriter()
    const result = await rewriter.rewrite(content, options)

    res.json(result)
  } catch (error) {
    console.error('Rewrite error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '重写失败'
    })
  }
})

/**
 * 批量内容重写
 * POST /rewrite/batch
 */
app.post('/rewrite/batch', async (req, res) => {
  try {
    const { chapters, options } = req.body

    if (!chapters || !Array.isArray(chapters)) {
      return res.status(400).json({ error: '缺少章节数组' })
    }

    const rewriter = getContentRewriter()
    const results = await Promise.all(
      chapters.map(chapter => rewriter.rewrite(chapter.content, options))
    )

    res.json({
      success: true,
      results
    })
  } catch (error) {
    console.error('Rewrite batch error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '批量重写失败'
    })
  }
})

/**
 * 去 AI 化处理（调用 Humanizer 核心包）
 * POST /humanize
 */
app.post('/humanize', async (req, res) => {
  try {
    const { content, options } = req.body

    if (!content) {
      return res.status(400).json({ error: '缺少内容' })
    }

    const humanizerInstance = getHumanizer()
    const result = await humanizerInstance.humanize(content, options)

    res.json(result)
  } catch (error) {
    console.error('Humanize error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '去AI化失败'
    })
  }
})

/**
 * 批量去 AI 化处理
 * POST /humanize/batch
 */
app.post('/humanize/batch', async (req, res) => {
  try {
    const { contents, options } = req.body

    if (!contents || !Array.isArray(contents)) {
      return res.status(400).json({ error: '缺少内容数组' })
    }

    const humanizerInstance = getHumanizer()
    const results = await Promise.all(
      contents.map(content => humanizerInstance.humanize(content, options))
    )

    res.json({
      success: true,
      results
    })
  } catch (error) {
    console.error('Humanize batch error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '批量去AI化失败'
    })
  }
})

/**
 * 翻译（调用 Translator 核心包）
 * POST /translate
 */
app.post('/translate', async (req, res) => {
  try {
    const { content, targetLanguage, options } = req.body

    if (!content) {
      return res.status(400).json({ error: '缺少内容' })
    }

    if (!targetLanguage) {
      return res.status(400).json({ error: '缺少目标语言' })
    }

    const translatorInstance = getTranslator()
    const result = await translatorInstance.translate(content, targetLanguage, options)

    res.json(result)
  } catch (error) {
    console.error('Translate error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '翻译失败'
    })
  }
})

/**
 * 批量翻译（并发翻译多语言）
 * POST /translate/batch
 */
app.post('/translate/batch', async (req, res) => {
  try {
    const { content, targetLanguages, options } = req.body

    if (!content) {
      return res.status(400).json({ error: '缺少内容' })
    }

    if (!targetLanguages || !Array.isArray(targetLanguages)) {
      return res.status(400).json({ error: '缺少目标语言数组' })
    }

    const translatorInstance = getTranslator()
    const results = await Promise.all(
      targetLanguages.map(lang => translatorInstance.translate(content, lang, options))
    )

    res.json({
      success: true,
      results: targetLanguages.map((lang, i) => ({
        targetLanguage: lang,
        ...results[i]
      }))
    })
  } catch (error) {
    console.error('Translate batch error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '批量翻译失败'
    })
  }
})

/**
 * 生成书籍（调用 BookGenerator 核心包）
 * POST /generate
 */
app.post('/generate', async (req, res) => {
  try {
    const { book, options } = req.body

    if (!book) {
      return res.status(400).json({ error: '缺少书籍数据' })
    }

    if (!options?.outputDir) {
      return res.status(400).json({ error: '缺少输出目录' })
    }

    const generator = getBookGenerator()
    const result = await generator.generate(book, options)

    res.json(result)
  } catch (error) {
    console.error('Generate error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '生成失败'
    })
  }
})

/**
 * KDP 验证
 * POST /validate
 */
app.post('/validate', async (req, res) => {
  try {
    const { book } = req.body

    if (!book) {
      return res.status(400).json({ error: '缺少书籍数据' })
    }

    const generator = getBookGenerator()
    const result = generator.validate(book)

    res.json({
      success: true,
      validation: result
    })
  } catch (error) {
    console.error('Validate error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '验证失败'
    })
  }
})

/**
 * 获取 Provider 状态
 * GET /providers/status
 */
app.get('/providers/status', async (req, res) => {
  try {
    const manager = getProviderManager()
    const statuses = await manager.getProviderStatuses()

    res.json({
      success: true,
      providers: statuses
    })
  } catch (error) {
    console.error('Provider status error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取状态失败'
    })
  }
})

/**
 * 更新 Provider 配置
 * POST /config/providers
 */
app.post('/config/providers', async (req, res) => {
  try {
    const config = req.body || {}
    const providers = Array.isArray(config.providers) ? config.providers : []

    if (providers.length === 0) {
      return res.status(400).json({
        success: false,
        error: '至少需要配置一个 Provider',
      })
    }

    const normalizedProviders = providers.map((item) => ({
      id: String(item.id || '').trim(),
      type: item.type,
      name: String(item.name || '').trim(),
      apiKey: String(item.apiKey || '').trim(),
      baseUrl: item.baseUrl ? String(item.baseUrl).trim() : '',
      defaultModel: item.defaultModel ? String(item.defaultModel).trim() : undefined,
      models: Array.isArray(item.models) ? item.models.map((m: unknown) => String(m)) : undefined,
      enabled: Boolean(item.enabled),
      priority: Number.isFinite(item.priority) ? Number(item.priority) : 1,
    }))

    const allowedTypes = ['anthropic', 'openai', 'openai-compatible', 'deepl', 'google']

    for (const item of normalizedProviders) {
      if (!item.id || !item.name || !item.type) {
        return res.status(400).json({
          success: false,
          error: 'Provider 配置缺少必要字段',
        })
      }
      if (!allowedTypes.includes(item.type)) {
        return res.status(400).json({
          success: false,
          error: `不支持的 Provider 类型: ${item.type}`,
        })
      }
      if (!item.apiKey && item.type !== 'deepl' && item.type !== 'openai-compatible') {
        return res.status(400).json({
          success: false,
          error: `Provider ${item.id} 缺少 API Key`,
        })
      }
      if (item.type === 'openai-compatible' && !item.baseUrl) {
        return res.status(400).json({
          success: false,
          error: `Provider ${item.id} 需要配置 Base URL`,
        })
      }
      if (item.type === 'google') {
        return res.status(400).json({
          success: false,
          error: 'Google Provider 尚未实现',
        })
      }
    }

    const enabledProviders = normalizedProviders
      .filter((item) => item.enabled)
      .sort((a, b) => a.priority - b.priority)

    if (enabledProviders.length === 0) {
      return res.status(400).json({
        success: false,
        error: '至少需要启用一个 Provider',
      })
    }

    providerConfigOverride = {
      providers: enabledProviders,
      defaultProvider: String(config.defaultProvider || enabledProviders[0].id),
      fallbackChain: Array.isArray(config.fallbackChain)
        ? config.fallbackChain.map((id: unknown) => String(id))
        : enabledProviders.slice(1).map((item) => item.id),
    }
    providerManager = null

    const statuses = await getProviderManager().getProviderStatuses()

    return res.json({
      success: true,
      providers: statuses,
    })
  } catch (error) {
    console.error('Provider config error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '更新配置失败',
    })
  }
})

/**
 * 测试 Provider 连接
 * POST /config/test
 */
app.post('/config/test', async (req, res) => {
  try {
    const config = req.body || {}
    const provider = String(config.provider || '').trim()
    const apiKey = String(config.apiKey || '').trim()
    const baseUrl = config.baseUrl ? String(config.baseUrl).trim() : ''
    const model = config.model ? String(config.model).trim() : undefined

    if (!provider) {
      return res.status(400).json({ success: false, error: '缺少 Provider 类型' })
    }
    if (!apiKey && provider !== 'deepl' && provider !== 'openai-compatible') {
      return res.status(400).json({ success: false, error: '缺少 API Key' })
    }
    if (provider === 'openai-compatible' && !baseUrl) {
      return res.status(400).json({ success: false, error: '缺少 Base URL' })
    }
    if (provider === 'google') {
      return res.status(400).json({ success: false, error: 'Google Provider 尚未实现' })
    }

    const testManager = createProviderManager({
      providers: [
        {
          id: provider,
          type: provider as 'anthropic' | 'openai' | 'openai-compatible' | 'deepl',
          name: provider,
          apiKey,
          baseUrl,
          defaultModel: model,
          enabled: true,
          priority: 1,
        },
      ],
      defaultProvider: provider,
      fallbackChain: [],
      retryAttempts: 1,
      timeout: 30000,
    })

    const statuses = await testManager.getProviderStatuses()
    const status = statuses[0]
    return res.json({
      success: true,
      status,
    })
  } catch (error) {
    console.error('Provider test error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '测试失败',
    })
  }
})

// 启动服务
app.listen(PORT, () => {
  console.log(`Processor service running on http://localhost:${PORT}`)
  console.log('Available endpoints:')
  console.log('  GET  /health - Health check')
  console.log('  GET  /providers/status - Get AI provider status')
  console.log('')
  console.log('  Document Processing:')
  console.log('  POST /parse - Parse document from file path')
  console.log('  POST /parse/upload - Parse uploaded document')
  console.log('  POST /analyze - Analyze document structure (basic)')
  console.log('  POST /analyze/deep - Deep content analysis (AI)')
  console.log('')
  console.log('  Content Processing:')
  console.log('  POST /sanitize - Sanitize content (AI)')
  console.log('  POST /sanitize/batch - Batch sanitize')
  console.log('  POST /sanitize/detect - Detect entities (rule-based)')
  console.log('  POST /sanitize/replace - Replace entities')
  console.log('')
  console.log('  Structure & Creation:')
  console.log('  POST /structure - Split into chapters')
  console.log('  POST /summarize - Generate summary')
  console.log('  POST /rewrite - Rewrite content')
  console.log('  POST /rewrite/batch - Batch rewrite')
  console.log('  POST /humanize - Remove AI traces')
  console.log('  POST /humanize/batch - Batch humanize')
  console.log('')
  console.log('  Translation:')
  console.log('  POST /translate - Translate content')
  console.log('  POST /translate/batch - Batch translate (multi-language)')
  console.log('')
  console.log('  Book Generation:')
  console.log('  POST /generate - Generate book (EPUB/PDF)')
  console.log('  POST /validate - KDP validation')
})
