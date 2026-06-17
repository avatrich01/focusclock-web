'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useStore } from '@/lib/useStore'
import { useScheduler } from '@/lib/scheduler'
import { Sidebar } from '@/components/Sidebar'
import { NotificationToast } from '@/components/NotificationToast'
import { Login } from '@/features/auth/Login'
import { ResetPassword } from '@/features/auth/ResetPassword'
import { Onboarding } from '@/features/onboarding/Onboarding'
import { Dashboard } from '@/features/dashboard/Dashboard'
import { WeeklyTodos } from '@/features/weekly/WeeklyTodos'
import { Analytics } from '@/features/analytics/Analytics'
import { Leaderboard } from '@/features/leaderboard/Leaderboard'
import { Reports } from '@/features/reports/Reports'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { SummaryModal } from '@/features/summary/SummaryModal'
import { ClockIcon, MenuIcon } from '@/components/Icons'

function Loading(): JSX.Element {
  return (
    <div className="h-full w-full grid place-items-center bg-surface">
      <div className="flex flex-col items-center gap-3 animate-fade-in">
        <div className="grid place-items-center h-12 w-12 rounded-2xl bg-accent text-white animate-pulse-glow">
          <ClockIcon width={26} height={26} />
        </div>
        <span className="text-sm text-content-muted">Loading FocusClock…</span>
      </div>
    </div>
  )
}

export default function Page(): JSX.Element {
  const ready = useStore((s) => s.ready)
  const authed = useStore((s) => s.authed)
  const settings = useStore((s) => s.settings)
  const route = useStore((s) => s.route)
  const init = useStore((s) => s.init)
  const recovering = useStore((s) => s.recovering)
  const [menuOpen, setMenuOpen] = useState(false)

  useScheduler()

  // Accept a peer-group invite link: ?join=CODE
  useEffect(() => {
    if (!authed || !settings?.onboarded || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const code = params.get('join')
    if (!code) return
    void useStore.getState().setGroupCode(code.toUpperCase())
    useStore.getState().setRoute('leaderboard')
    params.delete('join')
    const qs = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash)
  }, [authed, settings?.onboarded])

  useEffect(() => {
    void init()
    // Register the service worker so the app is installable as a PWA (and ready
    // for Web Push). Safe no-op if unsupported.
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        useStore.getState().setRecovering(true)
        return
      }
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
        void init()
      }
    })
    return () => data.subscription.unsubscribe()
  }, [init])

  return (
    <main className="h-screen w-screen">
      {recovering ? (
        <ResetPassword />
      ) : !ready ? (
        <Loading />
      ) : !authed ? (
        <Login />
      ) : !settings?.onboarded ? (
        <Onboarding />
      ) : (
        <div className="h-full w-full flex flex-col md:flex-row bg-surface text-content">
          {/* Mobile top bar */}
          <header className="md:hidden flex items-center gap-3 h-14 px-4 border-b border-border bg-surface-subtle/70 shrink-0">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="grid place-items-center h-9 w-9 rounded-xl text-content hover:bg-surface-raised"
            >
              <MenuIcon width={22} height={22} />
            </button>
            <div className="flex items-center gap-2">
              <div className="grid place-items-center h-8 w-8 rounded-lg bg-accent text-white">
                <ClockIcon width={18} height={18} />
              </div>
              <span className="font-display font-bold text-content">FocusClock</span>
            </div>
          </header>

          {/* Desktop sidebar */}
          <div className="hidden md:flex">
            <Sidebar />
          </div>

          {/* Mobile drawer */}
          {menuOpen && (
            <div className="md:hidden fixed inset-0 z-40">
              <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={() => setMenuOpen(false)} />
              <div className="absolute left-0 top-0 h-full animate-slide-in-left">
                <Sidebar onNavigate={() => setMenuOpen(false)} />
              </div>
            </div>
          )}

          <div className="flex-1 min-w-0 min-h-0">
            {route === 'dashboard' && <Dashboard />}
            {route === 'weekly' && <WeeklyTodos />}
            {route === 'analytics' && <Analytics />}
            {route === 'leaderboard' && <Leaderboard />}
            {route === 'reports' && <Reports />}
            {route === 'settings' && <SettingsPage />}
          </div>
          <SummaryModal />
          <NotificationToast />
        </div>
      )}
    </main>
  )
}
