'use client'
import type { ReactNode } from 'react'
import { Card, cx } from './ui'
import { ChevronDownIcon, ChevronUpIcon, GripIcon } from './Icons'

export function Panel({
  title,
  icon,
  headerRight,
  collapsed,
  onToggleCollapse,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  children
}: {
  title: string
  icon?: ReactNode
  headerRight?: ReactNode
  collapsed: boolean
  onToggleCollapse: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  children: ReactNode
}): JSX.Element {
  return (
    <Card className="overflow-hidden animate-fade-in">
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-2 min-w-0 flex-1 text-left"
          aria-expanded={!collapsed}
        >
          <span className={cx('text-content-subtle transition-transform', collapsed ? '-rotate-90' : '')}>
            <ChevronDownIcon width={18} height={18} />
          </span>
          {icon && <span className="text-accent shrink-0">{icon}</span>}
          <h2 className="text-sm font-semibold uppercase tracking-wide text-content truncate font-display">
            {title}
          </h2>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          {headerRight}
          <div className="mx-1 h-5 w-px bg-border" />
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="rounded-lg p-1.5 text-content-subtle hover:bg-surface-subtle hover:text-content disabled:opacity-25 transition"
            aria-label="Move section up"
          >
            <ChevronUpIcon width={16} height={16} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="rounded-lg p-1.5 text-content-subtle hover:bg-surface-subtle hover:text-content disabled:opacity-25 transition"
            aria-label="Move section down"
          >
            <ChevronDownIcon width={16} height={16} />
          </button>
          <span className="text-content-subtle/50 pl-0.5">
            <GripIcon width={16} height={16} />
          </span>
        </div>
      </div>
      {!collapsed && <div className="px-4 pb-4">{children}</div>}
    </Card>
  )
}
