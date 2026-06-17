/**
 * Auto-counted work hours, derived purely from the user's schedule + the clock.
 * No "start" button: as soon as your work-start time passes, hours accrue
 * (lunch excluded), and stop at work-end. Pure functions so the UI can compute
 * live numbers every second without touching the database.
 */
import type { Settings } from './types'

function overlap(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart))
}

/** Total productive work minutes in a day (work span minus lunch). */
export function totalWorkMinutes(s: Settings): number {
  return Math.max(0, s.workEnd - s.workStart - overlap(s.workStart, s.workEnd, s.lunchStart, s.lunchEnd))
}

/** Work minutes elapsed by `nowMinutes` (clamped to the work window, no lunch). */
export function workMinutesElapsed(s: Settings, nowMinutes: number): number {
  const cur = Math.max(s.workStart, Math.min(nowMinutes, s.workEnd))
  return Math.max(0, cur - s.workStart - overlap(s.workStart, cur, s.lunchStart, s.lunchEnd))
}

/** Lunch minutes elapsed by `nowMinutes`. */
export function breakMinutesElapsed(s: Settings, nowMinutes: number): number {
  const cur = Math.max(s.workStart, Math.min(nowMinutes, s.workEnd))
  return overlap(s.workStart, cur, s.lunchStart, s.lunchEnd)
}

export function workMinutesLeft(s: Settings, nowMinutes: number): number {
  return Math.max(0, totalWorkMinutes(s) - workMinutesElapsed(s, nowMinutes))
}

export function isWorkingNow(s: Settings, nowMinutes: number): boolean {
  return (
    nowMinutes >= s.workStart &&
    nowMinutes < s.workEnd &&
    !(nowMinutes >= s.lunchStart && nowMinutes < s.lunchEnd)
  )
}
