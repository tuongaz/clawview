export interface Session {
  sessionId: string
  name: string
  projectName: string
  cwd: string
  gitBranch: string
  timestamp: string  // ISO 8601
  firstPrompt: string
  lastUserPrompt: string
  lastAction: string
  isActive: boolean
  waitingForInput: boolean
  usesMemory: boolean
  version: string
  contextTokens: number
  maxContextTokens: number
  model: string
  client: string
}

export interface TurnEvent {
  kind: 'text' | 'tool'
  text: string       // for kind=="text"
  toolName: string   // for kind=="tool"
  toolDetail: string // for kind=="tool"
}

export interface TurnUsage {
  inputTokens: number
  outputTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
}

export interface Turn {
  index: number
  timestamp: string
  userPrompt: string
  events: TurnEvent[]
  usage: TurnUsage
  durationMs: number
  model: string
  stopReason: string
}

export interface SessionDetail extends Session {
  toolUsage: Record<string, number>
  mcpToolUsage: Record<string, number>
  skillsUsed: string[]
  subagentsUsed: string[]
  commandsUsed: string[]
  totalInputTokens: number
  totalOutputTokens: number
  totalCacheCreationTokens: number
  totalCacheReadTokens: number
  totalDurationMs: number
  turnCount: number
  turns: Turn[]
}

export interface MemoryFile {
  name: string
  content: string
}

export interface ProjectGroup {
  projectName: string
  path: string
  sessions: Session[]
}

export interface TokenPeriod {
  inputTokens: number
  outputTokens: number
}

export interface TokenStats {
  today: TokenPeriod
  thisWeek: TokenPeriod
  thisMonth: TokenPeriod
}
