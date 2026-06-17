'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useStore } from '@/lib/useStore'
import { Button, Card } from '@/components/ui'
import { ClockIcon, SparkleIcon } from '@/components/Icons'

/** Shown after the user clicks a password-reset link (PASSWORD_RECOVERY). */
export function ResetPassword(): JSX.Element {
  const setRecovering = useStore((s) => s.setRecovering)
  const init = useStore((s) => s.init)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(): Promise<void> {
    setError(null)
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords don’t match.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setDone(true)
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-surface">
      <div className="min-h-full w-full flex items-center justify-center p-5">
        <Card className="w-full max-w-md p-6 sm:p-8 animate-scale-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="grid place-items-center h-12 w-12 rounded-2xl bg-accent text-white shadow-glow">
              <ClockIcon width={26} height={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-content">Set a new password</h1>
              <p className="text-sm text-content-muted">Almost there — pick a new password.</p>
            </div>
          </div>

          {done ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl bg-success/10 border border-success/30 px-4 py-3 text-sm text-content">
                Password updated ✅ You&apos;re all set.
              </div>
              <Button
                variant="primary"
                className="w-full py-3"
                onClick={() => {
                  setRecovering(false)
                  void init()
                }}
              >
                Continue to FocusClock
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-content">New password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="rounded-xl border border-border bg-surface-subtle px-3 py-2.5 text-content text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-content">Confirm password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void submit()
                  }}
                  placeholder="Re-enter it"
                  className="rounded-xl border border-border bg-surface-subtle px-3 py-2.5 text-content text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                />
              </label>
              {error && <div className="text-sm text-danger">{error}</div>}
              <Button variant="primary" className="w-full py-3" disabled={loading} onClick={submit}>
                <SparkleIcon width={18} height={18} />
                {loading ? 'Saving…' : 'Update password'}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
