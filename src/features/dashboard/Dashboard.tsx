'use client'
import { useStore } from '@/lib/useStore'
import { useNow, liveDurations } from '@/lib/hooks'
import { useLayout } from '@/lib/useLayout'
import { Button, Card, ProgressRing, StatTile, cx } from '@/components/ui'
import { Panel } from '@/components/Panel'
import { Timeline } from '../timeline/Timeline'
import { TodoList } from '../todos/TodoList'
import {
  ClockIcon,
  CoffeeIcon,
  FlameIcon,
  ListChecksIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
  TargetIcon
} from '@/components/Icons'
import { WEEKDAY_LONG, formatDuration, formatLongDate, formatTime, formatClock, minutesOfDay } from '@/lib/time'
import { greeting, vibeCheck, type VibeTone } from '@/lib/vibe'

const SECTIONS = ['todos', 'stats', 'timeline'] as const

function sessionLabel(state: string | undefined): { text: string; tone: string } {
  switch (state) {
    case 'running':
      return { text: 'Working', tone: 'text-success' }
    case 'paused':
      return { text: 'Paused', tone: 'text-warning' }
    case 'stopped':
      return { text: 'Session ended', tone: 'text-content-muted' }
    default:
      return { text: 'Not started', tone: 'text-content-subtle' }
  }
}

