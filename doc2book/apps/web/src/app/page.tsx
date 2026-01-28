"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, FileText, Clock, Trash2, BookOpen, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useProjects } from "@/hooks/useApi"
import { useToast } from "@/hooks/useToast"
import { formatRelativeTime } from "@/lib/utils"
import { STAGE_NAMES } from "@/lib/constants"

export default function HomePage() {
  const { projects, loading, error, createProject, deleteProject } = useProjects()
  const { toast } = useToast()
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectDesc, setNewProjectDesc] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null)

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast({
        title: "请输入项目名称",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      await createProject({
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || undefined,
      })
      toast({
        title: "项目创建成功",
        description: `项目 "${newProjectName}" 已创建`,
      })
      setNewProjectName("")
      setNewProjectDesc("")
      setDialogOpen(false)
    } catch (e) {
      toast({
        title: "创建失败",
        description: e instanceof Error ? e.message : "未知错误",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!projectToDelete) return

    try {
      await deleteProject(projectToDelete)
      toast({
        title: "项目已删除",
      })
      setDeleteDialogOpen(false)
      setProjectToDelete(null)
    } catch (e) {
      toast({
        title: "删除失败",
        description: e instanceof Error ? e.message : "未知错误",
        variant: "destructive",
      })
    }
  }

  const getStageVariant = (stage: string): "default" | "secondary" | "success" | "warning" | "destructive" | "outline" => {
    switch (stage) {
      case "completed":
        return "success"
      case "upload":
        return "secondary"
      default:
        return "default"
    }
  }

  return (
    <div className="container py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-primary/10">
            <BookOpen className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          将文档转化为专业书籍
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          上传您的文档，通过 AI 智能处理，生成符合 KDP 标准的原创电子书
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              新建项目
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建新项目</DialogTitle>
              <DialogDescription>
                输入项目名称和描述，开始您的书籍创作之旅
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">项目名称</label>
                <Input
                  placeholder="例如：我的第一本书"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">项目描述（可选）</label>
                <Input
                  placeholder="简单描述这本书的内容"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreateProject} disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                创建项目
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-8 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
          <p className="text-destructive">{error}</p>
          <p className="text-sm text-muted-foreground mt-1">
            请确保后端服务已启动 (http://localhost:8000)
          </p>
        </div>
      )}

      {/* Projects Section */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">我的项目</h2>
        <p className="text-muted-foreground">
          {loading ? "加载中..." : `共 ${projects.length} 个项目`}
        </p>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">还没有项目</h3>
            <p className="text-muted-foreground mb-4">
              点击上方的"新建项目"按钮开始创建您的第一本书
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="group hover:shadow-md transition-shadow cursor-pointer relative"
            >
              <Link href={`/project/${project.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">
                        {project.name}
                      </CardTitle>
                      <CardDescription className="truncate">
                        {project.description || "暂无描述"}
                      </CardDescription>
                    </div>
                    <Badge variant={getStageVariant(project.current_stage)}>
                      {STAGE_NAMES[project.current_stage] || project.current_stage}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span>{project.document_count} 个文档</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatRelativeTime(project.updated_at)}</span>
                    </div>
                  </div>
                </CardContent>
              </Link>
              {/* Delete Button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setProjectToDelete(project.id)
                  setDeleteDialogOpen(true)
                }}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </Card>
          ))}

          {/* New Project Card */}
          <Card
            className="border-dashed hover:border-primary/50 hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => setDialogOpen(true)}
          >
            <CardContent className="flex flex-col items-center justify-center h-full min-h-[180px]">
              <div className="p-3 rounded-full bg-muted mb-3">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium">新建项目</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除这个项目吗？此操作无法撤销，项目中的所有文档和处理结果都将被删除。
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
