'use client'
import { useCallback, useEffect, useState } from 'react'
import { useStore } from '@/lib/useStore'
import * as db from '@/lib/data'
import { Button, Card, cx } from '@/components/ui'
import { FlameIcon, ListChecksIcon, RefreshIcon, TargetIcon } from '@/components/Icons'
import { formatDuration } from '@/lib/time'
import type { LeaderboardEntry } from '@/lib/types'

type Scope = 'global' | 'peers'

function medal(rank: number): string {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''
}
function newCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

function Row({ r, rank, isMe }: { r: LeaderboardEntry; rank: number; isMe: boolean }): JSX.Element {
  return (
    <div className={cx('flex items-center gap-3 px-3 py-2.5 rounded-xl', isMe ? 'bg-accent-soft/50 ring-1 ring-accent/30' : 'hover:bg-surface-subtle/60')}>
      <span className="w-7 text-center font-bold tabular font-display text-content-muted">{medal(rank) || rank}</span>
      <span className="grid place-items-center h-8 w-8 rounded-full bg-surface-subtle text-content-muted text-xs font-bold shrink-0">
        {(r.name || '?').slice(0, 2).toUpperCase()}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-content truncate">
          {r.linkUrl ? (
            <a href={r.linkUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-accent">
              {r.name}
            </a>
          ) : (
            r.name
          )}
          {isMe && <span className="text-xs text-accent font-medium"> (you)</span>}
        </div>
        <div className="text-[11px] text-content-subtle tabular">
          {formatDuration(r.focusMs)} · {r.tasksDone} tasks · {r.streak}d
        </div>
      </div>
      <span className="font-bold tabular font-display text-content shrink-0">{r.points}</span>
    </div>
  )
}

export function Leaderboard(): JSX.Element {
  const userId = useStore((s) => s.userId)
  const settings = useStore((s) => s.settings)
  const setGroupCode = useStore((s) => s.setGroupCode)
  const groupCode = settings?.groupCode ?? ''

  const [scope, setScope] = useState<Scope>('global')
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [joinInput, setJoinInput] = useState('')
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    await db.updateLeaderboardEntry().catch(() => {})
    if (scope === 'peers' && !groupCode) {
      setRows([])
    } else {
      setRows(await db.getLeaderboard(scope === 'peers' ? groupCode : undefined))
    }
    setBusy(false)
  }, [scope, groupCode])

  useEffect(() => {
    void load()
  }, [load])

  const myRank = rows && userId ? rows.findIndex((r) => r.userId === userId) + 1 : 0
  const me = rows?.find((r) => r.userId === userId)

  async function copyInvite(): Promise<void> {
    const url = `${window.location.origin}/?join=${groupCode}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

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

        {/* Scope tabs */}
        <div className="inline-flex rounded-xl bg-surface-subtle p-1 border border-border-subtle self-start">
          {(['global', 'peers'] as Scope[]).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={cx(
                'px-4 py-1.5 rounded-lg text-sm font-semibold transition-all',
                scope === s ? 'bg-surface-raised text-content shadow-sm' : 'text-content-muted hover:text-content'
              )}
            >
              {s === 'global' ? 'Global' : 'Peers'}
            </button>
          ))}
        </div>

        {/* Your standing */}
        <Card className="p-5 border-accent/30">
          <div className="flex items-center gap-4">
            <div className="grid place-items-center h-14 w-14 rounded-2xl bg-accent text-white text-2xl font-bold font-display shrink-0">
              {myRank > 0 ? `#${myRank}` : '—'}
            </div>
            <div className="min-w-0">
              <div className="text-sm text-content-muted">Your rank · {scope === 'peers' ? 'peers' : 'global'}</div>
              <div className="text-2xl font-bold text-content font-display tabular">{me ? `${me.points} pts` : '0 pts'}</div>
              {me && (
                <div className="text-xs text-content-subtle mt-0.5 flex flex-wrap gap-x-3">
                  <span><TargetIcon width={12} height={12} className="inline -mt-0.5 text-accent" /> {formatDuration(me.focusMs)}</span>
                  <span><ListChecksIcon width={12} height={12} className="inline -mt-0.5 text-success" /> {me.tasksDone} tasks</span>
                  <span><FlameIcon width={12} height={12} className="inline -mt-0.5 text-warning" /> {me.streak}d streak</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-content-subtle mt-3">Points = focus hours ×10 + tasks ×5 + streak ×15. Focus resets weekly.</p>
        </Card>

        {/* Peers: group management */}
        {scope === 'peers' &&
          (groupCode ? (
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-content-subtle">Your group</div>
                  <div className="text-2xl font-bold font-display tabular text-content tracking-wider">{groupCode}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="primary" onClick={copyInvite}>{copied ? 'Copied!' : 'Share invite link'}</Button>
                  <Button variant="ghost" onClick={() => void setGroupCode('')}>Leave</Button>
                </div>
              </div>
              <p className="text-xs text-content-subtle mt-3">Send the link — anyone who opens it joins this group and shows up below.</p>
            </Card>
          ) : (
            <Card className="p-5 flex flex-col gap-4">
              <div>
                <div className="text-base font-bold text-content font-display">Compete with your people</div>
                <p className="text-sm text-content-muted mt-1">Start a private group and share the link, or join one with a code.</p>
              </div>
              <Button variant="primary" className="self-start" onClick={() => void setGroupCode(newCode())}>
                Create a group
              </Button>
              <div className="flex items-center gap-2">
                <input
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                  placeholder="Enter a code"
                  className="flex-1 rounded-xl border border-border bg-surface-subtle px-3 py-2.5 text-content text-sm tabular tracking-wider outline-none focus:border-accent"
                />
                <Button onClick={() => joinInput.trim() && void setGroupCode(joinInput.trim())}>Join</Button>
              </div>
            </Card>
          ))}

        {/* Ranking */}
        {(scope === 'global' || groupCode) && (
          <Card className="p-2 animate-fade-in">
            {rows === null ? (
              <div className="px-4 py-6 text-sm text-content-subtle">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="px-4 py-6 text-sm text-content-subtle">
                {scope === 'peers' ? 'No one here yet — share your invite link 🔥' : 'No one on the board yet — finish a task to get on it 🔥'}
              </div>
            ) : (
              rows.map((r, i) => <Row key={r.userId} r={r} rank={i + 1} isMe={r.userId === userId} />)
            )}
          </Card>
        )}

        <p className="text-xs text-content-subtle text-center">
          You appear by your name (set in Settings). Leave your name blank to show as “Anonymous”.
        </p>
      </div>
    </div>
  )
}
