'use client'
import { useEffect, useRef, useState } from 'react'
import type { ClockFormat, Todo } from '@/lib/types'
import { formatClock, parseHHMM, toHHMM } from '@/lib/time'
import { celebrate } from '@/lib/celebrate'
import { cx } from '@/components/ui'
import { BellIcon, CheckIcon, PlusIcon, TrashIcon, XIcon } from '@/components/Icons'

interface TodoListProps {
  todos: Todo[]
  onAdd: (text: string, reminderMinutes: number | null) => void
  onToggle: (id: number, done: boolean) => void
  onUpdate: (id: number, text: string) => void
  onDelete: (id: number) => void
  onSetReminder?: (id: number, reminderMinutes: number | null) => void
  enableReminders?: boolean
  clockFormat?: ClockFormat
  placeholder?: string
  emptyHint?: string
}

function TodoRow({
  todo,
  onToggle,
  onUpdate,
  onDelete,
  onSetReminder,
  enableReminders,
  clockFormat
}: {
  todo: Todo
  onToggle: (id: number, done: boolean) => void
  onUpdate: (id: number, text: string) => void
  onDelete: (id: number) => void
  onSetReminder?: (id: number, reminderMinutes: number | null) => void
  enableReminders?: boolean
  clockFormat: ClockFormat
}): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(todo.text)
  const [editingReminder, setEditingReminder] = useState(false)
  const [flash, setFlash] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => setDraft(todo.text), [todo.text])

  function commit(): void {
    setEditing(false)
    if (draft.trim() && draft !== todo.text) onUpdate(todo.id, draft.trim())
    else if (!draft.trim()) onDelete(todo.id)
  }

  function toggle(): void {
    const completing = !todo.done
    onToggle(todo.id, completing)
    if (completing) {
      celebrate(rowRef.current)
      setFlash(true)
      setTimeout(() => setFlash(false), 700)
    }
  }

  const hasReminder = todo.reminderMinutes !== null

  return (
    <div
      ref={rowRef}
      className={cx(
        'group flex items-center gap-2.5 rounded-xl border-l-2 pl-2 pr-2.5 py-1.5 transition-all duration-300',
        flash && 'ring-2 ring-success bg-success/10',
        todo.done
          ? 'border-transparent hover:bg-surface-subtle/50'
          : 'border-accent/60 bg-surface-subtle/40 hover:bg-surface-subtle/80'
      )}
    >
      <button
        onClick={toggle}
        className={cx(
          'grid place-items-center h-5 w-5 rounded-md border-2 shrink-0 transition-all',
          todo.done ? 'bg-success border-success text-white' : 'border-content-subtle/50 hover:border-accent hover:scale-105'
        )}
        aria-pressed={todo.done}
      >
        {todo.done && <CheckIcon width={13} height={13} />}
      </button>

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              setDraft(todo.text)
              setEditing(false)
            }
          }}
          className="flex-1 bg-transparent text-sm font-medium text-content outline-none border-b border-accent/50"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className={cx(
            'flex-1 min-w-0 text-sm font-medium leading-snug cursor-text break-words',
            todo.done ? 'text-content-subtle line-through' : 'text-content'
          )}
        >
          {todo.text}
        </span>
      )}

      {enableReminders && onSetReminder && (
        <div className="flex items-center gap-1 shrink-0">
          {editingReminder ? (
            <input
              type="time"
              autoFocus
              defaultValue={hasReminder ? toHHMM(todo.reminderMinutes as number) : ''}
              onBlur={() => setEditingReminder(false)}
              onChange={(e) => onSetReminder(todo.id, e.target.value ? parseHHMM(e.target.value) : null)}
              className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-xs tabular text-content outline-none focus:border-accent"
            />
          ) : hasReminder ? (
            <button
              onClick={() => setEditingReminder(true)}
              className="flex items-center gap-1 rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent"
            >
              <BellIcon width={11} height={11} />
              {formatClock(todo.reminderMinutes as number, clockFormat)}
            </button>
          ) : (
            <button
              onClick={() => setEditingReminder(true)}
              className="opacity-0 group-hover:opacity-100 text-content-subtle hover:text-accent transition"
              aria-label="Add reminder"
            >
              <BellIcon width={15} height={15} />
            </button>
          )}
          {hasReminder && (
            <button
              onClick={() => onSetReminder(todo.id, null)}
              className="opacity-0 group-hover:opacity-100 text-content-subtle hover:text-danger transition"
              aria-label="Clear reminder"
            >
              <XIcon width={13} height={13} />
            </button>
          )}
        </div>
      )}

      <button
        onClick={() => onDelete(todo.id)}
        className="opacity-0 group-hover:opacity-100 text-content-subtle hover:text-danger transition shrink-0"
        aria-label="Delete task"
      >
        <TrashIcon width={16} height={16} />
      </button>
    </div>
  )
}

export function TodoList({
  todos,
  onAdd,
  onToggle,
  onUpdate,
  onDelete,
  onSetReminder,
  enableReminders = false,
  clockFormat = '12h',
  placeholder = 'Add a task…',
  emptyHint = 'No tasks yet — add your first one above.'
}: TodoListProps): JSX.Element {
  const [text, setText] = useState('')
  const [reminderOpen, setReminderOpen] = useState(false)
  const [reminder, setReminder] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function save(): void {
    const value = text.trim()
    if (!value) return
    onAdd(value, reminder ? parseHHMM(reminder) : null)
    setText('')
    setReminder('')
    setReminderOpen(false)
    inputRef.current?.focus()
  }

  const done = todos.filter((t) => t.done).length

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-subtle/60 px-3 py-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition">
        <PlusIcon width={18} height={18} className="text-accent shrink-0" />
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-content outline-none placeholder:text-content-subtle"
        />
        {enableReminders &&
          (reminderOpen ? (
            <input
              type="time"
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
              className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-xs tabular text-content outline-none focus:border-accent shrink-0"
            />
          ) : (
            <button
              onClick={() => setReminderOpen(true)}
              className="grid place-items-center h-7 w-7 rounded-lg text-content-subtle hover:text-accent hover:bg-surface-raised transition shrink-0"
              aria-label="Add a reminder time"
              title="Remind me"
            >
              <BellIcon width={16} height={16} />
            </button>
          ))}
        <button
          onClick={save}
          disabled={!text.trim()}
          aria-label="Save task"
          className={cx(
            'grid place-items-center h-7 w-7 rounded-lg transition-all shrink-0',
            text.trim() ? 'bg-accent text-white hover:brightness-110' : 'bg-border text-content-subtle pointer-events-none'
          )}
        >
          <CheckIcon width={16} height={16} />
        </button>
      </div>

      {todos.length > 0 && (
        <div className="px-3 pt-1 text-xs text-content-subtle">
          {done}/{todos.length} done
        </div>
      )}

      <div className="mt-1 flex flex-col">
        {todos.length === 0 ? (
          <div className="px-3 py-4 text-sm text-content-subtle">{emptyHint}</div>
        ) : (
          todos.map((todo) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              onToggle={onToggle}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onSetReminder={onSetReminder}
              enableReminders={enableReminders}
              clockFormat={clockFormat}
            />
          ))
        )}
      </div>
    </div>
  )
}
