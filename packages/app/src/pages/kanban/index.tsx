import { createSignal, For, Show } from "solid-js"
import type { Task, TaskStatus, TaskPriority } from "./types"
import { COLUMNS } from "./types"
import { KanbanColumn } from "./kanban-column"
import { TaskDetail } from "./task-detail"
import { mockTasks } from "./mock-data"

const AGENTS = [
  "all", "orchestrator", "planner", "builder", "reviewer", "documenter",
  "backend-specialist", "frontend-specialist", "database-specialist",
  "security-specialist", "devops-specialist", "qa-engineer",
]

const PRIORITIES: Array<TaskPriority | "all"> = ["all", "high", "medium", "low"]

let idCounter = 100

export default function KanbanPage() {
  const [tasks, setTasks] = createSignal<Task[]>(mockTasks)
  const [selectedTask, setSelectedTask] = createSignal<Task | null>(null)
  const [agentFilter, setAgentFilter] = createSignal("all")
  const [priorityFilter, setPriorityFilter] = createSignal<"all" | TaskPriority>("all")

  const filtered = () => {
    return tasks().filter((t) => {
      if (agentFilter() !== "all" && t.agentName !== agentFilter()) return false
      if (priorityFilter() !== "all" && t.priority !== priorityFilter()) return false
      return true
    })
  }

  const getColumnTasks = (status: TaskStatus) => {
    return filtered().filter((t) => t.status === status)
  }

  const handleDrop = (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, updatedAt: Date.now() } : t)))
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
  }

  const handleSave = (updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    setSelectedTask(null)
  }

  const handleDelete = () => {
    const id = selectedTask()?.id
    setTasks((prev) => prev.filter((t) => t.id !== id))
    setSelectedTask(null)
  }

  const handleAddTask = () => {
    const newTask: Task = {
      id: `task-${++idCounter}`,
      title: "New Task",
      description: "",
      status: "todo",
      priority: "medium",
      agentName: "builder",
      projectName: "AnitaCode",
      sessionId: "ses_new",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setTasks((prev) => [newTask, ...prev])
  }

  return (
    <div style={{ display: "flex", "flex-direction": "column", height: "100%", "min-height": "100vh", "background-color": "#0d0d1a" }}>
      <header
        style={{
          display: "flex",
          "align-items": "center",
          gap: "16px",
          padding: "16px 24px",
          "border-bottom": "1px solid #222",
        }}
      >
        <h2 style={{ margin: 0, "font-size": "18px", color: "#6C5CE7" }}>AnitaCode Kanban</h2>

        <div style={{ display: "flex", gap: "8px", "font-size": "13px" }}>
          <select
            value={agentFilter()}
            onInput={(e) => setAgentFilter(e.currentTarget.value)}
            style={selectStyle()}
          >
            <For each={AGENTS}>
              {(a) => <option value={a}>{a === "all" ? "All Agents" : a}</option>}
            </For>
          </select>

          <select
            value={priorityFilter()}
            onInput={(e) => setPriorityFilter(e.currentTarget.value as TaskPriority | "all")}
            style={selectStyle()}
          >
            <For each={PRIORITIES}>
              {(p) => <option value={p}>{p === "all" ? "All Priorities" : p}</option>}
            </For>
          </select>
        </div>

        <button
          onClick={handleAddTask}
          style={{
            "margin-left": "auto",
            padding: "8px 16px",
            "border-radius": "8px",
            border: "none",
            background: "#6C5CE7",
            color: "#fff",
            cursor: "pointer",
            "font-size": "13px",
            "font-weight": "bold",
          }}
        >
          + Add Task
        </button>
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          gap: "12px",
          padding: "16px 24px",
          overflow: "auto",
        }}
      >
        <For each={COLUMNS}>
          {(col) => (
            <KanbanColumn
              id={col.id}
              title={col.title}
              tasks={getColumnTasks(col.id)}
              onTaskClick={handleTaskClick}
              onDrop={handleDrop}
            />
          )}
        </For>
      </main>

      <Show when={selectedTask()}>
        {(task) => (
          <TaskDetail
            task={task()}
            onSave={handleSave}
            onCancel={() => setSelectedTask(null)}
            onDelete={handleDelete}
          />
        )}
      </Show>
    </div>
  )
}

function selectStyle() {
  return {
    padding: "6px 10px",
    "border-radius": "6px",
    border: "1px solid #333",
    background: "#1a1a2e",
    color: "#fff",
    "font-size": "12px",
    cursor: "pointer",
  } as const
}
