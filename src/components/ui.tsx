/** Reusable presentational primitives. */
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:brightness-110 active:brightness-95 shadow-sm',
  secondary: 'bg-surface-raised text-content border border-border hover:bg-surface-subtle',
  ghost: 'text-content-muted hover:bg-surface-subtle hover:text-content',
  danger: 'bg-danger text-white hover:brightness-110',
  success: 'bg-success text-white hover:brightness-110'
}

export function Button({
  variant = 'secondary',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }): JSX.Element {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold',
        'transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none select-none active:scale-[0.97]',
        VARIANTS[variant],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }): JSX.Element {
  return (
    <div className={cx('rounded-3xl border border-border bg-surface-raised/90 backdrop-blur', className)}>
      {children}
    </div>
  )
}

export function StatTile({
  icon,
  label,
  value,
  hint,
  accent
}: {
  icon: ReactNode
  label: string
  value: string
  hint?: string
  accent?: boolean
}): JSX.Element {
  return (
    <Card className="p-4 flex flex-col gap-2 animate-fade-in">
      <div className="flex items-center gap-2 text-content-subtle">
        <span className={cx(accent ? 'text-accent' : 'text-content-subtle')}>{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold tabular text-content font-display">{value}</div>
      {hint && <div className="text-xs text-content-subtle">{hint}</div>}
    </Card>
  )
}

export function Toggle({
  checked,
  onChange
}: {
  checked: boolean
  onChange: (v: boolean) => void
}): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 shrink-0',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        checked ? 'bg-accent' : 'bg-content-subtle/40'
      )}
    >
      <span
        className={cx(
          'inline-block h-5 w-5 rounded-full bg-white shadow-md ring-1 ring-black/5 transition-transform duration-200',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
}): JSX.Element {
  return (
    <div className="inline-flex rounded-xl bg-surface-subtle p-1 border border-border-subtle">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5',
            value === o.value ? 'bg-surface-raised text-content shadow-sm' : 'text-content-muted hover:text-content'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ProgressRing({
  progress,
  size = 132,
  stroke = 10,
  children
}: {
  progress: number
  size?: number
  stroke?: number
  children?: ReactNode
}): JSX.Element {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, progress))
  const offset = c * (1 - clamped)
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--border))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

export function Modal({ children, onClose }: { children: ReactNode; onClose?: () => void }): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg animate-scale-in">{children}</div>
    </div>
  )
}
