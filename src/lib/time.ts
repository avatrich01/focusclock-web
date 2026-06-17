import type { ClockFormat, MinutesOfDay } from './types'

export const MINUTES_PER_DAY = 24 * 60

export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function minutesOfDay(date: Date = new Date()): MinutesOfDay {
  return date.getHours() * 60 + date.getMinutes()
}

export function parseHHMM(value: string): MinutesOfDay {
  const [h, m] = value.split(':').map((p) => parseInt(p, 10))
  return clampMinutes((h || 0) * 60 + (m || 0))
}

export function toHHMM(minutes: MinutesOfDay): string {
  const m = clampMinutes(minutes)
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export function clampMinutes(m: number): MinutesOfDay {
  if (Number.isNaN(m)) return 0
  return Math.max(0, Math.min(MINUTES_PER_DAY - 1, Math.round(m)))
}

export function formatClock(minutes: MinutesOfDay, format: ClockFormat): string {
  const m = clampMinutes(minutes)
  const h24 = Math.floor(m / 60)
  const mm = String(m % 60).padStart(2, '0')
  if (format === '24h') return `${String(h24).padStart(2, '0')}:${mm}`
  const period = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${mm} ${period}`
}

export function formatTime(date: Date, format: ClockFormat, withSeconds = false): string {
  const h24 = date.getHours()
  const mm = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  if (format === '24h') {
    return withSeconds
      ? `${String(h24).padStart(2, '0')}:${mm}:${ss}`
      : `${String(h24).padStart(2, '0')}:${mm}`
  }
  const period = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return withSeconds ? `${h12}:${mm}:${ss} ${period}` : `${h12}:${mm} ${period}`
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return '0m'
  const totalMinutes = Math.floor(ms / 60000)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${Math.floor(ms / 1000)}s`
}

export const WEEKDAY_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
]
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const MONTH_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

export function formatLongDate(date: Date = new Date()): string {
  return `${MONTH_LONG[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

export function addDays(day: string, offset: number): string {
  const d = new Date(`${day}T00:00:00`)
  d.setDate(d.getDate() + offset)
  return dayKey(d)
}

export function startOfWeek(day: string): string {
  const d = new Date(`${day}T00:00:00`)
  const dow = d.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  return dayKey(d)
}

export function isPreviousDay(day: string, next: string): boolean {
  return addDays(day, 1) === next
}
