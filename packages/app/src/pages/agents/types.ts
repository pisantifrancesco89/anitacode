export interface AgentForm {
  name: string
  description: string
  mode: "subagent" | "primary" | "all"
  model: string
  temperature: number
  topP: number
  maxSteps: number
  color: string
  hidden: boolean
  disabled: boolean
  permission: {
    edit: "ask" | "allow" | "deny"
    bash: "ask" | "allow" | "deny"
    webfetch: "ask" | "allow" | "deny"
    doomLoop: "ask" | "allow" | "deny"
    externalDirectory: "ask" | "allow" | "deny"
  }
  tools: Record<string, boolean>
  prompt: string
}

export interface ProviderInfo {
  id: string
  name: string
  models: Array<{ id: string; name: string }>
}

export interface AgentNode {
  name: string
  description: string
  mode: "subagent" | "primary" | "all"
  color: string
  children: AgentNode[]
}
