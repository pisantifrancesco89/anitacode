import { createSignal, createMemo, For, Show, onMount, type JSX } from "solid-js"
import { createMemoryService, categoryLabel, categoryFile } from "./memory-service"
import type { MemoryCategory, MemoryScope, MemoryEntry } from "./types"

const CATEGORIES: MemoryCategory[] = ["habits", "errors", "successes", "patterns", "decisions", "progress", "custom"]
const SCOPES: { value: MemoryScope; label: string }[] = [
  { value: "all", label: "All" },
  { value: "global", label: "Global" },
  { value: "project", label: "Project" },
]

export default function MemoryPage() {
  const svc = createMemoryService()
  const store = svc.store

  // Get current project directory from URL or context
  const [projectDir, setProjectDir] = createSignal<string | undefined>()

  onMount(async () => {
    // Try to detect current project from URL
    const params = new URLSearchParams(window.location.search)
    const dir = params.get("dir") || undefined
    setProjectDir(dir)
    await svc.loadMemory(dir)
  })

  const memos = createMemo(() => svc.filteredEntries())

  const selectedEntry = createMemo(() =>
    store.selectedEntryId ? store.entries.find((e) => e.id === store.selectedEntryId) : undefined,
  )

  const handleEntryClick = (id: string) => {
    if (id === store.selectedEntryId) return
    // Save current entry before switching
    if (store.selectedEntryId) {
      svc.saveEntry(store.selectedEntryId)
    }
    svc.selectEntry(id)
  }

  const handleSave = async () => {
    if (store.selectedEntryId) {
      await svc.saveEntry(store.selectedEntryId)
    }
  }

  const handleCreate = async (cat: MemoryCategory) => {
    await svc.createEntry(cat, store.activeScope === "all" ? "global" : store.activeScope, projectDir())
  }

  const entryCount = (cat: MemoryCategory) => {
    return store.entries.filter(
      (e) => e.category === cat && (store.activeScope === "all" || e.scope === store.activeScope),
    ).length
  }

  return (
    <div style={{ display: "flex", height: "100%", "min-height": "100vh", background: "#0a0a16" }}>
      {/* ── LEFT SIDEBAR: Categories ── */}
      <aside
        style={{
          width: "200px",
          "border-right": "1px solid #222",
          padding: "16px",
          display: "flex",
          "flex-direction": "column",
          gap: "8px",
          background: "#0d0d1a",
          "flex-shrink": 0,
        }}
      >
        <h2 style={{ margin: "0 0 4px", "font-size": "14px", color: "#6C5CE7", "font-weight": 600 }}>
          Memory
        </h2>

        {/* Scope filters */}
        <div style={{ display: "flex", gap: "2px", background: "#111", "border-radius": "6px", padding: "2px" }}>
          <For each={SCOPES}>
            {(s) => (
              <button
                onClick={() => svc.setActiveScope(s.value)}
                style={{
                  flex: 1,
                  padding: "4px 8px",
                  "border-radius": "4px",
                  border: "none",
                  background: store.activeScope === s.value ? "#6C5CE7" : "transparent",
                  color: store.activeScope === s.value ? "#fff" : "#888",
                  cursor: "pointer",
                  "font-size": "11px",
                  "font-weight": 500,
                }}
              >
                {s.label}
              </button>
            )}
          </For>
        </div>

        <div style={{ height: "1px", background: "#222", margin: "4px 0" }} />

        {/* Category list */}
        <div style={{ flex: 1, overflow: "auto", display: "flex", "flex-direction": "column", gap: "2px" }}>
          <For each={CATEGORIES}>
            {(cat) => {
              const count = entryCount(cat)
              const isActive = store.activeCategory === cat
              return (
                <div
                  onClick={() => svc.setActiveCategory(cat)}
                  style={{
                    padding: "8px 10px",
                    "border-radius": "6px",
                    cursor: "pointer",
                    display: "flex",
                    "align-items": "center",
                    gap: "8px",
                    background: isActive ? "rgba(108,92,231,0.15)" : "transparent",
                    color: isActive ? "#fff" : "#999",
                    "font-size": "13px",
                  }}
                >
                  <CategoryIcon category={cat} />
                  <span style={{ flex: 1 }}>{categoryLabel(cat)}</span>
                  <span style={{ "font-size": "10px", color: "#555" }}>{count}</span>
                </div>
              )
            }}
          </For>
        </div>

        {/* Create button */}
        <button
          onClick={async () => {
            await handleCreate(store.activeCategory)
          }}
          style={{
            padding: "8px",
            "border-radius": "6px",
            border: "2px dashed #444",
            background: "transparent",
            color: "#6C5CE7",
            cursor: "pointer",
            "font-size": "12px",
            "font-weight": 600,
          }}
        >
          + New {categoryLabel(store.activeCategory)}
        </button>
      </aside>

      {/* ── MIDDLE: Entry list ── */}
      <aside
        style={{
          width: "220px",
          "border-right": "1px solid #222",
          padding: "16px",
          display: "flex",
          "flex-direction": "column",
          gap: "4px",
          background: "#0d0d1a",
          "flex-shrink": 0,
        }}
      >
        <h3 style={{ margin: "0 0 8px", "font-size": "12px", color: "#888", "text-transform": "uppercase", "letter-spacing": "0.5px" }}>
          {categoryLabel(store.activeCategory)}
        </h3>

        <Show
          when={memos().length > 0}
          fallback={
            <div style={{ padding: "16px 0", "text-align": "center", "font-size": "12px", color: "#555" }}>
              <p>No entries yet.</p>
              <p style={{ "margin-top": "8px" }}>
                Click "+ New" to create one, or use an AI agent to populate memory automatically.
              </p>
            </div>
          }
        >
          <For each={memos()}>
            {(entry) => {
              const isSelected = store.selectedEntryId === entry.id
              const preview = entry.content.slice(0, 80).replace(/[#*\n]/g, " ")
              return (
                <div
                  onClick={() => handleEntryClick(entry.id)}
                  style={{
                    padding: "8px 10px",
                    "border-radius": "6px",
                    cursor: "pointer",
                    background: isSelected ? "rgba(108,92,231,0.15)" : "transparent",
                    border: isSelected ? "1px solid rgba(108,92,231,0.3)" : "1px solid transparent",
                  }}
                >
                  <div style={{ display: "flex", "align-items": "center", gap: "4px", "margin-bottom": "2px" }}>
                    <ScopeBadge scope={entry.scope} />
                    <span style={{ "font-size": "11px", color: "#aaa", "font-weight": 500 }}>{entry.title}</span>
                  </div>
                  <div style={{ "font-size": "11px", color: "#666", "line-height": "1.4", overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap" }}>
                    {preview}...
                  </div>
                  <div style={{ "font-size": "10px", color: "#444", "margin-top": "2px" }}>
                    {new Date(entry.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              )
            }}
          </For>
        </Show>
      </aside>

      {/* ── RIGHT: Editor ── */}
      <main style={{ flex: 1, overflow: "hidden", display: "flex", "flex-direction": "column" }}>
        <Show when={selectedEntry()} fallback={
          <div
            style={{
              flex: 1,
              display: "flex",
              "align-items": "center",
              "justify-content": "center",
              color: "#555",
              "font-size": "14px",
            }}
          >
            <div style={{ "text-align": "center" }}>
              <div style={{ "font-size": "40px", "margin-bottom": "16px", opacity: 0.3 }}>📝</div>
              <p>Select a memory entry or create a new one</p>
              <p style={{ "font-size": "12px", color: "#444", "margin-top": "8px" }}>
                Memory is synced with ~/.anitacode/memory/ (global) and .memory/ (project)
              </p>
            </div>
          </div>
        }>
          <EditorContent
            entry={selectedEntry()!}
            editingTitle={store.editingTitle}
            editingContent={store.editingContent}
            onTitleChange={(v) => svc.setEditingTitle(v)}
            onContentChange={(v) => svc.setEditingContent(v)}
            onSave={() => svc.saveEntry(store.selectedEntryId!)}
          />
        </Show>
      </main>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────

// ─── Editor Content Component ──────────────────────────────────────

function EditorContent(props: {
  entry: MemoryEntry
  editingTitle: string
  editingContent: string
  onTitleChange: (v: string) => void
  onContentChange: (v: string) => void
  onSave: () => void
}): JSX.Element {
  return (
    <>
      {/* Toolbar */}
      <div
        style={{
          padding: "8px 16px",
          display: "flex",
          "align-items": "center",
          gap: "8px",
          background: "#0d0d1a",
          "border-bottom": "1px solid #222",
          "flex-shrink": 0,
        }}
      >
        <ScopeBadge scope={props.entry.scope} />
        <input
          type="text"
          value={props.editingTitle}
          onInput={(e) => props.onTitleChange(e.currentTarget.value)}
          style={{
            flex: 1,
            padding: "4px 8px",
            border: "1px solid transparent",
            "border-radius": "4px",
            background: "transparent",
            color: "#fff",
            "font-size": "14px",
            "font-weight": 600,
            outline: "none",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#444" }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "transparent" }}
        />
        <button
          onClick={props.onSave}
          style={{
            padding: "6px 16px",
            "border-radius": "6px",
            border: "none",
            background: "#6C5CE7",
            color: "#fff",
            cursor: "pointer",
            "font-size": "12px",
            "font-weight": 600,
          }}
        >
          Save
        </button>
      </div>

      {/* Editor textarea */}
      <div style={{ flex: 1, padding: "16px", overflow: "auto" }}>
        <textarea
          value={props.editingContent}
          onInput={(e) => props.onContentChange(e.currentTarget.value)}
          style={{
            width: "100%",
            height: "100%",
            padding: "12px",
            border: "1px solid #333",
            "border-radius": "8px",
            background: "#111",
            color: "#ccc",
            "font-size": "13px",
            "font-family": "'SF Mono', 'Fira Code', monospace",
            "line-height": "1.6",
            resize: "none",
            outline: "none",
            "box-sizing": "border-box",
            "white-space": "pre-wrap",
          }}
        />
      </div>
    </>
  )
}

function CategoryIcon(props: { category: MemoryCategory }) {
  const icons: Record<MemoryCategory, string> = {
    habits: "⚡",
    errors: "⚠️",
    successes: "✅",
    patterns: "📐",
    decisions: "📋",
    progress: "📊",
    custom: "📝",
  }
  return <span style={{ "font-size": "14px", "line-height": 1 }}>{icons[props.category]}</span>
}

function ScopeBadge(props: { scope: "project" | "global" | "all" }) {
  const colors: Record<string, string> = {
    global: "#6C5CE7",
    project: "#00B894",
  }
  if (props.scope === "all") return null
  return (
    <span
      style={{
        padding: "1px 6px",
        "border-radius": "3px",
        "font-size": "9px",
        "font-weight": 600,
        background: colors[props.scope] + "22",
        color: colors[props.scope],
        border: "1px solid " + colors[props.scope] + "44",
      }}
    >
      {props.scope}
    </span>
  )
}
