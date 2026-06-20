import { createStore } from "solid-js/store"
import type { MemoryEntry, MemoryCategory, MemoryScope, MemoryFile } from "./types"

// ─── File system helpers ───────────────────────────────────────────
// Uses the Electron main process IPC (window.api) for file operations.
// Falls back to localStorage when running outside the desktop app (web mode).
// The Window.api type is declared in src/app.tsx.

const STORAGE_PREFIX = "anitacode.memory."

async function readTextFile(path: string): Promise<string> {
  if (window.api?.fsReadFile) return window.api.fsReadFile(path)
  // Web fallback: localStorage
  return localStorage.getItem(STORAGE_PREFIX + path) ?? ""
}

async function writeTextFile(path: string, content: string): Promise<void> {
  if (window.api?.fsWriteFile) {
    await window.api.fsWriteFile(path, content)
    return
  }
  localStorage.setItem(STORAGE_PREFIX + path, content)
}

async function listDir(path: string): Promise<string[]> {
  if (window.api?.fsListDir) return window.api.fsListDir(path)
  // Web fallback: scan localStorage keys with this prefix
  const prefix = STORAGE_PREFIX + path + "/"
  const entries: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(prefix)) {
      const rest = key.slice(prefix.length)
      const name = rest.split("/")[0]
      if (name && !entries.includes(name)) entries.push(name)
    }
  }
  return entries
}

async function fileExists(path: string): Promise<boolean> {
  if (window.api?.fsExists) return window.api.fsExists(path)
  return localStorage.getItem(STORAGE_PREFIX + path) !== null
}

async function ensureDir(dir: string): Promise<void> {
  if (window.api?.fsMkdir) {
    await window.api.fsMkdir(dir)
    return
  }
  // Web fallback: no-op (localStorage doesn't need dirs)
}

// ─── Paths ─────────────────────────────────────────────────────────

const GLOBAL_MEMORY_DIR = ".anitacode/memory"
const PROJECT_MEMORY_DIR = ".memory"

let cachedHomeDir: string | undefined

async function globalDir(): Promise<string> {
  if (window.api?.fsGetHomeDir) {
    if (!cachedHomeDir) cachedHomeDir = await window.api.fsGetHomeDir()
    return `${cachedHomeDir}/${GLOBAL_MEMORY_DIR}`
  }
  // Web fallback: use a virtual path (localStorage keys are namespaced)
  return `~/${GLOBAL_MEMORY_DIR}`
}

// ─── Categories and their file names ───────────────────────────────

const CATEGORY_FILES: Record<MemoryCategory, string> = {
  habits: "habits.md",
  errors: "errors.md",
  successes: "successes.md",
  patterns: "patterns.md",
  decisions: "decisions.md",
  progress: "progress.md",
  custom: "custom.md",
}

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  habits: "Habits & Preferences",
  errors: "Common Errors",
  successes: "Success Patterns",
  patterns: "Code Patterns",
  decisions: "Decisions",
  progress: "Progress",
  custom: "Custom Notes",
}

export function categoryLabel(cat: MemoryCategory): string {
  return CATEGORY_LABELS[cat]
}

export function categoryFile(cat: MemoryCategory): string {
  return CATEGORY_FILES[cat]
}

// ─── Service ───────────────────────────────────────────────────────

