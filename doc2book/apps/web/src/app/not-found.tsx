import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileQuestion, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="container py-16 text-center">
      <FileQuestion className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
      <h2 className="text-2xl font-bold mb-2">页面不存在</h2>
      <p className="text-muted-foreground mb-6">
        您访问的页面不存在或已被移除
      </p>
      <Link href="/">
        <Button>
          <Home className="mr-2 h-4 w-4" />
          返回首页
        </Button>
      </Link>
    </div>
  )
}
