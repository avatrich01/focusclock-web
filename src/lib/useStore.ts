'use client'
import { create } from 'zustand'
import { supabase } from './supabaseClient'
import * as db from './data'
import { dayKey } from './time'
import { playNotificationSound } from './sound'
import type {
  BlockStatus,
  DailySummaryPayload,
  NotificationRecord,
  Settings,
  Todo,
  TodaySnapshot,
  WeeklyAnalytics
} from './types'

export type Route = 'dashboard' | 'weekly' | 'analytics' | 'leaderboard' | 'reports' | 'settings'

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
  userId: string | null
  settings: Settings | null
  today: TodaySnapshot | null
  weekly: WeeklyAnalytics | null
  route: Route
  dailyTodos: Todo[]
  dailyBucket: string
  summary: DailySummaryPayload | null
  showSummary: boolean
  toast: ToastData | null
  systemPrefersDark: boolean
  /** True while the user is completing a password-reset (recovery) link. */
  recovering: boolean

  init: () => Promise<void>
  signOut: () => Promise<void>
  setRecovering: (v: boolean) => void
  setRoute: (r: Route) => void
  refreshToday: () => Promise<void>

  saveSettings: (patch: Partial<Settings>) => Promise<void>
  completeOnboarding: (patch: Partial<Settings>) => Promise<void>
  setGroupCode: (code: string) => Promise<void>

  setBlockStatus: (id: number, status: BlockStatus) => Promise<void>
  setBlockNote: (id: number, note: string) => Promise<void>

  refreshWeekly: () => Promise<void>
  refreshDailyTodos: () => Promise<void>
  addDailyTodo: (text: string, reminderMinutes?: number | null) => Promise<void>
  toggleDailyTodo: (id: number, done: boolean) => Promise<void>
  updateDailyTodo: (id: number, text: string) => Promise<void>
  setDailyTodoReminder: (id: number, reminderMinutes: number | null) => Promise<void>
  deleteDailyTodo: (id: number) => Promise<void>

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
  userId: null,
  settings: null,
  today: null,
  weekly: null,
  route: 'dashboard',
  dailyTodos: [],
  dailyBucket: dayKey(),
  summary: null,
  showSummary: false,
  toast: null,
  systemPrefersDark: detectSystemDark(),
  recovering: false,

  setRecovering: (v) => set({ recovering: v }),

  init: async () => {
    const { data } = await supabase.auth.getUser()
    const userId = data.user?.id ?? null
    if (!userId) {
      set({ ready: true, authed: false })
      return
    }
    db.setUserId(userId)

    const settings = await db.getSettings()
    if (settings.carryOverTodos) await db.carryOverIncompleteDailyTodos(dayKey())

    const bucket = dayKey()
    const [today, weekly, dailyTodos] = await Promise.all([
      db.buildTodaySnapshot(),
      db.computeWeekly(),
      db.listTodos('daily', bucket)
    ])

    applyThemeClass(settings, get().systemPrefersDark)
    set({
      ready: true,
      authed: true,
      userId,
      settings,
      today,
      weekly,
      dailyTodos,
      dailyBucket: bucket
    })
    // Publish our score to the shared leaderboard (best-effort).
    void db.updateLeaderboardEntry().catch(() => {})

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
    set({ authed: false, ready: true, userId: null, settings: null, today: null })
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
    void db.updateLeaderboardEntry().catch(() => {})
  },

  setGroupCode: async (code) => {
    const next = await db.updateSettings({ groupCode: code })
    set({ settings: next })
    await db.updateLeaderboardEntry().catch(() => {})
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
    void db.updateLeaderboardEntry().catch(() => {})
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