export function createMemoryService() {
  const [store, setStore] = createStore<{
    entries: MemoryEntry[]
    loaded: boolean
    selectedEntryId: string | undefined
    editingContent: string
    editingTitle: string
    activeScope: MemoryScope
    activeCategory: MemoryCategory
    activeProjectDir: string | undefined
  }>({
    entries: [],
    loaded: false,
    selectedEntryId: undefined,
    editingContent: "",
    editingTitle: "",
    activeScope: "all",
    activeCategory: "habits",
    activeProjectDir: undefined,
  })

  // ── Load memory ──────────────────────────────────────────────

  async function loadMemory(projectDir?: string) {
    setStore("loaded", false)
    const entries: MemoryEntry[] = []
    const now = Date.now()

    // Load global memory
    const globalPath = await globalDir()
    for (const cat of Object.keys(CATEGORY_FILES) as MemoryCategory[]) {
      try {
        const content = await readTextFile(`${globalPath}/${CATEGORY_FILES[cat]}`)
        if (content) {
          entries.push({
            id: `global-${cat}`,
            title: CATEGORY_LABELS[cat],
            content,
            category: cat,
            scope: "global",
            tags: ["global", cat],
            updatedAt: now,
            createdAt: now,
          })
        }
      } catch {
        // File doesn't exist yet
      }
    }

    // Load project memory
    if (projectDir) {
      for (const cat of Object.keys(CATEGORY_FILES) as MemoryCategory[]) {
        try {
          const content = await readTextFile(`${projectDir}/${PROJECT_MEMORY_DIR}/${CATEGORY_FILES[cat]}`)
          if (content) {
            entries.push({
              id: `project-${cat}`,
              title: CATEGORY_LABELS[cat],
              content,
              category: cat,
              scope: "project",
              projectDir,
              tags: ["project", cat],
              updatedAt: now,
              createdAt: now,
            })
          }
        } catch {
          // File doesn't exist yet
        }
      }
    }

    setStore("entries", entries)
    setStore("loaded", true)
  }

  // ── Select entry ─────────────────────────────────────────────

  function selectEntry(id: string | undefined) {
    setStore("selectedEntryId", id)
    if (id) {
      const entry = store.entries.find((e) => e.id === id)
      if (entry) {
        setStore("editingTitle", entry.title)
        setStore("editingContent", entry.content)
      }
    } else {
      setStore("editingTitle", "")
      setStore("editingContent", "")
    }
  }

  // ── Save entry ───────────────────────────────────────────────

  async function saveEntry(id: string) {
    const entry = store.entries.find((e) => e.id === id)
    if (!entry) return

    const content = store.editingContent
    const title = store.editingTitle
    const now = Date.now()

    // Determine which file to write
    const filename = CATEGORY_FILES[entry.category]

    if (entry.scope === "global") {
      const dir = await globalDir()
      const path = `${dir}/${filename}`
      await ensureDir(dir)
      await writeTextFile(path, content)
    } else if (entry.scope === "project" && entry.projectDir) {
      const dir = `${entry.projectDir}/${PROJECT_MEMORY_DIR}`
      const path = `${dir}/${filename}`
      await ensureDir(dir)
      await writeTextFile(path, content)
    }

    // Update local store
    setStore("entries", (e) => e.id === id, {
      title,
      content,
      updatedAt: now,
    })
    setStore("editingContent", content)
    setStore("editingTitle", title)
  }

  // ── Create new memory entry ──────────────────────────────────

  async function createEntry(category: MemoryCategory, scope: MemoryScope, projectDir?: string) {
    const now = Date.now()
    const id = `${scope}-${category}-${now}`

    // Create empty file
    const filename = CATEGORY_FILES[category]
    const content = `# ${CATEGORY_LABELS[category]}\n\n`

    if (scope === "global") {
      const dir = await globalDir()
      const path = `${dir}/${filename}`
      await ensureDir(dir)
      if (!(await fileExists(path))) {
        await writeTextFile(path, content)
      }
    } else if (scope === "project" && projectDir) {
      const dir = `${projectDir}/${PROJECT_MEMORY_DIR}`
      const path = `${dir}/${filename}`
      await ensureDir(dir)
      if (!(await fileExists(path))) {
        await writeTextFile(path, content)
      }
    }

    const newEntry: MemoryEntry = {
      id,
      title: CATEGORY_LABELS[category],
      content,
      category,
      scope,
      projectDir,
      tags: [scope, category],
      updatedAt: now,
      createdAt: now,
    }

    // Check if entry already exists for this scope+category
    const existing = store.entries.find((e) => e.scope === scope && e.category === category)
    if (!existing) {
      setStore("entries", (entries) => [...entries, newEntry])
    }

    selectEntry(id)
    return newEntry
  }

  // ── Filter entries ───────────────────────────────────────────

  function filteredEntries() {
    const scope = store.activeScope
    const category = store.activeCategory
    let result = store.entries

    if (scope !== "all") {
      result = result.filter((e) => e.scope === scope)
    }
    if (category !== "custom") {
      result = result.filter((e) => e.category === category || e.category === "custom")
    } else {
      result = result.filter((e) => e.category === "custom")
    }

    return result
  }

  function setActiveScope(scope: MemoryScope) {
    setStore("activeScope", scope)
  }

  function setActiveCategory(cat: MemoryCategory) {
    setStore("activeCategory", cat)
  }

  function setActiveProjectDir(dir: string | undefined) {
    setStore("activeProjectDir", dir)
  }

  function setEditingContent(content: string) {
    setStore("editingContent", content)
  }

  function setEditingTitle(title: string) {
    setStore("editingTitle", title)
  }

  // ── Helpers ──────────────────────────────────────────────────

  async function ensureDir(dir: string) {
    await fetch(`/api/fs/mkdir?path=${encodeURIComponent(dir)}`, { method: "POST" })
  }

  return {
    store,
    loadMemory,
    selectEntry,
    saveEntry,
    createEntry,
    filteredEntries,
    setActiveScope,
    setActiveCategory,
    setActiveProjectDir,
    setEditingContent,
    setEditingTitle,
  }
}

export type MemoryService = ReturnType<typeof createMemoryService>
