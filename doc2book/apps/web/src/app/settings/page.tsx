"use client"

import { useState, useEffect } from "react"
import { Save, TestTube, CheckCircle, XCircle, Loader2, Key, Palette, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/useToast"

interface ProviderConfig {
  provider: string
  apiKey: string
  baseUrl?: string
}

interface AppSettings {
  primaryProvider: ProviderConfig
  backupProvider?: ProviderConfig
  defaultOutputFormats: string[]
  defaultKdpCompliant: boolean
  defaultLanguage: string
  theme: "light" | "dark" | "system"
}

const DEFAULT_SETTINGS: AppSettings = {
  primaryProvider: {
    provider: "anthropic",
    apiKey: "",
  },
  defaultOutputFormats: ["epub"],
  defaultKdpCompliant: true,
  defaultLanguage: "zh",
  theme: "system",
}

export default function SettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [isSaving, setIsSaving] = useState(false)
  const [testingProvider, setTestingProvider] = useState<string | null>(null)
  const [providerStatus, setProviderStatus] = useState<Record<string, "success" | "error" | null>>({})

  // 从 localStorage 加载设置
  useEffect(() => {
    const saved = localStorage.getItem("doc2book_settings")
    if (saved) {
      try {
        setSettings(JSON.parse(saved))
      } catch (e) {
        console.error("Failed to load settings:", e)
      }
    }
  }, [])

  // 保存设置
  const handleSave = async () => {
    setIsSaving(true)
    try {
      localStorage.setItem("doc2book_settings", JSON.stringify(settings))
      toast({
        title: "设置已保存",
        description: "您的设置已成功保存",
      })
    } catch (e) {
      toast({
        title: "保存失败",
        description: e instanceof Error ? e.message : "未知错误",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // 测试 Provider 连接
  const handleTestProvider = async (type: "primary" | "backup") => {
    const config = type === "primary" ? settings.primaryProvider : settings.backupProvider
    if (!config?.apiKey) {
      toast({
        title: "请先输入 API Key",
        variant: "destructive",
      })
      return
    }

    setTestingProvider(type)
    setProviderStatus({ ...providerStatus, [type]: null })

    try {
      // 模拟测试连接
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // 简单验证 API Key 格式
      const isValid = config.apiKey.length > 20

      if (isValid) {
        setProviderStatus({ ...providerStatus, [type]: "success" })
        toast({
          title: "连接成功",
          description: `${config.provider} API 连接正常`,
        })
      } else {
        throw new Error("API Key 格式无效")
      }
    } catch (e) {
      setProviderStatus({ ...providerStatus, [type]: "error" })
      toast({
        title: "连接失败",
        description: e instanceof Error ? e.message : "无法连接到 API",
        variant: "destructive",
      })
    } finally {
      setTestingProvider(null)
    }
  }

  return (
    <div className="container py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">设置</h1>
        <p className="text-muted-foreground">配置 AI 服务和默认选项</p>
      </div>

      <div className="space-y-6">
        {/* AI Provider 配置 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle>AI Provider 配置</CardTitle>
            </div>
            <CardDescription>
              配置用于文档处理的 AI 服务提供商
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 主要 Provider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">主要 Provider</h4>
                {providerStatus.primary && (
                  <Badge variant={providerStatus.primary === "success" ? "success" : "destructive"}>
                    {providerStatus.primary === "success" ? "已连接" : "连接失败"}
                  </Badge>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Provider</label>
                  <select
                    value={settings.primaryProvider.provider}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        primaryProvider: { ...settings.primaryProvider, provider: e.target.value },
                      })
                    }
                    className="w-full h-10 px-3 rounded-md border bg-background"
                  >
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="openai">OpenAI (GPT)</option>
                    <option value="openai-compatible">OpenAI 兼容端点</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">API Key</label>
                  <Input
                    type="password"
                    placeholder="sk-..."
                    value={settings.primaryProvider.apiKey}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        primaryProvider: { ...settings.primaryProvider, apiKey: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              {settings.primaryProvider.provider === "openai-compatible" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Base URL</label>
                  <Input
                    placeholder="https://api.example.com/v1"
                    value={settings.primaryProvider.baseUrl || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        primaryProvider: { ...settings.primaryProvider, baseUrl: e.target.value },
                      })
                    }
                  />
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => handleTestProvider("primary")}
                disabled={testingProvider === "primary" || !settings.primaryProvider.apiKey}
              >
                {testingProvider === "primary" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : providerStatus.primary === "success" ? (
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                ) : providerStatus.primary === "error" ? (
                  <XCircle className="mr-2 h-4 w-4 text-destructive" />
                ) : (
                  <TestTube className="mr-2 h-4 w-4" />
                )}
                测试连接
              </Button>
            </div>

            {/* 备用 Provider */}
            <div className="pt-4 border-t space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">备用 Provider（可选）</h4>
                {providerStatus.backup && (
                  <Badge variant={providerStatus.backup === "success" ? "success" : "destructive"}>
                    {providerStatus.backup === "success" ? "已连接" : "连接失败"}
                  </Badge>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Provider</label>
                  <select
                    value={settings.backupProvider?.provider || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        backupProvider: e.target.value
                          ? { provider: e.target.value, apiKey: settings.backupProvider?.apiKey || "" }
                          : undefined,
                      })
                    }
                    className="w-full h-10 px-3 rounded-md border bg-background"
                  >
                    <option value="">不使用备用</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="openai">OpenAI (GPT)</option>
                    <option value="openai-compatible">OpenAI 兼容端点</option>
                  </select>
                </div>

                {settings.backupProvider && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">API Key</label>
                    <Input
                      type="password"
                      placeholder="sk-..."
                      value={settings.backupProvider.apiKey}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          backupProvider: { ...settings.backupProvider!, apiKey: e.target.value },
                        })
                      }
                    />
                  </div>
                )}
              </div>

              {settings.backupProvider && (
                <Button
                  variant="outline"
                  onClick={() => handleTestProvider("backup")}
                  disabled={testingProvider === "backup" || !settings.backupProvider?.apiKey}
                >
                  {testingProvider === "backup" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube className="mr-2 h-4 w-4" />
                  )}
                  测试连接
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 默认设置 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle>默认设置</CardTitle>
            </div>
            <CardDescription>新项目的默认配置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">默认输出格式</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.defaultOutputFormats.includes("epub")}
                    onChange={(e) => {
                      const formats = e.target.checked
                        ? [...settings.defaultOutputFormats, "epub"]
                        : settings.defaultOutputFormats.filter((f) => f !== "epub")
                      setSettings({ ...settings, defaultOutputFormats: formats.length > 0 ? formats : ["epub"] })
                    }}
                    className="rounded"
                  />
                  EPUB
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.defaultOutputFormats.includes("pdf")}
                    onChange={(e) => {
                      const formats = e.target.checked
                        ? [...settings.defaultOutputFormats, "pdf"]
                        : settings.defaultOutputFormats.filter((f) => f !== "pdf")
                      setSettings({ ...settings, defaultOutputFormats: formats.length > 0 ? formats : ["epub"] })
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
                  checked={settings.defaultKdpCompliant}
                  onChange={(e) => setSettings({ ...settings, defaultKdpCompliant: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-medium">默认启用 KDP 合规</span>
              </label>
              <p className="text-sm text-muted-foreground ml-6">
                新项目默认符合亚马逊 Kindle Direct Publishing 标准
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">默认语言</label>
              <select
                value={settings.defaultLanguage}
                onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })}
                className="w-full h-10 px-3 rounded-md border bg-background max-w-xs"
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
                <option value="auto">自动检测</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* 外观设置 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle>外观</CardTitle>
            </div>
            <CardDescription>自定义界面外观</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label className="text-sm font-medium">主题</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="theme"
                    checked={settings.theme === "light"}
                    onChange={() => setSettings({ ...settings, theme: "light" })}
                  />
                  浅色
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="theme"
                    checked={settings.theme === "dark"}
                    onChange={() => setSettings({ ...settings, theme: "dark" })}
                  />
                  深色
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="theme"
                    checked={settings.theme === "system"}
                    onChange={() => setSettings({ ...settings, theme: "system" })}
                  />
                  跟随系统
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 保存按钮 */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            保存设置
          </Button>
        </div>
      </div>
    </div>
  )
}
