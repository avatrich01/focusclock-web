# Deploy FocusClock Web

This repo is already a git repo on branch `main` with a clean first commit
(no secrets, no `node_modules`). Follow these steps to go live.

## 1. Supabase (do this first)

1. <https://supabase.com> → **New project** (region + DB password).
2. **SQL Editor → New query** → paste all of [`supabase/schema.sql`](supabase/schema.sql)
   → **Run**.
3. **Project Settings → API** → copy **Project URL** and the **anon public** key.

## 2. Push to GitHub

1. Create a new **empty** repo at <https://github.com/new> named `focusclock-web`.
   - Do **not** add a README, .gitignore, or license (this repo already has them).
2. Connect and push (replace `<you>` with your GitHub username):

   ```bash
   cd focusclock-web
   git remote add origin https://github.com/<you>/focusclock-web.git
   git push -u origin main
   ```

   On the first push, Git for Windows opens a browser to sign in to GitHub
   (Git Credential Manager) — approve it and the push completes.

## 3. Deploy on Vercel

1. <https://vercel.com> → **Add New → Project** → **Import** `focusclock-web`.
   Vercel auto-detects Next.js — no settings needed.
2. Expand **Environment Variables** and add (Production + Preview + Development):
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon public key
3. **Deploy** → you get `https://<name>.vercel.app`.

## 4. Point Supabase auth at the live URL

Supabase → **Authentication → URL Configuration**:

- **Site URL:** `https://<name>.vercel.app`
- **Redirect URLs:** add `https://<name>.vercel.app/**`

Open the URL → enter your email → click the magic link → you're in.

After this, every `git push` to `main` auto-deploys.

## Optional extras

- **Background push notifications** (tab closed) and the **cron** — see
  [`README.md`](README.md) §4.
- **Install as an app (PWA)** — README §5.
