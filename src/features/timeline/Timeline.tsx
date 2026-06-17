'use client'
import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/lib/useStore'
import { useNow } from '@/lib/hooks'
import { cx } from '@/components/ui'
import {
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleIcon,
  CoffeeIcon,
  MinusIcon,
  PlayCurrentIcon,
  XIcon
} from '@/components/Icons'
import { celebrate } from '@/lib/celebrate'
import { formatClock, minutesOfDay } from '@/lib/time'
import type { ClockFormat, HourlyBlock } from '@/lib/types'

function StatusIcon({ block, isCurrent }: { block: HourlyBlock; isCurrent: boolean }): JSX.Element {
  if (isCurrent) return <PlayCurrentIcon className="text-accent" width={22} height={22} />
  if (block.status === 'completed') return <CheckCircleIcon className="text-success" width={22} height={22} />
  if (block.status === 'missed') return <XIcon className="text-danger" width={20} height={20} />
  if (block.status === 'worked')
    return (
      <span className="grid h-[22px] w-[22px] place-items-center" title="Worked, no task logged">
        <span className="h-2.5 w-2.5 rounded-full bg-content-subtle/70" />
      </span>
    )
  if (block.kind === 'lunch') return <CoffeeIcon className="text-warning" width={20} height={20} />
  return <CircleIcon className="text-content-subtle" width={20} height={20} />
}

