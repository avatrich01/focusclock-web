/** Domain types for the FocusClock web app. */

export type ThemePreference = 'dark' | 'light' | 'system'
export type ClockFormat = '12h' | '24h'
export type SoundName = 'bell' | 'chime' | 'beep' | 'soft'
export type MinutesOfDay = number

export interface Settings {
  onboarded: boolean
  userName: string
  workStart: MinutesOfDay
  workEnd: MinutesOfDay
  lunchStart: MinutesOfDay
  lunchEnd: MinutesOfDay
  clockFormat: ClockFormat
  theme: ThemePreference
  notificationsEnabled: boolean
  sound: SoundName
  volume: number
  dailyFocusGoal: number
  carryOverTodos: boolean
  idleAutoPause: boolean
  idleThresholdMinutes: number
  notificationExtraSeconds: number
  lockPastBlocks: boolean
}

export type BlockStatus = 'pending' | 'completed' | 'missed' | 'current' | 'worked'
export type BlockKind = 'work' | 'lunch'

export interface HourlyBlock {
  id: number
  day: string
  startMinutes: MinutesOfDay
  kind: BlockKind
  label: string
  status: BlockStatus
  note: string
  acknowledgedAt: number | null
}

export type SessionState = 'idle' | 'running' | 'paused' | 'stopped'

export interface WorkSession {
  id: number
  day: string
  startedAt: number
  endedAt: number | null
  state: SessionState
  focusMs: number
  pauseMs: number
  pauseStartedAt: number | null
  lastTickAt: number
}

export interface DailyStat {
  day: string
  workedMs: number
  focusMs: number
  breakMs: number
  blocksCompleted: number
  blocksTotal: number
  goalMet: boolean
}

export interface NotificationRecord {
  id: number
  firedAt: number
  type: 'hourly' | 'summary' | 'recovery' | 'system' | 'reminder'
  title: string
  body: string
}

export interface StreakInfo {
  current: number
  longest: number
}

export interface WeeklyAnalytics {
  days: DailyStat[]
  totalWorkedMs: number
  averageDailyMs: number
  streak: StreakInfo
}

export interface MissedBlock {
  id: number
  day: string
  startMinutes: MinutesOfDay
  label: string
}

export interface TodaySnapshot {
  day: string
  blocks: HourlyBlock[]
  session: WorkSession | null
  stat: DailyStat
  streak: StreakInfo
  currentBlockIndex: number
}

export type RecoveryAction = 'worked' | 'missed' | 'ignore'

export type TodoScope = 'daily' | 'weekly'

export interface Todo {
  id: number
  text: string
  scope: TodoScope
  bucket: string
  done: boolean
  createdAt: number
  completedAt: number | null
  position: number
  reminderMinutes: MinutesOfDay | null
}

export interface ReportTodo {
  id: number
  text: string
  scope: TodoScope
  bucket: string
  completedAt: number | null
}

export interface ActivityReport {
  fromDay: string
  toDay: string
  totalWorkedMs: number
  totalFocusMs: number
  totalBreakMs: number
  daysWorked: number
  blocksCompleted: number
  blocksTotal: number
  completedTodos: ReportTodo[]
  perDay: DailyStat[]
}

export interface LeaderboardEntry {
  userId: string
  name: string
  points: number
  focusMs: number
  tasksDone: number
  streak: number
}

export interface DailySummaryPayload {
  snapshot: TodaySnapshot
  weekly: WeeklyAnalytics
  completedTasks: { id: number; text: string }[]
  openTasks: number
  userName: string
  goalMs: number
}
