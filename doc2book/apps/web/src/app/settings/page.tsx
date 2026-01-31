"use client"

import { useState, useEffect, useRef } from "react"
import { Save, TestTube, CheckCircle, XCircle, Loader2, Key, Palette, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/useToast"
import { SkillsEditor } from "@/components/skills-editor"
import { useGlobalSkills, useProviderStatus, useProviderConfig } from "@/hooks/useApi"

interface ProviderConfig {
  provider: string
  apiKey: string
  baseUrl?: string
  model?: string
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

const PROVIDER_OPTIONS = [
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "openai", label: "OpenAI (GPT)" },
  { value: "openai-compatible", label: "OpenAI 兼容/本地" },
  { value: "deepl", label: "DeepL（翻译）" },
  { value: "google", label: "Google（暂未支持）" },
]

const MODEL_PRESETS: Record<string, string[]> = {
  anthropic: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-3.5-turbo"],
  "openai-compatible": ["deepseek-chat", "qwen2.5", "llama-3.1"],
  deepl: ["deepl"],
}

export default function SettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [isSaving, setIsSaving] = useState(false)
  const [testingProvider, setTestingProvider] = useState<string | null>(null)
  const [providerStatus, setProviderStatus] = useState<Record<string, "success" | "error" | null>>({})
  const { skills, loading: skillsLoading, updateSkills } = useGlobalSkills()
  const [draftSkills, setDraftSkills] = useState(skills)
  const { providers, loading: providersLoading, error: providersError, fetchStatus } = useProviderStatus()
  const {
    config: providerConfig,
    loading: providerConfigLoading,
    error: providerConfigError,
    fetchConfig,
    updateConfig,
    testConnection,
  } = useProviderConfig()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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

  useEffect(() => {
    fetchConfig().then((data) => {
      if (data?.success && data.config && data.config.providers?.length > 0) {
        const next = mapConfigToSettings(data.config)
        setSettings(next)
      }
    })
  }, [fetchConfig])

  useEffect(() => {
    setDraftSkills(skills)
  }, [skills])

  // 保存设置
  const handleSave = async () => {
    setIsSaving(true)
    try {
      localStorage.setItem("doc2book_settings", JSON.stringify(settings))
      const payload = buildProviderPayload(settings)
      if (payload) {
        await updateConfig(payload)
      }
      toast({
        title: "设置已保存",
        description: payload ? "已同步到服务端" : "仅保存本地设置",
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
    setTestingProvider(type)
    setProviderStatus({ ...providerStatus, [type]: null })

    try {
      if (!config) {
        throw new Error("未配置 Provider")
      }
      if (config.provider === "google") {
        throw new Error("Google Provider 暂未支持")
      }
      const data = await testConnection({
        provider: config.provider,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.model,
      })
      const status = data?.status
      if (data?.success && status?.available) {
        setProviderStatus({ ...providerStatus, [type]: "success" })
        toast({ title: "服务端可用", description: `${status.name || config.provider} 已就绪` })
      } else {
        setProviderStatus({ ...providerStatus, [type]: "error" })
        toast({
          title: "服务端不可用",
          description: data?.error || status?.error || "未检测到可用 Provider",
          variant: "destructive",
        })
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

  const mapConfigToSettings = (config: any): AppSettings => {
    const next: AppSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
    const providersList = Array.isArray(config.providers) ? config.providers : []
    if (providersList.length === 0) return next

    const primaryId = config.defaultProvider || providersList[0]?.id
    const fallbackId = Array.isArray(config.fallbackChain) ? config.fallbackChain[0] : providersList[1]?.id
    const primary = providersList.find((p: any) => p.id === primaryId) || providersList[0]
    const backup = providersList.find((p: any) => p.id === fallbackId)

    next.primaryProvider = {
      provider: primary?.type || "anthropic",
      apiKey: primary?.apiKey || "",
      baseUrl: primary?.baseUrl || "",
      model: primary?.defaultModel || "",
    }

    if (backup) {
      next.backupProvider = {
        provider: backup?.type || "openai",
        apiKey: backup?.apiKey || "",
        baseUrl: backup?.baseUrl || "",
        model: backup?.defaultModel || "",
      }
    } else {
      next.backupProvider = undefined
    }

    return next
  }

  const buildProviderPayload = (current: AppSettings) => {
    const primary = current.primaryProvider
    if (!primary?.provider) return null

    if (primary.provider === "google") {
      throw new Error("Google Provider 暂未支持")
    }

    const providersPayload: any[] = [
      {
        id: "primary",
        name: `主要-${primary.provider}`,
        type: primary.provider,
        apiKey: primary.apiKey,
        baseUrl: primary.baseUrl,
        defaultModel: primary.model,
        enabled: true,
        priority: 1,
      },
    ]

    if (current.backupProvider?.provider) {
      if (current.backupProvider.provider === "google") {
        throw new Error("Google Provider 暂未支持")
      }
      providersPayload.push({
        id: "backup",
        name: `备用-${current.backupProvider.provider}`,
        type: current.backupProvider.provider,
        apiKey: current.backupProvider.apiKey,
        baseUrl: current.backupProvider.baseUrl,
        defaultModel: current.backupProvider.model,
        enabled: true,
        priority: 2,
      })
    }

    return {
      providers: providersPayload,
      defaultProvider: "primary",
      fallbackChain: current.backupProvider?.provider ? ["backup"] : [],
    }
  }

  const handleSaveSkills = async () => {
    try {
      await updateSkills(draftSkills)
      toast({ title: "技能已保存", description: "全局技能配置已更新" })
    } catch (e) {
      toast({
        title: "保存失败",
        description: e instanceof Error ? e.message : "无法保存技能",
        variant: "destructive",
      })
    }
  }

  const handleImportSkills = async (file: File) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!Array.isArray(data)) {
        throw new Error("技能文件格式无效，应为数组")
      }
      setDraftSkills(data)
      toast({ title: "导入成功", description: "请确认后保存" })
    } catch (e) {
      toast({
        title: "导入失败",
        description: e instanceof Error ? e.message : "文件解析失败",
        variant: "destructive",
      })
    }
  }

  const handleExportSkills = () => {
    const blob = new Blob([JSON.stringify(draftSkills, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "doc2book-skills.json"
    link.click()
    URL.revokeObjectURL(url)
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
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              此页面支持本地保存与服务端同步。若需要使用本地模型，可将 Base URL 指向本地服务。
            </div>
            <div className="text-xs text-muted-foreground">
              {providerConfigLoading ? "正在读取服务端配置..." : providerConfigError ? `服务端配置读取失败：${providerConfigError}` : providerConfig ? "已检测到服务端配置" : "未发现服务端配置"}
            </div>
            <div className="text-xs text-muted-foreground">
              Google 渠道暂未支持，可先使用 OpenAI 兼容模式接入本地或自建服务。
            </div>
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
                  <label className="text-sm font-medium">渠道</label>
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
                    {PROVIDER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">API Key</label>
                  <Input
                    type="password"
                    placeholder={settings.primaryProvider.provider === "openai-compatible" ? "本地模型可留空" : "sk-..."}
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">模型</label>
                    <Input
                      list="primary-models"
                      placeholder="例如：gpt-4o"
                      value={settings.primaryProvider.model || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          primaryProvider: { ...settings.primaryProvider, model: e.target.value },
                        })
                      }
                    />
                    <datalist id="primary-models">
                      {(MODEL_PRESETS[settings.primaryProvider.provider] || []).map((model) => (
                        <option key={model} value={model} />
                      ))}
                    </datalist>
                  </div>
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
                    <p className="text-xs text-muted-foreground">本地模型可填写本地服务地址</p>
                  </div>
                </div>

              <Button
                variant="outline"
                onClick={() => handleTestProvider("primary")}
                disabled={testingProvider === "primary"}
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
                  <label className="text-sm font-medium">渠道</label>
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
                    {PROVIDER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {settings.backupProvider && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                    <label className="text-sm font-medium">API Key</label>
                    <Input
                      type="password"
                      placeholder={settings.backupProvider.provider === "openai-compatible" ? "本地模型可留空" : "sk-..."}
                      value={settings.backupProvider.apiKey}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          backupProvider: { ...settings.backupProvider!, apiKey: e.target.value },
                        })
                        }
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">模型</label>
                        <Input
                          list="backup-models"
                          placeholder="例如：gpt-4o"
                          value={settings.backupProvider.model || ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              backupProvider: { ...settings.backupProvider!, model: e.target.value },
                            })
                          }
                        />
                        <datalist id="backup-models">
                          {(MODEL_PRESETS[settings.backupProvider.provider] || []).map((model) => (
                            <option key={model} value={model} />
                          ))}
                        </datalist>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Base URL</label>
                        <Input
                          placeholder="https://api.example.com/v1"
                          value={settings.backupProvider.baseUrl || ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              backupProvider: { ...settings.backupProvider!, baseUrl: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {settings.backupProvider && (
              <Button
                variant="outline"
                onClick={() => handleTestProvider("backup")}
                disabled={testingProvider === "backup"}
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

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle>服务端 Provider 状态</CardTitle>
            </div>
            <CardDescription>真实服务端连接状态</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchStatus()} disabled={providersLoading}>
                {providersLoading ? "刷新中..." : "刷新状态"}
              </Button>
              {providersError && <span className="text-sm text-destructive">{providersError}</span>}
            </div>
            {providers.length === 0 ? (
              <div className="text-sm text-muted-foreground">未检测到服务端 Provider</div>
            ) : (
              <div className="space-y-2">
                {providers.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                    <div className="text-sm">{item.name}</div>
                    <Badge variant={item.available ? "success" : "destructive"}>
                      {item.available ? "可用" : "不可用"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
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

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle>全局技能库</CardTitle>
            </div>
            <CardDescription>用于清洗/理解/创作/翻译等阶段的提示词与约束</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {skillsLoading ? (
              <div className="text-sm text-muted-foreground">加载中...</div>
            ) : (
              <SkillsEditor value={draftSkills} onChange={setDraftSkills} />
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                导入技能
              </Button>
              <Button variant="outline" onClick={handleExportSkills}>
                导出技能
              </Button>
              <Button onClick={handleSaveSkills}>保存技能</Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImportSkills(file)
                }}
              />
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
