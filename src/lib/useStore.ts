'use client'
import { create } from 'zustand'
import { supabase } from './supabaseClient'
import * as db from './data'
import { dayKey } from './time'
import { playNotificationSound } from './sound'
import type {
  BlockStatus,
  DailySummaryPayload,
  MissedBlock,
  NotificationRecord,
  RecoveryAction,
  Settings,
  Todo,
  TodaySnapshot,
  WeeklyAnalytics
} from './types'

export type Route = 'dashboard' | 'weekly' | 'analytics' | 'reports' | 'settings'

export interface ToastData {
  id: number
  emoji: string
  title: string
  body: string
  durationMs: number
}

function detectSystemDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyThemeClass(settings: Settings | null, systemDark: boolean): void {
  if (typeof document === 'undefined') return
  const theme = settings?.theme ?? 'system'
  const isDark = theme === 'dark' || (theme === 'system' && systemDark)
  document.documentElement.classList.toggle('dark', isDark)
}

interface StoreState {
  ready: boolean
  authed: boolean
  settings: Settings | null
  today: TodaySnapshot | null
  weekly: WeeklyAnalytics | null
  route: Route
  dailyTodos: Todo[]
  dailyBucket: string
  missed: MissedBlock[]
  showRecovery: boolean
  summary: DailySummaryPayload | null
  showSummary: boolean
  toast: ToastData | null
  systemPrefersDark: boolean

  init: () => Promise<void>
  signOut: () => Promise<void>
  setRoute: (r: Route) => void
  refreshToday: () => Promise<void>

  saveSettings: (patch: Partial<Settings>) => Promise<void>
  completeOnboarding: (patch: Partial<Settings>) => Promise<void>

  startWork: () => Promise<void>
  pauseWork: () => Promise<void>
  resumeWork: () => Promise<void>
  stopWork: () => Promise<void>

  setBlockStatus: (id: number, status: BlockStatus) => Promise<void>
  setBlockNote: (id: number, note: string) => Promise<void>

  refreshWeekly: () => Promise<void>
  refreshDailyTodos: () => Promise<void>
  addDailyTodo: (text: string, reminderMinutes?: number | null) => Promise<void>
  toggleDailyTodo: (id: number, done: boolean) => Promise<void>
  updateDailyTodo: (id: number, text: string) => Promise<void>
  setDailyTodoReminder: (id: number, reminderMinutes: number | null) => Promise<void>
  deleteDailyTodo: (id: number) => Promise<void>

  resolveMissed: (id: number, action: RecoveryAction) => Promise<void>
  resolveAllMissed: (action: RecoveryAction) => Promise<void>
  dismissRecovery: () => void
  dismissSummary: () => void

  pushToast: (t: Omit<ToastData, 'id'>) => void
  dismissToast: () => void

  notify: (
    type: NotificationRecord['type'],
    title: string,
    body: string,
    opts?: { emoji?: string; sound?: boolean }
  ) => Promise<void>
  showSummaryRecap: (payload: DailySummaryPayload) => void
}

