'use client'
import { useStore } from '@/lib/useStore'
import { Button, Card, Modal, cx } from '@/components/ui'
import { CheckCircleIcon, ClockIcon, CoffeeIcon, TargetIcon } from '@/components/Icons'
import { formatDuration } from '@/lib/time'
import { recapVibe, type VibeTone } from '@/lib/vibe'

export function SummaryModal(): JSX.Element | null {
  const show = useStore((s) => s.showSummary)
  const summary = useStore((s) => s.summary)
  const setRoute = useStore((s) => s.setRoute)
  const dismiss = useStore((s) => s.dismissSummary)

  if (!show || !summary) return null
  const stat = summary.snapshot.stat
  const { completedTasks, openTasks, userName, goalMs } = summary
  const vibe = recapVibe(completedTasks.length, stat.focusMs, goalMs)

  const toneRing: Record<VibeTone, string> = {
    great: 'bg-highlight-soft text-content',
    ok: 'bg-accent-soft text-accent',
    low: 'bg-info-soft text-info',
    empty: 'bg-surface-subtle text-content-muted'
  }
  const rows = [
    { icon: <ClockIcon width={18} height={18} />, label: 'Worked', value: formatDuration(stat.workedMs) },
    { icon: <TargetIcon width={18} height={18} />, label: 'Focus Time', value: formatDuration(stat.focusMs) },
    { icon: <CoffeeIcon width={18} height={18} />, label: 'Break Time', value: formatDuration(stat.breakMs) }
  ]
  const hi = userName.trim() ? `${userName.trim()}, ` : ''

  return (
    <Modal onClose={dismiss}>
      <Card className="p-7 max-h-[85vh] overflow-y-auto">
        <div className="flex flex-col items-center text-center mb-5">
          <div className={cx('grid place-items-center h-14 w-14 rounded-2xl mb-3 text-2xl', toneRing[vibe.tone])}>🎬</div>
          <h2 className="text-2xl font-semibold text-content">That&apos;s a wrap</h2>
          <p className="text-sm text-content-muted mt-1">{hi}here&apos;s your day in review.</p>
        </div>

        <div className={cx('rounded-xl px-4 py-3 mb-4 text-center', toneRing[vibe.tone])}>
          <div className="text-lg font-semibold text-content">{vibe.headline}</div>
          <div className="text-sm text-content-muted mt-0.5">{vibe.sub}</div>
        </div>

        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3 rounded-xl bg-surface-subtle/70 px-4 py-3">
              <span className="text-accent">{r.icon}</span>
              <span className="text-sm font-medium text-content-muted">{r.label}</span>
              <span className="ml-auto tabular text-xl font-semibold text-content">{r.value}</span>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <div className="text-sm font-semibold text-content mb-2">What you got done ({completedTasks.length})</div>
          {completedTasks.length === 0 ? (
            <p className="text-sm text-content-subtle">No tasks checked off today — that&apos;s okay. Tomorrow&apos;s a fresh page 🌱</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {completedTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-2.5 text-sm text-content">
                  <CheckCircleIcon className="text-success shrink-0" width={16} height={16} />
                  <span className="truncate">{t.text}</span>
                </div>
              ))}
              {openTasks > 0 && <p className="text-xs text-content-subtle mt-1">{openTasks} task{openTasks === 1 ? '' : 's'} rolling over to tomorrow.</p>}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => { setRoute('analytics'); dismiss() }}>View analytics</Button>
          <Button variant="primary" onClick={dismiss}>Done for today ✌️</Button>
        </div>
      </Card>
    </Modal>
  )
}
