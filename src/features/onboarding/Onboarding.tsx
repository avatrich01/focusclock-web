'use client'
import { useMemo, useState } from 'react'
import { useStore } from '@/lib/useStore'
import { TimeField } from '@/components/TimeField'
import { Button, Card, SegmentedControl, cx } from '@/components/ui'
import { ClockIcon, CoffeeIcon, SparkleIcon } from '@/components/Icons'
import { formatClock } from '@/lib/time'
import type { ClockFormat, ThemePreference } from '@/lib/types'

interface Plan {
  startMinutes: number
  isLunch: boolean
}

function planBlocks(workStart: number, workEnd: number, lunchStart: number, lunchEnd: number): Plan[] {
  const blocks: Plan[] = []
  let t = Math.floor(workStart / 60) * 60
  if (t < workStart) t = workStart
  for (let m = t; m <= workEnd; m += 60) blocks.push({ startMinutes: m, isLunch: m >= lunchStart && m < lunchEnd })
  return blocks
}

export function Onboarding(): JSX.Element {
  const completeOnboarding = useStore((s) => s.completeOnboarding)
  const settings = useStore((s) => s.settings)

  const [userName, setUserName] = useState(settings?.userName ?? '')
  const [linkUrl, setLinkUrl] = useState(settings?.linkUrl ?? '')
  const [workStart, setWorkStart] = useState(settings?.workStart ?? 480)
  const [workEnd, setWorkEnd] = useState(settings?.workEnd ?? 1020)
  const [lunchStart, setLunchStart] = useState(settings?.lunchStart ?? 720)
  const [lunchEnd, setLunchEnd] = useState(settings?.lunchEnd ?? 780)
  const [dinnerStart, setDinnerStart] = useState(settings?.dinnerStart ?? 0)
  const [dinnerEnd, setDinnerEnd] = useState(settings?.dinnerEnd ?? 0)
  const [breakStart, setBreakStart] = useState(settings?.breakStart ?? 0)
  const [breakEnd, setBreakEnd] = useState(settings?.breakEnd ?? 0)
  const [clockFormat, setClockFormat] = useState<ClockFormat>(settings?.clockFormat ?? '12h')
  const [theme, setTheme] = useState<ThemePreference>(settings?.theme ?? 'system')
  const [saving, setSaving] = useState(false)

  const errors = useMemo(() => {
    const list: string[] = []
    if (workEnd <= workStart) list.push('Work end must be after work start.')
    if (lunchEnd <= lunchStart) list.push('Lunch end must be after lunch start.')
    if (lunchStart < workStart || lunchEnd > workEnd) list.push('Lunch must fall within your work hours.')
    return list
  }, [workStart, workEnd, lunchStart, lunchEnd])

  const blocks = useMemo(() => planBlocks(workStart, workEnd, lunchStart, lunchEnd), [workStart, workEnd, lunchStart, lunchEnd])

  async function finish(): Promise<void> {
    if (errors.length > 0) return
    setSaving(true)
    await completeOnboarding({
      userName: userName.trim(),
      linkUrl: linkUrl.trim(),
      workStart,
      workEnd,
      lunchStart,
      lunchEnd,
      dinnerStart,
      dinnerEnd,
      breakStart,
      breakEnd,
      clockFormat,
      theme
    })
    setSaving(false)
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-surface flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-3xl animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <div className="grid place-items-center h-12 w-12 rounded-2xl bg-accent text-white shadow-glow">
            <ClockIcon width={26} height={26} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-content">Welcome to FocusClock 👋</h1>
            <p className="text-content-muted text-sm">Two mins of setup and we&apos;ll keep you locked in all day.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="p-6 lg:col-span-3 flex flex-col gap-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-content">What should we call you?</span>
              <input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Your name (optional)" maxLength={40} className="rounded-xl border border-border bg-surface-subtle px-3 py-2.5 text-content text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition" />
              <span className="text-xs text-content-subtle">We&apos;ll use it to gas you up throughout the day ✨</span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-content">Profile link <span className="text-content-subtle font-normal">(optional)</span></span>
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="LinkedIn, TikTok, or your site"
                className="rounded-xl border border-border bg-surface-subtle px-3 py-2.5 text-content text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition"
              />
              <span className="text-xs text-content-subtle">Shown on the leaderboard so peers can find you.</span>
            </label>

            <div className="grid grid-cols-2 gap-4">
              <TimeField label="Work Start Time" value={workStart} onChange={setWorkStart} />
              <TimeField label="Work End Time" value={workEnd} onChange={setWorkEnd} />
              <TimeField label="Lunch Start" value={lunchStart} onChange={setLunchStart} />
              <TimeField label="Lunch End" value={lunchEnd} onChange={setLunchEnd} />
            </div>

            <details className="rounded-xl border border-border-subtle bg-surface-subtle/40 px-3 py-2">
              <summary className="text-sm font-medium text-content cursor-pointer">
                Add dinner / break <span className="text-content-subtle font-normal">(optional)</span>
              </summary>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <TimeField label="Dinner Start" value={dinnerStart} onChange={setDinnerStart} />
                <TimeField label="Dinner End" value={dinnerEnd} onChange={setDinnerEnd} />
                <TimeField label="Break Start" value={breakStart} onChange={setBreakStart} />
                <TimeField label="Break End" value={breakEnd} onChange={setBreakEnd} />
              </div>
              <span className="text-xs text-content-subtle mt-2 block">
                Leave a pair equal (e.g. both 00:00) to skip it. Breaks aren&apos;t counted as work.
              </span>
            </details>

            <div className="flex flex-wrap items-center gap-6 pt-1">
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-content">Clock</span>
                <SegmentedControl value={clockFormat} onChange={setClockFormat} options={[{ value: '12h', label: '12-hour' }, { value: '24h', label: '24-hour' }]} />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-content">Theme</span>
                <SegmentedControl value={theme} onChange={setTheme} options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
              </div>
            </div>

            {errors.length > 0 && (
              <div className="rounded-xl bg-danger/10 border border-danger/30 px-4 py-3 text-sm text-danger">
                {errors.map((e) => (<div key={e}>{e}</div>))}
              </div>
            )}

            <Button variant="primary" className="w-full py-3 text-base mt-1" disabled={errors.length > 0 || saving} onClick={finish}>
              <SparkleIcon width={18} height={18} />
              {saving ? 'Setting up…' : 'Start using FocusClock'}
            </Button>
          </Card>

          <Card className="p-6 lg:col-span-2">
            <div className="text-xs font-medium uppercase tracking-wide text-content-subtle mb-3">Your hourly blocks</div>
            <div className="flex flex-col gap-1.5 max-h-[340px] overflow-y-auto pr-1">
              {blocks.map((b) => (
                <div key={b.startMinutes} className={cx('flex items-center gap-2 rounded-lg px-3 py-2 text-sm', b.isLunch ? 'bg-warning/10 text-warning' : 'bg-surface-subtle text-content-muted')}>
                  {b.isLunch ? <CoffeeIcon width={16} height={16} /> : <ClockIcon width={16} height={16} />}
                  <span className="tabular font-medium">{formatClock(b.startMinutes, clockFormat)}</span>
                  {b.isLunch && <span className="ml-auto text-xs font-semibold">LUNCH</span>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
