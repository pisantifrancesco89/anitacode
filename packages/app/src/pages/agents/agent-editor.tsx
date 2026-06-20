import { createSignal, createEffect, For, Show } from "solid-js"
import type { AgentForm } from "./types"

const MODES = ["subagent", "primary", "all"] as const
const PERMISSION_LEVELS = ["ask", "allow", "deny"] as const
const COLORS = ["#6C5CE7", "#00B894", "#E17055", "#FDCB6E", "#74B9FF", "#A29BFE", "#FD79A8", "#55EFC4"]
const TOOLS = ["bash", "edit", "todowrite", "webfetch", "task", "glob", "grep", "read"]

function defaultForm(): AgentForm {
  return {
    name: "",
    description: "",
    mode: "subagent",
    model: "",
    temperature: 0.3,
    topP: 1,
    maxSteps: 25,
    color: "#6C5CE7",
    hidden: false,
    disabled: false,
    permission: {
      edit: "ask",
      bash: "ask",
      webfetch: "ask",
      doomLoop: "allow",
      externalDirectory: "ask",
    },
    tools: Object.fromEntries(TOOLS.map((t) => [t, true])),
    prompt: "",
  }
}

function getPerm(form: AgentForm, key: string): string {
  return form.permission[key as keyof typeof form.permission] ?? "ask"
}

export type ModelOption = {
  id: string
  providerId: string
  name: string
  free: boolean
  costInput: number
  costOutput: number
  status: string
}

