export interface Session {
  sessionId: string
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
}

export interface ProjectGroup {
  projectName: string
  path: string
  sessions: Session[]
}
