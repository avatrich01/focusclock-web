'use client'
import { useStore } from '@/lib/useStore'
import { useNow } from '@/lib/hooks'
import { Card, cx } from '@/components/ui'
import { Timeline } from '../timeline/Timeline'
import { TodoList } from '../todos/TodoList'
import { ClockIcon, FlameIcon, ListChecksIcon, TargetIcon } from '@/components/Icons'
import { WEEKDAY_LONG, formatDuration, formatLongDate, formatTime, formatClock, minutesOfDay } from '@/lib/time'
import { isWorkingNow, totalWorkMinutes, workMinutesElapsed, workMinutesLeft } from '@/lib/schedule'
import { greeting, vibeCheck } from '@/lib/vibe'

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

  const now = useNow(1000)
  const clockFormat = settings?.clockFormat ?? '12h'
  const nowMin = minutesOfDay(now)

  const elapsedMin = settings ? workMinutesElapsed(settings, nowMin) : 0
  const leftMin = settings ? workMinutesLeft(settings, nowMin) : 0
  const totalMin = settings ? totalWorkMinutes(settings) : 0
  const progress = totalMin > 0 ? elapsedMin / totalMin : 0
  const working = settings ? isWorkingNow(settings, nowMin) : false

  const tasksTotal = dailyTodos.length
  const tasksDone = dailyTodos.filter((t) => t.done).length
  const tasksLeft = tasksTotal - tasksDone

  const goalMs = (settings?.dailyFocusGoal ?? 360) * 60 * 1000
  const vibe = vibeCheck({ tasksDone, tasksTotal, focusMs: elapsedMin * 60000, goalMs, withinWorkHours: working })

  const currentBlock = today && today.currentBlockIndex >= 0 ? today.blocks[today.currentBlockIndex] : null
  const openTodo = dailyTodos.find((t) => !t.done)
  const workingOn = currentBlock?.note || openTodo?.text || null
  const streak = today?.streak.current ?? 0
  const hr = now.getHours()
  const bannerEmoji = hr < 12 ? '☀️' : hr < 17 ? '⚡' : '🌙'

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8 py-5 md:py-7 flex flex-col gap-4 sm:gap-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div className="text-content-subtle text-xs font-medium uppercase tracking-wide">
            {WEEKDAY_LONG[now.getDay()]} · {formatLongDate(now)}
          </div>
          <div className="flex items-center gap-3">
            <span className={cx('h-2 w-2 rounded-full', working ? 'bg-success animate-pulse' : 'bg-content-subtle')} />
            <span className="tabular text-base font-semibold text-content font-display">{formatTime(now, clockFormat, true)}</span>
          </div>
        </div>

        {/* Greeting + single supportive line (merged) */}
        <div className="flex items-center gap-3">
          <span className="text-3xl">{bannerEmoji}</span>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-content leading-none">
              {greeting(settings?.userName ?? '', now)}
            </h1>
            <p className="text-sm text-content-muted mt-1">{vibe.sub}</p>
          </div>
        </div>

        {/* Hero — today's stats, 4-up line + progress */}
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

        {/* Right Now + To-Dos on one line (stacks on mobile) */}
        <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-4 sm:gap-5 items-start">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <TargetIcon width={16} height={16} className="text-accent" />
              <span className="text-xs font-semibold uppercase tracking-wide text-accent">Right now</span>
            </div>
            <div className="text-xl font-bold text-content font-display leading-snug break-words">
              {workingOn ?? 'Add a task to lock into →'}
            </div>
            {currentBlock ? (
              <div className="text-xs text-content-subtle mt-2 tabular">
                this hour · {formatClock(currentBlock.startMinutes, clockFormat)}
              </div>
            ) : (
              <div className="text-xs text-content-subtle mt-2">{working ? 'Working hours' : 'Outside work hours'}</div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <ListChecksIcon width={18} height={18} className="text-accent" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-content">To-Dos</h2>
              <span className="ml-auto text-xs text-content-subtle">{tasksDone}/{tasksTotal} done</span>
            </div>
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
          </Card>
        </div>

        {/* Hourly timeline */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <ClockIcon width={18} height={18} className="text-accent" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-content">Hourly Timeline</h2>
          </div>
          <Timeline />
        </Card>
      </div>
    </div>
  )
}
