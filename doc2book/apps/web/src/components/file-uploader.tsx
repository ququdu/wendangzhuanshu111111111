'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText } from 'lucide-react'
import { useProjectStore } from '@/stores/project-store'

interface FileUploaderProps {
  projectId: string
}

const ACCEPTED_FORMATS = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'text/markdown': ['.md'],
  'text/html': ['.html', '.htm'],
  'text/plain': ['.txt'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
}

export function FileUploader({ projectId }: FileUploaderProps) {
  const { addDocument } = useProjectStore()

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        // 获取文件格式
        const ext = file.name.split('.').pop()?.toLowerCase() || ''
        const format = getFormat(ext)

        // 添加文档
        addDocument(projectId, {
          filename: file.name,
          format,
          size: file.size,
          uploadedAt: new Date(),
          status: 'pending',
        })

        // TODO: 实际上传文件到服务器
      }
    },
    [projectId, addDocument]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    multiple: true,
  })

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragActive
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50'
      }`}
    >
      <input {...getInputProps()} />
      <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
      {isDragActive ? (
        <p className="text-primary">放开以上传文件</p>
      ) : (
        <>
          <p className="mb-2">拖拽文件到这里，或点击选择文件</p>
          <p className="text-sm text-muted-foreground">
            支持 PDF、Word、Markdown、HTML、TXT、图片
          </p>
        </>
      )}
    </div>
  )
}

function getFormat(ext: string): string {
  const formatMap: Record<string, string> = {
    pdf: 'PDF',
    docx: 'Word',
    doc: 'Word',
    md: 'Markdown',
    markdown: 'Markdown',
    html: 'HTML',
    htm: 'HTML',
    txt: 'Text',
    png: 'Image',
    jpg: 'Image',
    jpeg: 'Image',
  }
  return formatMap[ext] || ext.toUpperCase()
}
