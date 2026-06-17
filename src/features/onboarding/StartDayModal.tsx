'use client'
import { useState } from 'react'
import { useStore } from '@/lib/useStore'
import { Button, Card, Modal } from '@/components/ui'
import { TimeField } from '@/components/TimeField'
import { ClockIcon, SparkleIcon } from '@/components/Icons'
import { dayKey, formatClock, minutesOfDay, toHHMM } from '@/lib/time'

/** Each new day, prompt the user to start their workday. The start time can't
 * be backdated, so you can't claim hours you didn't work. */
export function StartDayModal(): JSX.Element | null {
  const settings = useStore((s) => s.settings)
  const saveSettings = useStore((s) => s.saveSettings)
  const nowHour = Math.floor(minutesOfDay() / 60) * 60
  const [start, setStart] = useState(Math.max(nowHour, settings?.workStart ?? nowHour))
  const [saving, setSaving] = useState(false)

  const today = dayKey()
  if (!settings || !settings.onboarded || settings.startDay === today) return null

  const clockFormat = settings.clockFormat

  async function begin(): Promise<void> {
    setSaving(true)
    const s = Math.max(start, nowHour)
    const workEnd = Math.max(settings!.workEnd, s + 60)
    await saveSettings({ workStart: s, workEnd, startDay: today })
    setSaving(false)
  }

  return (
    <Modal>
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="grid place-items-center h-11 w-11 rounded-2xl bg-accent text-white shadow-glow">
            <ClockIcon width={24} height={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-content">New day — let&apos;s start</h2>
            <p className="text-sm text-content-muted">Set when you&apos;re starting today.</p>
          </div>
        </div>

        <TimeField
          label="I'm starting at"
          value={start}
          onChange={setStart}
          min={toHHMM(nowHour)}
          hint="You can only start now or later — no backdating."
        />

        <div className="text-xs text-content-subtle mt-3">
          Until {formatClock(settings.workEnd, clockFormat)} · breaks are excluded automatically.
        </div>

        <Button variant="primary" className="w-full py-3 mt-5" disabled={saving} onClick={begin}>
          <SparkleIcon width={18} height={18} />
          {saving ? 'Starting…' : 'Start my day'}
        </Button>
      </Card>
    </Modal>
  )
}
