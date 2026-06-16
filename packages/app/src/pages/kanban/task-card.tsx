import type { Task } from "./types"

const PRIORITY_COLORS = {
  high: "#E17055",
  medium: "#FDCB6E",
  low: "#74B9FF",
}

export function TaskCard(props: { task: Task; onClick: () => void }) {
  const t = props.task

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer?.setData("text/plain", t.id)}
      onClick={props.onClick}
      style={{
        padding: "10px",
        "border-radius": "8px",
        background: "#1a1a2e",
        border: "1px solid #333",
        cursor: "grab",
        display: "flex",
        "flex-direction": "column",
        gap: "8px",
        transition: "border-color 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#6C5CE7"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#333"
      }}
    >
      <div style={{ "font-size": "13px", "font-weight": "600", color: "#fff" }}>{t.title}</div>

      <div style={{ display: "flex", "align-items": "center", gap: "6px", "font-size": "11px" }}>
        <span
          style={{
            padding: "2px 6px",
            "border-radius": "4px",
            background: `${PRIORITY_COLORS[t.priority]}22`,
            color: PRIORITY_COLORS[t.priority],
            "font-weight": "600",
          }}
        >
          {t.priority}
        </span>

        <span
          style={{
            width: "20px",
            height: "20px",
            "border-radius": "50%",
            background: "#6C5CE7",
            color: "#fff",
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            "font-size": "10px",
            "font-weight": "bold",
          }}
        >
          {t.agentName[0]?.toUpperCase() || "?"}
        </span>

        <span style={{ color: "#666" }}>{new Date(t.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  )
}