function BlockRow({
  block,
  isCurrent,
  isPast,
  clockFormat,
  locked,
  onReschedule
}: {
  block: HourlyBlock
  isCurrent: boolean
  isPast: boolean
  clockFormat: ClockFormat
  locked: boolean
  onReschedule: (block: HourlyBlock) => void
}): JSX.Element {
  const setBlockNote = useStore((s) => s.setBlockNote)
  const setBlockStatus = useStore((s) => s.setBlockStatus)
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState(block.note)

  useEffect(() => setDraft(block.note), [block.note])

  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (isCurrent) ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [isCurrent])

  const isFuture = block.status === 'pending' && !isCurrent && !isPast

  function commitNote(): void {
    if (draft !== block.note) void setBlockNote(block.id, draft)
  }

  const taskText = block.note
    ? block.note
    : isPast
      ? '—'
      : block.kind === 'lunch'
        ? block.label || 'Break'
        : '+ Add a task'

  return (
    <div ref={ref} className="relative pl-12">
      <div className="absolute left-[18px] top-3.5 -translate-x-1/2">
        <StatusIcon block={block} isCurrent={isCurrent} />
      </div>

      <div
        className={cx(
          'rounded-2xl border px-4 py-3 transition-colors duration-200',
          locked ? 'cursor-default' : 'cursor-pointer',
          isCurrent
            ? 'border-2 border-accent bg-accent-soft/40'
            : block.status === 'completed'
              ? 'border-border-subtle bg-surface-raised/60'
              : block.status === 'missed'
                ? 'border-danger/30 bg-danger/5'
                : 'border-border-subtle bg-surface-subtle/50',
          isFuture && 'opacity-70'
        )}
        onClick={() => {
          if (!locked) setExpanded((v) => !v)
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className={cx(
              'tabular font-display font-semibold shrink-0',
              isCurrent ? 'text-accent text-base' : 'text-content-muted text-sm'
            )}
          >
            {formatClock(block.startMinutes, clockFormat)}
          </span>

          <span
            className={cx(
              'flex-1 min-w-0 truncate font-display tracking-tight',
              block.note
                ? 'text-base font-bold text-content'
                : !isPast && block.kind === 'work'
                  ? 'text-sm font-semibold text-accent'
                  : 'text-sm font-medium text-content-subtle italic'
            )}
          >
            {taskText}
          </span>

          {block.kind === 'lunch' && (
            <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-warning">
              {block.label || 'Break'}
            </span>
          )}
          {isCurrent && (
            <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
              Now
            </span>
          )}
          {block.status === 'completed' && !isCurrent && (
            <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-success">
              Done
            </span>
          )}
          {block.status === 'missed' && (
            <span className="shrink-0 rounded-full bg-danger/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-danger">
              Missed
            </span>
          )}
          {locked && (
            <span className="shrink-0 text-content-subtle" title="Locked — past hours can't be edited">
              🔒
            </span>
          )}
        </div>

        {expanded && (
          <div className="mt-3 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitNote}
              placeholder="What are you working on this hour?"
              rows={2}
              className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm text-content outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
            {isPast ? (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    void setBlockStatus(block.id, 'completed')
                    celebrate()
                  }}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-success hover:bg-success/10"
                >
                  <CheckIcon width={13} height={13} /> Mark done
                </button>
                <button onClick={() => void setBlockStatus(block.id, 'missed')} className="rounded-lg px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger/10">
                  Mark missed
                </button>
                {block.note.trim() && (
                  <button onClick={() => onReschedule(block)} className="rounded-lg px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/10">
                    Reschedule →
                  </button>
                )}
                <button onClick={() => void setBlockStatus(block.id, 'pending')} className="rounded-lg px-2.5 py-1 text-xs font-medium text-content-muted hover:bg-surface-subtle">
                  Reset
                </button>
              </div>
            ) : (
              <div className="text-xs text-content-subtle">
                Add your task now — you can mark it done or missed once the hour passes.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function Timeline(): JSX.Element {
  const today = useStore((s) => s.today)
  const clockFormat = useStore((s) => s.settings?.clockFormat ?? '12h')
  const lockPastBlocks = useStore((s) => s.settings?.lockPastBlocks ?? false)
  const setBlockNote = useStore((s) => s.setBlockNote)
  const setBlockStatus = useStore((s) => s.setBlockStatus)
  const now = useNow(15000)
  const [showPast, setShowPast] = useState(false)

  if (!today) return <div />

  const nowMin = minutesOfDay(now)
  const blocks = today.blocks
  const isPastBlock = (b: HourlyBlock, i: number): boolean =>
    i !== today.currentBlockIndex && b.startMinutes + 60 <= nowMin

  const past = blocks.filter((b, i) => isPastBlock(b, i))
  const rest = blocks.filter((b, i) => !isPastBlock(b, i))
  const doneCount = past.filter((b) => b.status === 'completed').length
  const missedCount = past.filter((b) => b.status === 'missed').length
  const emptyCount = past.length - doneCount - missedCount

  // Move a task to the next free upcoming hour today.
  const reschedule = (block: HourlyBlock): void => {
    const target = blocks.find(
      (b) => b.kind === 'work' && b.startMinutes + 60 > nowMin && !b.note.trim() && b.id !== block.id
    )
    if (!target) {
      window.alert('No free hour left today to reschedule into.')
      return
    }
    void setBlockNote(target.id, block.note)
    void setBlockNote(block.id, '')
    void setBlockStatus(block.id, 'missed')
  }

  const renderRow = (block: HourlyBlock): JSX.Element => {
    const i = blocks.indexOf(block)
    const isCurrent = i === today.currentBlockIndex
    const isPast = isPastBlock(block, i)
    return (
      <BlockRow
        key={block.id}
        block={block}
        isCurrent={isCurrent}
        isPast={isPast}
        clockFormat={clockFormat}
        locked={lockPastBlocks && isPast}
        onReschedule={reschedule}
      />
    )
  }

  return (
    <div className="relative">
      <div className="absolute left-[18px] top-2 bottom-2 w-px bg-border" />
      <div className="flex flex-col gap-2">
        {past.length > 0 && (
          <button
            onClick={() => setShowPast((v) => !v)}
            className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-surface-subtle/70 transition-colors text-left"
          >
            <span className={cx('text-content-subtle transition-transform shrink-0', showPast ? '' : '-rotate-90')}>
              <ChevronDownIcon width={16} height={16} />
            </span>
            <span className="text-sm font-semibold text-content">Earlier today</span>
            <span className="ml-auto flex items-center gap-2.5 text-xs font-medium shrink-0">
              <span className="flex items-center gap-0.5 text-success"><CheckIcon width={12} height={12} />{doneCount}</span>
              <span className="flex items-center gap-0.5 text-danger"><XIcon width={12} height={12} />{missedCount}</span>
              <span className="flex items-center gap-0.5 text-content-subtle"><MinusIcon width={12} height={12} />{emptyCount}</span>
            </span>
          </button>
        )}

        {showPast && past.map(renderRow)}

        {rest.length > 0 ? (
          rest.map(renderRow)
        ) : (
          <div className="rounded-xl px-3 py-4 text-sm text-content-subtle">
            That’s every hour for today — nice work. Expand “Earlier today” to review.
          </div>
        )}
      </div>
    </div>
  )
}
