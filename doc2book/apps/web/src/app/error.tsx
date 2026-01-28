'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('页面错误:', error)
  }, [error])

  return (
    <div className="container py-16 text-center">
      <AlertCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
      <h2 className="text-2xl font-bold mb-2">出错了</h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {error.message || '页面加载时发生错误，请尝试刷新页面'}
      </p>
      <div className="flex gap-4 justify-center">
        <Button onClick={reset} variant="default">
          <RefreshCw className="mr-2 h-4 w-4" />
          重试
        </Button>
        <Link href="/">
          <Button variant="outline">
            <Home className="mr-2 h-4 w-4" />
            返回首页
          </Button>
        </Link>
      </div>
      {error.digest && (
        <p className="text-xs text-muted-foreground mt-8">
          错误代码: {error.digest}
        </p>
      )}
    </div>
  )
}
