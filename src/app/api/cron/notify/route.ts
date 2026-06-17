/**
 * Background notification cron. Call once a minute (Vercel Cron on Pro, or a
 * free external cron like cron-job.org). For every user with a push
 * subscription, it works out their LOCAL time from the subscription timezone
 * and sends hourly nudges, due to-do reminders and the end-of-day recap via
 * Web Push — so notifications fire even when no tab is open.
 *
 * Protected by CRON_SECRET (query `?secret=` or header `x-cron-secret`).
 * Uses the Supabase service-role key, so it bypasses RLS to read all users.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface PushRow {
  endpoint: string
  p256dh: string
  auth: string
  tz: string
  user_id: string
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false } }
  )
}

function configureVapid(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:focusclock@example.com', pub, priv)
  return true
}

/** Local minutes-of-day + YYYY-MM-DD day key for a timezone. */
function localParts(tz: string): { minutes: number; day: string } {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(now)
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? '00'
  const day = `${get('year')}-${get('month')}-${get('day')}`
  let hour = parseInt(get('hour'), 10)
  if (hour === 24) hour = 0
  const minutes = hour * 60 + parseInt(get('minute'), 10)
  return { minutes, day }
}

function planStarts(s: any): number[] {
  const starts: number[] = []
  let t = Math.floor(s.work_start / 60) * 60
  if (t < s.work_start) t = s.work_start
  for (let m = t; m <= s.work_end; m += 60) {
    const isLunch = m >= s.lunch_start && m < s.lunch_end
    if (!isLunch) starts.push(m)
  }
  return starts
}

function clock(minutes: number, format: string): string {
  const h24 = Math.floor(minutes / 60)
  const mm = String(minutes % 60).padStart(2, '0')
  if (format === '24h') return `${String(h24).padStart(2, '0')}:${mm}`
  const period = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${mm} ${period}`
}

async function send(sub: PushRow, payload: object, db: ReturnType<typeof admin>): Promise<void> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    )
  } catch (err: any) {
    const code = err?.statusCode
    if (code === 404 || code === 410) {
      await db.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    }
  }
}

async function handle(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const provided = req.nextUrl.searchParams.get('secret') || req.headers.get('x-cron-secret')
    if (provided !== secret) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })
  }
  if (!configureVapid()) {
    return NextResponse.json({ error: 'VAPID keys not set' }, { status: 500 })
  }

  const db = admin()
  const { data: subs } = await db.from('push_subscriptions').select('*')
  if (!subs || subs.length === 0) return NextResponse.json({ sent: 0, users: 0 })

  // Group subscriptions per user.
  const byUser = new Map<string, PushRow[]>()
  for (const s of subs as PushRow[]) {
    const arr = byUser.get(s.user_id) ?? []
    arr.push(s)
    byUser.set(s.user_id, arr)
  }

  let sent = 0
  const now = Date.now()

  for (const [userId, userSubs] of byUser) {
    const { data: settings } = await db.from('settings').select('*').eq('user_id', userId).maybeSingle()
    if (!settings || !settings.onboarded || !settings.notifications_enabled) continue

    const tz = userSubs[0].tz || 'UTC'
    const { minutes, day } = localParts(tz)
    const localMidnight = now - minutes * 60000

    const messages: { title: string; body: string; tag: string }[] = []

    // 1) Hourly nudge (deduped per hour via the notifications table).
    if (minutes >= settings.work_start && minutes <= settings.work_end && planStarts(settings).includes(minutes)) {
      const { data: recent } = await db
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'hourly')
        .gte('fired_at', now - 90_000)
        .limit(1)
      if (!recent || recent.length === 0) {
        const { count } = await db
          .from('todos')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('scope', 'daily')
          .eq('bucket', day)
          .eq('done', false)
        const left = count ?? 0
        const body =
          left > 0
            ? `It's ${clock(minutes, settings.clock_format)}. ${left} to-do${left === 1 ? '' : 's'} left — let's get it 🔥`
            : `It's ${clock(minutes, settings.clock_format)}. New hour, fresh focus ✨`
        messages.push({ title: 'FocusClock', body, tag: `hourly-${minutes}` })
        await db.from('notifications').insert({ user_id: userId, fired_at: now, type: 'hourly', title: 'FocusClock', body })
      }
    }

    // 2) Due to-do reminders.
    const { data: dueTodos } = await db
      .from('todos')
      .select('id, text')
      .eq('user_id', userId)
      .eq('scope', 'daily')
      .eq('bucket', day)
      .eq('done', false)
      .eq('reminder_fired', false)
      .eq('reminder_minutes', minutes)
    for (const t of dueTodos ?? []) {
      messages.push({ title: '⏰ Reminder', body: t.text, tag: `reminder-${t.id}` })
      await db.from('todos').update({ reminder_fired: true }).eq('id', t.id)
      await db.from('notifications').insert({ user_id: userId, fired_at: now, type: 'reminder', title: '⏰ Reminder', body: t.text })
    }

    // 3) End-of-day recap (once per local day).
    if (minutes >= settings.work_end) {
      const { data: doneSummary } = await db
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'summary')
        .gte('fired_at', localMidnight)
        .limit(1)
      if (!doneSummary || doneSummary.length === 0) {
        const { data: stat } = await db.from('daily_stats').select('*').eq('user_id', userId).eq('day', day).maybeSingle()
        const focus = stat?.focus_ms ?? 0
        const worked = stat?.worked_ms ?? 0
        const body = `Focus ${Math.round(focus / 3600000)}h ${Math.floor((focus % 3600000) / 60000)}m · Worked ${Math.round(worked / 3600000)}h ${Math.floor((worked % 3600000) / 60000)}m`
        messages.push({ title: "That's a wrap 🎬", body, tag: `summary-${day}` })
        await db.from('notifications').insert({ user_id: userId, fired_at: now, type: 'summary', title: "That's a wrap 🎬", body })
      }
    }

    for (const msg of messages) {
      for (const sub of userSubs) {
        await send(sub, { ...msg, url: '/' }, db)
        sent += 1
      }
    }
  }

  return NextResponse.json({ ok: true, users: byUser.size, sent })
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return handle(req)
}
export async function POST(req: NextRequest): Promise<NextResponse> {
  return handle(req)
}
