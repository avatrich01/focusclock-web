'use client'
/** Completion reward: a gentle haptic buzz, a success chime, and a full-screen
 * confetti shower. Designed to feel good for ADHD users. */
import { playSuccessSound } from './sound'

const COLORS = ['#2A43E8', '#18A558', '#F4C84A', '#F2994A', '#6E86FF', '#E24B6E']

export function celebrate(): void {
  if (typeof window === 'undefined') return

  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(35)
    } catch {
      /* unsupported (e.g. iOS Safari) */
    }
  }
  playSuccessSound()

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const w = window.innerWidth
  const h = window.innerHeight
  for (let i = 0; i < 60; i++) {
    const dot = document.createElement('span')
    const x = Math.random() * w
    dot.style.cssText = `position:fixed;top:-12px;left:${x}px;width:9px;height:9px;border-radius:2px;z-index:99999;pointer-events:none;background:${COLORS[i % COLORS.length]}`
    document.body.appendChild(dot)
    const dx = (Math.random() - 0.5) * 120
    const rot = Math.random() * 900
    dot.animate(
      [
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px,${h + 60}px) rotate(${rot}deg)`, opacity: 0.9 }
      ],
      { duration: 1100 + Math.random() * 700, easing: 'cubic-bezier(.2,.6,.4,1)' }
    )
    setTimeout(() => dot.remove(), 1900)
  }
}
