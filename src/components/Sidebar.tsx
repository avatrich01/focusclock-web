'use client'
import type { ReactNode } from 'react'
import { useStore, type Route } from '@/lib/useStore'
import { isWorkingNow } from '@/lib/schedule'
import { minutesOfDay } from '@/lib/time'
import { cx } from './ui'
import {
  BarChartIcon,
  ClockIcon,
  FileTextIcon,
  FlameIcon,
  HomeIcon,
  ListChecksIcon,
  LogOutIcon,
  SettingsIcon
} from './Icons'

const NAV: { route: Route; label: string; icon: ReactNode }[] = [
  { route: 'dashboard', label: 'Today', icon: <HomeIcon width={18} height={18} /> },
  { route: 'weekly', label: 'Weekly To-Dos', icon: <ListChecksIcon width={18} height={18} /> },
  { route: 'analytics', label: 'Analytics', icon: <BarChartIcon width={18} height={18} /> },
  { route: 'leaderboard', label: 'Leaderboard', icon: <FlameIcon width={18} height={18} /> },
  { route: 'reports', label: 'Reports', icon: <FileTextIcon width={18} height={18} /> },
  { route: 'settings', label: 'Settings', icon: <SettingsIcon width={18} height={18} /> }
]

export function Sidebar({ onNavigate }: { onNavigate?: () => void }): JSX.Element {
  const route = useStore((s) => s.route)
  const setRoute = useStore((s) => s.setRoute)
  const signOut = useStore((s) => s.signOut)
  const settings = useStore((s) => s.settings)

  const working = settings ? isWorkingNow(settings, minutesOfDay()) : false
  const dotClass = working ? 'bg-success animate-pulse' : 'bg-content-subtle'

  return (
    <aside className="w-60 h-full shrink-0 border-r border-border bg-surface-raised md:bg-surface-subtle/60 flex flex-col">
      <div className="flex items-center gap-2.5 px-5 h-16">
        <div className="grid place-items-center h-9 w-9 rounded-xl bg-accent text-white shadow-glow">
          <ClockIcon width={20} height={20} />
        </div>
        <div className="font-display font-bold text-lg text-content tracking-tight">FocusClock</div>
      </div>

      <nav className="flex flex-col gap-1 px-3 mt-2">
        {NAV.map((item) => (
          <button
            key={item.route}
            onClick={() => {
              setRoute(item.route)
              onNavigate?.()
            }}
            className={cx(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              route === item.route
                ? 'bg-surface-raised text-content shadow-sm'
                : 'text-content-muted hover:text-content hover:bg-surface-raised/50'
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto px-3 pb-3 flex flex-col gap-2">
        <button
          onClick={() => void signOut()}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-content-muted hover:text-danger hover:bg-surface-raised/50 transition-colors"
        >
          <LogOutIcon width={18} height={18} />
          Sign out
        </button>
        <div className="px-2 flex items-center gap-2 text-xs text-content-subtle">
          <span className={cx('h-2 w-2 rounded-full', dotClass)} />
          {working ? 'Working hours' : 'Off hours'}
        </div>
      </div>
    </aside>
  )
}
