import { createSignal, For, Show } from "solid-js"
import type { Task, TaskPriority, TaskStatus } from "./types"
import { COLUMNS } from "./types"
import { FALLBACK_AGENTS } from "./agents"

const STATUSES = COLUMNS.map((c) => c.id)
const PRIORITIES: TaskPriority[] = ["high", "medium", "low"]
const AGENTS = [...FALLBACK_AGENTS]

export function TaskDetail(props: {
  task: Task
  onSave: (task: Task) => void
  onCancel: () => void
  onDelete: () => void
}) {
  const [edit, setEdit] = createSignal({ ...props.task })

  const update = <K extends keyof Task>(key: K, value: Task[K]) => {
    setEdit((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        "align-items": "center",
        "justify-content": "center",
        "z-index": 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onCancel()
      }}
    >
      <div
        style={{
          background: "#1a1a2e",
          border: "1px solid #333",
          "border-radius": "16px",
          padding: "24px",
          width: "480px",
          "max-width": "90vw",
          "max-height": "80vh",
          overflow: "auto",
          display: "flex",
          "flex-direction": "column",
          gap: "14px",
        }}
      >
        <h3 style={{ margin: 0, "font-size": "18px", color: "#fff" }}>Edit Task</h3>

        <label>
          Title
          <input
            type="text"
            value={edit().title}
            onInput={(e) => update("title", e.currentTarget.value)}
            style={inputStyle()}
          />
        </label>

        <label>
          Description
          <textarea
            value={edit().description}
            onInput={(e) => update("description", e.currentTarget.value)}
            style={{ ...inputStyle(), "min-height": "80px", resize: "vertical" }}
          />
        </label>

        <div style={{ display: "flex", gap: "10px" }}>
          <label style={{ flex: 1 }}>
            Status
            <select
              value={edit().status}
              onInput={(e) => update("status", e.currentTarget.value as TaskStatus)}
              style={selectStyle()}
            >
              <For each={STATUSES}>
                {(s) => <option value={s}>{s.replace("_", " ")}</option>}
              </For>
            </select>
          </label>

          <label style={{ flex: 1 }}>
            Priority
            <select
              value={edit().priority}
              onInput={(e) => update("priority", e.currentTarget.value as TaskPriority)}
              style={selectStyle()}
            >
              <For each={PRIORITIES}>
                {(p) => <option value={p}>{p}</option>}
              </For>
            </select>
          </label>
        </div>

        <label>
          Agent
          <select
            value={edit().agentName}
            onInput={(e) => update("agentName", e.currentTarget.value)}
            style={selectStyle()}
          >
            <For each={AGENTS}>
              {(a) => <option value={a}>{a}</option>}
            </For>
          </select>
        </label>

        <div style={{ display: "flex", gap: "8px", "margin-top": "8px" }}>
          <button type="button" onClick={() => props.onSave({ ...edit(), updatedAt: Date.now() })} style={btnStyle("#6C5CE7")}>
            Save
          </button>
          <button type="button" onClick={props.onCancel} style={btnStyle("#444")}>
            Cancel
          </button>
          <button type="button" onClick={props.onDelete} style={btnStyle("#E17055", true)}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function inputStyle() {
  return {
    display: "block",
    width: "100%",
    padding: "8px",
    margin: "4px 0",
    border: "1px solid #444",
    "border-radius": "6px",
    background: "#0d0d1a",
    color: "#fff",
    "font-size": "14px",
    "box-sizing": "border-box",
  } as const
}

function selectStyle() {
  return { ...inputStyle(), cursor: "pointer" }
}

function btnStyle(bg: string, danger = false) {
  return {
    padding: "8px 16px",
    "border-radius": "8px",
    border: "none",
    background: bg,
    color: "#fff",
    cursor: "pointer",
    "font-size": "13px",
    "font-weight": "bold",
    "margin-left": danger ? "auto" : "0",
  } as const
}
