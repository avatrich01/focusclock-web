'use client'
/** Completion reward: a gentle haptic buzz, a success chime, and a quick
 * confetti burst from the element. Designed to feel good for ADHD users. */
import { playSuccessSound } from './sound'

const COLORS = ['#2A43E8', '#18A558', '#F4C84A', '#F2994A', '#6E86FF']

export function celebrate(el: HTMLElement | null): void {
  if (typeof window === 'undefined') return

  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(30)
    } catch {
      /* unsupported (e.g. iOS Safari) */
    }
  }
  playSuccessSound()

  if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const rect = el.getBoundingClientRect()
  const cx = rect.left + rect.width * 0.16
  const cy = rect.top + rect.height / 2

  for (let i = 0; i < 14; i++) {
    const dot = document.createElement('span')
    dot.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;width:7px;height:7px;border-radius:2px;z-index:9999;pointer-events:none;background:${COLORS[i % COLORS.length]}`
    document.body.appendChild(dot)
    const ang = Math.random() * Math.PI * 2
    const dist = 24 + Math.random() * 54
    const dx = Math.cos(ang) * dist
    const dy = Math.sin(ang) * dist - 16
    dot.animate(
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${dx}px,${dy + 46}px) scale(0.4)`, opacity: 0 }
      ],
      { duration: 680, easing: 'cubic-bezier(.2,.7,.3,1)' }
    )
    setTimeout(() => dot.remove(), 720)
  }
}
