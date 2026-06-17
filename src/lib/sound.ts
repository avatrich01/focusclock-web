/** Notification sounds, synthesized with the Web Audio API (no asset files). */
import type { SoundName } from './types'

let ctx: AudioContext | null = null

function audioContext(): AudioContext {
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

interface Tone {
  freq: number
  start: number
  duration: number
  type: OscillatorType
  gain: number
}

const PATTERNS: Record<SoundName, Tone[]> = {
  bell: [
    { freq: 880, start: 0, duration: 1.1, type: 'sine', gain: 0.6 },
    { freq: 1760, start: 0, duration: 0.9, type: 'sine', gain: 0.18 },
    { freq: 2637, start: 0, duration: 0.5, type: 'sine', gain: 0.08 }
  ],
  chime: [
    { freq: 523.25, start: 0, duration: 0.5, type: 'sine', gain: 0.5 },
    { freq: 659.25, start: 0.16, duration: 0.5, type: 'sine', gain: 0.5 },
    { freq: 783.99, start: 0.32, duration: 0.7, type: 'sine', gain: 0.5 }
  ],
  beep: [
    { freq: 1000, start: 0, duration: 0.12, type: 'square', gain: 0.35 },
    { freq: 1000, start: 0.18, duration: 0.12, type: 'square', gain: 0.35 }
  ],
  soft: [
    { freq: 440, start: 0, duration: 0.6, type: 'triangle', gain: 0.4 },
    { freq: 554.37, start: 0.1, duration: 0.6, type: 'triangle', gain: 0.3 }
  ]
}

/** A short, bright arpeggio played when a task is completed. */
export function playSuccessSound(volume = 0.45): void {
  try {
    const ctx = audioContext()
    const master = ctx.createGain()
    master.gain.value = Math.max(0, Math.min(1, volume))
    master.connect(ctx.destination)
    const now = ctx.currentTime
    ;[523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t0 = now + i * 0.08
      const t1 = t0 + 0.18
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t1)
      osc.connect(g)
      g.connect(master)
      osc.start(t0)
      osc.stop(t1 + 0.05)
    })
  } catch {
    /* audio may be blocked until interaction */
  }
}

export function playNotificationSound(sound: SoundName, volume: number): void {
  try {
    const context = audioContext()
    const master = context.createGain()
    master.gain.value = Math.max(0, Math.min(1, volume))
    master.connect(context.destination)
    const now = context.currentTime
    for (const tone of PATTERNS[sound]) {
      const osc = context.createOscillator()
      const g = context.createGain()
      osc.type = tone.type
      osc.frequency.value = tone.freq
      const t0 = now + tone.start
      const t1 = t0 + tone.duration
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.exponentialRampToValueAtTime(tone.gain, t0 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t1)
      osc.connect(g)
      g.connect(master)
      osc.start(t0)
      osc.stop(t1 + 0.05)
    }
  } catch {
    // audio may be blocked until the user interacts; ignore
  }
}
