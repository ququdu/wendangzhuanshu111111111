"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Trash2,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  BookOpen,
  Settings,
  Languages,
  Download,
  FileText,
  Brain,
  Eye,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useProject, useDocuments, useTasks, useDrafts, useProjectSkills, useProviderStatus } from "@/hooks/useApi"
import { useToast } from "@/hooks/useToast"
import { api, Task } from "@/services/api"
import { ReviewEditor } from "@/components/review-editor"
import { TranslationPanel } from "@/components/translation-panel"
import { SkillsEditor } from "@/components/skills-editor"
import { formatFileSize, formatRelativeTime, TASK_STATUS_NAMES } from "@/lib/utils"
import {
  STAGES,
  AUTO_TASKS,
  POST_REVIEW_TASKS,
  STAGE_NAMES,
  TASK_TYPE_NAMES,
  getStageIndex,
}from "@/lib/constants"

// 任务序列（用于自动执行）
const TASK_SEQUENCE = [...AUTO_TASKS, ...POST_REVIEW_TASKS]

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const { toast } = useToast()

  const { project, loading: projectLoading, error: projectError, fetchProject, updateProject } = useProject(projectId)
  const { documents, loading: docsLoading, uploadProgress, fetchDocuments, uploadDocument, deleteDocument, fetchDocumentContent } = useDocuments(projectId)
  const { tasks, loading: tasksLoading, fetchTasks, createTask, startPolling, stopPolling } = useTasks(projectId)
  const { primaryDraft, fetchPrimaryDraft } = useDrafts(projectId)
  const { skills: projectSkills, inherits: skillsInherit, updateSkills: updateProjectSkills } = useProjectSkills(projectId)
  const {
    providers: providerStatuses,
    loading: providerStatusLoading,
    error: providerStatusError,
    fetchStatus: fetchProviderStatus,
  } = useProviderStatus()

  const [activeTab, setActiveTab] = useState("upload")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentTask, setCurrentTask] = useState<Task | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [exportId, setExportId] = useState<string | null>(null)
  const [autoRun, setAutoRun] = useState(false)
  const [documentContent, setDocumentContent] = useState<Record<string, any>>({})
  const [contentLoading, setContentLoading] = useState<Record<string, boolean>>({})
  const [projectSkillDraft, setProjectSkillDraft] = useState(projectSkills || [])
  const exportPollRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchProviderStatus()
    const interval = setInterval(() => {
      fetchProviderStatus()
    }, 10000)
    return () => clearInterval(interval)
  }, [fetchProviderStatus])

  // 文件上传处理
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return

    for (const file of Array.from(files)) {
      try {
        await uploadDocument(file)
        toast({
          title: "上传成功",
          description: `${file.name} 已上传`,
        })
      } catch (e) {
        toast({
          title: "上传失败",
          description: e instanceof Error ? e.message : "未知错误",
          variant: "destructive",
        })
      }
    }
    fetchProject()
  }, [uploadDocument, toast, fetchProject])

  // 删除文档
  const handleDeleteDocument = useCallback(async (docId: string) => {
    try {
      await deleteDocument(docId)
      toast({ title: "文档已删除" })
      fetchProject()
    } catch (e) {
      toast({
        title: "删除失败",
        description: e instanceof Error ? e.message : "未知错误",
        variant: "destructive",
      })
    }
  }, [deleteDocument, toast, fetchProject])

  // 删除项目
  const handleDeleteProject = useCallback(async () => {
    try {
      await api.deleteProject(projectId)
      toast({ title: "项目已删除" })
      router.push("/")
    } catch (e) {
      toast({
        title: "删除失败",
        description: e instanceof Error ? e.message : "未知错误",
        variant: "destructive",
      })
    }
  }, [projectId, toast, router])

  const downloadExportFile = useCallback(async (id: string, format: string, filename?: string) => {
    const blob = await api.downloadExport(id, format)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename || `book.${format}`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }, [])

  const pollExport = useCallback((id: string) => {
    if (exportPollRef.current) {
      clearInterval(exportPollRef.current)
    }

    exportPollRef.current = setInterval(async () => {
      try {
        const record = await api.getExport(id)
        if (record.status === "completed") {
          if (exportPollRef.current) {
            clearInterval(exportPollRef.current)
            exportPollRef.current = null
          }
          setIsExporting(false)
          setExportId(id)
          const file = record.files?.[0]
          if (file) {
            await downloadExportFile(id, file.format, file.filename)
            toast({ title: "导出完成", description: "文件已开始下载" })
          } else {
            toast({ title: "导出完成", description: "未找到可下载文件" })
          }
        }

        if (record.status === "failed") {
          if (exportPollRef.current) {
            clearInterval(exportPollRef.current)
            exportPollRef.current = null
          }
          setIsExporting(false)
          toast({ title: "导出失败", description: record.error || "未知错误", variant: "destructive" })
        }
      } catch (e) {
        if (exportPollRef.current) {
          clearInterval(exportPollRef.current)
          exportPollRef.current = null
        }
        setIsExporting(false)
        toast({ title: "导出失败", description: e instanceof Error ? e.message : "未知错误", variant: "destructive" })
      }
    }, 1500)
  }, [downloadExportFile, toast])

  const handleExportBook = useCallback(async () => {
    if (!project) return
    setIsExporting(true)
    try {
      const formats = project.settings?.output_formats || ["epub"]
      const record = await api.createExport(project.id, formats)
      setExportId(record.id)
      toast({ title: "导出已开始", description: "正在生成书籍文件" })
      pollExport(record.id)
    } catch (e) {
      setIsExporting(false)
      toast({ title: "导出失败", description: e instanceof Error ? e.message : "未知错误", variant: "destructive" })
    }
  }, [project, pollExport, toast])

  useEffect(() => {
    return () => {
      if (exportPollRef.current) {
        clearInterval(exportPollRef.current)
      }
    }
  }, [])

  useEffect(() => {
    setProjectSkillDraft(projectSkills || [])
  }, [projectSkills])

  // 开始处理流程
  const handleStartProcessing = useCallback(async () => {
    if (!project || documents.length === 0) {
      toast({
        title: "无法开始处理",
        description: "请先上传文档",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      // 创建解析任务
      const task = await createTask("parse")
      if (task) {
        setCurrentTask(task)
        startPolling(1000)
        toast({
          title: "处理已开始",
          description: "正在解析文档...",
        })
      }
    } catch (e) {
      toast({
        title: "启动失败",
        description: e instanceof Error ? e.message : "未知错误",
        variant: "destructive",
      })
      setIsProcessing(false)
    }
  }, [project, documents, createTask, startPolling, toast])

  // 获取下一个任务类型
  const getNextTaskType = useCallback(() => {
    if (!project) return null
    const currentIndex = TASK_SEQUENCE.indexOf(project.current_stage)
    if (currentIndex >= 0 && currentIndex < TASK_SEQUENCE.length - 1) {
      return TASK_SEQUENCE[currentIndex + 1]
    }
    return null
  }, [project])

  // 继续下一个任务
  const handleContinueProcessing = useCallback(async (taskType: string) => {
    setIsProcessing(true)
    try {
      const task = await createTask(taskType)
      if (task) {
        setCurrentTask(task)
        startPolling(1000)
        toast({
          title: "任务已创建",
          description: `正在执行: ${TASK_TYPE_NAMES[taskType] || taskType}`,
        })
      }
    } catch (e) {
      toast({
        title: "启动失败",
        description: e instanceof Error ? e.message : "未知错误",
        variant: "destructive",
      })
      setIsProcessing(false)
    }
  }, [createTask, startPolling, toast])

  const handleAutoRun = useCallback(async () => {
    if (!project) return
    if (documents.length === 0) {
      toast({
        title: "无法开始处理",
        description: "请先上传文档",
        variant: "destructive",
      })
      return
    }

    setAutoRun(true)
    if (project.current_stage === "upload") {
      await handleStartProcessing()
    } else {
      const nextTaskType = getNextTaskType()
      if (nextTaskType && AUTO_TASKS.includes(nextTaskType)) {
        await handleContinueProcessing(nextTaskType)
      }
    }
  }, [project, documents, handleStartProcessing, handleContinueProcessing, getNextTaskType, toast])

  const handleLoadDocumentContent = useCallback(async (docId: string) => {
    if (documentContent[docId]) return
    setContentLoading((prev) => ({ ...prev, [docId]: true }))
    try {
      const content = await fetchDocumentContent(docId)
      setDocumentContent((prev) => ({ ...prev, [docId]: content }))
    } catch (e) {
      toast({
        title: "加载失败",
        description: e instanceof Error ? e.message : "无法获取文档内容",
        variant: "destructive",
      })
    } finally {
      setContentLoading((prev) => ({ ...prev, [docId]: false }))
    }
  }, [documentContent, fetchDocumentContent, toast])

  const handleSaveProjectSkills = useCallback(async () => {
    try {
      await updateProjectSkills({ skills: projectSkillDraft })
      toast({ title: "项目技能已保存" })
    } catch (e) {
      toast({
        title: "保存失败",
        description: e instanceof Error ? e.message : "无法保存项目技能",
        variant: "destructive",
      })
    }
  }, [updateProjectSkills, projectSkillDraft, toast])

  const handleInheritSkills = useCallback(async () => {
    try {
      await updateProjectSkills({ inherit: true })
      toast({ title: "已切换为继承全局技能" })
    } catch (e) {
      toast({
        title: "切换失败",
        description: e instanceof Error ? e.message : "无法切换技能模式",
        variant: "destructive",
      })
    }
  }, [updateProjectSkills, toast])

  // 监听任务状态变化
  useEffect(() => {
    const runningTask = tasks.find(t => t.status === "running" || t.status === "pending")
    if (runningTask) {
      setCurrentTask(runningTask)
      setIsProcessing(true)
    } else {
      setIsProcessing(false)
      if (currentTask && currentTask.status === "completed") {
        fetchProject()
        fetchDocuments()
        if (currentTask.task_type === "create") {
          fetchPrimaryDraft()
        }
      }
    }
  }, [tasks, currentTask, fetchProject, fetchDocuments, fetchPrimaryDraft])

  useEffect(() => {
    if (!autoRun) return
    const runningTask = tasks.find(t => t.status === "running" || t.status === "pending")
    if (runningTask) return

    const nextTaskType = getNextTaskType()
    if (!nextTaskType || !AUTO_TASKS.includes(nextTaskType)) {
      setAutoRun(false)
      return
    }

    handleContinueProcessing(nextTaskType)
  }, [autoRun, tasks, getNextTaskType, handleContinueProcessing])

  // 加载状态
  if (projectLoading && !project) {
    return (
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-20 w-full mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  // 错误状态
  if (projectError || !project) {
    return (
      <div className="container py-8 text-center">
        <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
        <h2 className="text-xl font-semibold mb-2">项目不存在</h2>
        <p className="text-muted-foreground mb-4">{projectError || "无法加载项目"}</p>
        <Link href="/">
          <Button>返回首页</Button>
        </Link>
      </div>
    )
  }

  const currentStageIndex = getStageIndex(project.current_stage)
  const runningTask = tasks.find(t => t.status === "running")
  const nextTaskType = getNextTaskType()
  const latestGenerateTask = tasks.find(t => t.task_type === "generate")

  const getDataBadge = (data?: any) => {
    if (!data) return { label: "未生成", variant: "secondary" as const }
    const source = data.source || (data.note?.includes("基础") ? "basic" : undefined)
    if (source === "real") return { label: "真实", variant: "success" as const }
    if (source === "ai") return { label: "真实AI", variant: "success" as const }
    if (source === "rule") return { label: "规则", variant: "secondary" as const }
    if (source === "basic") return { label: "基础", variant: "warning" as const }
    if (source === "fallback") return { label: "降级", variant: "destructive" as const }
    return { label: "未知", variant: "outline" as const }
  }

  return (
    <div className="min-h-screen">
      {/* 头部 */}
      <div className="border-b bg-card">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">{project.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {documents.length} 个文档 · {STAGE_NAMES[project.current_stage] || project.current_stage}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-2">
                {providerStatusLoading && (
                  <Badge variant="outline" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    连接检测中
                  </Badge>
                )}
                {providerStatusError && (
                  <Badge variant="destructive">{providerStatusError}</Badge>
                )}
                {providerStatuses.length > 0 && providerStatuses.map((item: any) => (
                  <Badge key={item.id} variant={item.available ? "success" : "destructive"}>
                    {item.name || item.id} {item.available ? "已连接" : "不可用"}
                  </Badge>
                ))}
              </div>
              {project.current_stage === "upload" ? (
                <Button
                  onClick={handleStartProcessing}
                  disabled={documents.length === 0 || isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  开始处理
                </Button>
              ) : nextTaskType && project.current_stage !== "completed" ? (
                <Button
                  onClick={() => handleContinueProcessing(nextTaskType)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  继续: {TASK_TYPE_NAMES[nextTaskType] || nextTaskType}
                </Button>
              ) : project.current_stage === "completed" ? (
                <Button variant="outline" onClick={handleExportBook} disabled={isExporting}>
                  <Download className="mr-2 h-4 w-4" />
                  {isExporting ? "导出中..." : "导出书籍"}
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-5 w-5 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 进度条 */}
      <div className="border-b bg-muted/30">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            {STAGES.map((stage, index) => {
              const Icon = stage.icon
              const isActive = project.current_stage === stage.id
              const isPast = currentStageIndex > index
              const isCompleted = project.current_stage === "completed"

              return (
                <div key={stage.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : isPast || isCompleted
                          ? "bg-green-500 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isPast || isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <span className={`text-xs mt-1 ${isActive ? "text-primary font-medium" : "text-muted-foreground"}`}>
                      {stage.name}
                    </span>
                  </div>
                  {index < STAGES.length - 1 && (
                    <div
                      className={`w-12 h-1 mx-2 rounded ${
                        isPast || isCompleted ? "bg-green-500" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 任务进度 */}
      {runningTask && (
        <div className="border-b bg-primary/5">
          <div className="container py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="font-medium">{runningTask.message}</span>
              </div>
              <span className="text-sm text-muted-foreground">{runningTask.progress}%</span>
            </div>
            <Progress value={runningTask.progress} className="h-2" />
          </div>
        </div>
      )}

      {/* 主内容 */}
      <div className="container py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 flex flex-wrap">
              <TabsTrigger value="upload" className="gap-2">
                <Upload className="h-4 w-4" />
                上传
              </TabsTrigger>
              <TabsTrigger value="pipeline" className="gap-2">
                <Brain className="h-4 w-4" />
                解析与理解
              </TabsTrigger>
              <TabsTrigger value="create" className="gap-2">
                <BookOpen className="h-4 w-4" />
                创作
              </TabsTrigger>
              <TabsTrigger value="review" className="gap-2">
                <Eye className="h-4 w-4" />
                审阅
              </TabsTrigger>
              <TabsTrigger value="translate" className="gap-2">
                <Languages className="h-4 w-4" />
                翻译
              </TabsTrigger>
              <TabsTrigger value="generate" className="gap-2">
                <Download className="h-4 w-4" />
                生成
              </TabsTrigger>
              <TabsTrigger value="tasks" className="gap-2">
                <Clock className="h-4 w-4" />
                任务
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                设置
              </TabsTrigger>
            </TabsList>

          {/* 文档标签页 */}
          <TabsContent value="upload">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* 上传区域 */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg">上传文档</CardTitle>
                  <CardDescription>支持 PDF、Word、Markdown、HTML、TXT、图片</CardDescription>
                </CardHeader>
                <CardContent>
                  <label className="block">
                    <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors">
                      <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                      <p className="mb-2">拖拽文件到这里</p>
                      <p className="text-sm text-muted-foreground">或点击选择文件</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      accept=".pdf,.docx,.doc,.md,.markdown,.html,.htm,.txt,.png,.jpg,.jpeg"
                      onChange={(e) => handleFileUpload(e.target.files)}
                    />
                  </label>

                  {/* 上传进度 */}
                  {Object.keys(uploadProgress).length > 0 && (
                    <div className="mt-4 space-y-2">
                      {Object.entries(uploadProgress).map(([name, progress]) => (
                        <div key={name} className="text-sm">
                          <div className="flex justify-between mb-1">
                            <span className="truncate">{name.split("-")[0]}</span>
                            <span>{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-1" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 文档列表 */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">已上传文档</CardTitle>
                  <CardDescription>{documents.length} 个文档</CardDescription>
                </CardHeader>
                <CardContent>
                  {docsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>还没有上传文档</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded bg-muted">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{doc.original_filename}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatFileSize(doc.size)} · {doc.format}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={doc.status === "parsed" ? "success" : doc.status === "pending" ? "secondary" : "default"}>
                              {doc.status === "parsed" ? "已解析" : doc.status === "pending" ? "待处理" : doc.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteDocument(doc.id)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 解析与理解标签页 */}
          <TabsContent value="pipeline">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">解析与理解</CardTitle>
                      <CardDescription>解析、清洗、理解与结构化可一键执行</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={handleAutoRun} disabled={isProcessing || documents.length === 0}>
                        {autoRun ? "自动处理中" : "一键处理"}
                      </Button>
                      {autoRun && (
                        <Badge variant="secondary">自动执行中</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div>当前阶段：{STAGE_NAMES[project.current_stage] || project.current_stage}</div>
                  <div>文档数量：{documents.length}</div>
                  {runningTask && <div>执行中：{runningTask.message}</div>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">处理结果</CardTitle>
                  <CardDescription>点击文档加载解析/清洗/理解结果</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {documents.length === 0 ? (
                    <div className="text-center text-muted-foreground py-6">暂无文档</div>
                  ) : (
                    documents.map((doc) => {
                      const content = documentContent[doc.id]
                      const parsedBadge = getDataBadge(content?.parsed_content)
                      const cleanBadge = getDataBadge(content?.sanitized_content)
                      const analysisBadge = getDataBadge(content?.analysis_result)

                      return (
                        <div key={doc.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{doc.original_filename}</div>
                              <div className="text-xs text-muted-foreground">{doc.format} · {formatFileSize(doc.size)}</div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLoadDocumentContent(doc.id)}
                              disabled={contentLoading[doc.id]}
                            >
                              {contentLoading[doc.id] ? "加载中..." : "查看结果"}
                            </Button>
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs">
                            <Badge variant={parsedBadge.variant}>解析：{parsedBadge.label}</Badge>
                            <Badge variant={cleanBadge.variant}>清洗：{cleanBadge.label}</Badge>
                            <Badge variant={analysisBadge.variant}>理解：{analysisBadge.label}</Badge>
                          </div>

                          {content && (
                            <div className="grid gap-3 md:grid-cols-3">
                              <Card className="border-dashed">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm">解析结果</CardTitle>
                                </CardHeader>
                                <CardContent className="text-xs text-muted-foreground space-y-2">
                                  <div>标题：{content.parsed_content?.metadata?.title || "未识别"}</div>
                                  <div>语言：{content.parsed_content?.metadata?.language || "未知"}</div>
                                  <div>字数：{content.parsed_content?.metadata?.wordCount || 0}</div>
                                  {content.parsed_content?.note && (
                                    <div>备注：{content.parsed_content.note}</div>
                                  )}
                                </CardContent>
                              </Card>
                              <Card className="border-dashed">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm">清洗结果</CardTitle>
                                </CardHeader>
                                <CardContent className="text-xs text-muted-foreground space-y-2">
                                  <div>移除项：{content.sanitized_content?.removed_count || content.sanitized_content?.removed_items?.length || 0}</div>
                                  <div className="line-clamp-3">{content.sanitized_content?.content || "暂无内容"}</div>
                                  {content.sanitized_content?.note && (
                                    <div>备注：{content.sanitized_content.note}</div>
                                  )}
                                </CardContent>
                              </Card>
                              <Card className="border-dashed">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm">理解结果</CardTitle>
                                </CardHeader>
                                <CardContent className="text-xs text-muted-foreground space-y-2">
                                  <div>主题：{content.analysis_result?.mainTheme?.name || content.analysis_result?.summary || "未生成"}</div>
                                  <div>要点：{content.analysis_result?.keyPoints?.length || 0} 条</div>
                                  <div>文档类型：{content.analysis_result?.documentType || "未识别"}</div>
                                  {content.analysis_result?.note && (
                                    <div>备注：{content.analysis_result.note}</div>
                                  )}
                                </CardContent>
                              </Card>
                              <Card className="border-dashed md:col-span-3">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm">结果详情</CardTitle>
                                </CardHeader>
                                <CardContent className="text-xs text-muted-foreground space-y-2">
                                  <div className="text-xs">解析输出</div>
                                  <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-2">
                                    {JSON.stringify(content.parsed_content || {}, null, 2).slice(0, 2000)}
                                  </pre>
                                  <div className="text-xs">清洗输出</div>
                                  <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-2">
                                    {JSON.stringify(content.sanitized_content || {}, null, 2).slice(0, 2000)}
                                  </pre>
                                  <div className="text-xs">理解输出</div>
                                  <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-2">
                                    {JSON.stringify(content.analysis_result || {}, null, 2).slice(0, 2000)}
                                  </pre>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 创作标签页 */}
          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">创作结果</CardTitle>
                <CardDescription>查看 AI 重写后的内容</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {documents.length === 0 ? (
                  <div className="text-center text-muted-foreground py-6">暂无文档</div>
                ) : (
                  documents.map((doc) => {
                    const content = documentContent[doc.id]
                    const hasContent = Boolean(content?.rewritten_content)
                    return (
                      <div key={doc.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{doc.original_filename}</div>
                            <div className="text-xs text-muted-foreground">{doc.format} · {formatFileSize(doc.size)}</div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLoadDocumentContent(doc.id)}
                            disabled={contentLoading[doc.id]}
                          >
                            {contentLoading[doc.id] ? "加载中..." : "查看内容"}
                          </Button>
                        </div>
                        <Badge variant={hasContent ? "success" : "secondary"}>
                          {hasContent ? "已生成" : "未生成"}
                        </Badge>
                        {hasContent && (
                          <div className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">
                            {content.rewritten_content}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 审阅标签页 */}
          <TabsContent value="review">
            <div className="h-[720px] border rounded-lg overflow-hidden">
              <ReviewEditor
                projectId={project.id}
                draft={primaryDraft}
                onDraftUpdate={() => fetchPrimaryDraft()}
                onApprove={() => fetchProject()}
              />
            </div>
          </TabsContent>

          {/* 翻译标签页 */}
          <TabsContent value="translate">
            <TranslationPanel
              projectId={project.id}
              sourceDraft={primaryDraft}
              onComplete={() => fetchProject()}
            />
          </TabsContent>

          {/* 生成标签页 */}
          <TabsContent value="generate">
            <div className="space-y-6">
              <Card>
                <CardContent className="py-10">
                  {project.current_stage === "completed" ? (
                    <div className="text-center">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 text-primary" />
                      <h3 className="text-lg font-medium mb-2">书籍已生成</h3>
                      <p className="text-muted-foreground mb-4">您可以下载生成的电子书</p>
                      <Button onClick={handleExportBook} disabled={isExporting}>
                        <Download className="mr-2 h-4 w-4" />
                        {isExporting ? "导出中..." : "导出书籍"}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>完成所有处理阶段后可生成书籍</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {latestGenerateTask?.result_data?.files && Array.isArray(latestGenerateTask.result_data.files) && latestGenerateTask.result_data.files.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">最新生成结果</CardTitle>
                    <CardDescription>以下为最近一次生成的文件</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(latestGenerateTask.result_data.files as any[]).map((file: any, index: number) => (
                      <div key={`${file.path || file.filename || index}`} className="flex items-center justify-between border rounded-md px-3 py-2">
                        <div className="text-sm">{file.filename || file.path || `文件 ${index + 1}`}</div>
                        <Badge variant="secondary">{file.format || "未知格式"}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </TabsContent>

          {/* 任务标签页 */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">处理任务</CardTitle>
                  <Button variant="outline" size="sm" onClick={fetchTasks}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    刷新
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>还没有处理任务</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <div key={task.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {task.status === "running" ? (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            ) : task.status === "completed" ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : task.status === "failed" ? (
                              <XCircle className="h-4 w-4 text-destructive" />
                            ) : (
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="font-medium">
                              {TASK_TYPE_NAMES[task.task_type] || task.task_type}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {(task.status === "failed" || task.status === "cancelled") && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await api.retryTask(task.id)
                                    fetchTasks()
                                    toast({
                                      title: "任务已重试",
                                      description: "任务已重新加入队列",
                                    })
                                  } catch (e) {
                                    toast({
                                      title: "重试失败",
                                      description: e instanceof Error ? e.message : "未知错误",
                                      variant: "destructive",
                                    })
                                  }
                                }}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                重试
                              </Button>
                            )}
                            <Badge
                              variant={
                                task.status === "completed" ? "success" :
                                task.status === "failed" ? "destructive" :
                                task.status === "running" ? "default" : "secondary"
                              }
                            >
                              {TASK_STATUS_NAMES[task.status] || task.status}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{task.message}</p>
                        {task.status === "running" && (
                          <Progress value={task.progress} className="h-1" />
                        )}
                        {task.error && (
                          <p className="text-sm text-destructive mt-2">{task.error}</p>
                        )}
                        {task.retry_count && task.retry_count > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            已重试 {task.retry_count} 次
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatRelativeTime(task.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 设置标签页 */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">项目设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 max-w-xl">
                <div className="space-y-2">
                  <label className="text-sm font-medium">项目名称</label>
                  <Input
                    value={project.name}
                    onChange={(e) => updateProject({ name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">项目描述</label>
                  <Input
                    value={project.description}
                    onChange={(e) => updateProject({ description: e.target.value })}
                    placeholder="添加项目描述"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">输出格式</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={project.settings?.output_formats?.includes("epub") ?? true}
                        onChange={(e) => {
                          const formats = project.settings?.output_formats || ["epub"]
                          const newFormats = e.target.checked
                            ? [...formats.filter(f => f !== "epub"), "epub"]
                            : formats.filter(f => f !== "epub")
                          updateProject({
                            output_formats: newFormats.length > 0 ? newFormats : ["epub"]
                          })
                        }}
                        className="rounded"
                      />
                      EPUB
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={project.settings?.output_formats?.includes("pdf") ?? false}
                        onChange={(e) => {
                          const formats = project.settings?.output_formats || ["epub"]
                          const newFormats = e.target.checked
                            ? [...formats.filter(f => f !== "pdf"), "pdf"]
                            : formats.filter(f => f !== "pdf")
                          updateProject({
                            output_formats: newFormats.length > 0 ? newFormats : ["epub"]
                          })
                        }}
                        className="rounded"
                      />
                      PDF
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">处理流程</label>
                  <select
                    value={project.settings?.processing_mode || "ai-enhanced"}
                    onChange={(e) => updateProject({ processing_mode: e.target.value as "ai-enhanced" | "local-lite" })}
                    className="w-full h-10 px-3 rounded-md border bg-background max-w-xs"
                  >
                    <option value="ai-enhanced">AI 增强（全流程使用 AI）</option>
                    <option value="local-lite">本地轻量（仅创作/翻译用 AI）</option>
                  </select>
                  <p className="text-sm text-muted-foreground">
                    本地轻量模式会保留所有流程，但清洗/理解/结构化采用本地规则与基础分析。
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={project.settings?.kdp_compliant ?? true}
                      onChange={(e) => updateProject({ kdp_compliant: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">符合 KDP 标准</span>
                  </label>
                  <p className="text-sm text-muted-foreground ml-6">
                    确保生成的电子书符合亚马逊 Kindle Direct Publishing 的要求
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">项目技能</CardTitle>
                <CardDescription>项目未配置时将继承全局技能</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={skillsInherit ? "secondary" : "default"}>
                    {skillsInherit ? "继承全局" : "使用项目技能"}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleInheritSkills}
                  >
                    继承全局
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveProjectSkills}
                  >
                    保存项目技能
                  </Button>
                </div>
                {!skillsInherit && (
                  <SkillsEditor value={projectSkillDraft} onChange={setProjectSkillDraft} />
                )}
                {skillsInherit && (
                  <div className="text-sm text-muted-foreground">
                    当前未设置项目技能，将使用全局技能库。
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除项目</DialogTitle>
            <DialogDescription>
              确定要删除项目 "{project.name}" 吗？此操作无法撤销，所有文档和处理结果都将被删除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteProject}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
