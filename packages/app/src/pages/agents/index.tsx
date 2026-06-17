import { createSignal, For, Show, createMemo } from "solid-js"
import { createStore } from "solid-js/store"
import type { AgentForm, AgentNode, AgentCanvasState } from "./types"
import { AgentEditor } from "./agent-editor"
import { AgentCanvas } from "./agent-canvas"
import { useServerSync } from "@/context/server-sync"

const BUILTIN_AGENTS = ["plan", "build", "general", "explore", "scout", "title", "summary", "compaction"]

function defaultCanvasState(): AgentCanvasState {
  return { positions: [], connections: [], teams: [] }
}

export default function AgentsPage() {
  const sync = useServerSync()
  const [viewMode, setViewMode] = createSignal<"canvas" | "editor">("canvas")
  const [selectedAgent, setSelectedAgent] = createSignal<string>("")
  const [editingAgent, setEditingAgent] = createSignal<AgentForm | undefined>()
  const [saving, setSaving] = createSignal(false)

  const config = createMemo(() => sync().data.config)
  const providerList = createMemo(() => sync().data.provider)

  // Canvas state (persisted in config)
  const [canvasState, setCanvasState] = createSignal<AgentCanvasState>(
    (config() as any)?.agent_canvas ?? defaultCanvasState(),
  )

  const agentList = createMemo(() => {
    const agents = config()?.agent ?? {}
    const list = Object.keys(agents).filter((name) => !BUILTIN_AGENTS.includes(name))
    const result: AgentNode[] = []
    for (const name of list) {
      const cfg = agents[name]
      if (!cfg || cfg.hidden) continue
      result.push({
        name,
        description: cfg.description ?? "",
        mode: (cfg.mode as "subagent" | "primary" | "all") ?? "subagent",
        color: cfg.color ?? "#6C5CE7",
        children: [],
      })
    }
    return result
  })

  const models = createMemo(() => {
    const all = providerList()?.all
    if (!all) return []
    const result: Array<{ id: string; providerId: string; name: string }> = []
    for (const [pid, provider] of all) {
      if (!provider.models) continue
      for (const [mid, model] of Object.entries(provider.models)) {
        result.push({ id: `${pid}/${mid}`, providerId: pid, name: typeof model === "object" ? (model as any).name ?? mid : mid })
      }
    }
    return result
  })

  const treeData = createMemo((): AgentNode => {
    const list = agentList()
    const primaries = list.filter((a) => a.mode === "primary")
    const root = primaries[0] ?? { name: "orchestrator", mode: "primary" as const, children: [], description: "", color: "#6C5CE7" }
    const subagents = list.filter((a) => a.mode === "subagent" && a.name !== root.name)
    root.children = subagents
    return root
  })

  const handleCanvasStateChange = async (state: AgentCanvasState) => {
    setCanvasState(state)
    // Persist to config
    const currentConfig = config() ?? {}
    await sync().updateConfig({ ...currentConfig, agent_canvas: state } as any)
  }

  const handleNodeSelect = (name: string) => {
    if (name === "__new__") {
      handleNewAgent()
      return
    }
    setSelectedAgent(name)
    const cfg = config()?.agent
    const agentCfg = cfg ? (cfg as any)[name] : undefined
    if (agentCfg) {
      const perm = (agentCfg.permission && typeof agentCfg.permission === "object" ? agentCfg.permission : {}) as Record<string, string>
      setEditingAgent({
        name,
        description: agentCfg.description ?? "",
        mode: (agentCfg.mode as "subagent" | "primary" | "all") ?? "subagent",
        model: agentCfg.model ?? "",
        temperature: agentCfg.temperature ?? 0.3,
        topP: agentCfg.top_p ?? 1,
        maxSteps: agentCfg.maxSteps ?? agentCfg.steps ?? 25,
        color: typeof agentCfg.color === "string" ? agentCfg.color : "#6C5CE7",
        hidden: agentCfg.hidden ?? false,
        disabled: agentCfg.disable ?? false,
        permission: {
          edit: (perm.edit ?? "ask") as "ask" | "allow" | "deny",
          bash: (perm.bash ?? "ask") as "ask" | "allow" | "deny",
          webfetch: (perm.webfetch ?? "ask") as "ask" | "allow" | "deny",
          doomLoop: (perm.doom_loop ?? "allow") as "ask" | "allow" | "deny",
          externalDirectory: (perm.external_directory ?? "ask") as "ask" | "allow" | "deny",
        },
        tools: agentCfg.tools ?? {},
        prompt: agentCfg.prompt ?? "",
      })
      setViewMode("editor")
    }
  }

  const handleNodeEdit = (name: string) => {
    handleNodeSelect(name)
  }

  const handleSave = async (form: AgentForm) => {
    setSaving(true)
    try {
      const currentConfig = config() ?? {}
      const currentAgent = (currentConfig as any).agent ?? {}

      const agentConfig: any = {
        description: form.description || undefined,
        mode: form.mode,
        model: form.model || undefined,
        temperature: form.temperature,
        top_p: form.topP,
        maxSteps: form.maxSteps,
        color: form.color,
        hidden: form.hidden || undefined,
        disable: form.disabled || undefined,
        permission: {
          ...form.permission,
          doom_loop: form.permission.doomLoop,
          external_directory: form.permission.externalDirectory,
        },
        tools: Object.keys(form.tools).length ? form.tools : undefined,
        prompt: form.prompt || undefined,
      }

      const updatedAgent = { ...currentAgent, [form.name]: agentConfig }
      await sync().updateConfig({ ...currentConfig, agent: updatedAgent } as any)
    } finally {
      setSaving(false)
      setViewMode("canvas")
      setEditingAgent(undefined)
    }
  }

  const handleDelete = async () => {
    if (!editingAgent()) return
    setSaving(true)
    try {
      const currentConfig = config() ?? {}
      const currentAgent = { ...((currentConfig as any).agent ?? {}) }
      delete currentAgent[editingAgent()!.name]
      await sync().updateConfig({ ...currentConfig, agent: currentAgent } as any)
    } finally {
      setSaving(false)
      setViewMode("canvas")
      setEditingAgent(undefined)
    }
  }

  const handleDeleteAgent = async (name: string) => {
    const currentConfig = config() ?? {}
    const currentAgent = { ...((currentConfig as any).agent ?? {}) }
    delete currentAgent[name]
    await sync().updateConfig({ ...currentConfig, agent: currentAgent } as any)
  }

  const handleNewAgent = () => {
    setEditingAgent(undefined)
    setSelectedAgent("")
    setViewMode("editor")
  }

  return (
    <div style={{ display: "flex", height: "100%", "min-height": "100vh", background: "#0a0a16" }}>
      <aside
        style={{
          width: "240px",
          "border-right": "1px solid #222",
          padding: "16px",
          display: "flex",
          "flex-direction": "column",
          gap: "8px",
          background: "#0d0d1a",
        }}
      >
        <h2 style={{ margin: "0 0 8px", "font-size": "16px", color: "#6C5CE7" }}>AnitaCode Agents</h2>

        <div style={{ display: "flex", gap: "4px" }}>
          <button onClick={() => setViewMode("canvas")} style={tabStyle(viewMode() === "canvas")}>
            Canvas
          </button>
          <button onClick={() => setViewMode("editor")} style={tabStyle(viewMode() === "editor")}>
            Editor
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          <For each={agentList()}>
            {(agent) => (
              <div
                onClick={() => handleNodeSelect(agent.name)}
                style={{
                  padding: "8px",
                  "border-radius": "6px",
                  cursor: "pointer",
                  display: "flex",
                  "align-items": "center",
                  gap: "8px",
                  "font-size": "13px",
                  background: selectedAgent() === agent.name ? "rgba(108,92,231,0.2)" : "transparent",
                  color: selectedAgent() === agent.name ? "#fff" : "#999",
                }}
              >
                <div style={{ width: "8px", height: "8px", "border-radius": "50%", "background-color": agent.color }} />
                <span style={{ flex: 1 }}>{agent.name}</span>
                <span style={{ "font-size": "10px", color: "#666" }}>{agent.mode}</span>
              </div>
            )}
          </For>
        </div>

        <Show when={saving()}>
          <div style={{ "text-align": "center", "font-size": "12px", color: "#6C5CE7" }}>Saving...</div>
        </Show>

        <button
          onClick={handleNewAgent}
          style={{
            padding: "10px",
            "border-radius": "8px",
            border: "2px dashed #444",
            background: "transparent",
            color: "#6C5CE7",
            cursor: "pointer",
            "font-size": "14px",
            "font-weight": "bold",
          }}
        >
          + New Agent
        </button>
      </aside>

      <main style={{ flex: 1, overflow: "hidden" }}>
        <Show when={viewMode() === "canvas"}>
          <AgentCanvas
            agents={agentList()}
            canvasState={canvasState()}
            onCanvasStateChange={handleCanvasStateChange}
            onSelect={handleNodeSelect}
            onEdit={handleNodeEdit}
            onDelete={handleDeleteAgent}
          />
        </Show>

        <Show when={viewMode() === "editor"}>
          <div style={{ overflow: "auto", height: "100%" }}>
            <AgentEditor
              initial={editingAgent()}
              models={models()}
              onSave={handleSave}
              onDelete={editingAgent() ? handleDelete : undefined}
            />
          </div>
        </Show>
      </main>
    </div>
  )
}

function tabStyle(active: boolean) {
  return {
    flex: 1,
    padding: "6px",
    "border-radius": "6px",
    border: "none",
    background: active ? "rgba(108,92,231,0.2)" : "transparent",
    color: active ? "#6C5CE7" : "#666",
    cursor: "pointer",
    "font-size": "13px",
    "font-weight": "bold",
  } as const
}
