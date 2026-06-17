'use client'
/**
 * Lightweight client heartbeat. Hours auto-count from the schedule (no sessions
 * to tick), so this only handles minute-boundary work: hourly nudges, to-do
 * reminders, the end-of-day recap, carry-over, and an occasional snapshot
 * refresh to keep blocks/stats current.
 */
import { useEffect, useRef } from 'react'
import { useStore } from './useStore'
import * as db from './data'
import { dayKey, formatClock, minutesOfDay } from './time'
import type { DailySummaryPayload } from './types'

function fmt(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function useScheduler(): void {
  const busy = useRef(false)
  const lastMinuteKey = useRef('')
  const lastRefreshAt = useRef(0)

  useEffect(() => {
    lastMinuteKey.current = `${dayKey()}:${minutesOfDay()}`

    const tick = async (): Promise<void> => {
      const store = useStore.getState()
      if (!store.authed || busy.current) return
      busy.current = true
      try {
        const day = dayKey()
        const minutes = minutesOfDay()
        const key = `${day}:${minutes}`
        if (key !== lastMinuteKey.current) {
          const prevDay = lastMinuteKey.current.split(':')[0]
          lastMinuteKey.current = key
          await onMinuteChanged(day, minutes, prevDay)
        }
        // Periodic refresh keeps blocks + persisted stats current (snappy: 20s).
        const now = Date.now()
        if (now - lastRefreshAt.current >= 20000) {
          lastRefreshAt.current = now
          await store.refreshToday()
        }
      } catch {
        /* keep ticking even if a query fails */
      } finally {
        busy.current = false
      }
    }

    const onMinuteChanged = async (day: string, minutes: number, prevDay: string): Promise<void> => {
      const store = useStore.getState()
      const s = store.settings
      if (!s) return

      if (prevDay && prevDay !== day && s.carryOverTodos) {
        await db.carryOverIncompleteDailyTodos(day)
      }

      // Hourly nudge at the top of each work hour.
      const blocks = await db.getBlocksForDay(day)
      const starting = blocks.find((b) => b.startMinutes === minutes)
      if (starting && starting.kind === 'work') {
        const clock = formatClock(starting.startMinutes, s.clockFormat)
        const left = await db.countOpenDailyTodos(day)
        const body = starting.label
          ? `It's ${clock} — ${starting.label} time 🍽️`
          : left > 0
            ? `It's ${clock}. ${left} task${left === 1 ? '' : 's'} left — let's get it 🔥`
            : `It's ${clock}. New hour, fresh focus ✨`
        await store.notify('hourly', 'FocusClock', body, { emoji: '⏱️' })
      }

      // To-do reminders.
      for (const todo of await db.getDueReminders(day, minutes)) {
        await db.markReminderFired(todo.id)
        await store.notify('reminder', '⏰ Reminder', todo.text, { emoji: '⏰' })
      }

      // End-of-day recap (once per day).
      if (minutes >= s.workEnd && !(await db.summaryFiredToday(day))) {
        const snapshot = await db.buildTodaySnapshot()
        const completedTasks = await db.completedDailyTodos(day)
        const openTasks = await db.countOpenDailyTodos(day)
        const goalMs = (s.dailyFocusGoal || 60) * 60 * 1000
        const tail = completedTasks.length > 0 ? ` · ${completedTasks.length} task(s) done` : ''
        await store.notify(
          'summary',
          "That's a wrap 🎬",
          `Worked ${fmt(snapshot.stat.workedMs)}${tail}`,
          { emoji: '🎬' }
        )
        const payload: DailySummaryPayload = {
          snapshot,
          weekly: await db.computeWeekly(),
          completedTasks,
          openTasks,
          userName: s.userName,
          goalMs
        }
        store.showSummaryRecap(payload)
      }

      await store.refreshToday()
    }

    const id = setInterval(() => void tick(), 1000)
    return () => clearInterval(id)
  }, [])
}
