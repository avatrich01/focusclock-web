/**
 * Keep-alive: a tiny request to Supabase so the free-tier project never idles
 * out and pauses. Hit it on a schedule (Vercel Cron daily, or any external
 * cron). Harmless + unauthenticated — it just touches the database.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: 'Supabase env not set' }, { status: 500 })
  }
  const db = createClient(url, key, { auth: { persistSession: false } })
  try {
    // A trivial query is enough to register activity and keep the project warm.
    const { error } = await db.from('leaderboard').select('user_id', { head: true, count: 'exact' })
    return NextResponse.json({ ok: true, ts: Date.now(), db: error ? error.message : 'reachable' })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 })
  }
}
