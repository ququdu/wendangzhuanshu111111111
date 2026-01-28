"use client"

import { useState, useEffect, useCallback } from "react"
import {
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Trash2,
  Activity,
  Server,
  Cpu,
  Database,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface LogEntry {
  id: string
  timestamp: string
  level: string
  module: string
  message: string
  data?: Record<string, unknown>
}

interface ModuleStatus {
  last_activity: string
  last_level: string
  last_message: string
  status: string
}

interface SystemStatus {
  modules: Record<string, ModuleStatus>
  total_logs: number
  error_count: number
  warning_count: number
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [selectedModule, setSelectedModule] = useState<string | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedModule) params.append("module", selectedModule)
      if (selectedLevel) params.append("level", selectedLevel)
      params.append("limit", "200")

      const response = await fetch(`${API_BASE}/logs?${params}`)
      if (!response.ok) throw new Error("获取日志失败")
      const data = await response.json()
      setLogs(data.logs || [])
      setError(null)
    } catch (e) {
      console.error("获取日志失败:", e)
      setError(e instanceof Error ? e.message : "获取日志失败")
    }
  }, [selectedModule, selectedLevel])

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/logs/status`)
      if (!response.ok) throw new Error("获取状态失败")
      const data = await response.json()
      setStatus(data)
    } catch (e) {
      console.error("获取状态失败:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  const clearLogs = async () => {
    if (!confirm("确定要清空所有日志吗？此操作不可恢复。")) return
    try {
      const response = await fetch(`${API_BASE}/logs`, { method: "DELETE" })
      if (!response.ok) throw new Error("清空日志失败")
      await fetchLogs()
      await fetchStatus()
    } catch (e) {
      console.error("清空日志失败:", e)
    }
  }

  useEffect(() => {
    fetchLogs()
    fetchStatus()

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchLogs()
        fetchStatus()
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [fetchLogs, fetchStatus, autoRefresh])

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "ERROR":
      case "CRITICAL":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "WARNING":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "INFO":
        return <Info className="h-4 w-4 text-blue-500" />
      default:
        return <CheckCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case "ERROR":
      case "CRITICAL":
        return "destructive"
      case "WARNING":
        return "warning" as const
      case "INFO":
        return "default"
      default:
        return "secondary"
    }
  }

  const getModuleIcon = (module: string) => {
    switch (module) {
      case "api":
        return <Server className="h-3 w-3" />
      case "processor":
        return <Cpu className="h-3 w-3" />
      case "database":
        return <Database className="h-3 w-3" />
      default:
        return <Activity className="h-3 w-3" />
    }
  }

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            系统监控
          </h1>
          <p className="text-muted-foreground mt-1">实时查看系统运行状态和日志</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
            size="sm"
          >
            {autoRefresh ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                自动刷新中
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                已暂停
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              fetchLogs()
              fetchStatus()
            }}
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
          <Button variant="outline" onClick={clearLogs} size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            清空
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          <AlertCircle className="h-4 w-4 inline mr-2" />
          {error}
        </div>
      )}

      {/* 系统状态概览 */}
      {status && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                总日志数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status.total_logs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-500">错误数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{status.error_count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-500">警告数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">
                {status.warning_count}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                活跃模块
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(status.modules).length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 模块状态 */}
      {status && Object.keys(status.modules).length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">模块状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(status.modules).map(([module, info]) => (
                <Badge
                  key={module}
                  variant={info.status === "error" ? "destructive" : "default"}
                  className="cursor-pointer px-3 py-1"
                  onClick={() =>
                    setSelectedModule(selectedModule === module ? null : module)
                  }
                >
                  {info.status === "error" ? (
                    <AlertCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  )}
                  {module}
                  {selectedModule === module && " ✓"}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 日志过滤器 */}
      <div className="flex gap-2 mb-4">
        <select
          value={selectedModule || ""}
          onChange={(e) => setSelectedModule(e.target.value || null)}
          className="px-3 py-2 border rounded-md bg-background"
        >
          <option value="">所有模块</option>
          {status &&
            Object.keys(status.modules).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
        </select>
        <select
          value={selectedLevel || ""}
          onChange={(e) => setSelectedLevel(e.target.value || null)}
          className="px-3 py-2 border rounded-md bg-background"
        >
          <option value="">所有级别</option>
          <option value="DEBUG">DEBUG</option>
          <option value="INFO">INFO</option>
          <option value="WARNING">WARNING</option>
          <option value="ERROR">ERROR</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>
        {(selectedModule || selectedLevel) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedModule(null)
              setSelectedLevel(null)
            }}
          >
            清除过滤
          </Button>
        )}
      </div>

      {/* 日志列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            日志记录
            {logs.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({logs.length} 条)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`p-3 rounded-md border ${
                  log.level === "ERROR" || log.level === "CRITICAL"
                    ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                    : log.level === "WARNING"
                    ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800"
                    : "bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {getLevelIcon(log.level)}
                  <Badge variant={getLevelBadgeVariant(log.level) as any}>
                    {log.level}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    {getModuleIcon(log.module)}
                    {log.module}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(log.timestamp).toLocaleString("zh-CN")}
                  </span>
                </div>
                <div className="text-sm">{log.message}</div>
                {log.data && Object.keys(log.data).length > 0 && (
                  <pre className="text-xs mt-2 p-2 bg-white dark:bg-gray-800 rounded overflow-x-auto">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无日志记录</p>
                <p className="text-sm mt-1">系统运行时日志将显示在这里</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
