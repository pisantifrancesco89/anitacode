import { createSignal, For, Show, createMemo, createEffect } from "solid-js"
import { createStore } from "solid-js/store"
import { createQuery } from "@tanstack/solid-query"
import type { AgentForm, AgentNode, AgentCanvasState } from "./types"
import { AgentEditor } from "./agent-editor"
import { AgentCanvas } from "./agent-canvas"
import { useServerSync, useQueryOptions } from "@/context/server-sync"
import { pathKey } from "@/utils/path-key"
import type { Agent } from "@opencode-ai/sdk/v2/client"

const CANVAS_STORAGE_PREFIX = "anitacode.agent-canvas"

function canvasStorageKey(directory: string | undefined): string {
  return directory ? `${CANVAS_STORAGE_PREFIX}.${directory}` : CANVAS_STORAGE_PREFIX
}

function loadCanvasState(directory: string | undefined): AgentCanvasState {
  try {
    const raw = localStorage.getItem(canvasStorageKey(directory))
    return raw ? JSON.parse(raw) : defaultCanvasState()
  } catch {
    return defaultCanvasState()
  }
}

function saveCanvasState(directory: string | undefined, state: AgentCanvasState) {
  try {
    localStorage.setItem(canvasStorageKey(directory), JSON.stringify(state))
  } catch {
    // Ignore storage errors
  }
}

function defaultCanvasState(): AgentCanvasState {
  return { positions: [], connections: [], teams: [], viewport: { zoom: 1, panX: 0, panY: 0 } }
}

