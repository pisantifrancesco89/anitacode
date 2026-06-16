import { createSignal, For, Show } from "solid-js"
import type { AgentForm, AgentNode } from "./types"
import { AgentEditor } from "./agent-editor"
import { AgentTreeView } from "./agent-tree"

const DEFAULT_AGENTS: AgentNode[] = [
  {
    name: "orchestrator",
    description: "CEO - delegates to subagents automatically",
    mode: "primary",
    color: "#6C5CE7",
    children: [
      {
        name: "planner",
        description: "Creates development plans",
        mode: "subagent",
        color: "#00B894",
        children: [],
      },
      {
        name: "builder",
        description: "Writes production code",
        mode: "subagent",
        color: "#74B9FF",
        children: [
          {
            name: "backend-specialist",
            description: "API and business logic",
            mode: "subagent",
            color: "#A29BFE",
            children: [],
          },
          {
            name: "frontend-specialist",
            description: "UI components and pages",
            mode: "subagent",
            color: "#FD79A8",
            children: [],
          },
          {
            name: "database-specialist",
            description: "Schema design and migrations",
            mode: "subagent",
            color: "#55EFC4",
            children: [],
          },
        ],
      },
      {
        name: "reviewer",
        description: "Reviews code quality",
        mode: "subagent",
        color: "#E17055",
        children: [],
      },
      {
        name: "documenter",
        description: "Creates documentation",
        mode: "subagent",
        color: "#FDCB6E",
        children: [],
      },
      {
        name: "qa-engineer",
        description: "Testing and QA",
        mode: "subagent",
        color: "#FD79A8",
        children: [],
      },
      {
        name: "security-specialist",
        description: "Security audits",
        mode: "subagent",
        color: "#E17055",
        children: [],
      },
      {
        name: "devops-specialist",
        description: "CI/CD and deployment",
        mode: "subagent",
        color: "#74B9FF",
        children: [],
      },
    ],
  },
]

export default function AgentsPage() {
  const [viewMode, setViewMode] = createSignal<"tree" | "editor">("tree")
  const [selectedAgent, setSelectedAgent] = createSignal<string>("")
  const [editingAgent, setEditingAgent] = createSignal<AgentForm | undefined>()
  const [treeData, setTreeData] = createSignal<AgentNode>(DEFAULT_AGENTS[0])

  const handleNodeSelect = (name: string) => {
    setSelectedAgent(name)
    const node = findNode(treeData(), name)
    if (node) {
      setEditingAgent({
        name: node.name,
        description: node.description,
        mode: node.mode,
        model: "",
        temperature: 0.3,
        topP: 1,
        maxSteps: 25,
        color: node.color,
        hidden: false,
        disabled: false,
        permission: { edit: "ask", bash: "ask", webfetch: "ask", doomLoop: "allow", externalDirectory: "ask" },
        tools: {},
        prompt: "",
      })
      setViewMode("editor")
    }
  }

  const handleSave = (form: AgentForm) => {
    console.log("Saving agent:", form)
    setViewMode("tree")
    setEditingAgent(undefined)
  }

  const handleNewAgent = () => {
    setEditingAgent(undefined)
    setViewMode("editor")
  }

  const agentList = flattenTree(treeData())

  return (
    <div style={{ display: "flex", height: "100%", "min-height": "100vh" }}>
      <aside
        style={{
          width: "240px",
          "border-right": "1px solid #333",
          padding: "16px",
          display: "flex",
          "flex-direction": "column",
          gap: "8px",
          "background-color": "#0d0d1a",
        }}
      >
        <h2 style={{ margin: "0 0 8px", "font-size": "16px", color: "#6C5CE7" }}>AnitaCode Agents</h2>

        <div style={{ display: "flex", gap: "4px" }}>
          <button
            onClick={() => setViewMode("tree")}
            style={tabStyle(viewMode() === "tree")}
          >
            Tree
          </button>
          <button
            onClick={() => setViewMode("editor")}
            style={tabStyle(viewMode() === "editor")}
          >
            Editor
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          <For each={agentList}>
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
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    "border-radius": "50%",
                    "background-color": agent.color,
                  }}
                />
                <span style={{ flex: 1 }}>{agent.name}</span>
                <span style={{ "font-size": "10px", color: "#666" }}>{agent.mode}</span>
              </div>
            )}
          </For>
        </div>

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

      <main style={{ flex: 1, overflow: "auto" }}>
        <Show when={viewMode() === "tree" && !editingAgent()}>
          <div style={{ padding: "24px" }}>
            <AgentTreeView tree={treeData()} onSelect={handleNodeSelect} />
          </div>
        </Show>

        <Show when={viewMode() === "editor"}>
          <AgentEditor initial={editingAgent()} onSave={handleSave} />
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

function findNode(root: AgentNode, name: string): AgentNode | null {
  if (root.name === name) return root
  for (const child of root.children) {
    const found = findNode(child, name)
    if (found) return found
  }
  return null
}

function flattenTree(root: AgentNode): AgentNode[] {
  return [root, ...root.children.flatMap((child) => flattenTree(child))]
}
