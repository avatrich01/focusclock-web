'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { useStore } from '@/lib/useStore'
import { TimeField } from '@/components/TimeField'
import { Button, Card, SegmentedControl, Toggle } from '@/components/ui'
import { BellIcon, ClockIcon, ListChecksIcon, MonitorIcon, MoonIcon, SettingsIcon, SunIcon, TargetIcon, VolumeIcon } from '@/components/Icons'
import { playNotificationSound } from '@/lib/sound'
import { disablePush, enablePush, isPushEnabled, pushSupported } from '@/lib/push'
import type { SoundName } from '@/lib/types'

function BackgroundPushRow(): JSX.Element {
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const supported = pushSupported()

  useEffect(() => {
    void isPushEnabled().then(setEnabled)
  }, [])

  async function toggle(v: boolean): Promise<void> {
    setBusy(true)
    if (v) setEnabled(await enablePush())
    else {
      await disablePush()
      setEnabled(false)
    }
    setBusy(false)
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium text-content">Background notifications</div>
        <div className="text-xs text-content-subtle mt-0.5">
          {supported
            ? 'Get hourly nudges & reminders even when this tab is closed (requires the cron — see README)'
            : 'Not supported in this browser'}
        </div>
      </div>
      <Toggle checked={enabled} onChange={(v) => !busy && void toggle(v)} />
    </div>
  )
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }): JSX.Element {
  return (
    <Card className="p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-accent">{icon}</span>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-content">{title}</h2>
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </Card>
  )
}
function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium text-content">{label}</div>
        {hint && <div className="text-xs text-content-subtle mt-0.5">{hint}</div>}
      </div>
      {children}
    </div>
  )
}

const SOUNDS: { value: SoundName; label: string }[] = [
  { value: 'bell', label: 'Bell' },
  { value: 'chime', label: 'Chime' },
  { value: 'beep', label: 'Beep' },
  { value: 'soft', label: 'Soft Alert' }
]

