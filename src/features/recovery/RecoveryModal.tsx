'use client'
import { useStore } from '@/lib/useStore'
import { Button, Card, Modal, cx } from '@/components/ui'
import { ClockIcon } from '@/components/Icons'
import { formatClock } from '@/lib/time'

export function RecoveryModal(): JSX.Element | null {
  const show = useStore((s) => s.showRecovery)
  const missed = useStore((s) => s.missed)
  const clockFormat = useStore((s) => s.settings?.clockFormat ?? '12h')
  const resolveMissed = useStore((s) => s.resolveMissed)
  const resolveAllMissed = useStore((s) => s.resolveAllMissed)
  const dismiss = useStore((s) => s.dismissRecovery)

  if (!show || missed.length === 0) return null

  return (
    <Modal onClose={dismiss}>
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="grid place-items-center h-10 w-10 rounded-xl bg-warning/15 text-warning">
            <ClockIcon width={20} height={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-content">You missed {missed.length} hourly check-in{missed.length > 1 ? 's' : ''}</h2>
            <p className="text-sm text-content-muted">Reconcile them so your stats stay accurate.</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
          {missed.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-subtle/60 px-4 py-2.5">
              <span className="tabular font-semibold text-content w-20">{formatClock(m.startMinutes, clockFormat)}</span>
              {m.label && <span className="text-xs font-semibold uppercase tracking-wide text-warning">{m.label}</span>}
              <div className="ml-auto flex items-center gap-1">
                <button onClick={() => void resolveMissed(m.id, 'worked')} className="rounded-lg px-2.5 py-1 text-xs font-medium text-success hover:bg-success/10">Worked</button>
                <button onClick={() => void resolveMissed(m.id, 'missed')} className="rounded-lg px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger/10">Missed</button>
                <button onClick={() => void resolveMissed(m.id, 'ignore')} className={cx('rounded-lg px-2.5 py-1 text-xs font-medium text-content-muted hover:bg-surface-raised')}>Ignore</button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => void resolveAllMissed('ignore')}>Ignore all</Button>
          <Button variant="primary" onClick={() => void resolveAllMissed('worked')}>Mark all worked</Button>
        </div>
      </Card>
    </Modal>
  )
}
