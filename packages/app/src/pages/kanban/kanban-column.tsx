import { For } from "solid-js"
import type { Task, TaskStatus } from "./types"
import { TaskCard } from "./task-card"

const COLUMN_COLORS: Record<TaskStatus, string> = {
  todo: "#6C5CE7",
  in_progress: "#FDCB6E",
  review: "#74B9FF",
  done: "#00B894",
  cancelled: "#636E72",
}

export function KanbanColumn(props: {
  id: TaskStatus
  title: string
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onDrop: (taskId: string, newStatus: TaskStatus) => void
}) {
  const color = COLUMN_COLORS[props.id]

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const taskId = e.dataTransfer?.getData("text/plain")
        if (taskId) props.onDrop(taskId, props.id)
      }}
      style={{
        flex: 1,
        "min-width": "220px",
        "max-width": "320px",
        display: "flex",
        "flex-direction": "column",
        background: "rgba(255,255,255,0.02)",
        "border-radius": "12px",
        padding: "12px",
        gap: "10px",
        border: "1px solid #222",
      }}
    >
      <div
        style={{
          display: "flex",
          "align-items": "center",
          gap: "8px",
          padding: "0 4px",
        }}
      >
        <div
          style={{
            width: "10px",
            height: "10px",
            "border-radius": "50%",
            "background-color": color,
          }}
        />
        <span style={{ "font-size": "13px", "font-weight": "bold", color: "#fff" }}>{props.title}</span>
        <span
          style={{
            "font-size": "11px",
            color: "#666",
            "margin-left": "auto",
            padding: "2px 6px",
            "border-radius": "10px",
            background: "#222",
          }}
        >
          {props.tasks.length}
        </span>
      </div>

      <div style={{ display: "flex", "flex-direction": "column", gap: "8px", "overflow-y": "auto", flex: 1 }}>
        <For each={props.tasks}>
          {(task) => <TaskCard task={task} onClick={() => props.onTaskClick(task)} />}
        </For>
      </div>
    </div>
  )
}
