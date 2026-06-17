'use client'
import { useEffect, useState } from 'react'
import { useStore } from '@/lib/useStore'
import * as db from '@/lib/data'
import { Card, StatTile, cx } from '@/components/ui'
import { BarChartIcon, ChevronRightIcon, ClockIcon, FlameIcon, TargetIcon } from '@/components/Icons'
import { WEEKDAY_SHORT, addDays, dayKey, formatDuration } from '@/lib/time'
import type { WeeklyAnalytics } from '@/lib/types'

function weekRangeLabel(firstDay: string): string {
  const start = new Date(`${firstDay}T00:00:00`)
  const end = new Date(`${addDays(firstDay, 6)}T00:00:00`)
  const fmt = (d: Date): string => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

export function Analytics(): JSX.Element {
  const weekly = useStore((s) => s.weekly)
  const [anchor, setAnchor] = useState(dayKey())
  const [data, setData] = useState<WeeklyAnalytics | null>(weekly)

  useEffect(() => {
    void db.computeWeekly(anchor).then(setData)
  }, [anchor])

  useEffect(() => {
    if (weekly && anchor === dayKey()) setData(weekly)
  }, [weekly, anchor])

  const days = data?.days ?? []
  const maxMs = Math.max(1, ...days.map((d) => d.workedMs))
  const todayKey = dayKey()
  const isCurrentWeek = anchor === todayKey || days.some((d) => d.day === todayKey)

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-8 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <BarChartIcon className="text-accent" width={22} height={22} />
            <h1 className="text-xl font-semibold text-content">Weekly Analytics</h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setAnchor((a) => addDays(a, -7))} className="rounded-lg p-2 text-content-muted hover:bg-surface-subtle rotate-180" aria-label="Previous week">
              <ChevronRightIcon width={18} height={18} />
            </button>
            <span className="text-sm font-medium text-content-muted tabular min-w-[140px] text-center">{data ? weekRangeLabel(data.days[0].day) : '—'}</span>
            <button onClick={() => !isCurrentWeek && setAnchor((a) => addDays(a, 7))} disabled={isCurrentWeek} className="rounded-lg p-2 text-content-muted hover:bg-surface-subtle disabled:opacity-30" aria-label="Next week">
              <ChevronRightIcon width={18} height={18} />
            </button>
          </div>
        </div>

        <Card className="p-6 animate-fade-in">
          <div className="flex items-end justify-between gap-3 h-56">
            {days.map((d, i) => {
              const heightPct = (d.workedMs / maxMs) * 100
              const isToday = d.day === todayKey
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div className="text-[11px] tabular text-content-subtle h-4">{d.workedMs > 0 ? formatDuration(d.workedMs) : ''}</div>
                  <div className="w-full flex-1 flex items-end">
                    <div className={cx('w-full rounded-t-lg transition-all duration-500', isToday ? 'bg-accent' : 'bg-accent/40')} style={{ height: `${Math.max(heightPct, d.workedMs > 0 ? 4 : 0)}%` }} />
                  </div>
                  <div className={cx('text-xs font-medium', isToday ? 'text-accent' : 'text-content-muted')}>{WEEKDAY_SHORT[(i + 1) % 7]}</div>
                </div>
              )
            })}
          </div>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile icon={<ClockIcon width={16} height={16} />} label="Total Weekly" value={formatDuration(data?.totalWorkedMs ?? 0)} accent />
          <StatTile icon={<TargetIcon width={16} height={16} />} label="Daily Average" value={formatDuration(data?.averageDailyMs ?? 0)} />
          <StatTile icon={<FlameIcon width={16} height={16} />} label="Current Streak" value={`${data?.streak.current ?? 0}d`} />
          <StatTile icon={<FlameIcon width={16} height={16} />} label="Longest Streak" value={`${data?.streak.longest ?? 0}d`} />
        </div>

        <Card className="p-2 animate-fade-in">
          {days.map((d, i) => (
            <div key={d.day} className={cx('flex items-center gap-3 px-4 py-3 rounded-xl', d.day === todayKey && 'bg-accent-soft/30')}>
              <span className="w-10 text-sm font-medium text-content">{WEEKDAY_SHORT[(i + 1) % 7]}</span>
              <div className="flex-1 h-2 rounded-full bg-surface-subtle overflow-hidden">
                <div className="h-full rounded-full bg-accent" style={{ width: `${(d.workedMs / maxMs) * 100}%` }} />
              </div>
              <span className="tabular text-sm font-semibold text-content w-20 text-right">{formatDuration(d.workedMs)}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
