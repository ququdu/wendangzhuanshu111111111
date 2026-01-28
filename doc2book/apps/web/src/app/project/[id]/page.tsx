"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect, useCallback } from "react"
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
import { useProject, useDocuments, useTasks } from "@/hooks/useApi"
import { useToast } from "@/hooks/useToast"
import { api, Task } from "@/services/api"
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
  const { documents, loading: docsLoading, uploadProgress, fetchDocuments, uploadDocument, deleteDocument } = useDocuments(projectId)
  const { tasks, loading: tasksLoading, fetchTasks, createTask, startPolling, stopPolling } = useTasks(projectId)

  const [activeTab, setActiveTab] = useState("documents")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentTask, setCurrentTask] = useState<Task | null>(null)

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
      }
    }
  }, [tasks, currentTask, fetchProject, fetchDocuments])

  // 获取下一个任务类型
  const getNextTaskType = useCallback(() => {
    if (!project) return null
    const currentIndex = TASK_SEQUENCE.indexOf(project.current_stage)
    if (currentIndex >= 0 && currentIndex < TASK_SEQUENCE.length - 1) {
      return TASK_SEQUENCE[currentIndex + 1]
    }
    return null
  }, [project])

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
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  导出书籍
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
          <TabsList className="mb-6">
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              文档
            </TabsTrigger>
            <TabsTrigger value="structure" className="gap-2">
              <Brain className="h-4 w-4" />
              结构
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              预览
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
          <TabsContent value="documents">
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

          {/* 结构标签页 */}
          <TabsContent value="structure">
            <Card>
              <CardContent className="py-12">
                {currentStageIndex >= 2 ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">文档结构</h3>
                    {documents.map((doc) => (
                      <div key={doc.id} className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">{doc.original_filename}</h4>
                        {doc.has_analysis ? (
                          <p className="text-sm text-muted-foreground">已分析完成</p>
                        ) : (
                          <p className="text-sm text-muted-foreground">等待分析</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>请先完成文档解析和理解阶段</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 预览标签页 */}
          <TabsContent value="preview">
            <Card>
              <CardContent className="py-12">
                {project.current_stage === "completed" ? (
                  <div className="text-center">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-primary" />
                    <h3 className="text-lg font-medium mb-2">书籍已生成</h3>
                    <p className="text-muted-foreground mb-4">您可以下载生成的电子书</p>
                    <Button>
                      <Download className="mr-2 h-4 w-4" />
                      下载 EPUB
                    </Button>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>完成所有处理阶段后可预览书籍</p>
                  </div>
                )}
              </CardContent>
            </Card>
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