export function AgentEditor(props: {
  initial?: AgentForm
  models?: ModelOption[]
  onSave: (form: AgentForm) => void
  onDelete?: () => void
}) {
  const [form, setForm] = createSignal<AgentForm>(props.initial || defaultForm())
  const [showTools, setShowTools] = createSignal(false)
  const [showFreeOnly, setShowFreeOnly] = createSignal(true)

  // Reset form when a different agent is selected (track by agent name)
  let lastAgentName: string | undefined
  createEffect(() => {
    const init = props.initial
    const agentName = init?.name
    if (agentName !== lastAgentName) {
      lastAgentName = agentName
      setForm(init || defaultForm())
    }
  })

  const updateField = (field: keyof AgentForm, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const updatePermission = (key: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev.permission, [key]: value as "ask" | "allow" | "deny" }
      return { ...prev, permission: next }
    })
  }

  const toggleTool = (tool: string) => {
    setForm((prev) => {
      const next = { ...prev.tools, [tool]: !prev.tools[tool] }
      return { ...prev, tools: next }
    })
  }

  // Separate free and paid models
  const freeModels = () => (props.models ?? []).filter((m) => m.free)
  const paidModels = () => (props.models ?? []).filter((m) => !m.free)

  const modelOptions = () => showFreeOnly() ? freeModels() : (props.models ?? [])
  const modelGroups = () => {
    const groups: Record<string, Array<{ id: string; name: string; free: boolean }>> = {}
    for (const m of modelOptions()) {
      if (!groups[m.providerId]) groups[m.providerId] = []
      groups[m.providerId].push({ id: m.id, name: m.name, free: m.free })
    }
    return groups
  }

  return (
    <div style="display: flex; flex-direction: column; gap: 16px; padding: 16px; max-width: 600px">
      <h3 style="margin: 0; font-size: 18px">
        {props.initial?.name ? `Edit: ${props.initial.name}` : "New Agent"}
      </h3>

      <label>
        Name
        <input
          type="text"
          value={form().name}
          onInput={(e) => updateField("name", e.currentTarget.value)}
          placeholder="agent-name"
          disabled={!!props.initial?.name}
          style={inputStyle(!!props.initial?.name)}
        />
      </label>

      <label>
        Description
        <input
          type="text"
          value={form().description}
          onInput={(e) => updateField("description", e.currentTarget.value)}
          placeholder="What this agent does"
          style={inputStyle(false)}
        />
      </label>

      <div style="display: flex; gap: 12px">
        <label style="flex: 1">
          Mode
          <select
            value={form().mode}
            onInput={(e) => updateField("mode", e.currentTarget.value)}
            style={selectStyle()}
          >
            <For each={MODES}>
              {(mode) => <option value={mode}>{mode}</option>}
            </For>
          </select>
        </label>

        <label style={{ flex: 1 }}>
          <div style={{ display: "flex", "align-items": "center", gap: "6px", "margin-bottom": "4px" }}>
            <span>Model</span>
            <button
              onClick={() => setShowFreeOnly((v) => !v)}
              style={{
                padding: "2px 8px",
                "border-radius": "4px",
                border: "1px solid",
                "border-color": showFreeOnly() ? "#00B894" : "#444",
                background: showFreeOnly() ? "rgba(0,184,148,0.15)" : "transparent",
                color: showFreeOnly() ? "#00B894" : "#888",
                cursor: "pointer",
                "font-size": "10px",
                "font-weight": 600,
              }}
              title={showFreeOnly() ? "Showing free models only. Click to show all." : "Show free models only"}
            >
              {showFreeOnly() ? `Free (${freeModels().length})` : `All (${(props.models ?? []).length})`}
            </button>
          </div>
          <Show when={modelOptions().length > 0} fallback={
            <input
              type="text"
              value={form().model}
              onInput={(e) => updateField("model", e.currentTarget.value)}
              placeholder="provider/model-id"
              style={inputStyle(false)}
            />
          }>
            <select
              value={form().model}
              onInput={(e) => updateField("model", e.currentTarget.value)}
              style={{ ...selectStyle(), "font-size": "12px" }}
            >
              <option value="">(default)</option>
              <For each={Object.entries(modelGroups())}>
                {([provider, models]) => (
                  <optgroup label={provider}>
                    <For each={models}>
                      {(model) => (
                        <option value={model.id}>
                          {model.name}{model.free ? " (free)" : ""}
                        </option>
                      )}
                    </For>
                  </optgroup>
                )}
              </For>
            </select>
          </Show>
        </label>
      </div>

      <div style="display: flex; gap: 12px">
        <label style="flex: 1">
          Temperature ({form().temperature})
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={form().temperature}
            onInput={(e) => updateField("temperature", parseFloat(e.currentTarget.value))}
            style="width: 100%"
          />
        </label>

        <label style="flex: 1">
          Top P ({form().topP})
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={form().topP}
            onInput={(e) => updateField("topP", parseFloat(e.currentTarget.value))}
            style="width: 100%"
          />
        </label>

        <label style="flex: 1">
          Max Steps
          <input
            type="number"
            min="1"
            max="100"
            value={form().maxSteps}
            onInput={(e) => updateField("maxSteps", parseInt(e.currentTarget.value))}
            style={inputStyle(false)}
          />
        </label>
      </div>

      <label style="display: flex; align-items: center; gap: 8px">
        Color
        <For each={COLORS}>
          {(color) => (
            <div
              onClick={() => updateField("color", color)}
              style={{
                width: "24px",
                height: "24px",
                "border-radius": "50%",
                "background-color": color,
                border: form().color === color ? "3px solid white" : "3px solid transparent",
                cursor: "pointer",
                outline: form().color === color ? "2px solid #6C5CE7" : "none",
              }}
            />
          )}
        </For>
      </label>

      <h4 style="margin: 8px 0 4px">Permissions</h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px">
        <For each={Object.keys(form().permission)}>
          {(key) => {
            const perm = getPerm(form(), key)
            return (
              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px">
                {key === "doomLoop" ? "doom_loop" : key === "externalDirectory" ? "external" : key}
                <select
                  value={perm}
                  onInput={(e) => updatePermission(key, e.currentTarget.value)}
                  style="flex: 1; font-size: 12px; display: block; padding: 4px; border: 1px solid #444; border-radius: 4px; background: #1a1a2e; color: #fff; cursor: pointer"
                >
                  <For each={PERMISSION_LEVELS}>
                    {(level) => <option value={level}>{level}</option>}
                  </For>
                </select>
              </label>
            )
          }}
        </For>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowTools((v) => !v)}
          style={{
            padding: "8px 16px",
            "border-radius": "6px",
            border: "1px solid #444",
            background: "transparent",
            color: "#ccc",
            cursor: "pointer",
            "font-size": "14px",
            "font-weight": "bold",
            "margin-bottom": showTools() ? "8px" : "0",
          }}
        >
          Tools ({showTools() ? "Hide" : "Show"})
        </button>
        {showTools() && (
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 6px">
            <For each={TOOLS}>
              {(tool) => (
                <label
                  onClick={() => toggleTool(tool)}
                  style={{
                    padding: "6px",
                    "border-radius": "4px",
                    "text-align": "center",
                    "font-size": "12px",
                    cursor: "pointer",
                    border: form().tools[tool] ? "2px solid #6C5CE7" : "2px solid #444",
                    background: form().tools[tool] ? "rgba(108,92,231,0.2)" : "transparent",
                    color: form().tools[tool] ? "#fff" : "#888",
                  }}
                >
                  {tool}
                </label>
              )}
            </For>
          </div>
        )}
      </div>

      <label>
        System Prompt
        <textarea
          value={form().prompt}
          onInput={(e) => updateField("prompt", e.currentTarget.value)}
          placeholder="You are a..."
          rows={8}
          style="display: block; width: 100%; padding: 8px; margin: 4px 0; border: 1px solid #444; border-radius: 6px; background: #1a1a2e; color: #fff; font-size: 14px; box-sizing: border-box; min-height: 120px; resize: vertical"
        />
      </label>

      <div style="display: flex; gap: 8px; margin-top: 8px">
        <button
          type="button"
          onClick={() => props.onSave(form())}
          style="padding: 8px 16px; border-radius: 6px; border: none; background: #6C5CE7; color: #fff; cursor: pointer; font-size: 14px; font-weight: bold"
        >
          Save
        </button>
        {props.onDelete && (
          <button
            type="button"
            onClick={() => props.onDelete?.()}
            style="padding: 8px 16px; border-radius: 6px; border: none; background: #E17055; color: #fff; cursor: pointer; font-size: 14px; font-weight: bold"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

function inputStyle(disabled?: boolean) {
  return {
    display: "block",
    width: "100%",
    padding: "8px",
    margin: "4px 0",
    border: "1px solid #444",
    "border-radius": "6px",
    background: disabled ? "#222" : "#1a1a2e",
    color: disabled ? "#666" : "#fff",
    "font-size": "14px",
    "box-sizing": "border-box",
    cursor: disabled ? "not-allowed" : "text",
  } as const
}

function selectStyle() {
  return { ...inputStyle(), cursor: "pointer" }
}
