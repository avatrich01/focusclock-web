/**
 * Auto-counted work hours, derived purely from the user's schedule + the clock.
 * Hours accrue from work-start (once the day is started) and stop at work-end,
 * excluding every break window (lunch, dinner, break). Pure functions so the UI
 * can compute live numbers every second without touching the database.
 */
import type { Settings } from './types'

function overlap(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart))
}

/** Valid break windows (lunch always; dinner/break only if end > start). */
export function breakWindows(s: Settings): [number, number][] {
  const wins: [number, number][] = []
  if (s.lunchEnd > s.lunchStart) wins.push([s.lunchStart, s.lunchEnd])
  if (s.dinnerEnd > s.dinnerStart) wins.push([s.dinnerStart, s.dinnerEnd])
  if (s.breakEnd > s.breakStart) wins.push([s.breakStart, s.breakEnd])
  return wins
}

function breaksOverlap(s: Settings, from: number, to: number): number {
  return breakWindows(s).reduce((sum, [bs, be]) => sum + overlap(from, to, bs, be), 0)
}

/** Total productive work minutes in a day (work span minus all breaks). */
export function totalWorkMinutes(s: Settings): number {
  return Math.max(0, s.workEnd - s.workStart - breaksOverlap(s, s.workStart, s.workEnd))
}

/** Work minutes elapsed by `nowMinutes` (clamped to the work window, no breaks). */
export function workMinutesElapsed(s: Settings, nowMinutes: number): number {
  const cur = Math.max(s.workStart, Math.min(nowMinutes, s.workEnd))
  return Math.max(0, cur - s.workStart - breaksOverlap(s, s.workStart, cur))
}

/** Break minutes elapsed by `nowMinutes`. */
export function breakMinutesElapsed(s: Settings, nowMinutes: number): number {
  const cur = Math.max(s.workStart, Math.min(nowMinutes, s.workEnd))
  return breaksOverlap(s, s.workStart, cur)
}

export function workMinutesLeft(s: Settings, nowMinutes: number): number {
  return Math.max(0, totalWorkMinutes(s) - workMinutesElapsed(s, nowMinutes))
}

export function isWorkingNow(s: Settings, nowMinutes: number): boolean {
  if (nowMinutes < s.workStart || nowMinutes >= s.workEnd) return false
  return !breakWindows(s).some(([bs, be]) => nowMinutes >= bs && nowMinutes < be)
}

/** Label for the break window covering a minute, if any. */
export function breakLabelAt(s: Settings, minutes: number): string {
  if (s.lunchEnd > s.lunchStart && minutes >= s.lunchStart && minutes < s.lunchEnd) return 'Lunch'
  if (s.dinnerEnd > s.dinnerStart && minutes >= s.dinnerStart && minutes < s.dinnerEnd) return 'Dinner'
  if (s.breakEnd > s.breakStart && minutes >= s.breakStart && minutes < s.breakEnd) return 'Break'
  return ''
}
