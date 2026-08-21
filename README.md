# Fliq — Watch. Create. Share.

Fliq is a full-stack short-video social platform: personalized feeds, a
browser-based camera + video editor, messaging, live, stories, creator
analytics, and an admin/moderation console — built with Next.js (App
Router), TypeScript, Prisma, and SQLite.

## Quick start

```bash
npm install
npx prisma migrate dev      # creates prisma/dev.db and applies the schema
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
- **Prisma + SQLite** for the relational database (`prisma/schema.prisma`);
  swap the `datasource` provider + `DATABASE_URL` for Postgres/MySQL in
  production — the schema and queries don't depend on SQLite specifics
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
- **OAuth** (Google/Apple) buttons are wired to a clean seam
  (`src/components/auth/OAuthButtons.tsx`) that explains real credentials
  are needed — they don't fake a signed-in session.
- **Object storage**: uploads go through `src/lib/storage.ts`, which writes
  to `/public/uploads` locally. Set `STORAGE_PROVIDER=s3` and fill in the
  `S3_*` env vars to point it at real object storage/CDN in production.
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
- `npm run db:seed` — reseed demo data (idempotent, clears and recreates)
- `npm run db:reset` — drop and recreate the SQLite DB from migrations, then seed
- `npm run gen:seed-videos` — regenerate the local placeholder video clips
