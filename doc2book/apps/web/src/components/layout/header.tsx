"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, Settings, Home, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/logs", label: "监控", icon: Activity },
  { href: "/settings", label: "设置", icon: Settings },
]

export function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 mr-6">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">Doc2Book</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center space-x-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href))

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-2",
                    isActive && "bg-secondary"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground hidden md:inline">
            文档转书籍系统
          </span>
        </div>
      </div>
    </header>
  )
}
