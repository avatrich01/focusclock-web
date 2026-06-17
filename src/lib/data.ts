/**
 * Data + engine layer. Replaces the Electron main process: all Supabase access
 * plus the tracking / analytics / recovery / report logic, run client-side.
 * Row Level Security scopes every query to the signed-in user.
 */
import { supabase } from './supabaseClient'
import { addDays, dayKey, isPreviousDay, minutesOfDay, startOfWeek } from './time'
import { breakLabelAt, breakMinutesElapsed, workMinutesElapsed } from './schedule'
import type {
  ActivityReport,
  BlockKind,
  BlockStatus,
  DailyStat,
  HourlyBlock,
  MinutesOfDay,
  MissedBlock,
  NotificationRecord,
  RecoveryAction,
  ReportTodo,
  SessionState,
  Settings,
  StreakInfo,
  TodaySnapshot,
  Todo,
  TodoScope,
  WeeklyAnalytics,
  WorkSession
} from './types'

let uid: string | null = null
export function setUserId(id: string | null): void {
  uid = id
}
function requireUid(): string {
  if (!uid) throw new Error('Not authenticated')
  return uid
}

// ─────────────────────────────── settings ───────────────────────────────────
const DEFAULT_SETTINGS = (): Omit<Settings, never> => ({
  onboarded: false,
  userName: '',
  workStart: 480,
  workEnd: 1020,
  lunchStart: 720,
  lunchEnd: 780,
  dinnerStart: 0,
  dinnerEnd: 0,
  breakStart: 0,
  breakEnd: 0,
  startDay: '',
  clockFormat: '12h',
  theme: 'system',
  notificationsEnabled: true,
  sound: 'chime',
  volume: 0.7,
  dailyFocusGoal: 360,
  carryOverTodos: true,
  idleAutoPause: true,
  idleThresholdMinutes: 5,
  notificationExtraSeconds: 10,
  lockPastBlocks: false,
  groupCode: '',
  linkUrl: ''
})

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToSettings(r: any): Settings {
  return {
    onboarded: !!r.onboarded,
    userName: r.user_name ?? '',
    workStart: r.work_start,
    workEnd: r.work_end,
    lunchStart: r.lunch_start,
    lunchEnd: r.lunch_end,
    dinnerStart: r.dinner_start ?? 0,
    dinnerEnd: r.dinner_end ?? 0,
    breakStart: r.break_start ?? 0,
    breakEnd: r.break_end ?? 0,
    startDay: r.start_day ?? '',
    clockFormat: r.clock_format === '24h' ? '24h' : '12h',
    theme: ['dark', 'light', 'system'].includes(r.theme) ? r.theme : 'system',
    notificationsEnabled: !!r.notifications_enabled,
    sound: ['bell', 'chime', 'beep', 'soft'].includes(r.sound) ? r.sound : 'chime',
    volume: r.volume ?? 0.7,
    dailyFocusGoal: r.daily_focus_goal ?? 360,
    carryOverTodos: !!r.carry_over_todos,
    idleAutoPause: !!r.idle_auto_pause,
    idleThresholdMinutes: r.idle_threshold_minutes ?? 5,
    notificationExtraSeconds: r.notification_extra_seconds ?? 10,
    lockPastBlocks: !!r.lock_past_blocks,
    groupCode: r.group_code ?? '',
    linkUrl: r.link_url ?? ''
  }
}

function settingsToRow(s: Settings): Record<string, unknown> {
  return {
    user_id: requireUid(),
    onboarded: s.onboarded,
    user_name: s.userName,
    work_start: s.workStart,
    work_end: s.workEnd,
    lunch_start: s.lunchStart,
    lunch_end: s.lunchEnd,
    dinner_start: s.dinnerStart,
    dinner_end: s.dinnerEnd,
    break_start: s.breakStart,
    break_end: s.breakEnd,
    start_day: s.startDay,
    clock_format: s.clockFormat,
    theme: s.theme,
    notifications_enabled: s.notificationsEnabled,
    sound: s.sound,
    volume: s.volume,
    daily_focus_goal: s.dailyFocusGoal,
    carry_over_todos: s.carryOverTodos,
    idle_auto_pause: s.idleAutoPause,
    idle_threshold_minutes: s.idleThresholdMinutes,
    notification_extra_seconds: s.notificationExtraSeconds,
    lock_past_blocks: s.lockPastBlocks,
    group_code: s.groupCode,
    link_url: s.linkUrl,
    updated_at: new Date().toISOString()
  }
}

