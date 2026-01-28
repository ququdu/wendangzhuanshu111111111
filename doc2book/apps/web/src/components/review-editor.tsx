/**
 * 审阅编辑器组件
 * 用于审阅和编辑书籍草稿
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  ChevronRight,
  ChevronDown,
  GripVertical,
  Save,
  Check,
  Edit2,
  X,
  BookOpen,
  FileText,
} from 'lucide-react'
import { api, BookDraft, Chapter } from '@/services/api'
import { cn } from '@/lib/utils'

interface ReviewEditorProps {
  projectId: string
  draft: BookDraft | null
  onDraftUpdate?: (draft: BookDraft) => void
  onApprove?: () => void
}

export function ReviewEditor({ projectId, draft, onDraftUpdate, onApprove }: ReviewEditorProps) {
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null)
  const [editingMetadata, setEditingMetadata] = useState(false)
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)

  // 元数据编辑状态
  const [title, setTitle] = useState(draft?.title || '')
  const [subtitle, setSubtitle] = useState(draft?.subtitle || '')
  const [author, setAuthor] = useState(draft?.author || '')
  const [description, setDescription] = useState(draft?.description || '')

  // 当 draft 变化时更新元数据
  useEffect(() => {
    if (draft) {
      setTitle(draft.title || '')
      setSubtitle(draft.subtitle || '')
      setAuthor(draft.author || '')
      setDescription(draft.description || '')
    }
  }, [draft])

  // 选中的章节
  const selectedChapter = draft?.chapters?.find(ch => ch.id === selectedChapterId) || null

  // 保存元数据
  const handleSaveMetadata = useCallback(async () => {
    if (!draft) return

    setSaving(true)
    try {
      const updated = await api.updateDraft(draft.id, {
        title,
        subtitle,
        author,
        description,
      })
      onDraftUpdate?.(updated)
      setEditingMetadata(false)
    } catch (error) {
      console.error('保存元数据失败:', error)
    } finally {
      setSaving(false)
    }
  }, [draft, title, subtitle, author, description, onDraftUpdate])

  // 保存章节
  const handleSaveChapter = useCallback(async () => {
    if (!draft || !editingChapter) return

    setSaving(true)
    try {
      const updated = await api.updateChapter(draft.id, editingChapter.id, {
        title: editingChapter.title,
        content: editingChapter.content,
      })
      onDraftUpdate?.(updated)
      setEditingChapter(null)
    } catch (error) {
      console.error('保存章节失败:', error)
    } finally {
      setSaving(false)
    }
  }, [draft, editingChapter, onDraftUpdate])

  // 确认审阅
  const handleApprove = useCallback(async () => {
    if (!draft) return

    setApproving(true)
    try {
      const result = await api.approveDraft(draft.id)
      onDraftUpdate?.(result.draft)
      onApprove?.()
    } catch (error) {
      console.error('确认审阅失败:', error)
    } finally {
      setApproving(false)
    }
  }, [draft, onDraftUpdate, onApprove])

  // 开始编辑章节
  const startEditingChapter = useCallback((chapter: Chapter) => {
    setEditingChapter({ ...chapter })
  }, [])

  // 取消编辑章节
  const cancelEditingChapter = useCallback(() => {
    setEditingChapter(null)
  }, [])

  if (!draft) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>暂无草稿内容</p>
          <p className="text-sm mt-2">请先完成创作阶段</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* 左侧：目录树 */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4" />
            目录
          </h3>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            {draft.chapters?.map((chapter, index) => (
              <div
                key={chapter.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors',
                  selectedChapterId === chapter.id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
                onClick={() => setSelectedChapterId(chapter.id)}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                <span className="flex-1 truncate text-sm">{chapter.title}</span>
                {chapter.wordCount && (
                  <span className="text-xs text-muted-foreground">{chapter.wordCount}字</span>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* 确认审阅按钮 */}
        <div className="p-4 border-t">
          <Button
            className="w-full"
            onClick={handleApprove}
            disabled={approving || draft.status === 'approved'}
          >
            {approving ? (
              '确认中...'
            ) : draft.status === 'approved' ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                已确认
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                确认审阅完成
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 右侧：内容编辑区 */}
      <div className="flex-1 flex flex-col">
        {/* 元数据区域 */}
        <Card className="m-4 mb-0">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">书籍信息</CardTitle>
              {!editingMetadata ? (
                <Button variant="ghost" size="sm" onClick={() => setEditingMetadata(true)}>
                  <Edit2 className="w-4 h-4 mr-1" />
                  编辑
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingMetadata(false)}>
                    <X className="w-4 h-4 mr-1" />
                    取消
                  </Button>
                  <Button size="sm" onClick={handleSaveMetadata} disabled={saving}>
                    <Save className="w-4 h-4 mr-1" />
                    保存
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="py-3">
            {editingMetadata ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">书名</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="输入书名"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">副标题</label>
                  <Input
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="输入副标题（可选）"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">作者</label>
                  <Input
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="输入作者名"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">简介</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="输入书籍简介"
                    rows={3}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">书名：</span>
                  <span className="font-medium">{draft.title || '未设置'}</span>
                </div>
                {draft.subtitle && (
                  <div>
                    <span className="text-muted-foreground">副标题：</span>
                    <span>{draft.subtitle}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">作者：</span>
                  <span>{draft.author || '未设置'}</span>
                </div>
                {draft.description && (
                  <div>
                    <span className="text-muted-foreground">简介：</span>
                    <span className="line-clamp-2">{draft.description}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator className="mx-4 my-2" />

        {/* 章节内容区域 */}
        <div className="flex-1 p-4 pt-0 overflow-hidden">
          {selectedChapter ? (
            <Card className="h-full flex flex-col">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  {editingChapter?.id === selectedChapter.id ? (
                    <Input
                      value={editingChapter.title}
                      onChange={(e) =>
                        setEditingChapter({ ...editingChapter, title: e.target.value })
                      }
                      className="text-lg font-semibold"
                    />
                  ) : (
                    <CardTitle className="text-lg">{selectedChapter.title}</CardTitle>
                  )}
                  {editingChapter?.id === selectedChapter.id ? (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={cancelEditingChapter}>
                        <X className="w-4 h-4 mr-1" />
                        取消
                      </Button>
                      <Button size="sm" onClick={handleSaveChapter} disabled={saving}>
                        <Save className="w-4 h-4 mr-1" />
                        保存
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditingChapter(selectedChapter)}
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      编辑
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden py-0">
                <ScrollArea className="h-full">
                  {editingChapter?.id === selectedChapter.id ? (
                    <Textarea
                      value={editingChapter.content}
                      onChange={(e) =>
                        setEditingChapter({ ...editingChapter, content: e.target.value })
                      }
                      className="min-h-[400px] resize-none"
                      placeholder="输入章节内容..."
                    />
                  ) : (
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap pb-4">
                      {selectedChapter.content || '暂无内容'}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>请从左侧选择一个章节</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
