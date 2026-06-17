export type MemoryScope = "project" | "global" | "all"

export type MemoryCategory =
  | "habits"
  | "errors"
  | "successes"
  | "patterns"
  | "decisions"
  | "progress"
  | "custom"

export interface MemoryEntry {
  id: string
  title: string
  content: string
  category: MemoryCategory
  scope: MemoryScope
  projectDir?: string
  tags: string[]
  updatedAt: number
  createdAt: number
}

export interface MemoryStore {
  entries: MemoryEntry[]
  loadedAt: number
}

export interface MemoryGroup {
  category: MemoryCategory
  entries: MemoryEntry[]
  count: number
}

// File-based memory structure
export interface MemoryFile {
  filename: string
  title: string
  category: MemoryCategory
  content: string
  path: string
}