export async function getSettings(): Promise<Settings> {
  const { data } = await supabase.from('settings').select('*').eq('user_id', requireUid()).maybeSingle()
  if (data) return rowToSettings(data)
  const fresh = DEFAULT_SETTINGS()
  await supabase.from('settings').upsert(settingsToRow(fresh), { onConflict: 'user_id' })
  return fresh
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings()
  const next: Settings = { ...current, ...patch }
  await supabase.from('settings').upsert(settingsToRow(next), { onConflict: 'user_id' })
  return next
}

// ─────────────────────────────── blocks ─────────────────────────────────────
function rowToBlock(r: any): HourlyBlock {
  return {
    id: r.id,
    day: r.day,
    startMinutes: r.start_minutes,
    kind: r.kind === 'lunch' ? 'lunch' : 'work',
    label: r.label,
    status: r.status as BlockStatus,
    note: r.note,
    acknowledgedAt: r.acknowledged_at
  }
}

export function computeBlockPlan(
  s: Settings
): { startMinutes: MinutesOfDay; kind: BlockKind; label: string }[] {
  const blocks: { startMinutes: MinutesOfDay; kind: BlockKind; label: string }[] = []
  let t = Math.floor(s.workStart / 60) * 60
  if (t < s.workStart) t = s.workStart
  for (let m = t; m <= s.workEnd; m += 60) {
    const label = breakLabelAt(s, m)
    blocks.push({ startMinutes: m, kind: label ? 'lunch' : 'work', label })
  }
  return blocks
}

export async function getBlocksForDay(day: string): Promise<HourlyBlock[]> {
  const { data } = await supabase
    .from('hourly_blocks')
    .select('*')
    .eq('user_id', requireUid())
    .eq('day', day)
    .order('start_minutes', { ascending: true })
  return (data ?? []).map(rowToBlock)
}

export async function ensureBlocksForDay(day: string, s: Settings): Promise<HourlyBlock[]> {
  const plan = computeBlockPlan(s)
  const existing = await getBlocksForDay(day)
  const byStart = new Map(existing.map((b) => [b.startMinutes, b]))
  const toInsert = plan
    .filter((p) => !byStart.has(p.startMinutes))
    .map((p) => ({
      user_id: requireUid(),
      day,
      start_minutes: p.startMinutes,
      kind: p.kind,
      label: p.label,
      status: 'pending',
      note: ''
    }))
  if (toInsert.length) await supabase.from('hourly_blocks').insert(toInsert)
  for (const p of plan) {
    const row = byStart.get(p.startMinutes)
    if (row && (row.kind !== p.kind || (p.label && row.label !== p.label))) {
      await supabase
        .from('hourly_blocks')
        .update({ kind: p.kind, label: p.label || row.label })
        .eq('id', row.id)
    }
  }
  return getBlocksForDay(day)
}

export async function setBlockStatus(id: number, status: BlockStatus): Promise<void> {
  const ack = status === 'completed' || status === 'missed' ? Date.now() : null
  await supabase.from('hourly_blocks').update({ status, acknowledged_at: ack }).eq('id', id)
}

export async function setBlockNote(id: number, note: string): Promise<void> {
  await supabase.from('hourly_blocks').update({ note }).eq('id', id)
  const { data } = await supabase.from('hourly_blocks').select('*').eq('id', id).maybeSingle()
  if (data && note.trim() && data.status === 'worked') {
    await setBlockStatus(id, 'completed')
  }
}

