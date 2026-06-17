'use client'
import { useState } from 'react'
import { useStore } from '@/lib/useStore'
import { Button, Card, Modal, cx } from '@/components/ui'
import { TimeField } from '@/components/TimeField'
import { ClockIcon, SparkleIcon } from '@/components/Icons'
import { addDays, dayKey, formatClock, minutesOfDay, toHHMM } from '@/lib/time'
import { greeting } from '@/lib/vibe'
import { quoteOfDay } from '@/lib/quotes'

/** New-day welcome: a quote, an honest read of recent data, and a non-backdated
 * start. Hours don't count until the user starts. */
export function StartDayModal(): JSX.Element | null {
  const settings = useStore((s) => s.settings)
  const weekly = useStore((s) => s.weekly)
  const saveSettings = useStore((s) => s.saveSettings)
  const nowHour = Math.floor(minutesOfDay() / 60) * 60
  const [start, setStart] = useState(Math.max(nowHour, settings?.workStart ?? nowHour))
  const [saving, setSaving] = useState(false)

  const today = dayKey()
  if (!settings || !settings.onboarded || settings.startDay === today) return null

  const quote = quoteOfDay()
  const yStat = weekly?.days.find((d) => d.day === addDays(today, -1))

  let honest: { tone: 'warn' | 'good' | 'neutral'; text: string }
  if (yStat && yStat.blocksTotal > 0) {
    const ratio = yStat.blocksCompleted / yStat.blocksTotal
    honest =
      ratio < 0.5
        ? { tone: 'warn', text: `Real talk: you finished only ${yStat.blocksCompleted} of ${yStat.blocksTotal} planned hours yesterday. Let's fix that today.` }
        : { tone: 'good', text: `${yStat.blocksCompleted}/${yStat.blocksTotal} hours done yesterday — bring that same energy.` }
  } else if ((weekly?.streak.current ?? 0) > 0) {
    honest = { tone: 'good', text: `${weekly!.streak.current}-day streak going — don't break it today.` }
  } else {
    honest = { tone: 'neutral', text: 'Fresh start. One task per hour — that’s the whole game.' }
  }

  const honestStyle =
    honest.tone === 'warn'
      ? 'bg-danger/10 text-danger border-danger/30'
      : honest.tone === 'good'
        ? 'bg-success/10 text-success border-success/30'
        : 'bg-info-soft/60 text-info border-info/30'

  async function begin(): Promise<void> {
    setSaving(true)
    const s = Math.max(start, nowHour)
    const workEnd = Math.max(settings!.workEnd, s + 60)
    await saveSettings({ workStart: s, workEnd, startDay: today })
    setSaving(false)
  }

  return (
    <Modal>
      <Card className="p-6 max-h-[88vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="grid place-items-center h-11 w-11 rounded-2xl bg-accent text-white shadow-glow">
            <ClockIcon width={24} height={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-content">{greeting(settings.userName)}</h2>
            <p className="text-sm text-content-muted">A new day — let&apos;s set it up.</p>
          </div>
        </div>

        <div className="rounded-2xl bg-accent-soft/50 px-4 py-3 mb-3">
          <div className="text-base text-content font-display leading-snug">“{quote.text}”</div>
          <div className="text-xs text-content-subtle mt-1">— {quote.by}</div>
        </div>

        <div className={cx('rounded-xl border px-3.5 py-2.5 mb-4 text-sm', honestStyle)}>{honest.text}</div>

        <TimeField
          label="I'm starting at"
          value={start}
          onChange={setStart}
          min={toHHMM(nowHour)}
          hint="You can only start now or later — no backdating."
        />
        <div className="text-xs text-content-subtle mt-2">
          Working until {formatClock(settings.workEnd, settings.clockFormat)} · breaks excluded automatically.
        </div>

        <Button variant="primary" className="w-full py-3 mt-5" disabled={saving} onClick={begin}>
          <SparkleIcon width={18} height={18} />
          {saving ? 'Starting…' : 'Start my day'}
        </Button>
      </Card>
    </Modal>
  )
}