export default function AgentsPage() {
  const serverSync = useServerSync()
  const queryOptions = useQueryOptions()
  const [viewMode, setViewMode] = createSignal<"canvas" | "editor">("canvas")
  const [selectedAgent, setSelectedAgent] = createSignal<string>("")
  const [editingAgent, setEditingAgent] = createSignal<AgentForm | undefined>()
  const [saving, setSaving] = createSignal(false)
  const [search, setSearch] = createSignal("")
  const [showAll, setShowAll] = createSignal(false)

  const config = createMemo(() => serverSync().data.config)
  const providerList = createMemo(() => serverSync().data.provider)

  // Directory for per-project canvas state and agent loading
  const directory = createMemo(() => serverSync().data.path.directory)

  // Load merged agents (native + custom) from the server
  const agentsQuery = createQuery(() => {
    const dir = directory()
    return {
      ...queryOptions().agents(pathKey(dir ?? "")),
      enabled: !!dir,
    }
  })
  const agents = (): Agent[] => agentsQuery.data ?? []

  // Canvas state (persisted per-project in localStorage)
  const [canvasState, setCanvasState] = createSignal<AgentCanvasState>(loadCanvasState(directory()))

  // Reload canvas state when directory changes
  createEffect(() => {
    const dir = directory()
    setCanvasState(loadCanvasState(dir))
  })

  const agentList = createMemo(() => {
    const q = search().toLowerCase()
    return agents()
      .filter((a) => (showAll() ? true : a.native))
      .filter(
        (a) =>
          !q ||
          a.name.toLowerCase().includes(q) ||
          (a.description ?? "").toLowerCase().includes(q),
      )
      .map((a) => ({
        name: a.name,
        description: a.description ?? "",
        mode: a.mode,
        color: a.color ?? "#6C5CE7",
        children: [],
      }))
  })

  const models = createMemo(() => {
    const all = providerList()?.all
    const connected = providerList()?.connected ?? []
    if (!all) return []
    const result: Array<{
      id: string
      providerId: string
      name: string
      free: boolean
      costInput: number
      costOutput: number
      status: string
    }> = []
    for (const [pid, provider] of all) {
      if (!provider.models) continue
      const isConnected = connected.includes(pid)
      for (const [mid, model] of Object.entries(provider.models)) {
        const m = model as any
        const costInput = m.cost?.input ?? 0
        const costOutput = m.cost?.output ?? 0
        const isFree = costInput === 0 && costOutput === 0
        const status = m.status ?? "active"

        // Filter: show only free models + models from connected providers
        if (!isFree && !isConnected) continue

        result.push({
          id: `${pid}/${mid}`,
          providerId: pid,
          name: m.name ?? mid,
          free: isFree,
          costInput,
          costOutput,
          status,
        })
      }
    }
    return result
  })

  const handleCanvasStateChange = async (state: AgentCanvasState) => {
    setCanvasState(state)
    saveCanvasState(directory(), state)
  }

  const handleNodeSelect = (name: string) => {
    if (name === "__new__") {
      handleNewAgent()
      return
    }
    setSelectedAgent(name)
    // Build form from merged agent data if available, fall back to config
    const agent = agents().find((a) => a.name === name)
    const cfg = config()?.agent
    const agentCfg = cfg ? (cfg as any)[name] : undefined
    if (agent || agentCfg) {
      const perm = (agentCfg?.permission && typeof agentCfg.permission === "object" ? agentCfg.permission : {}) as Record<string, string>
      setEditingAgent({
        name,
        description: agent?.description ?? agentCfg?.description ?? "",
        mode: (agent?.mode ?? agentCfg?.mode ?? "subagent") as "subagent" | "primary" | "all",
        model: agent?.model ? `${agent.model.providerID}/${agent.model.modelID}` : (agentCfg?.model ?? ""),
        temperature: agent?.temperature ?? agentCfg?.temperature ?? 0.3,
        topP: agent?.topP ?? agentCfg?.top_p ?? 1,
        maxSteps: agentCfg?.maxSteps ?? agentCfg?.steps ?? 25,
        color: typeof (agent?.color ?? agentCfg?.color) === "string" ? (agent?.color ?? agentCfg?.color) : "#6C5CE7",
        hidden: agentCfg?.hidden ?? false,
        disabled: agentCfg?.disable ?? false,
        permission: {
          edit: (perm.edit ?? "ask") as "ask" | "allow" | "deny",
          bash: (perm.bash ?? "ask") as "ask" | "allow" | "deny",
          webfetch: (perm.webfetch ?? "ask") as "ask" | "allow" | "deny",
          doomLoop: (perm.doom_loop ?? "allow") as "ask" | "allow" | "deny",
          externalDirectory: (perm.external_directory ?? "ask") as "ask" | "allow" | "deny",
        },
        tools: agentCfg?.tools ?? {},
        prompt: agent?.prompt ?? agentCfg?.prompt ?? "",
      })
      setViewMode("editor")
    }
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
          edit: form.permission.edit,
          bash: form.permission.bash,
          webfetch: form.permission.webfetch,
          doom_loop: form.permission.doomLoop,
          external_directory: form.permission.externalDirectory,
        },
        tools: Object.keys(form.tools).length ? form.tools : undefined,
        prompt: form.prompt || undefined,
      }

      const updatedAgent = { ...currentAgent, [form.name]: agentConfig }
      await serverSync().updateConfig({ ...currentConfig, agent: updatedAgent } as any)
      // Refetch agents to reflect changes
      void agentsQuery.refetch()
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
      await serverSync().updateConfig({ ...currentConfig, agent: currentAgent } as any)
      void agentsQuery.refetch()
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
    await serverSync().updateConfig({ ...currentConfig, agent: currentAgent } as any)
    void agentsQuery.refetch()
  }

  const handleNewAgent = () => {
    setEditingAgent(undefined)
    setSelectedAgent("")
    setViewMode("editor")
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0a0a16" }}>
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

        {/* Search */}
        <input
          type="text"
          placeholder="Search agents..."
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
          style={{
            width: "100%",
            padding: "6px 10px",
            "border-radius": "6px",
            border: "1px solid #333",
            background: "#1a1a2e",
            color: "#fff",
            "font-size": "12px",
            "box-sizing": "border-box",
          }}
        />

        {/* Toggle: OpenCode only / All */}
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            onClick={() => setShowAll(false)}
            style={filterBtnStyle(!showAll())}
          >
            OpenCode
          </button>
          <button
            onClick={() => setShowAll(true)}
            style={filterBtnStyle(showAll())}
          >
            All ({agents().length})
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
                <Show when={agents().find((a) => a.name === agent.name)?.native}>
                  <span style={{ "font-size": "9px", color: "#6C5CE7", background: "rgba(108,92,231,0.15)", padding: "1px 4px", "border-radius": "3px" }}>core</span>
                </Show>
                <span style={{ "font-size": "10px", color: "#666" }}>{agent.mode}</span>
              </div>
            )}
          </For>
          <Show when={agentList().length === 0}>
            <div style={{ padding: "16px", "text-align": "center", color: "#666", "font-size": "12px" }}>
              {agentsQuery.isLoading ? "Loading agents..." : "No agents found"}
            </div>
          </Show>
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

      <main style={{ flex: 1, overflow: "hidden", position: "relative", display: "flex", "flex-direction": "column" }}>
        <Show when={viewMode() === "canvas"}>
          <div style={{ flex: 1, position: "relative" }}>
            <AgentCanvas
              agents={agentList()}
              canvasState={canvasState()}
              onCanvasStateChange={handleCanvasStateChange}
              onSelect={handleNodeSelect}
              onEdit={handleNodeSelect}
              onDelete={handleDeleteAgent}
            />
          </div>
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

function filterBtnStyle(active: boolean) {
  return {
    flex: 1,
    padding: "4px 8px",
    "border-radius": "4px",
    border: "1px solid",
    "border-color": active ? "#6C5CE7" : "#333",
    background: active ? "rgba(108,92,231,0.15)" : "transparent",
    color: active ? "#6C5CE7" : "#666",
    cursor: "pointer",
    "font-size": "11px",
    "font-weight": "600",
  } as const
}