// ─────────────────────────────── sessions ───────────────────────────────────
function rowToSession(r: any): WorkSession {
  return {
    id: r.id,
    day: r.day,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    state: r.state as SessionState,
    focusMs: r.focus_ms,
    pauseMs: r.pause_ms,
    pauseStartedAt: r.pause_started_at,
    lastTickAt: r.last_tick_at
  }
}

async function getActiveSession(day: string): Promise<WorkSession | null> {
  const { data } = await supabase
    .from('work_sessions')
    .select('*')
    .eq('user_id', requireUid())
    .eq('day', day)
    .in('state', ['running', 'paused'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ? rowToSession(data) : null
}

async function getLatestSession(day: string): Promise<WorkSession | null> {
  const { data } = await supabase
    .from('work_sessions')
    .select('*')
    .eq('user_id', requireUid())
    .eq('day', day)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ? rowToSession(data) : null
}

async function saveSession(s: WorkSession): Promise<void> {
  await supabase
    .from('work_sessions')
    .update({
      ended_at: s.endedAt,
      state: s.state,
      focus_ms: s.focusMs,
      pause_ms: s.pauseMs,
      pause_started_at: s.pauseStartedAt,
      last_tick_at: s.lastTickAt
    })
    .eq('id', s.id)
}

async function sumForDay(day: string, col: 'focus_ms' | 'pause_ms'): Promise<number> {
  const { data } = await supabase
    .from('work_sessions')
    .select(col)
    .eq('user_id', requireUid())
    .eq('day', day)
  return (data ?? []).reduce((sum: number, r: any) => sum + (r[col] ?? 0), 0)
}

function accrue(session: WorkSession, now: number): WorkSession {
  const elapsed = Math.max(0, now - session.lastTickAt)
  if (session.state === 'running') session.focusMs += elapsed
  else if (session.state === 'paused') session.pauseMs += elapsed
  session.lastTickAt = now
  return session
}

export async function markCurrentBlockWorked(s?: Settings): Promise<void> {
  const settings = s ?? (await getSettings())
  const day = dayKey()
  await ensureBlocksForDay(day, settings)
  const m = minutesOfDay()
  const blocks = await getBlocksForDay(day)
  const block = blocks.find((b) => b.kind === 'work' && m >= b.startMinutes && m < b.startMinutes + 60)
  if (!block) return
  if (block.note.trim()) {
    if (block.status !== 'completed') await setBlockStatus(block.id, 'completed')
  } else if (block.status === 'pending') {
    await setBlockStatus(block.id, 'worked')
  }
}

export async function startWork(): Promise<void> {
  const day = dayKey()
  const now = Date.now()
  const existing = await getActiveSession(day)
  if (existing) {
    accrue(existing, now)
    existing.state = 'running'
    existing.pauseStartedAt = null
    await saveSession(existing)
  } else {
    await supabase.from('work_sessions').insert({
      user_id: requireUid(),
      day,
      started_at: now,
      state: 'running',
      focus_ms: 0,
      pause_ms: 0,
      last_tick_at: now
    })
  }
  await markCurrentBlockWorked()
}

export async function pauseWork(): Promise<void> {
  const session = await getActiveSession(dayKey())
  if (!session || session.state !== 'running') return
  accrue(session, Date.now())
  session.state = 'paused'
  session.pauseStartedAt = Date.now()
  await saveSession(session)
}

export async function resumeWork(): Promise<void> {
  const session = await getActiveSession(dayKey())
  if (!session || session.state !== 'paused') return
  accrue(session, Date.now())
  session.state = 'running'
  session.pauseStartedAt = null
  await saveSession(session)
  await markCurrentBlockWorked()
}

export async function stopWork(): Promise<void> {
  const day = dayKey()
  const session = await getActiveSession(day)
  if (!session) return
  accrue(session, Date.now())
  session.state = 'stopped'
  session.endedAt = Date.now()
  session.pauseStartedAt = null
  await saveSession(session)
  await recomputeDailyStat(day)
}

/** Settle an active session up to now; discards offline gaps > 2 min. */
export async function tickActiveSession(): Promise<WorkSession | null> {
  const day = dayKey()
  const session = await getActiveSession(day)
  if (!session) return null
  const now = Date.now()
  if (now - session.lastTickAt > 2 * 60 * 1000) {
    // Browser was closed / asleep — don't credit the gap.
    session.lastTickAt = now
  } else {
    accrue(session, now)
  }
  await saveSession(session)
  return session
}

// ─────────────────────────────── stats ──────────────────────────────────────
function rowToStat(r: any): DailyStat {
  return {
    day: r.day,
    workedMs: r.worked_ms,
    focusMs: r.focus_ms,
    breakMs: r.break_ms,
    blocksCompleted: r.blocks_completed,
    blocksTotal: r.blocks_total,
    goalMet: !!r.goal_met
  }
}
const EMPTY_STAT = (day: string): DailyStat => ({
  day,
  workedMs: 0,
  focusMs: 0,
  breakMs: 0,
  blocksCompleted: 0,
  blocksTotal: 0,
  goalMet: false
})

/** Effective "now" minutes for a day. Past days count full; today only counts
 * once the user has started their day (start_day === today), else 0. */
function effectiveMinutes(settings: Settings, day: string): number {
  const today = dayKey()
  if (day < today) return settings.workEnd
  if (day > today) return settings.workStart
  if (settings.startDay !== today) return settings.workStart
  return minutesOfDay()
}

/**
 * Auto-progress today's hour blocks based on the clock: once an hour has fully
 * passed it becomes "done" (if it carried a task) or "worked" (a quiet dot).
 */
async function progressBlocks(day: string, settings: Settings): Promise<void> {
  if (day !== dayKey()) return
  const nowM = minutesOfDay()
  const blocks = await getBlocksForDay(day)
  for (const b of blocks) {
    if (b.kind === 'work' && b.status === 'pending' && b.startMinutes + 60 <= nowM) {
      await setBlockStatus(b.id, b.note.trim() ? 'completed' : 'worked')
    }
  }
}

export async function recomputeDailyStat(day: string, s?: Settings): Promise<DailyStat> {
  const settings = s ?? (await getSettings())
  await ensureBlocksForDay(day, settings)
  await progressBlocks(day, settings)
  const blocks = await getBlocksForDay(day)
  // Hours auto-count from the schedule — no manual sessions.
  const eff = effectiveMinutes(settings, day)
  const focusMs = workMinutesElapsed(settings, eff) * 60000
  const breakMs = breakMinutesElapsed(settings, eff) * 60000
  const work = blocks.filter((b) => b.kind === 'work')
  const completed = work.filter((b) => b.status === 'completed').length
  const planned = work.filter((b) => b.note.trim() !== '' || b.status === 'completed').length
  const goalMs = (settings.dailyFocusGoal || 60) * 60 * 1000
  const stat: DailyStat = {
    day,
    workedMs: focusMs,
    focusMs,
    breakMs,
    blocksCompleted: completed,
    blocksTotal: planned,
    goalMet: focusMs >= goalMs
  }
  await supabase.from('daily_stats').upsert(
    {
      user_id: requireUid(),
      day: stat.day,
      worked_ms: stat.workedMs,
      focus_ms: stat.focusMs,
      break_ms: stat.breakMs,
      blocks_completed: stat.blocksCompleted,
      blocks_total: stat.blocksTotal,
      goal_met: stat.goalMet
    },
    { onConflict: 'user_id,day' }
  )
  return stat
}

async function getStatsInRange(from: string, to: string): Promise<DailyStat[]> {
  const { data } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('user_id', requireUid())
    .gte('day', from)
    .lte('day', to)
    .order('day', { ascending: true })
  return (data ?? []).map(rowToStat)
}

async function computeStreak(): Promise<StreakInfo> {
  const { data } = await supabase
    .from('daily_stats')
    .select('day')
    .eq('user_id', requireUid())
    .eq('goal_met', true)
    .order('day', { ascending: true })
  const days = (data ?? []).map((r: any) => r.day as string)
  if (days.length === 0) return { current: 0, longest: 0 }
  let longest = 1
  let run = 1
  for (let i = 1; i < days.length; i++) {
    run = isPreviousDay(days[i - 1], days[i]) ? run + 1 : 1
    if (run > longest) longest = run
  }
  const set = new Set(days)
  const today = dayKey()
  let current = 0
  let cursor = today
  if (!set.has(cursor)) {
    cursor = addDays(today, -1)
    if (!set.has(cursor)) return { current: 0, longest }
  }
  while (set.has(cursor)) {
    current += 1
    cursor = addDays(cursor, -1)
  }
  return { current, longest }
}

export async function computeWeekly(anchorDay: string = dayKey()): Promise<WeeklyAnalytics> {
  const monday = startOfWeek(anchorDay)
  const sunday = addDays(monday, 6)
  const stored = await getStatsInRange(monday, sunday)
  const byDay = new Map(stored.map((s) => [s.day, s]))
  const days: DailyStat[] = []
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i)
    days.push(byDay.get(d) ?? EMPTY_STAT(d))
  }
  const totalWorkedMs = days.reduce((sum, d) => sum + d.workedMs, 0)
  const workedDays = days.filter((d) => d.workedMs > 0).length
  return {
    days,
    totalWorkedMs,
    averageDailyMs: workedDays > 0 ? Math.round(totalWorkedMs / workedDays) : 0,
    streak: await computeStreak()
  }
}

