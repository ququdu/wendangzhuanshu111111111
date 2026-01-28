/**
 * 翻译面板组件
 * 用于选择目标语言并启动翻译任务
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Languages,
  Play,
  Check,
  X,
  Loader2,
  AlertCircle,
  Download,
  Trash2,
} from 'lucide-react'
import { api, TranslationJob, BookDraft } from '@/services/api'
import { cn } from '@/lib/utils'
import { SUPPORTED_LANGUAGES } from '@/lib/constants'

interface TranslationPanelProps {
  projectId: string
  sourceDraft: BookDraft | null
  onComplete?: () => void
}

export function TranslationPanel({ projectId, sourceDraft, onComplete }: TranslationPanelProps) {
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])
  const [jobs, setJobs] = useState<TranslationJob[]>([])
  const [translatedDrafts, setTranslatedDrafts] = useState<BookDraft[]>([])
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [completing, setCompleting] = useState(false)

  // 加载翻译任务
  const loadJobs = useCallback(async () => {
    try {
      const data = await api.listTranslations(projectId)
      setJobs(data)
    } catch (error) {
      console.error('加载翻译任务失败:', error)
    }
  }, [projectId])

  // 加载翻译后的草稿
  const loadDrafts = useCallback(async () => {
    try {
      const data = await api.listDrafts(projectId)
      // 过滤出非主草稿（翻译版本）
      setTranslatedDrafts(data.filter(d => !d.is_primary))
    } catch (error) {
      console.error('加载草稿失败:', error)
    }
  }, [projectId])

  // 初始加载
  useEffect(() => {
    setLoading(true)
    Promise.all([loadJobs(), loadDrafts()]).finally(() => setLoading(false))
  }, [loadJobs, loadDrafts])

  // 轮询运行中的任务
  useEffect(() => {
    const runningJobs = jobs.filter(j => j.status === 'running' || j.status === 'pending')
    if (runningJobs.length === 0) return

    const interval = setInterval(() => {
      loadJobs()
      loadDrafts()
    }, 2000)

    return () => clearInterval(interval)
  }, [jobs, loadJobs, loadDrafts])

  // 切换语言选择
  const toggleLanguage = useCallback((code: string) => {
    setSelectedLanguages(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    )
  }, [])

  // 开始翻译
  const handleStartTranslation = useCallback(async () => {
    if (!sourceDraft || selectedLanguages.length === 0) return

    setStarting(true)
    try {
      const result = await api.createTranslations({
        project_id: projectId,
        source_draft_id: sourceDraft.id,
        target_languages: selectedLanguages,
        provider: 'deepl',
        preserve_formatting: true,
      })

      if (result.success) {
        setSelectedLanguages([])
        await loadJobs()
      }
    } catch (error) {
      console.error('启动翻译失败:', error)
    } finally {
      setStarting(false)
    }
  }, [projectId, sourceDraft, selectedLanguages, loadJobs])

  // 取消翻译
  const handleCancelJob = useCallback(async (jobId: string) => {
    try {
      await api.cancelTranslation(jobId)
      await loadJobs()
    } catch (error) {
      console.error('取消翻译失败:', error)
    }
  }, [loadJobs])

  // 删除翻译
  const handleDeleteJob = useCallback(async (jobId: string) => {
    try {
      await api.deleteTranslation(jobId)
      await loadJobs()
      await loadDrafts()
    } catch (error) {
      console.error('删除翻译失败:', error)
    }
  }, [loadJobs, loadDrafts])

  // 完成翻译阶段
  const handleComplete = useCallback(async () => {
    setCompleting(true)
    try {
      await api.completeTranslations(projectId)
      onComplete?.()
    } catch (error) {
      console.error('完成翻译阶段失败:', error)
    } finally {
      setCompleting(false)
    }
  }, [projectId, onComplete])

  // 获取语言名称
  const getLanguageName = (code: string) => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code)
    return lang?.name || code
  }

  // 获取语言旗帜
  const getLanguageFlag = (code: string) => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code)
    return lang?.flag || '🌐'
  }

  // 获取任务状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500'
      case 'running':
        return 'bg-blue-500'
      case 'pending':
        return 'bg-yellow-500'
      case 'failed':
        return 'bg-red-500'
      case 'cancelled':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  // 获取任务状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成'
      case 'running':
        return '翻译中'
      case 'pending':
        return '等待中'
      case 'failed':
        return '失败'
      case 'cancelled':
        return '已取消'
      default:
        return status
    }
  }

  // 已翻译的语言
  const translatedLanguages = new Set(
    jobs.filter(j => j.status === 'completed').map(j => j.target_language)
  )

  // 正在翻译的语言
  const translatingLanguages = new Set(
    jobs.filter(j => j.status === 'running' || j.status === 'pending').map(j => j.target_language)
  )

  if (!sourceDraft) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <Languages className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>请先完成审阅阶段</p>
        </div>
      </div>
    )
  }

  if (sourceDraft.status !== 'approved') {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>请先确认审阅完成</p>
          <p className="text-sm mt-2">审阅完成后才能开始翻译</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* 语言选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="w-5 h-5" />
            选择目标语言
          </CardTitle>
          <CardDescription>
            选择要翻译的目标语言，支持同时翻译多种语言
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {SUPPORTED_LANGUAGES.map(lang => {
              const isTranslated = translatedLanguages.has(lang.code)
              const isTranslating = translatingLanguages.has(lang.code)
              const isSelected = selectedLanguages.includes(lang.code)
              const isDisabled = isTranslated || isTranslating

              return (
                <div
                  key={lang.code}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    isDisabled && 'opacity-50 cursor-not-allowed',
                    isSelected && !isDisabled && 'border-primary bg-primary/5',
                    !isSelected && !isDisabled && 'hover:bg-muted'
                  )}
                  onClick={() => !isDisabled && toggleLanguage(lang.code)}
                >
                  <Checkbox
                    checked={isSelected}
                    disabled={isDisabled}
                    onCheckedChange={() => !isDisabled && toggleLanguage(lang.code)}
                  />
                  <span className="text-xl">{lang.flag}</span>
                  <span className="flex-1">{lang.name}</span>
                  {isTranslated && (
                    <Badge variant="secondary" className="text-xs">
                      <Check className="w-3 h-3 mr-1" />
                      已翻译
                    </Badge>
                  )}
                  {isTranslating && (
                    <Badge variant="secondary" className="text-xs">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      翻译中
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleStartTranslation}
              disabled={selectedLanguages.length === 0 || starting}
            >
              {starting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  启动中...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  开始翻译 ({selectedLanguages.length} 种语言)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 翻译任务列表 */}
      {jobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>翻译任务</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3">
                {jobs.map(job => (
                  <div
                    key={job.id}
                    className="flex items-center gap-4 p-3 rounded-lg border"
                  >
                    <span className="text-xl">{getLanguageFlag(job.target_language)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {getLanguageName(job.target_language)}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn('text-xs text-white', getStatusColor(job.status))}
                        >
                          {getStatusText(job.status)}
                        </Badge>
                      </div>
                      {(job.status === 'running' || job.status === 'pending') && (
                        <Progress value={job.progress} className="mt-2 h-2" />
                      )}
                      {job.error && (
                        <p className="text-sm text-red-500 mt-1">{job.error}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {(job.status === 'running' || job.status === 'pending') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelJob(job.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                      {(job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteJob(job.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* 已完成的翻译版本 */}
      {translatedDrafts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>已完成的翻译版本</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {translatedDrafts.map(draft => (
                <div
                  key={draft.id}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  <span className="text-xl">{getLanguageFlag(draft.language)}</span>
                  <div className="flex-1">
                    <div className="font-medium">{getLanguageName(draft.language)}</div>
                    <div className="text-sm text-muted-foreground">
                      {draft.chapters?.length || 0} 章节
                    </div>
                  </div>
                  <Check className="w-5 h-5 text-green-500" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 完成按钮 */}
      <div className="flex justify-end">
        <Button
          onClick={handleComplete}
          disabled={completing || translatedDrafts.length === 0}
          size="lg"
        >
          {completing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              处理中...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              完成翻译，进入生成阶段
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
