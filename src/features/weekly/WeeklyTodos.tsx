'use client'
import { useCallback, useEffect, useState } from 'react'
import type { Todo } from '@/lib/types'
import * as db from '@/lib/data'
import { Card } from '@/components/ui'
import { ChevronRightIcon, ListChecksIcon } from '@/components/Icons'
import { TodoList } from '../todos/TodoList'
import { addDays, dayKey, startOfWeek } from '@/lib/time'

function weekLabel(monday: string): string {
  const start = new Date(`${monday}T00:00:00`)
  const end = new Date(`${addDays(monday, 6)}T00:00:00`)
  const fmt = (d: Date): string => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

export function WeeklyTodos(): JSX.Element {
  const [bucket, setBucket] = useState(() => startOfWeek(dayKey()))
  const [todos, setTodos] = useState<Todo[]>([])

  const refresh = useCallback(async () => {
    setTodos(await db.listTodos('weekly', bucket))
  }, [bucket])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const isCurrentWeek = bucket === startOfWeek(dayKey())

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-8 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <ListChecksIcon className="text-accent" width={22} height={22} />
            <h1 className="text-xl font-semibold text-content">Weekly To-Dos</h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setBucket((b) => addDays(b, -7))} className="rounded-lg p-2 text-content-muted hover:bg-surface-subtle rotate-180" aria-label="Previous week">
              <ChevronRightIcon width={18} height={18} />
            </button>
            <span className="text-sm font-medium text-content-muted tabular min-w-[140px] text-center">{weekLabel(bucket)}</span>
            <button onClick={() => !isCurrentWeek && setBucket((b) => addDays(b, 7))} disabled={isCurrentWeek} className="rounded-lg p-2 text-content-muted hover:bg-surface-subtle disabled:opacity-30" aria-label="Next week">
              <ChevronRightIcon width={18} height={18} />
            </button>
          </div>
        </div>

        <Card className="p-5 animate-fade-in">
          <TodoList
            todos={todos}
            placeholder="Add a weekly goal…"
            emptyHint="No weekly goals yet — set a few to aim for this week."
            onAdd={async (text) => setTodos(await db.addTodo(text, 'weekly', bucket))}
            onToggle={async (id, done) => setTodos(await db.setTodoDone(id, done, 'weekly', bucket))}
            onUpdate={async (id, text) => setTodos(await db.updateTodoText(id, text, 'weekly', bucket))}
            onDelete={async (id) => setTodos(await db.deleteTodo(id, 'weekly', bucket))}
          />
        </Card>
      </div>
    </div>
  )
}
