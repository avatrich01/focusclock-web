'use client'
import { useStore } from '@/lib/useStore'
import { useNow } from '@/lib/hooks'
import { useLayout } from '@/lib/useLayout'
import { Card, cx } from '@/components/ui'
import { Panel } from '@/components/Panel'
import { Timeline } from '../timeline/Timeline'
import { TodoList } from '../todos/TodoList'
import { ClockIcon, FlameIcon, ListChecksIcon } from '@/components/Icons'
import { WEEKDAY_LONG, formatDuration, formatLongDate, formatTime, formatClock, minutesOfDay } from '@/lib/time'
import {
  isWorkingNow,
  totalWorkMinutes,
  workMinutesElapsed,
  workMinutesLeft
} from '@/lib/schedule'
import { greeting, vibeCheck, type VibeTone } from '@/lib/vibe'

const SECTIONS = ['todos', 'timeline'] as const

function Metric({ value, label, tone }: { value: string; label: string; tone?: string }): JSX.Element {
  return (
    <div>
      <div className={cx('text-2xl sm:text-3xl font-bold tabular font-display leading-none', tone ?? 'text-content')}>
        {value}
      </div>
      <div className="text-[11px] sm:text-xs text-content-subtle mt-1">{label}</div>
    </div>
  )
}

export function Dashboard(): JSX.Element {
  const today = useStore((s) => s.today)
  const settings = useStore((s) => s.settings)
  const dailyTodos = useStore((s) => s.dailyTodos)
  const addDailyTodo = useStore((s) => s.addDailyTodo)
  const toggleDailyTodo = useStore((s) => s.toggleDailyTodo)
  const updateDailyTodo = useStore((s) => s.updateDailyTodo)
  const setDailyTodoReminder = useStore((s) => s.setDailyTodoReminder)
  const deleteDailyTodo = useStore((s) => s.deleteDailyTodo)

  const layout = useLayout([...SECTIONS])
  const now = useNow(1000)
  const clockFormat = settings?.clockFormat ?? '12h'
  const nowMin = minutesOfDay(now)

  // Auto-counted hours — straight from the schedule, no Start button.
  const elapsedMin = settings ? workMinutesElapsed(settings, nowMin) : 0
  const leftMin = settings ? workMinutesLeft(settings, nowMin) : 0
  const totalMin = settings ? totalWorkMinutes(settings) : 0
  const progress = totalMin > 0 ? elapsedMin / totalMin : 0
  const working = settings ? isWorkingNow(settings, nowMin) : false

  const tasksTotal = dailyTodos.length
  const tasksDone = dailyTodos.filter((t) => t.done).length
  const tasksLeft = tasksTotal - tasksDone

  const goalMs = (settings?.dailyFocusGoal ?? 360) * 60 * 1000
  const vibe = vibeCheck({
    tasksDone,
    tasksTotal,
    focusMs: elapsedMin * 60000,
    goalMs,
    withinWorkHours: working
  })
  const vibeStyles: Record<VibeTone, string> = {
    great: 'bg-highlight-soft/60 border-highlight/50 shadow-glow-volt',
    ok: 'bg-accent-soft/50 border-accent/40',
    low: 'bg-info-soft/50 border-info/40',
    empty: 'bg-surface-subtle border-border'
  }

  const currentBlock = today && today.currentBlockIndex >= 0 ? today.blocks[today.currentBlockIndex] : null
  const openTodo = dailyTodos.find((t) => !t.done)
  const workingOn = currentBlock?.note || openTodo?.text || null
  const streak = today?.streak.current ?? 0
  const hr = now.getHours()
  const bannerEmoji = hr < 12 ? '☀️' : hr < 17 ? '⚡' : '🌙'

  const panels: Record<(typeof SECTIONS)[number], JSX.Element> = {
    todos: (
      <TodoList
        todos={dailyTodos}
        enableReminders
        clockFormat={clockFormat}
        placeholder="What do you want to get done today?"
        emptyHint="No tasks yet — add your first one above and hit ✓ to save."
        onAdd={(text, rm) => void addDailyTodo(text, rm)}
        onToggle={(id, done) => void toggleDailyTodo(id, done)}
        onUpdate={(id, text) => void updateDailyTodo(id, text)}
        onSetReminder={(id, rm) => void setDailyTodoReminder(id, rm)}
        onDelete={(id) => void deleteDailyTodo(id)}
      />
    ),
    timeline: <Timeline />
  }
  const panelMeta: Record<(typeof SECTIONS)[number], { title: string; icon: JSX.Element }> = {
    todos: { title: 'To-Dos', icon: <ListChecksIcon width={18} height={18} /> },
    timeline: { title: 'Hourly Timeline', icon: <ClockIcon width={18} height={18} /> }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8 py-5 md:py-7 flex flex-col gap-4 sm:gap-5">
        {/* Compact header */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div className="text-content-subtle text-xs font-medium uppercase tracking-wide">
            {WEEKDAY_LONG[now.getDay()]} · {formatLongDate(now)}
          </div>
          <div className="flex items-center gap-3">
            <span className={cx('h-2 w-2 rounded-full', working ? 'bg-success animate-pulse' : 'bg-content-subtle')} />
            <span className="tabular text-base font-semibold text-content font-display">
              {formatTime(now, clockFormat, true)}
            </span>
            <button onClick={layout.reset} className="text-xs text-content-subtle hover:text-content hidden sm:inline" title="Reset layout">
              Reset layout
            </button>
          </div>
        </div>

        {/* HERO — today's stats in a 4-up line + progress. Always on top. */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-content-subtle">Today</span>
            <span className="flex items-center gap-1.5 text-xs text-content-muted">
              <FlameIcon width={14} height={14} className="text-warning" />
              <span className="font-semibold text-content tabular">{streak}d</span> streak
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-4">
            <Metric value={formatDuration(elapsedMin * 60000)} label="hours done" tone="text-accent" />
            <Metric value={formatDuration(leftMin * 60000)} label="hours left" />
            <Metric value={`${tasksDone}`} label="tasks done" tone="text-success" />
            <Metric value={`${tasksLeft}`} label="tasks left" />
          </div>
          <div className="mt-4 h-2.5 rounded-full bg-surface-subtle overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-700"
              style={{ width: `${Math.max(progress * 100, progress > 0 ? 3 : 0)}%` }}
            />
          </div>
        </Card>

        {/* Greeting + what you're on */}
        <Card className="overflow-hidden">
          <div className="flex flex-col sm:flex-row">
            <div className="flex-1 p-5 flex items-center gap-3.5">
              <div className="grid place-items-center h-14 w-14 rounded-2xl bg-accent-soft text-3xl shrink-0">{bannerEmoji}</div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-content">{greeting(settings?.userName ?? '', now)}</h1>
                <p className="text-sm text-content-muted mt-0.5 line-clamp-2">{vibe.headline} — {vibe.sub}</p>
              </div>
            </div>
            <div className="sm:w-64 shrink-0 bg-accent/10 border-t sm:border-t-0 sm:border-l border-border p-5 flex flex-col justify-center">
              <span className="text-xs font-semibold uppercase tracking-wide text-accent">
                {working ? 'Now working on' : 'Up next'}
              </span>
              <div className="text-lg font-bold text-content mt-1 font-display leading-snug break-words">
                {workingOn ?? 'Add a task →'}
              </div>
              {currentBlock && (
                <div className="text-xs text-content-subtle mt-1 tabular">this hour · {formatClock(currentBlock.startMinutes, clockFormat)}</div>
              )}
            </div>
          </div>
        </Card>

        {/* Vibe */}
        <div className={cx('rounded-2xl border-2 px-5 py-4 flex items-center gap-3', vibeStyles[vibe.tone])}>
          <div className="min-w-0">
            <div className="text-lg font-bold tracking-tight text-content font-display">{vibe.headline}</div>
            <div className="text-sm text-content-muted mt-0.5">{vibe.sub}</div>
          </div>
        </div>

        {/* Movable panels */}
        {layout.order.map((id, idx) => {
          const key = id as (typeof SECTIONS)[number]
          const meta = panelMeta[key]
          if (!meta) return null
          return (
            <Panel
              key={key}
              title={meta.title}
              icon={meta.icon}
              collapsed={!!layout.collapsed[key]}
              onToggleCollapse={() => layout.toggleCollapse(key)}
              onMoveUp={() => layout.moveUp(key)}
              onMoveDown={() => layout.moveDown(key)}
              canMoveUp={idx > 0}
              canMoveDown={idx < layout.order.length - 1}
            >
              {panels[key]}
            </Panel>
          )
        })}
      </div>
    </div>
  )
}
