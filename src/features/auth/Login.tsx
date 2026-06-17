'use client'
import { useState } from 'react'
import { supabase, hasSupabaseEnv } from '@/lib/supabaseClient'
import { Button, Card } from '@/components/ui'
import { ClockIcon, SparkleIcon } from '@/components/Icons'

export function Login(): JSX.Element {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function sendLink(): Promise<void> {
    setError(null)
    if (!email.trim()) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined }
    })
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div className="h-full w-full grid place-items-center bg-surface p-6">
      <Card className="w-full max-w-md p-8 animate-scale-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="grid place-items-center h-12 w-12 rounded-2xl bg-accent text-white shadow-glow">
            <ClockIcon width={26} height={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-content">FocusClock</h1>
            <p className="text-sm text-content-muted">Sign in to stay locked in.</p>
          </div>
        </div>

        {!hasSupabaseEnv ? (
          <div className="rounded-xl bg-danger/10 border border-danger/30 px-4 py-3 text-sm text-danger">
            Supabase isn&apos;t configured. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (see README).
          </div>
        ) : sent ? (
          <div className="rounded-xl bg-success/10 border border-success/30 px-4 py-4 text-sm text-content">
            <div className="font-semibold mb-1">Check your inbox ✉️</div>
            We sent a magic sign-in link to <span className="font-medium">{email}</span>. Open it on
            this device to continue.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-content">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void sendLink()
                }}
                placeholder="you@example.com"
                className="rounded-xl border border-border bg-surface-subtle px-3 py-2.5 text-content text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </label>
            {error && <div className="text-sm text-danger">{error}</div>}
            <Button variant="primary" className="w-full py-3" disabled={loading || !email.trim()} onClick={sendLink}>
              <SparkleIcon width={18} height={18} />
              {loading ? 'Sending…' : 'Send magic link'}
            </Button>
            <p className="text-xs text-content-subtle text-center">No password needed — we&apos;ll email you a one-tap sign-in link.</p>
          </div>
        )}
      </Card>
    </div>
  )
}