// ─────────────────────────────── snapshot ───────────────────────────────────
export async function buildTodaySnapshot(): Promise<TodaySnapshot> {
  const day = dayKey()
  const settings = await getSettings()
  const stat = await recomputeDailyStat(day, settings)
  const blocks = await getBlocksForDay(day)
  const nowM = minutesOfDay()
  let currentBlockIndex = -1
  for (let i = 0; i < blocks.length; i++) {
    if (nowM >= blocks[i].startMinutes && nowM < blocks[i].startMinutes + 60) {
      currentBlockIndex = i
      break
    }
  }
  const streak = await computeStreak()
  return { day, blocks, session: null, stat, streak, currentBlockIndex }
}

export async function reconcileDanglingSessions(): Promise<void> {
  const today = dayKey()
  const now = Date.now()
  const { data } = await supabase
    .from('work_sessions')
    .select('*')
    .eq('user_id', requireUid())
    .in('state', ['running', 'paused'])
  for (const row of data ?? []) {
    const session = rowToSession(row)
    if (session.day !== today) {
      session.state = 'stopped'
      session.endedAt = session.lastTickAt
      session.pauseStartedAt = null
      await saveSession(session)
      await recomputeDailyStat(session.day)
    } else {
      session.lastTickAt = now
      await saveSession(session)
    }
  }
}