export function SettingsPage(): JSX.Element {
  const settings = useStore((s) => s.settings)
  const saveSettings = useStore((s) => s.saveSettings)
  if (!settings) return <div />
  const save = (patch: Parameters<typeof saveSettings>[0]): void => void saveSettings(patch)

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-8 py-8 flex flex-col gap-6">
        <div className="flex items-center gap-2 animate-fade-in">
          <SettingsIcon className="text-accent" width={22} height={22} />
          <h1 className="text-xl font-semibold text-content">Settings</h1>
        </div>

        <Section icon={<ClockIcon width={18} height={18} />} title="Schedule">
          <div className="grid grid-cols-2 gap-4">
            <TimeField label="Work Start" value={settings.workStart} onChange={(v) => save({ workStart: v })} />
            <TimeField label="Work End" value={settings.workEnd} onChange={(v) => save({ workEnd: v })} />
            <TimeField label="Lunch Start" value={settings.lunchStart} onChange={(v) => save({ lunchStart: v })} />
            <TimeField label="Lunch End" value={settings.lunchEnd} onChange={(v) => save({ lunchEnd: v })} />
          </div>
          <Row label="Clock format" hint="How times are displayed throughout the app">
            <SegmentedControl value={settings.clockFormat} onChange={(v) => save({ clockFormat: v })} options={[{ value: '12h', label: '12h' }, { value: '24h', label: '24h' }]} />
          </Row>
        </Section>

        <Section icon={<TargetIcon width={18} height={18} />} title="You & Goals">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-content">Your name</span>
            <input value={settings.userName} onChange={(e) => save({ userName: e.target.value })} placeholder="What should we call you?" maxLength={40} className="rounded-xl border border-border bg-surface-subtle px-3 py-2.5 text-content text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition" />
          </label>
          <Row label="Daily focus goal" hint="Hit this to keep your streak alive and earn the win 🔥">
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={16} step={0.5} value={settings.dailyFocusGoal / 60} onChange={(e) => save({ dailyFocusGoal: Math.round(Number(e.target.value) * 60) })} className="w-20 rounded-xl border border-border bg-surface-subtle px-3 py-2 text-content text-sm tabular outline-none focus:border-accent" />
              <span className="text-sm text-content-muted">hours / day</span>
            </div>
          </Row>
        </Section>

        <Section icon={<BellIcon width={18} height={18} />} title="Notifications & Sound">
          <Row label="Hourly notifications" hint="Get a reminder at the top of every hour">
            <Toggle checked={settings.notificationsEnabled} onChange={(v) => save({ notificationsEnabled: v })} />
          </Row>
          <Row label="Notification sound">
            <SegmentedControl value={settings.sound} onChange={(v) => { save({ sound: v }); playNotificationSound(v, settings.volume) }} options={SOUNDS} />
          </Row>
          <Row label="Volume" hint={`${Math.round(settings.volume * 100)}%`}>
            <div className="flex items-center gap-3 w-52">
              <VolumeIcon className="text-content-subtle" width={18} height={18} />
              <input type="range" min={0} max={100} value={Math.round(settings.volume * 100)} onChange={(e) => save({ volume: Number(e.target.value) / 100 })} onMouseUp={() => playNotificationSound(settings.sound, settings.volume)} className="flex-1 accent-[rgb(var(--accent))]" />
            </div>
          </Row>
          <Row label="Keep nudge on screen longer" hint={`In-app reminder stays ${settings.notificationExtraSeconds}s longer (quiet while paused)`}>
            <div className="flex items-center gap-3 w-52">
              <input type="range" min={0} max={30} value={settings.notificationExtraSeconds} onChange={(e) => save({ notificationExtraSeconds: Number(e.target.value) })} className="flex-1 accent-[rgb(var(--accent))]" />
              <span className="tabular text-sm text-content-muted w-10 text-right">+{settings.notificationExtraSeconds}s</span>
            </div>
          </Row>
          <Button variant="secondary" className="self-start" onClick={() => playNotificationSound(settings.sound, settings.volume)}>
            <BellIcon width={16} height={16} /> Test sound
          </Button>
          <BackgroundPushRow />
        </Section>

        <Section icon={<ListChecksIcon width={18} height={18} />} title="Tasks & Tracking">
          <Row label="Carry over unfinished to-dos" hint="Roll today's open tasks to tomorrow so nothing slips">
            <Toggle checked={settings.carryOverTodos} onChange={(v) => save({ carryOverTodos: v })} />
          </Row>
          <Row label="Auto-pause when I'm away" hint="Only counts real work — pauses when you go idle, resumes when back">
            <Toggle checked={settings.idleAutoPause} onChange={(v) => save({ idleAutoPause: v })} />
          </Row>
          <Row label="Idle threshold" hint="Minutes of inactivity before auto-pause">
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={60} value={settings.idleThresholdMinutes} disabled={!settings.idleAutoPause} onChange={(e) => save({ idleThresholdMinutes: Math.max(1, Number(e.target.value)) })} className="w-20 rounded-xl border border-border bg-surface-subtle px-3 py-2 text-content text-sm tabular outline-none focus:border-accent disabled:opacity-40" />
              <span className="text-sm text-content-muted">min</span>
            </div>
          </Row>
          <Row label="Lock past hours" hint="Once an hour has passed you can't edit it — keeps you accountable">
            <Toggle checked={settings.lockPastBlocks} onChange={(v) => save({ lockPastBlocks: v })} />
          </Row>
        </Section>

        <Section icon={<SunIcon width={18} height={18} />} title="Appearance">
          <Row label="Theme">
            <SegmentedControl
              value={settings.theme}
              onChange={(v) => save({ theme: v })}
              options={[
                { value: 'system', label: (<><MonitorIcon width={14} height={14} /> System</>) },
                { value: 'light', label: (<><SunIcon width={14} height={14} /> Light</>) },
                { value: 'dark', label: (<><MoonIcon width={14} height={14} /> Dark</>) }
              ]}
            />
          </Row>
        </Section>

        <div className="text-center text-xs text-content-subtle pb-4">FocusClock for Web · Locked in, every day ⚡</div>
      </div>
    </div>
  )
}
