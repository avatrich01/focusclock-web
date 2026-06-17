'use client'
import { useEffect, useState } from 'react'
import { useStore } from '@/lib/useStore'
import { Card, cx } from './ui'
import { XIcon } from './Icons'

export function NotificationToast(): JSX.Element | null {
  const toast = useStore((s) => s.toast)
  const dismissToast = useStore((s) => s.dismissToast)
  const [progress, setProgress] = useState(1)

  useEffect(() => {
    if (!toast) return
    setProgress(1)
    const start = Date.now()
    const tick = setInterval(() => {
      const p = Math.max(0, 1 - (Date.now() - start) / toast.durationMs)
      setProgress(p)
      if (p <= 0) clearInterval(tick)
    }, 50)
    const timer = setTimeout(() => dismissToast(), toast.durationMs)
    return () => {
      clearInterval(tick)
      clearTimeout(timer)
    }
  }, [toast, dismissToast])

  if (!toast) return null

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[min(440px,90vw)] animate-slide-down">
      <Card className="overflow-hidden shadow-card border-accent/30">
        <div className="flex items-start gap-3 p-4">
          <span className="text-2xl leading-none mt-0.5">{toast.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-content">{toast.title}</div>
            <div className="text-sm text-content-muted mt-0.5 break-words">{toast.body}</div>
          </div>
          <button onClick={dismissToast} className="text-content-subtle hover:text-content shrink-0" aria-label="Dismiss">
            <XIcon width={16} height={16} />
          </button>
        </div>
        <div className="h-1 bg-border/40">
          <div className={cx('h-full bg-accent')} style={{ width: `${progress * 100}%` }} />
        </div>
      </Card>
    </div>
  )
}