// ─────────────────────────────── recovery ───────────────────────────────────
export async function getMissedBlocks(): Promise<MissedBlock[]> {
  const settings = await getSettings()
  const day = dayKey()
  await ensureBlocksForDay(day, settings)
  const nowM = minutesOfDay()
  const blocks = await getBlocksForDay(day)
  return blocks
    .filter((b) => b.kind === 'work' && b.status === 'pending' && b.startMinutes + 60 <= nowM)
    .map((b) => ({ id: b.id, day: b.day, startMinutes: b.startMinutes, label: b.label }))
}

export async function resolveMissedBlock(id: number, action: RecoveryAction): Promise<void> {
  if (action === 'worked') await setBlockStatus(id, 'completed')
  else if (action === 'missed') await setBlockStatus(id, 'missed')
  await recomputeDailyStat(dayKey())
}

// ─────────────────────────────── todos ──────────────────────────────────────
function rowToTodo(r: any): Todo {
  return {
    id: r.id,
    text: r.text,
    scope: r.scope === 'weekly' ? 'weekly' : 'daily',
    bucket: r.bucket,
    done: !!r.done,
    createdAt: r.created_at,
    completedAt: r.completed_at,
    position: r.position,
    reminderMinutes: r.reminder_minutes
  }
}

export async function listTodos(scope: TodoScope, bucket: string): Promise<Todo[]> {
  const { data } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', requireUid())
    .eq('scope', scope)
    .eq('bucket', bucket)
    .order('done', { ascending: true })
    .order('position', { ascending: true })
    .order('id', { ascending: true })
  return (data ?? []).map(rowToTodo)
}

