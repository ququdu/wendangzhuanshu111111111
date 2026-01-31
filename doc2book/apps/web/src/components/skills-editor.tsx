"use client"

import { useMemo } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import type { Skill } from "@/services/api"

const STAGE_OPTIONS = [
  { id: "clean", label: "清洗" },
  { id: "understand", label: "理解" },
  { id: "structure", label: "结构" },
  { id: "create", label: "创作" },
  { id: "translate", label: "翻译" },
  { id: "localize", label: "本地化" },
]

const TONE_OPTIONS = [
  { id: "formal", label: "正式" },
  { id: "informal", label: "口语" },
  { id: "academic", label: "学术" },
  { id: "conversational", label: "对话" },
]

const AUDIENCE_OPTIONS = [
  { id: "general", label: "大众" },
  { id: "professional", label: "专业" },
  { id: "academic", label: "学术" },
  { id: "children", label: "儿童" },
]

const COMPLEXITY_OPTIONS = [
  { id: "simple", label: "简单" },
  { id: "moderate", label: "适中" },
  { id: "complex", label: "复杂" },
]

const TRANSLATE_MODE_OPTIONS = [
  { id: "auto", label: "自动" },
  { id: "ai", label: "强制 AI" },
  { id: "deepl", label: "强制 DeepL" },
]

function createSkill(): Skill {
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `skill_${Date.now()}`
  return {
    id,
    name: "新技能",
    instruction: "",
    stages: [],
    enabled: true,
    options: {},
  }
}

export function SkillsEditor({ value, onChange }: { value: Skill[]; onChange: (skills: Skill[]) => void }) {
  const stageSetBySkill = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const skill of value) {
      map.set(skill.id, new Set(skill.stages || []))
    }
    return map
  }, [value])

  const updateSkill = (id: string, updates: Partial<Skill>) => {
    onChange(value.map((skill) => (skill.id === id ? { ...skill, ...updates } : skill)))
  }

  const toggleStage = (id: string, stage: string) => {
    const current = stageSetBySkill.get(id) || new Set()
    if (current.has(stage)) current.delete(stage)
    else current.add(stage)
    updateSkill(id, { stages: Array.from(current) })
  }

  const addSkill = () => onChange([createSkill(), ...value])

  const removeSkill = (id: string) => onChange(value.filter((skill) => skill.id !== id))

  const updateOptions = (id: string, updates: Record<string, unknown>) => {
    const current = value.find((skill) => skill.id === id)
    updateSkill(id, { options: { ...(current?.options || {}), ...updates } })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">技能列表</CardTitle>
          <Badge variant="secondary">{value.length} 个</Badge>
        </div>
        <Button size="sm" onClick={addSkill} className="gap-2">
          <Plus className="h-4 w-4" />
          添加技能
        </Button>
      </div>

      {value.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            暂无技能配置
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {value.map((skill) => {
            const stages = new Set(skill.stages || [])
            const showCreateOptions = stages.has("create")
            const showTranslateOptions = stages.has("translate") || stages.has("localize")
            const showUseAI = stages.has("clean") || stages.has("understand") || stages.has("structure")

            return (
              <Card key={skill.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      value={skill.name}
                      onChange={(e) => updateSkill(skill.id, { name: e.target.value })}
                      className="max-w-xs"
                    />
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={skill.enabled}
                          onCheckedChange={(checked) => updateSkill(skill.id, { enabled: Boolean(checked) })}
                        />
                        启用
                      </label>
                      <Button variant="ghost" size="icon" onClick={() => removeSkill(skill.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">适用阶段</div>
                    <div className="flex flex-wrap gap-2">
                      {STAGE_OPTIONS.map((stage) => (
                        <label key={stage.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={stages.has(stage.id)}
                            onCheckedChange={() => toggleStage(skill.id, stage.id)}
                          />
                          {stage.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">提示词/约束</div>
                    <Textarea
                      value={skill.instruction}
                      onChange={(e) => updateSkill(skill.id, { instruction: e.target.value })}
                      placeholder="例如：避免生成营销词；不要新增未出现的事实；面向小白读者"
                      rows={3}
                    />
                  </div>

                  {showUseAI && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={Boolean(skill.options?.useAI)}
                        onCheckedChange={(checked) => updateOptions(skill.id, { useAI: Boolean(checked) })}
                      />
                      <span className="text-sm">清洗/理解/结构时启用 AI</span>
                    </div>
                  )}

                  {showCreateOptions && (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">语气</div>
                        <select
                          value={(skill.options?.tone as string) || "formal"}
                          onChange={(e) => updateOptions(skill.id, { tone: e.target.value })}
                          className="w-full h-10 px-3 rounded-md border bg-background"
                        >
                          {TONE_OPTIONS.map((tone) => (
                            <option key={tone.id} value={tone.id}>
                              {tone.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">读者</div>
                        <select
                          value={(skill.options?.audience as string) || "general"}
                          onChange={(e) => updateOptions(skill.id, { audience: e.target.value })}
                          className="w-full h-10 px-3 rounded-md border bg-background"
                        >
                          {AUDIENCE_OPTIONS.map((audience) => (
                            <option key={audience.id} value={audience.id}>
                              {audience.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">复杂度</div>
                        <select
                          value={(skill.options?.complexity as string) || "moderate"}
                          onChange={(e) => updateOptions(skill.id, { complexity: e.target.value })}
                          className="w-full h-10 px-3 rounded-md border bg-background"
                        >
                          {COMPLEXITY_OPTIONS.map((complexity) => (
                            <option key={complexity.id} value={complexity.id}>
                              {complexity.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {showTranslateOptions && (
                    <div className="space-y-1 max-w-xs">
                      <div className="text-sm font-medium">翻译模式</div>
                      <select
                        value={(skill.options?.mode as string) || "auto"}
                        onChange={(e) => updateOptions(skill.id, { mode: e.target.value })}
                        className="w-full h-10 px-3 rounded-md border bg-background"
                      >
                        {TRANSLATE_MODE_OPTIONS.map((mode) => (
                          <option key={mode.id} value={mode.id}>
                            {mode.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
