/** Personalised greetings + honest-but-kind vibe checks. Gen-Z energy. */

export type VibeTone = 'great' | 'ok' | 'low' | 'empty'

export interface Vibe {
  tone: VibeTone
  headline: string
  sub: string
}

function nameSuffix(name: string): string {
  const n = name.trim()
  return n ? `, ${n}` : ''
}

export function greeting(name: string, date: Date = new Date()): string {
  const h = date.getHours()
  const s = nameSuffix(name)
  if (h < 5) return `still up${s}? 🌙`
  if (h < 12) return `gm${s} ☀️`
  if (h < 17) return `afternoon${s} 💪`
  if (h < 21) return `evening${s} 🌆`
  return `winding down${s} 🌙`
}

interface VibeInput {
  tasksDone: number
  tasksTotal: number
  focusMs: number
  goalMs: number
  withinWorkHours: boolean
}

export function vibeCheck({
  tasksDone,
  tasksTotal,
  focusMs,
  goalMs,
  withinWorkHours
}: VibeInput): Vibe {
  const taskRatio = tasksTotal > 0 ? tasksDone / tasksTotal : 0
  const focusRatio = goalMs > 0 ? focusMs / goalMs : 0
  const progress = Math.max(taskRatio, focusRatio)
  const allTasksDone = tasksTotal > 0 && tasksDone === tasksTotal

  if (tasksTotal === 0 && focusMs < 60_000) {
    return {
      tone: 'empty',
      headline: 'Clean slate ✨',
      sub: 'Drop your top 3 for today and hit ✓ — future you says thanks.'
    }
  }
  if (allTasksDone || progress >= 1) {
    return {
      tone: 'great',
      headline: "You're locked in 🔒🔥",
      sub: 'Everything is getting done. Absolute machine — keep cooking.'
    }
  }
  if (progress >= 0.5) {
    return {
      tone: 'ok',
      headline: 'Solid pace 👏',
      sub: "Over halfway there. Keep the momentum, you're so close."
    }
  }
  if (progress > 0) {
    return {
      tone: 'low',
      headline: 'Slow start — no stress 🌱',
      sub: 'Pick the easiest task and just start. One down changes everything.'
    }
  }
  return {
    tone: 'low',
    headline: withinWorkHours ? "Let's get the first one 💪" : 'Ready when you are 🌟',
    sub: withinWorkHours
      ? 'Nothing checked off yet — knock out one quick win to get rolling.'
      : 'Add a task or start the clock whenever you wanna lock in.'
  }
}

export function recapVibe(tasksDone: number, focusMs: number, goalMs: number): Vibe {
  const hitGoal = goalMs > 0 && focusMs >= goalMs
  if (hitGoal && tasksDone > 0) {
    return { tone: 'great', headline: 'You ate today 😤🔥', sub: 'Goal smashed and tasks cleared. This is the standard now.' }
  }
  if (hitGoal || tasksDone >= 3) {
    return { tone: 'great', headline: 'W day 🏆', sub: 'Real progress today — be proud of that.' }
  }
  if (focusMs > 0 || tasksDone > 0) {
    return { tone: 'ok', headline: 'Something > nothing 🌱', sub: 'Not your biggest day, but you showed up. Tomorrow we build on it.' }
  }
  return { tone: 'low', headline: 'Quiet one today 🌙', sub: "No focus logged — it happens. Fresh start tomorrow, you've got this." }
}
