'use client'
import { parseHHMM, toHHMM } from '@/lib/time'

export function TimeField({
  label,
  value,
  onChange,
  hint
}: {
  label: string
  value: number
  onChange: (minutes: number) => void
  hint?: string
}): JSX.Element {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-content">{label}</span>
      <input
        type="time"
        value={toHHMM(value)}
        onChange={(e) => onChange(parseHHMM(e.target.value))}
        className="rounded-xl border border-border bg-surface-subtle px-3 py-2.5 text-content text-base
                   tabular outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition"
      />
      {hint && <span className="text-xs text-content-subtle">{hint}</span>}
    </label>
  )
}
