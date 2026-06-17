'use client'
import { useEffect, useMemo, useState } from 'react'
import type { ActivityReport } from '@/lib/types'
import * as db from '@/lib/data'
import { Button, Card, StatTile, cx } from '@/components/ui'
import { ClockIcon, CoffeeIcon, CopyIcon, DownloadIcon, FileTextIcon, TargetIcon } from '@/components/Icons'
import { addDays, dayKey, formatDuration } from '@/lib/time'

type Preset = 'today' | 'yesterday' | 'week' | 'month' | 'lastMonth' | 'custom'

function startOfMonth(d: Date): string {
  return dayKey(new Date(d.getFullYear(), d.getMonth(), 1))
}
function endOfMonth(d: Date): string {
  return dayKey(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}
function rangeFor(preset: Preset): { from: string; to: string } {
  const today = new Date()
  switch (preset) {
    case 'today':
      return { from: dayKey(today), to: dayKey(today) }
    case 'yesterday': {
      const y = addDays(dayKey(today), -1)
      return { from: y, to: y }
    }
    case 'week':
      return { from: addDays(dayKey(today), -6), to: dayKey(today) }
    case 'month':
      return { from: startOfMonth(today), to: dayKey(today) }
    case 'lastMonth': {
      const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      return { from: startOfMonth(lm), to: endOfMonth(lm) }
    }
    default:
      return { from: dayKey(today), to: dayKey(today) }
  }
}
function prettyDate(day: string): string {
  return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}
function prettyTime(ms: number | null): string {
  if (!ms) return ''
  return new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
function toMarkdown(r: ActivityReport): string {
  const lines: string[] = []
  lines.push('# FocusClock Activity Report', '')
  lines.push(`**Range:** ${prettyDate(r.fromDay)} → ${prettyDate(r.toDay)}`, '')
  lines.push('## Summary')
  lines.push(`- Worked: ${formatDuration(r.totalWorkedMs)}`)
  lines.push(`- Focus time: ${formatDuration(r.totalFocusMs)}`)
  lines.push(`- Break time: ${formatDuration(r.totalBreakMs)}`)
  lines.push(`- Days worked: ${r.daysWorked}`)
  lines.push(`- Hourly blocks completed: ${r.blocksCompleted}/${r.blocksTotal}`, '')
  lines.push(`## Activities completed (${r.completedTodos.length})`)
  if (r.completedTodos.length === 0) lines.push('_No completed activities in this range._')
  else
    for (const t of r.completedTodos) {
      const when = t.completedAt ? `${prettyDate(dayKey(new Date(t.completedAt)))} ${prettyTime(t.completedAt)}` : ''
      lines.push(`- [${t.scope}] ${t.text}${when ? ` — ${when}` : ''}`)
    }
  return lines.join('\n')
}

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'custom', label: 'Custom' }
]

export function Reports(): JSX.Element {
  const [preset, setPreset] = useState<Preset>('yesterday')
  const initial = rangeFor('yesterday')
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [report, setReport] = useState<ActivityReport | null>(null)
  const [copied, setCopied] = useState(false)

  function choosePreset(p: Preset): void {
    setPreset(p)
    if (p !== 'custom') {
      const r = rangeFor(p)
      setFrom(r.from)
      setTo(r.to)
    }
  }

  useEffect(() => {
    void db.buildReport(from, to).then(setReport)
  }, [from, to])

  const markdown = useMemo(() => (report ? toMarkdown(report) : ''), [report])

  async function copy(): Promise<void> {
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function save(): void {
    if (!report) return
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `focusclock-report-${report.fromDay}_${report.toDay}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 md:px-8 py-6 md:py-8 flex flex-col gap-6">
        <div className="flex items-center gap-2 animate-fade-in">
          <FileTextIcon className="text-accent" width={22} height={22} />
          <h1 className="text-xl font-semibold text-content">Reports</h1>
        </div>

        <Card className="p-4 flex flex-col gap-4 animate-fade-in">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => choosePreset(p.value)}
                className={cx('px-3 py-1.5 rounded-lg text-sm font-medium transition-all border', preset === p.value ? 'bg-accent text-white border-accent' : 'bg-surface-subtle text-content-muted border-border hover:text-content')}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-content-subtle">From</span>
              <input type="date" value={from} max={to} onChange={(e) => { setPreset('custom'); setFrom(e.target.value) }} className="rounded-xl border border-border bg-surface-subtle px-3 py-2 text-content text-sm tabular outline-none focus:border-accent" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-content-subtle">To</span>
              <input type="date" value={to} min={from} max={dayKey()} onChange={(e) => { setPreset('custom'); setTo(e.target.value) }} className="rounded-xl border border-border bg-surface-subtle px-3 py-2 text-content text-sm tabular outline-none focus:border-accent" />
            </label>
            <div className="ml-auto flex gap-2">
              <Button onClick={copy} disabled={!report}>
                <CopyIcon width={16} height={16} /> {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button variant="primary" onClick={save} disabled={!report}>
                <DownloadIcon width={16} height={16} /> Save
              </Button>
            </div>
          </div>
        </Card>

        {report && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatTile icon={<ClockIcon width={16} height={16} />} label="Worked" value={formatDuration(report.totalWorkedMs)} accent />
              <StatTile icon={<TargetIcon width={16} height={16} />} label="Focus" value={formatDuration(report.totalFocusMs)} />
              <StatTile icon={<CoffeeIcon width={16} height={16} />} label="Break" value={formatDuration(report.totalBreakMs)} />
              <StatTile icon={<FileTextIcon width={16} height={16} />} label="Blocks" value={`${report.blocksCompleted}/${report.blocksTotal}`} hint={`${report.daysWorked} day${report.daysWorked === 1 ? '' : 's'} worked`} />
            </div>
            <Card className="p-5 animate-fade-in">
              <div className="text-sm font-semibold text-content mb-3">Activities completed ({report.completedTodos.length})</div>
              {report.completedTodos.length === 0 ? (
                <div className="text-sm text-content-subtle py-2">No completed activities in this range.</div>
              ) : (
                <div className="flex flex-col gap-1">
                  {report.completedTodos.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-subtle/60">
                      <span className={cx('text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded', t.scope === 'weekly' ? 'bg-accent-soft text-accent' : 'bg-surface-subtle text-content-muted')}>{t.scope}</span>
                      <span className="flex-1 text-sm text-content truncate">{t.text}</span>
                      <span className="tabular text-xs text-content-subtle">{t.completedAt ? prettyDate(dayKey(new Date(t.completedAt))) : ''} {prettyTime(t.completedAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
