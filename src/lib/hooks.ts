import { useEffect, useState } from 'react'
import type { WorkSession } from './types'

/** A Date that updates on an interval (default every second). */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/** Live focus / break / worked durations extrapolated from the last tick. */
export function liveDurations(
  session: WorkSession | null,
  now: number
): { focusMs: number; breakMs: number; workedMs: number } {
  if (!session) return { focusMs: 0, breakMs: 0, workedMs: 0 }
  let focusMs = session.focusMs
  let breakMs = session.pauseMs
  if (session.state === 'running') {
    focusMs += Math.max(0, now - session.lastTickAt)
  } else if (session.state === 'paused') {
    breakMs += Math.max(0, now - session.lastTickAt)
  }
  return { focusMs, breakMs, workedMs: focusMs + breakMs }
}
