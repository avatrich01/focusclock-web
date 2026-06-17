# FocusClock — Web

The web version of FocusClock: hourly work tracking, focus sessions, to-dos,
reminders, analytics and reports — built with **Next.js (App Router)** + **React**
+ **TypeScript** + **TailwindCSS** + **Zustand**, with data in **Supabase
(Postgres)** behind email magic-link auth. Designed to deploy on **Vercel**.

It mirrors the desktop app (v9) feature-for-feature, minus the OS-only bits that
don't exist in a browser:

- **Dropped (desktop-only):** system tray, the floating sticky note, launch-at-
  startup, remembered window position.
- **Adapted:** native OS notifications → the **Web Notifications API** (the app
  asks permission on first load) plus the in-app toast; the local SQLite file →
  **Supabase Postgres**, scoped per user with Row Level Security.

Everything else is here: onboarding, the task-first dashboard with the top
tracker + "Now working on" banner, collapsible/reorderable panels (saved
layout), the hourly timeline (now-first with collapsible past, task-only "Done",
worked-but-untasked dashes, accountability lock), weekly to-dos, analytics,
reports (copy / download Markdown), idle auto-pause, carry-over, reminders, the
end-of-day recap, and the Waybill palette + Space Grotesk type.

---

## 1. Create the Supabase project (free tier)

1. Go to <https://supabase.com> → **New project**. Pick a name, a strong DB
   password, and a region. Wait for it to provision (~2 min).
2. **Run the schema.** In the dashboard: **SQL Editor → New query**, paste the
   entire contents of [`supabase/schema.sql`](supabase/schema.sql), and click
   **Run**. This creates the tables and the per-user Row Level Security policies.
3. **Email auth is on by default.** Optional but recommended: **Authentication →
   Providers → Email** — keep "Email" enabled. For zero-setup magic links the
   built-in Supabase email sender works for low volume (you can later plug in
   your own SMTP under **Project Settings → Auth**).
4. **Grab your keys.** **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   The anon key is safe to expose in the browser — RLS is what protects the data.

---

## 2. Run it locally

```bash
cp .env.local.example .env.local     # then paste your URL + anon key
npm install
npm run dev                          # http://localhost:3000
```

Sign in with your email → open the magic link → you're in. (For local links to
work, Supabase **Authentication → URL Configuration → Site URL** can be
`http://localhost:3000` while developing.)

```bash
npm run typecheck   # strict TypeScript check
npm run build       # production build
```

---

## 3. Deploy to Vercel

1. **Push this folder to a GitHub repo** (e.g. `focusclock-web`).
2. Go to <https://vercel.com> → **Add New… → Project** → import that repo.
   Vercel auto-detects Next.js — no config needed.
3. **Add environment variables** (Project → Settings → Environment Variables),
   for all environments:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon public key
4. **Deploy.** You'll get a URL like `https://focusclock-web.vercel.app`.
5. **Point Supabase auth at your live URL.** In Supabase → **Authentication →
   URL Configuration**:
   - **Site URL:** `https://your-app.vercel.app`
   - **Redirect URLs:** add `https://your-app.vercel.app/**`

   (The app already calls `signInWithOtp` with `emailRedirectTo =
   window.location.origin`, so the magic link returns users to wherever they
   signed in — but Supabase only allows redirects you've listed here.)

That's it — open the Vercel URL, sign in, and use it from any device. Each
account's data is isolated by RLS.

---

## 4. Background notifications (Web Push) — optional

By default the hourly nudge / reminder / recap scheduler runs only while a tab is
open. To get notifications **when the tab is closed**, enable Web Push:

1. **Generate VAPID keys:**
   ```bash
   npm run gen-vapid
   ```
   Copy the printed values.
2. **Add env vars** (locally in `.env.local`, and in Vercel → Settings → Env Vars):
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` (from step 1)
   - `VAPID_SUBJECT` = `mailto:you@example.com`
   - `SUPABASE_SERVICE_ROLE_KEY` = Supabase → Settings → API → **service_role** key
     (server-only — never prefix with `NEXT_PUBLIC`)
   - `CRON_SECRET` = any long random string
3. **In the app:** Settings → Notifications & Sound → **Background notifications** →
   toggle on (grants permission + registers the push subscription).
4. **Trigger the cron once a minute.** The endpoint is
   `POST /api/cron/notify?secret=YOUR_CRON_SECRET`. Pick one:
   - **Free (recommended):** create a job at <https://cron-job.org> (or any free
     cron) that calls `https://your-app.vercel.app/api/cron/notify?secret=YOUR_CRON_SECRET`
     every minute.
   - **Vercel Pro:** rename the included `vercel.pro.json` → `vercel.json`, set
     your secret in its path, and redeploy. (Minute-level crons require the Pro
     plan; on Hobby keep `vercel.pro.json` as-is and use the external cron above.)

The cron reads each user's subscription timezone, works out their local hour, and
sends the right pushes — deduped so each hour / reminder / recap fires once.

## 5. Install it like an app (PWA)

FocusClock ships a web manifest + icons + service worker, so it's installable:

- **Desktop (Chrome/Edge):** open your deployed URL → click the **install icon**
  in the address bar (or browser menu → "Install FocusClock"). It opens in its
  own window, no browser chrome.
- **iOS Safari:** Share → **Add to Home Screen**.
- **Android Chrome:** menu → **Install app / Add to Home screen**.

Installed, combined with Web Push (§4), it behaves a lot like the desktop app.
Icons are generated with `npm run gen-icons` (already committed in `public/`).

## How it works

- **`src/lib/data.ts`** is the entire backend: Supabase queries plus the
  tracking / analytics / recovery / report logic that used to live in Electron's
  main process. Row Level Security scopes every query to `auth.uid()`.
- **`src/lib/scheduler.ts`** is a client-side heartbeat (the browser equivalent
  of the desktop scheduler): session accrual, real-work marking, idle auto-pause,
  hourly nudges, reminders, carry-over, recovery and the end-of-day recap.
- **`src/lib/useStore.ts`** (Zustand) holds UI state and exposes the same action
  surface the components use; it drives notifications (Web Notifications API +
  sound + in-app toast).
- The notification scheduler runs only while a tab is open. For true background
  notifications you'd add a Service Worker + Web Push (a future enhancement).

## Free hosting summary

- **Vercel** Hobby plan — free for personal projects.
- **Supabase** Free tier — generous for a personal app (500 MB DB, plenty of auth
  users). No credit card required.