export async function addTodo(
  text: string,
  scope: TodoScope,
  bucket: string,
  reminderMinutes: number | null = null
): Promise<Todo[]> {
  if (text.trim()) {
    const existing = await listTodos(scope, bucket)
    const pos = existing.reduce((max, t) => Math.max(max, t.position), 0) + 1
    await supabase.from('todos').insert({
      user_id: requireUid(),
      text: text.trim(),
      scope,
      bucket,
      done: false,
      created_at: Date.now(),
      position: pos,
      reminder_minutes: reminderMinutes
    })
  }
  return listTodos(scope, bucket)
}

export async function setTodoDone(
  id: number,
  done: boolean,
  scope: TodoScope,
  bucket: string
): Promise<Todo[]> {
  await supabase
    .from('todos')
    .update({ done, completed_at: done ? Date.now() : null })
    .eq('id', id)
  return listTodos(scope, bucket)
}

export async function updateTodoText(
  id: number,
  text: string,
  scope: TodoScope,
  bucket: string
): Promise<Todo[]> {
  if (text.trim()) await supabase.from('todos').update({ text: text.trim() }).eq('id', id)
  else await supabase.from('todos').delete().eq('id', id)
  return listTodos(scope, bucket)
}

export async function setTodoReminder(
  id: number,
  reminderMinutes: number | null,
  scope: TodoScope,
  bucket: string
): Promise<Todo[]> {
  await supabase
    .from('todos')
    .update({ reminder_minutes: reminderMinutes, reminder_fired: false })
    .eq('id', id)
  return listTodos(scope, bucket)
}

export async function deleteTodo(id: number, scope: TodoScope, bucket: string): Promise<Todo[]> {
  await supabase.from('todos').delete().eq('id', id)
  return listTodos(scope, bucket)
}

export async function carryOverIncompleteDailyTodos(today: string): Promise<void> {
  await supabase
    .from('todos')
    .update({ bucket: today, reminder_fired: false })
    .eq('user_id', requireUid())
    .eq('scope', 'daily')
    .eq('done', false)
    .lt('bucket', today)
}

export async function getDueReminders(day: string, minutes: number): Promise<Todo[]> {
  const { data } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', requireUid())
    .eq('scope', 'daily')
    .eq('bucket', day)
    .eq('done', false)
    .eq('reminder_fired', false)
    .eq('reminder_minutes', minutes)
  return (data ?? []).map(rowToTodo)
}

export async function markReminderFired(id: number): Promise<void> {
  await supabase.from('todos').update({ reminder_fired: true }).eq('id', id)
}

export async function countOpenDailyTodos(day: string): Promise<number> {
  const { count } = await supabase
    .from('todos')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', requireUid())
    .eq('scope', 'daily')
    .eq('bucket', day)
    .eq('done', false)
  return count ?? 0
}

async function completedDailyTodos(day: string): Promise<{ id: number; text: string }[]> {
  const { data } = await supabase
    .from('todos')
    .select('id, text')
    .eq('user_id', requireUid())
    .eq('scope', 'daily')
    .eq('bucket', day)
    .eq('done', true)
    .order('completed_at', { ascending: true })
  return (data ?? []).map((r: any) => ({ id: r.id, text: r.text }))
}

async function completedTodosBetween(fromMs: number, toMs: number): Promise<ReportTodo[]> {
  const { data } = await supabase
    .from('todos')
    .select('id, text, scope, bucket, completed_at')
    .eq('user_id', requireUid())
    .eq('done', true)
    .gte('completed_at', fromMs)
    .lte('completed_at', toMs)
    .order('completed_at', { ascending: true })
  return (data ?? []).map((r: any) => ({
    id: r.id,
    text: r.text,
    scope: r.scope === 'weekly' ? 'weekly' : 'daily',
    bucket: r.bucket,
    completedAt: r.completed_at
  }))
}

