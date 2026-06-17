'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useStore } from '@/lib/useStore'
import { useScheduler } from '@/lib/scheduler'
import { Sidebar } from '@/components/Sidebar'
import { NotificationToast } from '@/components/NotificationToast'
import { Login } from '@/features/auth/Login'
import { Onboarding } from '@/features/onboarding/Onboarding'
import { Dashboard } from '@/features/dashboard/Dashboard'
import { WeeklyTodos } from '@/features/weekly/WeeklyTodos'
import { Analytics } from '@/features/analytics/Analytics'
import { Reports } from '@/features/reports/Reports'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { RecoveryModal } from '@/features/recovery/RecoveryModal'
import { SummaryModal } from '@/features/summary/SummaryModal'
import { ClockIcon } from '@/components/Icons'

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

  useScheduler()

  useEffect(() => {
    void init()
    // Register the service worker so the app is installable as a PWA (and ready
    // for Web Push). Safe no-op if unsupported.
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
        void init()
      }
    })
    return () => data.subscription.unsubscribe()
  }, [init])

  return (
    <main className="h-screen w-screen">
      {!ready ? (
        <Loading />
      ) : !authed ? (
        <Login />
      ) : !settings?.onboarded ? (
        <Onboarding />
      ) : (
        <div className="h-full w-full flex bg-surface text-content">
          <Sidebar />
          <div className="flex-1 min-w-0">
            {route === 'dashboard' && <Dashboard />}
            {route === 'weekly' && <WeeklyTodos />}
            {route === 'analytics' && <Analytics />}
            {route === 'reports' && <Reports />}
            {route === 'settings' && <SettingsPage />}
          </div>
          <RecoveryModal />
          <SummaryModal />
          <NotificationToast />
        </div>
      )}
    </main>
  )
}
