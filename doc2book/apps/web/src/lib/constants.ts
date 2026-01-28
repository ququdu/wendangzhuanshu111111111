/**
 * 项目常量定义
 * 集中管理阶段、任务类型等常量
 */

import {
  Upload,
  FileText,
  Eraser,
  Brain,
  ListTree,
  PenTool,
  Eye,
  Languages,
  Download,
  type LucideIcon,
} from "lucide-react"

// 项目阶段定义
export interface Stage {
  id: string
  name: string
  icon: LucideIcon
  description: string
}

export const STAGES: Stage[] = [
  { id: "upload", name: "上传", icon: Upload, description: "上传源文档" },
  { id: "parse", name: "解析", icon: FileText, description: "解析文档内容" },
  { id: "clean", name: "清洗", icon: Eraser, description: "去除广告和无关内容" },
  { id: "understand", name: "理解", icon: Brain, description: "AI 深度理解文档" },
  { id: "structure", name: "结构", icon: ListTree, description: "生成书籍结构" },
  { id: "create", name: "创作", icon: PenTool, description: "AI 重写内容" },
  { id: "review", name: "审阅", icon: Eye, description: "用户审阅编辑" },
  { id: "translate", name: "翻译", icon: Languages, description: "多语言翻译" },
  { id: "generate", name: "生成", icon: Download, description: "生成电子书" },
]

// 自动执行的任务（到审阅暂停）
export const AUTO_TASKS = ["parse", "clean", "understand", "structure", "create"]

// 审阅后的任务
export const POST_REVIEW_TASKS = ["translate", "generate"]

// 所有任务类型
export const ALL_TASKS = [...AUTO_TASKS, ...POST_REVIEW_TASKS]

// 阶段名称映射
export const STAGE_NAMES: Record<string, string> = {
  upload: "上传",
  parse: "解析",
  clean: "清洗",
  understand: "理解",
  structure: "结构",
  create: "创作",
  review: "审阅",
  translate: "翻译",
  generate: "生成",
  completed: "完成",
}

// 任务类型名称映射
export const TASK_TYPE_NAMES: Record<string, string> = {
  parse: "文档解析",
  clean: "内容清洗",
  understand: "深度理解",
  structure: "结构生成",
  create: "内容创作",
  translate: "多语言翻译",
  generate: "书籍生成",
}

// 获取阶段索引
export function getStageIndex(stage: string): number {
  const stageIds = STAGES.map((s) => s.id)
  const index = stageIds.indexOf(stage)
  return index >= 0 ? index : -1
}

// 获取下一个阶段
export function getNextStage(currentStage: string): string | null {
  const index = getStageIndex(currentStage)
  if (index >= 0 && index < STAGES.length - 1) {
    return STAGES[index + 1].id
  }
  return null
}

// 判断阶段是否完成
export function isStageCompleted(currentStage: string, targetStage: string): boolean {
  const currentIndex = getStageIndex(currentStage)
  const targetIndex = getStageIndex(targetStage)
  return currentIndex > targetIndex
}

// 支持的翻译语言
export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "英语", flag: "🇬🇧" },
  { code: "ja", name: "日语", flag: "🇯🇵" },
  { code: "ko", name: "韩语", flag: "🇰🇷" },
  { code: "de", name: "德语", flag: "🇩🇪" },
  { code: "fr", name: "法语", flag: "🇫🇷" },
  { code: "es", name: "西班牙语", flag: "🇪🇸" },
  { code: "pt", name: "葡萄牙语", flag: "🇵🇹" },
  { code: "it", name: "意大利语", flag: "🇮🇹" },
  { code: "nl", name: "荷兰语", flag: "🇳🇱" },
  { code: "pl", name: "波兰语", flag: "🇵🇱" },
  { code: "ru", name: "俄语", flag: "🇷🇺" },
]
