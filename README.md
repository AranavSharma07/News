# NaukriSetu Auto Updates — starter project

A responsive Next.js portal with a scheduled RSS/Atom ingestion endpoint, Supabase storage, public notice listing, and a protected admin-review API. It is a deployable starter, not a turnkey crawler for every government website: sources must be configured individually, and many official sites do not provide feeds.

## Features
- Categories: Jobs, Results, Admit Cards, Answer Keys, Admissions, Notifications.
- Responsive homepage with search and category filters.
- Vercel Cron configured for every 30 minutes (`vercel.json`).
- RSS/Atom items collected from configured URLs and stored as **pending** for review, never auto-published without verification.
- Duplicate prevention via unique `official_url`.
- Protected admin API to list pending notices and approve/reject/expire them.
- Official URLs displayed to users; no fake application links.

## Deploy
1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase/schema.sql`.
3. Import this folder into a GitHub repository and connect it to Vercel.
4. In Vercel Project Settings → Environment Variables, add values from `.env.example`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-side only; never use `NEXT_PUBLIC_`)
   - `CRON_SECRET` (long random secret)
   - `ADMIN_SECRET` (different long random secret)
   - `JOB_FEEDS` (comma-separated RSS/Atom feed URLs from official sources you are permitted to monitor)
   - `DEFAULT_SOURCE_NAME` (optional)
5. Deploy. Vercel Cron will call `/api/cron/ingest` on the configured schedule on plans that support cron frequency; check your current Vercel plan limits.
6. Test ingestion manually with `Authorization: Bearer YOUR_CRON_SECRET` on `GET /api/cron/ingest`. Do not put secrets in browser code or public URLs.
7. Review pending notices with `GET /api/admin/notices` and `Authorization: Bearer YOUR_ADMIN_SECRET`. Approve a notice with `PATCH /api/admin/notices` JSON body `{"id":"NOTICE_UUID","status":"published"}`. Other accepted statuses: `rejected`, `expired`, `pending`.

## Feed limitations and accuracy
- RSS/Atom feeds are parsed with a lightweight parser; some feeds use non-standard XML or script-rendered content and may need a source-specific adapter.
- The current automatic category assignment is keyword-based and can misclassify a notice; review before publishing.
- The ingestion endpoint sets new records to `pending` for safety. This avoids publishing incorrect dates, eligibility, or fake download links.
- Only use official/public feeds or sources whose terms permit automated access. Do not bypass CAPTCHAs, logins, rate limits, or access controls.
- An RSS item's link may point to a source announcement rather than the final application/result PDF. Verify before publishing.
- This starter does not include email/SMS alerts, a visual admin dashboard, automatic translation, or broad website scraping. These can be added after the actual NaukriSetu repo and desired sources are known.

## Local development
```bash
cp .env.example .env.local
npm install
npm run dev
```
The homepage can run without Supabase, but listings and ingestion require valid credentials.
