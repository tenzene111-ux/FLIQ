# Fliq — Watch. Create. Share.

Fliq is a full-stack short-video social platform: personalized feeds, a
browser-based camera + video editor, messaging, live, stories, creator
analytics, and an admin/moderation console — built with Next.js (App
Router), TypeScript, Prisma, and Postgres.

## Quick start (local development)

You need a Postgres database. Easiest options: install Postgres locally, or
grab a free connection string from [Neon](https://neon.tech) or
[Supabase](https://supabase.com) — either works, no local install needed.

```bash
cp .env.example .env        # then fill in DATABASE_URL and JWT_SECRET
npm install
npx prisma migrate dev      # applies the schema to your database
npm run gen:seed-videos     # generates local placeholder clips (public/seed-videos)
npm run db:seed             # populates demo users, videos, follows, messages...
npm run dev
```

Open http://localhost:3000 and log in with the seeded demo account:

- **Email:** `demo@fliq.app`
- **Password:** `Password123!`

(Or create your own account via Sign up — it goes through the full
onboarding flow.)

## Stack

- **Next.js 16** (App Router, Route Handlers as the API layer)
- **TypeScript**, **Tailwind CSS v4** for the design system (see
  `src/app/globals.css` for the Fliq gradient/color tokens)
- **Prisma + Postgres** for the relational database (`prisma/schema.prisma`)
  — same engine in dev and production, one `DATABASE_URL` env var
- **Zustand** for lightweight client state (auth/session, toasts, feed UI,
  the in-progress Create draft)
- **Recharts** for the analytics dashboards
- Session auth via signed httpOnly JWT cookies + bcrypt password hashing
  (`src/lib/auth.ts`) — no third-party auth provider required

## What's real vs. simplified

Every screen in the spec is implemented with real client/server code and a
real database — not a static prototype. A few areas were deliberately
scoped down, and are called out in the UI copy itself rather than faked:

- **Video editing** (trim / speed / filters / text / stickers / transitions)
  runs entirely client-side: a `<canvas>` + `MediaRecorder` pipeline
  (`src/lib/video-bake.ts`) re-encodes the recorded/uploaded clip in the
  browser. If a browser doesn't support the required APIs, posting falls
  back to the original clip rather than failing.
- **Live** streaming shows the host's own camera to the host, and real
  chat/reactions/viewer-count to viewers (polling-based, all backed by the
  database), but does not relay live video between viewers — that needs a
  media server (RTMP/WebRTC SFU) that isn't part of this app. The viewer UI
  says so explicitly instead of pretending otherwise.
- **Email** (verification, password reset) uses a console-logging mailer
  (`src/lib/mailer.ts`) and returns the token/link directly in the API
  response in dev mode, since there's no inbox in this environment. Swap in
  a real provider behind the same `sendEmail()` signature for production.
- **OAuth** (Google/Apple) is a real Authorization Code flow
  (`src/app/api/auth/google`, `src/app/api/auth/apple`) — it only needs
  provider credentials set as env vars to work (see "Set up Google/Apple
  sign-in" below); with nothing configured, the buttons show a friendly
  error instead of faking a signed-in session.
- **Object storage**: uploads go through `src/lib/storage.ts`, which writes
  to `/public/uploads` locally. Set `STORAGE_PROVIDER=vercel-blob` to use
  Vercel Blob storage in production (see Deploy section below), or
  `STORAGE_PROVIDER=s3` for a self-hosted S3-compatible bucket.
- **Monetization / Payouts / Promote Video** are honest "coming soon"
  screens rather than fabricated dashboards.
- Seed/demo video content is generated locally at
  `public/seed-videos/*.webm` (via `npm run gen:seed-videos`, using sharp +
  a bundled ffmpeg) so the app has zero third-party CDN dependency for demo
  content — everything plays offline.

## Project layout

```
prisma/schema.prisma       Relational schema (users, videos, social graph, messaging, live, moderation, analytics...)
prisma/seed.ts             Demo data generator
src/app/(auth)/            Welcome, login, signup, forgot/reset password, onboarding
src/app/(app)/             Authenticated app shell: home, discover, search, create, inbox, profile, settings, live, analytics...
src/app/admin/             Admin dashboard (separate layout, isAdmin-gated)
src/app/api/                Route handlers — the API layer, organized to mirror the resources above
src/components/            UI components grouped by feature (feed, creator, stories, admin, settings, ui...)
src/lib/                   Server-side helpers: auth, db, storage, social graph, serialization, ranking
src/store/                 Zustand client stores
```

## Scripts

- `npm run dev` / `npm run build` / `npm run start`
- `npm run db:migrate` — create/apply a migration after changing `schema.prisma`
- `npm run db:seed` — reseed demo data (idempotent, clears and recreates)
- `npm run db:reset` — drop and recreate the DB from migrations, then seed
- `npm run gen:seed-videos` — regenerate the local placeholder video clips

## Deploy to production (Vercel)

1. **Push this repo to GitHub** (already done if you're reading this from
   the repo) and go to [vercel.com/new](https://vercel.com/new) → import it.
2. **Add a Postgres database**: in the Vercel dashboard for the new
   project, go to *Storage → Create Database → Postgres* (powered by Neon).
   This automatically sets `DATABASE_URL` for you — no separate signup.
3. **Add Blob storage** for uploaded avatars/videos: *Storage → Create →
   Blob*. This automatically sets `BLOB_READ_WRITE_TOKEN`.
4. **Set environment variables** (Project Settings → Environment Variables):
   - `JWT_SECRET` — any long random string (`openssl rand -hex 32`)
   - `STORAGE_PROVIDER` — `vercel-blob`
   - `NEXT_PUBLIC_APP_NAME` — `Fliq`
5. **Deploy.** Vercel runs `npm install` (which triggers `prisma generate`
   via the `postinstall` script), then `npm run build`, which runs
   `prisma migrate deploy` before `next build` — so the database schema is
   created/updated automatically on every deploy. No manual migration step
   needed.
6. **Load demo data once**, after the first successful deploy, by visiting
   (in your browser, or via `curl`):
   ```
   https://<your-app>.vercel.app/api/setup/seed?secret=<your JWT_SECRET value>
   ```
   This is a protected one-time route (`src/app/api/setup/seed/route.ts`)
   gated behind your `JWT_SECRET` — it refuses to run again on a database
   that already has users unless you add `&force=true`.
7. Every push to `main` auto-deploys. Push to any other branch and Vercel
   gives you a preview URL for that branch instead — the same "preview
   deployment" workflow real teams use to check work before it ships.

## Set up Google/Apple sign-in

Both are optional. Without credentials, the buttons show a friendly error
instead of pretending to work.

**Google (free):**
1. Go to [console.cloud.google.com](https://console.cloud.google.com) →
   create a project (or use an existing one).
2. *APIs & Services → OAuth consent screen* — fill in the basics (app name,
   your email), External user type is fine for testing.
3. *APIs & Services → Credentials → Create Credentials → OAuth client ID* →
   Application type: **Web application**.
4. Under **Authorized redirect URIs**, add:
   `https://<your-app>.vercel.app/api/auth/google/callback`
5. Copy the generated **Client ID** and **Client Secret**.
6. In Vercel: *Settings → Environment Variables* → add `GOOGLE_CLIENT_ID`
   and `GOOGLE_CLIENT_SECRET` with those values, for Production.
7. Redeploy. The Google button on `/login` and `/signup` now works.

**Apple (requires a $99/year Apple Developer Program membership):**
1. Enroll at [developer.apple.com/programs](https://developer.apple.com/programs)
   if you haven't already.
2. *Certificates, IDs & Profiles → Identifiers* — create an **App ID** (if
   you don't have one) with the "Sign in with Apple" capability enabled.
3. Create a **Services ID** — this is your `APPLE_CLIENT_ID`. Enable "Sign in
   with Apple" on it, and configure:
   - Domain: `<your-app>.vercel.app`
   - Return URL: `https://<your-app>.vercel.app/api/auth/apple/callback`
4. *Keys* → create a new key with "Sign in with Apple" enabled, download the
   `.p8` file (you only get one chance to download it), and note the **Key
   ID**.
5. Your **Team ID** is shown in the top-right of the Apple Developer
   account page.
6. In Vercel, add these env vars for Production:
   - `APPLE_CLIENT_ID` — the Services ID from step 3
   - `APPLE_TEAM_ID` — from step 5
   - `APPLE_KEY_ID` — from step 4
   - `APPLE_PRIVATE_KEY` — the full contents of the `.p8` file from step 4
     (paste it as-is, including the `-----BEGIN PRIVATE KEY-----` lines)
7. Redeploy. The Apple button now works.

A signed-in user's account is matched by provider ID first, then by email
(so someone who originally signed up with a password and later clicks
"Google" with the same email gets linked to their existing account instead
of a duplicate).
