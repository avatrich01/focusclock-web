'use client'
import { useState } from 'react'
import { supabase, hasSupabaseEnv } from '@/lib/supabaseClient'
import { Button, Card, cx } from '@/components/ui'
import { ClockIcon, SparkleIcon } from '@/components/Icons'

type Mode = 'login' | 'signup' | 'forgot'

export function Login(): JSX.Element {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function go(m: Mode): void {
    setMode(m)
    setError(null)
    setInfo(null)
  }

  async function submit(): Promise<void> {
    setError(null)
    setInfo(null)

    if (mode === 'forgot') {
      if (!email.trim()) {
        setError('Enter your email.')
        return
      }
      setLoading(true)
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
      })
      setLoading(false)
      if (error) setError(error.message)
      else setInfo('Check your email for a link to reset your password.')
      return
    }

    if (!email.trim() || !password) {
      setError('Enter your email and a password.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      setLoading(false)
      if (error) setError(error.message)
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined }
      })
      setLoading(false)
      if (error) setError(error.message)
      else if (!data.session) {
        setInfo('Account created! Check your email to confirm, then log in.')
        setMode('login')
      }
    }
  }

  const cta = mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Send reset link'

  return (
    <div className="h-full w-full overflow-y-auto bg-surface">
      <div className="min-h-full w-full flex items-center justify-center p-5">
        <Card className="w-full max-w-md p-6 sm:p-8 animate-scale-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="grid place-items-center h-12 w-12 rounded-2xl bg-accent text-white shadow-glow">
              <ClockIcon width={26} height={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-content">FocusClock</h1>
              <p className="text-sm text-content-muted">
                {mode === 'forgot' ? 'Reset your password.' : 'Stay locked in, every day.'}
              </p>
            </div>
          </div>

          {!hasSupabaseEnv ? (
            <div className="rounded-xl bg-danger/10 border border-danger/30 px-4 py-3 text-sm text-danger">
              Supabase isn&apos;t configured. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
            </div>
          ) : (
            <>
              {mode !== 'forgot' && (
                <div className="flex rounded-xl bg-surface-subtle p-1 border border-border-subtle mb-5">
                  {(['login', 'signup'] as Mode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => go(m)}
                      className={cx(
                        'flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all',
                        mode === m ? 'bg-surface-raised text-content shadow-sm' : 'text-content-muted hover:text-content'
                      )}
                    >
                      {m === 'login' ? 'Log in' : 'Sign up'}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-content">Email</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && mode === 'forgot') void submit()
                    }}
                    placeholder="you@example.com"
                    className="rounded-xl border border-border bg-surface-subtle px-3 py-2.5 text-content text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                  />
                </label>

                {mode !== 'forgot' && (
                  <label className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-content">Password</span>
                      {mode === 'login' && (
                        <button onClick={() => go('forgot')} className="text-xs text-accent font-medium">
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <input
                      type="password"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void submit()
                      }}
                      placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                      className="rounded-xl border border-border bg-surface-subtle px-3 py-2.5 text-content text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                    />
                  </label>
                )}

                {error && <div className="text-sm text-danger">{error}</div>}
                {info && (
                  <div className="rounded-xl bg-success/10 border border-success/30 px-3 py-2.5 text-sm text-content">
                    {info}
                  </div>
                )}

                <Button variant="primary" className="w-full py-3" disabled={loading} onClick={submit}>
                  <SparkleIcon width={18} height={18} />
                  {loading ? 'Please wait…' : cta}
                </Button>

                <p className="text-xs text-content-subtle text-center">
                  {mode === 'forgot' ? (
                    <button className="text-accent font-medium" onClick={() => go('login')}>
                      ← Back to log in
                    </button>
                  ) : mode === 'login' ? (
                    <>New here? <button className="text-accent font-medium" onClick={() => go('signup')}>Create an account</button></>
                  ) : (
                    <>Already have an account? <button className="text-accent font-medium" onClick={() => go('login')}>Log in</button></>
                  )}
                </p>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
