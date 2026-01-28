/**
 * 语言检测工具
 * 使用 franc 库检测文本语言
 */

// franc v5 使用 CommonJS
const franc = require('franc')

/**
 * 语言代码映射（franc 代码 -> ISO 639-1）
 */
const LANGUAGE_MAP: Record<string, string> = {
  cmn: 'zh', // 中文
  eng: 'en', // 英文
  fra: 'fr', // 法文
  deu: 'de', // 德文
  spa: 'es', // 西班牙文
  por: 'pt', // 葡萄牙文
  rus: 'ru', // 俄文
  jpn: 'ja', // 日文
  kor: 'ko', // 韩文
  ara: 'ar', // 阿拉伯文
  hin: 'hi', // 印地文
  ita: 'it', // 意大利文
  nld: 'nl', // 荷兰文
  pol: 'pl', // 波兰文
  tur: 'tr', // 土耳其文
  vie: 'vi', // 越南文
  tha: 'th', // 泰文
  ind: 'id', // 印尼文
  swe: 'sv', // 瑞典文
  dan: 'da', // 丹麦文
  nor: 'no', // 挪威文
  fin: 'fi', // 芬兰文
  ces: 'cs', // 捷克文
  ell: 'el', // 希腊文
  heb: 'he', // 希伯来文
  ukr: 'uk', // 乌克兰文
  ron: 'ro', // 罗马尼亚文
  hun: 'hu', // 匈牙利文
}

/**
 * 语言名称映射
 */
const LANGUAGE_NAMES: Record<string, string> = {
  zh: '中文',
  en: '英文',
  fr: '法文',
  de: '德文',
  es: '西班牙文',
  pt: '葡萄牙文',
  ru: '俄文',
  ja: '日文',
  ko: '韩文',
  ar: '阿拉伯文',
  hi: '印地文',
  it: '意大利文',
  nl: '荷兰文',
  pl: '波兰文',
  tr: '土耳其文',
  vi: '越南文',
  th: '泰文',
  id: '印尼文',
  sv: '瑞典文',
  da: '丹麦文',
  no: '挪威文',
  fi: '芬兰文',
  cs: '捷克文',
  el: '希腊文',
  he: '希伯来文',
  uk: '乌克兰文',
  ro: '罗马尼亚文',
  hu: '匈牙利文',
}

/**
 * 语言检测结果
 */
export interface LanguageDetectionResult {
  /** ISO 639-1 语言代码 */
  code: string
  /** 语言名称 */
  name: string
  /** 置信度（0-1） */
  confidence: number
  /** 是否为混合语言 */
  isMixed: boolean
  /** 检测到的所有语言 */
  allLanguages?: Array<{ code: string; name: string; confidence: number }>
}

/**
 * 检测文本语言
 * @param text 要检测的文本
 * @param options 检测选项
 * @returns 语言检测结果
 */
export function detectLanguage(
  text: string,
  options?: {
    /** 最小文本长度（默认：10） */
    minLength?: number
    /** 是否检测多语言（默认：false） */
    detectMultiple?: boolean
  }
): LanguageDetectionResult {
  const { minLength = 10, detectMultiple = false } = options || {}

  // 文本太短，无法准确检测
  if (text.length < minLength) {
    return {
      code: 'und', // undefined
      name: '未知',
      confidence: 0,
      isMixed: false,
    }
  }

  // 使用 franc 检测语言
  const francCode = franc(text)

  // 转换为 ISO 639-1 代码
  const code = LANGUAGE_MAP[francCode] || 'und'
  const name = LANGUAGE_NAMES[code] || '未知'

  // 计算置信度（基于文本长度和检测结果）
  let confidence = 0.5
  if (francCode !== 'und') {
    // 文本越长，置信度越高
    confidence = Math.min(0.95, 0.5 + text.length / 1000)
  }

  // 检测是否为混合语言
  const isMixed = detectMixedLanguage(text)

  const result: LanguageDetectionResult = {
    code,
    name,
    confidence,
    isMixed,
  }

  // 如果需要检测多语言
  if (detectMultiple) {
    result.allLanguages = detectMultipleLanguages(text)
  }

  return result
}

/**
 * 检测是否为混合语言文本
 */
function detectMixedLanguage(text: string): boolean {
  // 检测是否同时包含中文和英文
  const hasChinese = /[\u4e00-\u9fa5]/.test(text)
  const hasEnglish = /[a-zA-Z]{3,}/.test(text)

  // 检测是否包含日文假名
  const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff]/.test(text)

  // 检测是否包含韩文
  const hasKorean = /[\uac00-\ud7af]/.test(text)

  // 计算检测到的语言数量
  const languageCount = [hasChinese, hasEnglish, hasJapanese, hasKorean].filter(Boolean).length

  return languageCount > 1
}

/**
 * 检测文本中的多种语言
 */
function detectMultipleLanguages(
  text: string
): Array<{ code: string; name: string; confidence: number }> {
  const results: Array<{ code: string; name: string; confidence: number }> = []

  // 按段落分割文本
  const paragraphs = text.split(/\n\n+/)

  // 统计每种语言的出现次数
  const languageCounts: Record<string, number> = {}
  let totalParagraphs = 0

  for (const paragraph of paragraphs) {
    if (paragraph.trim().length < 10) continue

    const francCode = franc(paragraph)
    const code = LANGUAGE_MAP[francCode] || 'und'

    if (code !== 'und') {
      languageCounts[code] = (languageCounts[code] || 0) + 1
      totalParagraphs++
    }
  }

  // 转换为结果数组
  for (const [code, count] of Object.entries(languageCounts)) {
    results.push({
      code,
      name: LANGUAGE_NAMES[code] || '未知',
      confidence: count / totalParagraphs,
    })
  }

  // 按置信度排序
  results.sort((a, b) => b.confidence - a.confidence)

  return results
}

/**
 * 获取语言名称
 */
export function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] || '未知'
}

/**
 * 获取支持的语言列表
 */
export function getSupportedLanguages(): Array<{ code: string; name: string }> {
  return Object.entries(LANGUAGE_NAMES).map(([code, name]) => ({ code, name }))
}
