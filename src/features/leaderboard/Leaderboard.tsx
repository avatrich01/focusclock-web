'use client'
import { useEffect, useState } from 'react'
import { useStore } from '@/lib/useStore'
import * as db from '@/lib/data'
import { Button, Card, cx } from '@/components/ui'
import { FlameIcon, ListChecksIcon, RefreshIcon, TargetIcon } from '@/components/Icons'
import { formatDuration } from '@/lib/time'
import type { LeaderboardEntry } from '@/lib/types'

function medal(rank: number): string {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''
}

export function Leaderboard(): JSX.Element {
  const userId = useStore((s) => s.userId)
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(null)
  const [busy, setBusy] = useState(false)

  async function load(): Promise<void> {
    setBusy(true)
    await db.updateLeaderboardEntry().catch(() => {})
    setRows(await db.getLeaderboard())
    setBusy(false)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const myRank = rows && userId ? rows.findIndex((r) => r.userId === userId) + 1 : 0
  const me = rows?.find((r) => r.userId === userId)

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 md:px-8 py-6 md:py-8 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlameIcon className="text-warning" width={22} height={22} />
            <h1 className="text-xl font-semibold text-content">Leaderboard</h1>
          </div>
          <Button onClick={() => void load()} disabled={busy} className="px-3 py-1.5 text-xs">
            <RefreshIcon width={14} height={14} /> {busy ? 'Updating…' : 'Refresh'}
          </Button>
        </div>

        {/* Your standing */}
        <Card className="p-5 border-accent/30">
          <div className="flex items-center gap-4">
            <div className="grid place-items-center h-14 w-14 rounded-2xl bg-accent text-white text-2xl font-bold font-display shrink-0">
              {myRank > 0 ? `#${myRank}` : '—'}
            </div>
            <div className="min-w-0">
              <div className="text-sm text-content-muted">Your rank this week</div>
              <div className="text-2xl font-bold text-content font-display tabular">
                {me ? `${me.points} pts` : '0 pts'}
              </div>
              {me && (
                <div className="text-xs text-content-subtle mt-0.5 flex flex-wrap gap-x-3">
                  <span><TargetIcon width={12} height={12} className="inline -mt-0.5 text-accent" /> {formatDuration(me.focusMs)}</span>
                  <span><ListChecksIcon width={12} height={12} className="inline -mt-0.5 text-success" /> {me.tasksDone} tasks</span>
                  <span><FlameIcon width={12} height={12} className="inline -mt-0.5 text-warning" /> {me.streak}d streak</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-content-subtle mt-3">
            Points = focus hours ×10 + tasks ×5 + streak ×15. Resets focus each week.
          </p>
        </Card>

        {/* Ranking */}
        <Card className="p-2 animate-fade-in">
          {rows === null ? (
            <div className="px-4 py-6 text-sm text-content-subtle">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-6 text-sm text-content-subtle">
              No one on the board yet — finish a task to get on it 🔥
            </div>
          ) : (
            rows.map((r, i) => {
              const rank = i + 1
              const isMe = r.userId === userId
              return (
                <div
                  key={r.userId}
                  className={cx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl',
                    isMe ? 'bg-accent-soft/50 ring-1 ring-accent/30' : 'hover:bg-surface-subtle/60'
                  )}
                >
                  <span className="w-7 text-center font-bold tabular font-display text-content-muted">
                    {medal(rank) || rank}
                  </span>
                  <span className="grid place-items-center h-8 w-8 rounded-full bg-surface-subtle text-content-muted text-xs font-bold shrink-0">
                    {(r.name || '?').slice(0, 2).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-content truncate">
                      {r.name} {isMe && <span className="text-xs text-accent font-medium">(you)</span>}
                    </div>
                    <div className="text-[11px] text-content-subtle tabular">
                      {formatDuration(r.focusMs)} · {r.tasksDone} tasks · {r.streak}d
                    </div>
                  </div>
                  <span className="font-bold tabular font-display text-content shrink-0">{r.points}</span>
                </div>
              )
            })
          )}
        </Card>

        <p className="text-xs text-content-subtle text-center">
          Everyone signed in appears here by their name (set it in Settings). Don&apos;t want to show
          up? Leave your name blank — you&apos;ll appear as “Anonymous”.
        </p>
      </div>
    </div>
  )
}
