'use client'
/**
 * Client-side heartbeat — the browser equivalent of the Electron scheduler.
 * Drives session accrual, real-work marking, idle auto-pause, hourly nudges,
 * to-do reminders, the end-of-day recap, carry-over and recovery.
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
  const lastActivity = useRef(Date.now())
  const autoPaused = useRef(false)
  const lastSnapshotAt = useRef(0)

  useEffect(() => {
    const bump = (): void => {
      lastActivity.current = Date.now()
    }
    window.addEventListener('mousemove', bump)
    window.addEventListener('keydown', bump)
    window.addEventListener('mousedown', bump)
    window.addEventListener('focus', bump)

    lastMinuteKey.current = `${dayKey()}:${minutesOfDay()}`

    const tick = async (): Promise<void> => {
      const store = useStore.getState()
      if (!store.authed || busy.current) return
      busy.current = true
      try {
        const session = await db.tickActiveSession()
        if (session?.state === 'running') await db.markCurrentBlockWorked()

        await handleIdle(session?.state ?? null)

        const day = dayKey()
        const minutes = minutesOfDay()
        const key = `${day}:${minutes}`
        if (key !== lastMinuteKey.current) {
          const prevDay = lastMinuteKey.current.split(':')[0]
          lastMinuteKey.current = key
          await onMinuteChanged(day, minutes, prevDay)
        }

        const now = Date.now()
        if (now - lastSnapshotAt.current >= 5000) {
          lastSnapshotAt.current = now
          await store.refreshToday()
        }
      } catch {
        /* keep ticking even if a query fails */
      } finally {
        busy.current = false
      }
    }

    const handleIdle = async (state: string | null): Promise<void> => {
      const s = useStore.getState().settings
      if (!s?.idleAutoPause) return
      const idleSeconds = (Date.now() - lastActivity.current) / 1000
      const threshold = Math.max(1, s.idleThresholdMinutes) * 60
      if (state === 'running' && idleSeconds >= threshold) {
        await db.pauseWork()
        autoPaused.current = true
        await useStore.getState().notify('system', 'FocusClock', 'Paused — you stepped away ⏸️', {
          emoji: '⏸️'
        })
        await useStore.getState().refreshToday()
      } else if (autoPaused.current && state === 'paused' && idleSeconds < 5) {
        await db.resumeWork()
        autoPaused.current = false
        await useStore.getState().refreshToday()
      } else if (state !== 'paused') {
        autoPaused.current = false
      }
    }

    const onMinuteChanged = async (day: string, minutes: number, prevDay: string): Promise<void> => {
      const store = useStore.getState()
      const s = store.settings
      if (!s) return

      if (prevDay && prevDay !== day) {
        if (s.carryOverTodos) await db.carryOverIncompleteDailyTodos(day)
        const missed = await db.getMissedBlocks()
        if (missed.length > 0) useStore.setState({ missed, showRecovery: true })
      }

      const blocks = await db.getBlocksForDay(day)
      const starting = blocks.find((b) => b.startMinutes === minutes)

      // Hourly nudge — quiet while paused.
      const active = store.today?.session ?? null
      if (starting && starting.kind === 'work' && active?.state !== 'paused') {
        const clock = formatClock(starting.startMinutes, s.clockFormat)
        const remaining = await db.countOpenDailyTodos(day)
        const body = starting.label
          ? `It's ${clock} — ${starting.label} time 🍽️`
          : remaining > 0
            ? `It's ${clock}. ${remaining} to-do${remaining === 1 ? '' : 's'} left — let's get it 🔥`
            : `It's ${clock}. New hour, fresh focus ✨`
        await store.notify('hourly', 'FocusClock', body, { emoji: '⏱️' })
      }

      // To-do reminders.
      for (const todo of await db.getDueReminders(day, minutes)) {
        await db.markReminderFired(todo.id)
        await store.notify('reminder', '⏰ Reminder', todo.text, { emoji: '⏰' })
      }

      // End-of-day recap.
      if (minutes >= s.workEnd && !(await db.summaryFiredToday(day))) {
        const snapshot = await db.buildTodaySnapshot()
        const completedTasks = await db.completedDailyTodos(day)
        const openTasks = await db.countOpenDailyTodos(day)
        const goalMs = (s.dailyFocusGoal || 60) * 60 * 1000
        const tail = completedTasks.length > 0 ? ` · ${completedTasks.length} task(s) done` : ''
        await store.notify(
          'summary',
          "That's a wrap 🎬",
          `Focus ${fmt(snapshot.stat.focusMs)} · Worked ${fmt(snapshot.stat.workedMs)}${tail}`,
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
    return () => {
      clearInterval(id)
      window.removeEventListener('mousemove', bump)
      window.removeEventListener('keydown', bump)
      window.removeEventListener('mousedown', bump)
      window.removeEventListener('focus', bump)
    }
  }, [])
}