export function Dashboard(): JSX.Element {
  const today = useStore((s) => s.today)
  const settings = useStore((s) => s.settings)
  const startWork = useStore((s) => s.startWork)
  const pauseWork = useStore((s) => s.pauseWork)
  const resumeWork = useStore((s) => s.resumeWork)
  const stopWork = useStore((s) => s.stopWork)

  const dailyTodos = useStore((s) => s.dailyTodos)
  const addDailyTodo = useStore((s) => s.addDailyTodo)
  const toggleDailyTodo = useStore((s) => s.toggleDailyTodo)
  const updateDailyTodo = useStore((s) => s.updateDailyTodo)
  const setDailyTodoReminder = useStore((s) => s.setDailyTodoReminder)
  const deleteDailyTodo = useStore((s) => s.deleteDailyTodo)

  const layout = useLayout([...SECTIONS])
  const now = useNow(1000)
  const clockFormat = settings?.clockFormat ?? '12h'

  const session = today?.session ?? null
  const live = liveDurations(session, now.getTime())
  const state = session?.state

  const workBlocks = today?.blocks.filter((b) => b.kind === 'work') ?? []
  const completedTaskHours = workBlocks.filter((b) => b.status === 'completed').length
  const plannedTaskHours = workBlocks.filter((b) => b.note.trim() !== '' || b.status === 'completed').length
  const taskProgress = plannedTaskHours > 0 ? completedTaskHours / plannedTaskHours : 0
  const totalWorkHours = workBlocks.length

  const { text: stateText, tone: stateTone } = sessionLabel(state)
  const currentBlock = today && today.currentBlockIndex >= 0 ? today.blocks[today.currentBlockIndex] : null

  const nowMin = minutesOfDay(now)
  const hoursToGo = workBlocks.filter((b) => b.startMinutes + 60 > nowMin && b.status !== 'completed').length
  const withinWorkHours = !!settings && nowMin >= settings.workStart && nowMin < settings.workEnd
  const goalMs = (settings?.dailyFocusGoal ?? 360) * 60 * 1000
  const focusPct = Math.min(1, live.focusMs / goalMs)
  const tasksDone = dailyTodos.filter((t) => t.done).length
  const vibe = vibeCheck({ tasksDone, tasksTotal: dailyTodos.length, focusMs: live.focusMs, goalMs, withinWorkHours })

  const vibeStyles: Record<VibeTone, string> = {
    great: 'bg-highlight-soft/60 border-highlight/50 shadow-glow-volt',
    ok: 'bg-accent-soft/50 border-accent/40',
    low: 'bg-info-soft/50 border-info/40',
    empty: 'bg-surface-subtle border-border'
  }

  const openTodo = dailyTodos.find((t) => !t.done)
  const workingOn = currentBlock?.note || openTodo?.text || null
  const workingLabel = state === 'running' ? 'Now working on' : 'Focus on'
  const hr = now.getHours()
  const bannerEmoji = hr < 12 ? '☀️' : hr < 17 ? '⚡' : '🌙'

  const controls = (
    <div className="flex items-center gap-1.5">
      {(!state || state === 'idle' || state === 'stopped') && (
        <Button variant="primary" className="px-3 py-1.5 text-xs" onClick={() => void startWork()}>
          <PlayIcon width={14} height={14} /> Start
        </Button>
      )}
      {state === 'running' && (
        <>
          <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => void pauseWork()}>
            <PauseIcon width={14} height={14} /> Pause
          </Button>
          <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => void stopWork()}>
            <StopIcon width={14} height={14} /> Stop
          </Button>
        </>
      )}
      {state === 'paused' && (
        <>
          <Button variant="success" className="px-3 py-1.5 text-xs" onClick={() => void resumeWork()}>
            <PlayIcon width={14} height={14} /> Resume
          </Button>
          <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => void stopWork()}>
            <StopIcon width={14} height={14} /> Stop
          </Button>
        </>
      )}
    </div>
  )

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
    stats: (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 items-center">
        <div className="grid grid-cols-2 gap-3">
          <StatTile icon={<ClockIcon width={16} height={16} />} label="Worked" value={formatDuration(live.workedMs)} accent />
          <StatTile icon={<TargetIcon width={16} height={16} />} label="Focus" value={formatDuration(live.focusMs)} />
          <StatTile icon={<CoffeeIcon width={16} height={16} />} label="Break" value={formatDuration(live.breakMs)} />
          <StatTile icon={<FlameIcon width={16} height={16} />} label="Streak" value={`${today?.streak.current ?? 0}d`} hint={`Best ${today?.streak.longest ?? 0}d`} />
        </div>
        <div className="flex justify-center">
          <ProgressRing progress={taskProgress}>
            {plannedTaskHours > 0 ? (
              <>
                <span className="text-3xl font-bold tabular text-content font-display">{Math.round(taskProgress * 100)}%</span>
                <span className="text-xs text-content-subtle mt-0.5">{completedTaskHours}/{plannedTaskHours} task-hours</span>
              </>
            ) : (
              <>
                <span className="text-2xl font-bold text-content font-display">—</span>
                <span className="text-[11px] text-content-subtle mt-1 px-4 text-center leading-tight">Add a task to an hour to track it</span>
              </>
            )}
          </ProgressRing>
        </div>
      </div>
    ),
    timeline: <Timeline />
  }

  const panelMeta: Record<(typeof SECTIONS)[number], { title: string; icon: JSX.Element; headerRight?: JSX.Element }> = {
    todos: { title: 'To-Dos', icon: <ListChecksIcon width={18} height={18} />, headerRight: controls },
    stats: { title: 'Today’s Stats', icon: <TargetIcon width={18} height={18} /> },
    timeline: { title: 'Hourly Timeline', icon: <ClockIcon width={18} height={18} /> }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-8 py-7 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <div className="text-content-subtle text-xs font-medium uppercase tracking-wide">
            {WEEKDAY_LONG[now.getDay()]} · {formatLongDate(now)}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={cx('h-2.5 w-2.5 rounded-full', state === 'running' ? 'bg-success animate-pulse' : state === 'paused' ? 'bg-warning' : 'bg-content-subtle')} />
              <span className={cx('text-sm font-semibold', stateTone)}>{stateText}</span>
            </div>
            <span className="tabular text-lg font-semibold text-content font-display">{formatTime(now, clockFormat, true)}</span>
            <button onClick={layout.reset} className="text-xs text-content-subtle hover:text-content underline-offset-2 hover:underline" title="Reset section layout">
              Reset layout
            </button>
          </div>
        </div>

        {/* Tracker */}
        <Card className="px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-content-subtle">How you’re doing</span>
            <span className="text-xs text-content-muted tabular">{formatDuration(live.focusMs)} / {Math.round(goalMs / 3600000)}h focus</span>
          </div>
          <div className="h-3 rounded-full bg-surface-subtle overflow-hidden">
            <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.max(focusPct * 100, focusPct > 0 ? 4 : 0)}%` }} />
          </div>
          <div className="flex items-center justify-between gap-4 mt-3 text-sm">
            <div className="text-content-muted">
              <span className="font-bold text-content tabular font-display">{totalWorkHours}</span> hours
              <span className="text-content-subtle"> · </span>
              <span className="font-bold text-success tabular font-display">{completedTaskHours}</span> tasks done
              <span className="text-content-subtle"> · </span>
              <span className="font-bold text-accent tabular font-display">{hoursToGo}</span> more to go
            </div>
            <span className="flex items-center gap-1.5 text-content-muted shrink-0">
              <FlameIcon width={15} height={15} className="text-warning" />
              <span className="font-semibold text-content tabular">{today?.streak.current ?? 0}d</span> streak
            </span>
          </div>
        </Card>

        {/* Banner */}
        <Card className="overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div className="flex-1 p-6 flex items-center gap-4">
              <div className="grid place-items-center h-16 w-16 rounded-2xl bg-accent-soft text-4xl shrink-0">{bannerEmoji}</div>
              <div className="min-w-0">
                <h1 className="text-3xl font-bold tracking-tight text-content">{greeting(settings?.userName ?? '', now)}</h1>
                <p className="text-sm text-content-muted mt-1">{vibe.headline} — {vibe.sub}</p>
              </div>
            </div>
            <div className="md:w-72 shrink-0 bg-accent/10 border-t md:border-t-0 md:border-l border-border p-6 flex flex-col justify-center">
              <span className="text-xs font-semibold uppercase tracking-wide text-accent">{workingLabel}</span>
              <div className="text-lg font-bold text-content mt-1 font-display leading-snug break-words">{workingOn ?? 'Pick a task to lock in →'}</div>
              {currentBlock && <div className="text-xs text-content-subtle mt-1 tabular">this hour · {formatClock(currentBlock.startMinutes, clockFormat)}</div>}
            </div>
          </div>
        </Card>

        {/* Vibe banner */}
        <div className={cx('rounded-2xl border-2 px-5 py-4 animate-fade-in flex items-center gap-3', vibeStyles[vibe.tone])}>
          <div className="min-w-0">
            <div className="text-xl font-bold tracking-tight text-content font-display">{vibe.headline}</div>
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
              headerRight={meta.headerRight}
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
