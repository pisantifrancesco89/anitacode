// Shared agent list for Kanban filters and task assignment.
// Derived from the configured agents (config().agent) with a static fallback
// so the dropdowns stay in sync and cover the full specialist set.

export const FALLBACK_AGENTS = [
  "orchestrator",
  "planner",
  "builder",
  "reviewer",
  "documenter",
  "backend-specialist",
  "frontend-specialist",
  "database-specialist",
  "security-specialist",
  "devops-specialist",
  "qa-engineer",
  "ui-specialist",
  "ai-engineer",
  "mobile-specialist",
  "payment-specialist",
  "performance-specialist",
  "integration-specialist",
  "realtime-specialist",
  "data-specialist",
  "testing-specialist",
  "auth-specialist",
] as const

/**
 * Returns the agent names available for assignment/filtering.
 * If `configuredAgents` is provided (from config().agent), those names are
 * merged with the fallback list so custom agents appear alongside the
 * built-in specialists. Duplicates are removed.
 */
export function agentNames(configuredAgents?: Record<string, unknown>): string[] {
  if (!configuredAgents) return [...FALLBACK_AGENTS]
  const configured = Object.entries(configuredAgents)
    .filter(([, cfg]) => cfg && !(cfg as { hidden?: boolean }).hidden)
    .map(([name]) => name)
  return [...new Set([...configured, ...FALLBACK_AGENTS])]
}