// ─────────────────────────────── notifications ──────────────────────────────
export async function recordNotification(
  type: NotificationRecord['type'],
  title: string,
  body: string
): Promise<void> {
  await supabase
    .from('notifications')
    .insert({ user_id: requireUid(), fired_at: Date.now(), type, title, body })
}

export async function summaryFiredToday(day: string): Promise<boolean> {
  const since = new Date(`${day}T00:00:00`).getTime()
  const { data } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', requireUid())
    .eq('type', 'summary')
    .gte('fired_at', since)
    .limit(1)
  return (data ?? []).length > 0
}

// ─────────────────────────────── reports ────────────────────────────────────
export async function buildReport(fromDay: string, toDay: string): Promise<ActivityReport> {
  const [from, to] = fromDay <= toDay ? [fromDay, toDay] : [toDay, fromDay]
  const perDay = await getStatsInRange(from, to)
  const totalWorkedMs = perDay.reduce((s, d) => s + d.workedMs, 0)
  const totalFocusMs = perDay.reduce((s, d) => s + d.focusMs, 0)
  const totalBreakMs = perDay.reduce((s, d) => s + d.breakMs, 0)
  const fromMs = new Date(`${from}T00:00:00`).getTime()
  const toMs = new Date(`${to}T23:59:59.999`).getTime()
  return {
    fromDay: from,
    toDay: to,
    totalWorkedMs,
    totalFocusMs,
    totalBreakMs,
    daysWorked: perDay.filter((d) => d.workedMs > 0).length,
    blocksCompleted: perDay.reduce((s, d) => s + d.blocksCompleted, 0),
    blocksTotal: perDay.reduce((s, d) => s + d.blocksTotal, 0),
    completedTodos: await completedTodosBetween(fromMs, toMs),
    perDay
  }
}

// Used by the scheduler to assemble the end-of-day recap payload.
export { completedDailyTodos }

// ─────────────────────────────── leaderboard ────────────────────────────────
import type { LeaderboardEntry } from './types'

/** Publish this user's current score to the shared leaderboard. */
export async function updateLeaderboardEntry(): Promise<void> {
  const settings = await getSettings()
  if (!settings.onboarded) return
  const weekly = await computeWeekly()
  const monday = startOfWeek(dayKey())
  const fromMs = new Date(`${monday}T00:00:00`).getTime()
  const tasksDone = (await completedTodosBetween(fromMs, Date.now())).length
  const focusMs = weekly.totalWorkedMs
  const streak = weekly.streak.current
  // Hours where you actually completed a task (utilised, breaks excluded) are
  // weighted highest — clock time alone counts little.
  const taskHours = weekly.days.reduce((sum, d) => sum + d.blocksCompleted, 0)
  const points =
    taskHours * 20 + tasksDone * 5 + Math.round(focusMs / 3_600_000) * 5 + streak * 15
  await supabase.from('leaderboard').upsert(
    {
      user_id: requireUid(),
      name: settings.userName.trim() || 'Anonymous',
      points,
      focus_ms: focusMs,
      tasks_done: tasksDone,
      streak,
      group_code: settings.groupCode || '',
      link_url: settings.linkUrl || '',
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id' }
  )
}

export async function getLeaderboard(groupCode?: string): Promise<LeaderboardEntry[]> {
  let q = supabase
    .from('leaderboard')
    .select('*')
    .order('points', { ascending: false })
    .order('focus_ms', { ascending: false })
    .limit(200)
  if (groupCode) q = q.eq('group_code', groupCode)
  const { data } = await q
  return (data ?? []).map((r: any) => ({
    userId: r.user_id,
    name: r.name,
    points: r.points,
    focusMs: r.focus_ms,
    tasksDone: r.tasks_done,
    streak: r.streak,
    groupCode: r.group_code ?? '',
    linkUrl: r.link_url ?? ''
  }))
}
