export interface Session {
  sessionId: string
  name: string
  projectName: string
  cwd: string
  gitBranch: string
  timestamp: string  // ISO 8601
  startTimestamp: string  // ISO 8601 - first message timestamp
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
  continuedFrom: string  // session_id this continues from (after /clear)
  continuedAs: string    // session_id of continuation (after /clear)
}

export interface TurnEvent {
  kind: 'text' | 'tool'
  text: string       // for kind=="text"
  toolName: string   // for kind=="tool"
  toolDetail: string // for kind=="tool"
  toolExtra: string  // for kind=="tool": extra info (e.g. bash command)
  toolInput: Record<string, unknown>  // for kind=="tool": full tool input params
}

export interface UserImage {
  mediaType: string  // e.g. "image/png"
  data: string       // base64-encoded image data
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
  images: UserImage[]
  events: TurnEvent[]
  usage: TurnUsage
  durationMs: number
  model: string
  stopReason: string
}

export interface SubagentInvocation {
  description: string
  prompt: string
  model: string
  mode: string
  runInBackground: boolean
}

export interface SessionDetail extends Session {
  toolUsage: Record<string, number>
  mcpToolUsage: Record<string, number>
  skillsUsed: string[]
  subagentsUsed: string[]
  subagentDetails: Record<string, SubagentInvocation[]>
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

// ---------------------------------------------------------------------------
// Project Insights (from /ws/insights/{sessionId})
// ---------------------------------------------------------------------------

export interface InsightsOverview {
  total_messages: number
  total_tokens: {
    input: number
    output: number
    cache_read: number
    cache_creation: number
  }
  session_count: number
  date_range: { start: string | null; end: string | null }
  message_types: Record<string, number>
}

export interface InsightsTools {
  usage_counts: Record<string, number>
  error_counts: Record<string, number>
  error_rates: Record<string, number>
}

export interface InsightsSessions {
  count: number
  average_duration_seconds: number
  average_messages: number
  sessions_with_errors: number
}

export interface DailyCostBreakdown {
  input: number
  output: number
  cache: number
}

export interface DailyStatEntry {
  messages: number
  sessions: number
  tokens: Record<string, number>
  cost: number
  cost_breakdown: DailyCostBreakdown
}

export interface HourlyTokens {
  input: number
  output: number
  cache_creation: number
  cache_read: number
}

export interface InsightsHourlyPattern {
  messages: Record<string, number>
  tokens: Record<string, HourlyTokens>
}

export interface ErrorDetail {
  timestamp: string
  session_id: string
  category: string
  text: string
}

export interface InsightsErrors {
  total: number
  error_rate: number
  by_category: Record<string, number>
  details: ErrorDetail[]
}

export interface ModelStats {
  count: number
  input_tokens: number
  output_tokens: number
  cache_creation_tokens: number
  cache_read_tokens: number
}

export interface InsightsUserInteractions {
  real_user_messages: number
  commands_requiring_tools: number
  tool_use_rate: number
  avg_tools_per_command: number
  avg_steps_per_command: number
  avg_tokens_per_command: number
  interruption_rate: number
  tool_count_distribution: Record<string, number>
  model_distribution: Record<string, number>
}

export interface InsightsCache {
  total_created: number
  total_read: number
  hit_rate: number
  efficiency: number
  tokens_saved: number
  cost_saved: number
  break_even: boolean
  roi: number
}

export interface CommandDetail {
  user_message: string
  timestamp: string
  session_id: string
  model: string
  steps: number
  tools_count: number
  tokens: number
  interrupted: boolean
  tool_names: string[]
}

export interface AdvancedToolStats {
  tool_categories: Record<string, number>
  subagent_usage: Record<string, number>
  skill_usage: Record<string, number>
  mcp_server_usage: Record<string, Record<string, number>>
  automation_score: number
  search_edit_ratio: { search: number; modification: number; ratio: number }
  cost_per_command: number
  total_tool_calls: number
}

export interface ProjectInsights {
  overview: InsightsOverview
  tools: InsightsTools
  sessions: InsightsSessions
  daily_stats: Record<string, DailyStatEntry>
  hourly_pattern: InsightsHourlyPattern
  errors: InsightsErrors
  models: Record<string, ModelStats>
  user_interactions: InsightsUserInteractions
  cache: InsightsCache
  command_details: CommandDetail[]
  advanced_tools: AdvancedToolStats
}
