import { createSignal, For, Show, createMemo, createEffect } from "solid-js"
import type { Task, TaskStatus, TaskPriority } from "./types"
import { COLUMNS } from "./types"
import { KanbanColumn } from "./kanban-column"
import { TaskDetail } from "./task-detail"
import { agentNames } from "./agents"
import { useServerSync } from "@/context/server-sync"

const STORAGE_KEY = "anitacode.kanban.tasks"

function loadLocalTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocalTasks(tasks: Task[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  } catch {
    // Ignore storage errors
  }
}

const PRIORITIES: Array<TaskPriority | "all"> = ["all", "high", "medium", "low"]

function taskFromTodo(sessionId: string, todo: { content: string; status: string; priority: string }, idx: number): Task {
  return {
    id: `task-${sessionId}-${idx}`,
    title: todo.content,
    description: "",
    status: mapTodoStatus(todo.status),
    priority: (todo.priority as TaskPriority) || "medium",
    agentName: "",
    projectName: "",
    sessionId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

function mapTodoStatus(status: string): TaskStatus {
  switch (status) {
    case "pending": return "todo"
    case "in_progress": return "in_progress"
    case "review": return "review"
    case "completed": return "done"
    case "cancelled": return "cancelled"
    default: return "todo"
  }
}

export default function KanbanPage() {
  const sync = useServerSync()
  const [selectedTask, setSelectedTask] = createSignal<Task | null>(null)
  const [agentFilter, setAgentFilter] = createSignal("all")
  const [priorityFilter, setPriorityFilter] = createSignal<"all" | TaskPriority>("all")
  const [localTasks, setLocalTasks] = createSignal<Task[]>(loadLocalTasks())

  // Agent list derived from config (merged with fallback specialists)
  const agents = createMemo(() => agentNames(sync().data.config?.agent as Record<string, unknown> | undefined))

  // Persist local tasks to localStorage
  createEffect(() => saveLocalTasks(localTasks()))

  const sessionTodos = createMemo(() => {
    const store = sync().data.session_todo
    if (!store) return []
    const tasks: Task[] = []
    for (const [sessionId, todos] of Object.entries(store)) {
      if (!Array.isArray(todos)) continue
      todos.forEach((todo: any, idx: number) => {
        tasks.push(taskFromTodo(sessionId, todo, idx))
      })
    }
    return tasks
  })

  const allTasks = createMemo(() => {
    const remote = sessionTodos()
    const local = localTasks()
    const localIds = new Set(local.map((t) => t.id))
    return [...local, ...remote.filter((t) => !localIds.has(t.id))]
  })

  const filtered = createMemo(() => {
    return allTasks().filter((t) => {
      if (agentFilter() !== "all" && t.agentName !== agentFilter()) return false
      if (priorityFilter() !== "all" && t.priority !== priorityFilter()) return false
      return true
    })
  })

  const getColumnTasks = (status: TaskStatus) => {
    return filtered().filter((t) => t.status === status)
  }

  const handleDrop = (taskId: string, newStatus: TaskStatus) => {
    setLocalTasks((prev) => {
      // If the task is already local, update its status
      const existing = prev.find((t) => t.id === taskId)
      if (existing) {
        return prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, updatedAt: Date.now() } : t))
      }
      // Task is remote (from a session) — promote it to a local override
      // so the status change persists. The dedup in allTasks() ensures the
      // local copy takes precedence over the remote one.
      const remote = allTasks().find((t) => t.id === taskId)
      if (remote) {
        return [...prev, { ...remote, status: newStatus, updatedAt: Date.now() }]
      }
      return prev
    })
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
  }

  const handleSave = (updated: Task) => {
    setLocalTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    setSelectedTask(null)
  }

  const handleDelete = () => {
    const id = selectedTask()?.id
    setLocalTasks((prev) => prev.filter((t) => t.id !== id))
    setSelectedTask(null)
  }

  const handleAddTask = () => {
    const newTask: Task = {
      id: `task-local-${Date.now()}`,
      title: "New Task",
      description: "",
      status: "todo",
      priority: "medium",
      agentName: "builder",
      projectName: "",
      sessionId: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setLocalTasks((prev) => [newTask, ...prev])
  }

  const todosLoading = createMemo(() => {
    return !sync().data.session_todo
  })

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
            <For each={["all", ...agents()]}>
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

          <Show when={todosLoading()}>
            <span style={{ color: "#666", "font-size": "12px" }}>Loading sessions...</span>
          </Show>
        </div>

        <div style={{ "margin-left": "auto", display: "flex", gap: "8px", "align-items": "center" }}>
          <span style={{ color: "#666", "font-size": "11px" }}>
            {allTasks().length} tasks ({sessionTodos().length} from sessions)
          </span>
          <button
            onClick={handleAddTask}
            style={{
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
        </div>
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
