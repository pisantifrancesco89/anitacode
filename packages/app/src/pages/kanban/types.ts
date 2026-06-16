export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "cancelled"

export type TaskPriority = "high" | "medium" | "low"

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  agentName: string
  projectName: string
  sessionId: string
  createdAt: number
  updatedAt: number
}

export interface KanbanColumn {
  id: TaskStatus
  title: string
  tasks: Task[]
}

export const COLUMNS: Array<{ id: TaskStatus; title: string }> = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
  { id: "cancelled", title: "Cancelled" },
]