export const useStore = create<StoreState>((set, get) => ({
  ready: false,
  authed: false,
  settings: null,
  today: null,
  weekly: null,
  route: 'dashboard',
  dailyTodos: [],
  dailyBucket: dayKey(),
  missed: [],
  showRecovery: false,
  summary: null,
  showSummary: false,
  toast: null,
  systemPrefersDark: detectSystemDark(),

  init: async () => {
    const { data } = await supabase.auth.getUser()
    const userId = data.user?.id ?? null
    if (!userId) {
      set({ ready: true, authed: false })
      return
    }
    db.setUserId(userId)
    await db.reconcileDanglingSessions()

    const settings = await db.getSettings()
    if (settings.carryOverTodos) await db.carryOverIncompleteDailyTodos(dayKey())

    const bucket = dayKey()
    const [today, weekly, missed, dailyTodos] = await Promise.all([
      db.buildTodaySnapshot(),
      db.computeWeekly(),
      db.getMissedBlocks(),
      db.listTodos('daily', bucket)
    ])

    applyThemeClass(settings, get().systemPrefersDark)
    set({
      ready: true,
      authed: true,
      settings,
      today,
      weekly,
      missed,
      dailyTodos,
      dailyBucket: bucket,
      showRecovery: settings.onboarded && missed.length > 0
    })

    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', (e) => {
        set({ systemPrefersDark: e.matches })
        applyThemeClass(get().settings, e.matches)
      })
      if ('Notification' in window && Notification.permission === 'default') {
        void Notification.requestPermission()
      }
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    db.setUserId(null)
    set({ authed: false, ready: true, settings: null, today: null })
  },

  setRoute: (route) => set({ route }),

  refreshToday: async () => {
    const today = await db.buildTodaySnapshot()
    set({ today })
    if (today.day !== get().dailyBucket) {
      const dailyTodos = await db.listTodos('daily', today.day)
      set({ dailyTodos, dailyBucket: today.day })
    }
  },

  saveSettings: async (patch) => {
    const next = await db.updateSettings(patch)
    applyThemeClass(next, get().systemPrefersDark)
    const today = await db.buildTodaySnapshot()
    set({ settings: next, today })
  },

  completeOnboarding: async (patch) => {
    const next = await db.updateSettings({ ...patch, onboarded: true })
    applyThemeClass(next, get().systemPrefersDark)
    const today = await db.buildTodaySnapshot()
    set({ settings: next, today })
  },

  startWork: async () => {
    await db.startWork()
    await get().refreshToday()
  },
  pauseWork: async () => {
    await db.pauseWork()
    await get().refreshToday()
  },
  resumeWork: async () => {
    await db.resumeWork()
    await get().refreshToday()
  },
  stopWork: async () => {
    await db.stopWork()
    await get().refreshToday()
    set({ weekly: await db.computeWeekly() })
  },

  setBlockStatus: async (id, status) => {
    await db.setBlockStatus(id, status)
    await db.recomputeDailyStat(dayKey())
    await get().refreshToday()
  },
  setBlockNote: async (id, note) => {
    await db.setBlockNote(id, note)
    await db.recomputeDailyStat(dayKey())
    await get().refreshToday()
  },

  refreshWeekly: async () => set({ weekly: await db.computeWeekly() }),

  refreshDailyTodos: async () => {
    const bucket = dayKey()
    set({ dailyTodos: await db.listTodos('daily', bucket), dailyBucket: bucket })
  },
  addDailyTodo: async (text, reminderMinutes = null) => {
    set({ dailyTodos: await db.addTodo(text, 'daily', get().dailyBucket, reminderMinutes) })
  },
  toggleDailyTodo: async (id, done) => {
    set({ dailyTodos: await db.setTodoDone(id, done, 'daily', get().dailyBucket) })
  },
  updateDailyTodo: async (id, text) => {
    set({ dailyTodos: await db.updateTodoText(id, text, 'daily', get().dailyBucket) })
  },
  setDailyTodoReminder: async (id, reminderMinutes) => {
    set({ dailyTodos: await db.setTodoReminder(id, reminderMinutes, 'daily', get().dailyBucket) })
  },
  deleteDailyTodo: async (id) => {
    set({ dailyTodos: await db.deleteTodo(id, 'daily', get().dailyBucket) })
  },

  resolveMissed: async (id, action) => {
    await db.resolveMissedBlock(id, action)
    const remaining = get().missed.filter((m) => m.id !== id)
    set({ missed: remaining, showRecovery: remaining.length > 0 })
    await get().refreshToday()
  },
  resolveAllMissed: async (action) => {
    for (const m of get().missed) await db.resolveMissedBlock(m.id, action)
    set({ missed: [], showRecovery: false })
    await get().refreshToday()
  },
  dismissRecovery: () => set({ showRecovery: false, missed: [] }),
  dismissSummary: () => set({ showSummary: false }),

  pushToast: (t) => set({ toast: { ...t, id: Date.now() } }),
  dismissToast: () => set({ toast: null }),

  notify: async (type, title, body, opts) => {
    await db.recordNotification(type, title, body)
    const s = get().settings
    if (!s?.notificationsEnabled) return
    if (opts?.sound !== false) playNotificationSound(s.sound, s.volume)
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        // eslint-disable-next-line no-new
        new Notification(title, { body })
      } catch {
        /* ignore */
      }
    }
    get().pushToast({
      emoji: opts?.emoji ?? '⏱️',
      title,
      body,
      durationMs: 3000 + s.notificationExtraSeconds * 1000
    })
  },

  showSummaryRecap: (payload) => set({ summary: payload, showSummary: true, weekly: payload.weekly })
}))
