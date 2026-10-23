# NaukriSetu — Jobs, Results & Education Updates

A polished, responsive Next.js 14 portal for discovering jobs, exam results, admit cards, answer keys, admissions and official notifications. The project includes a Supabase-backed notice API, a protected RSS/Atom ingestion endpoint, and a protected moderation API. It includes conservative automatic verification for notices whose official destination can be matched against an explicit trusted-domain allowlist; uncertain notices remain pending.

## What’s included

- Responsive, accessible homepage with search, category filters, loading/error/empty states and manual refresh.
- SEO metadata, Open Graph/Twitter metadata, and generated `robots.txt` and `sitemap.xml`.
- Supabase REST API for published notices; secrets remain server-side.
- Scheduled feed ingestion via Vercel Cron; duplicate feed entries are ignored.
- Conservative automatic verification: a pending notice is published only when its destination is on the explicit `OFFICIAL_DOMAINS` allowlist and the fetched page content matches the notice title. Aggregator pages are scanned only for links to allowlisted official domains; uncertain notices remain pending.
- Admin review dashboard at `/admin` to inspect pending notices, edit details, verify official URLs, publish or reject records.
- Feed article URLs are stored separately; ingestion does not claim third-party article links are official.
- Security improvement: cron secret is accepted only in the Authorization header, not in query strings.

## Requirements

- Node.js 18.17+ (Node 20 LTS recommended)
- A Supabase project
- A Vercel account for scheduled ingestion (or another scheduler that can call the endpoint)

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in the required values. Keep `.env.local` private and never commit secrets.
3. In Supabase SQL Editor, run `supabase/migrations/20261022_notice_review.sql` once. It adds review fields and moves legacy FreeJobAlert article links back to pending review so third-party pages are not presented as official links. For a brand-new database, use `supabase/schema.sql`.
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Visit `http://localhost:3000`; the review dashboard is at `/admin`.

The homepage can run without Supabase but will show a setup message until database credentials are configured.

## Deploy to Vercel

1. Push this project to a GitHub repository.
2. Import that repository into Vercel and select the Next.js framework preset.
3. Add the environment variables below in **Project Settings → Environment Variables** for Production (and Preview if required), including a new `ADMIN_SECRET` that differs from `CRON_SECRET`.
4. Set `NEXT_PUBLIC_SITE_URL` to the final canonical website URL, e.g. `https://your-domain.vercel.app`.
5. Deploy and test `/`, `/api/notices`, `/robots.txt`, `/sitemap.xml`, and `/admin`.
6. Confirm the Cron job appears in Vercel and check its execution logs. Cron availability/frequency can depend on your Vercel plan.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | Yes for live notices | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes for live notices | Server-side database access; **never use `NEXT_PUBLIC_`** |
| `CRON_SECRET` | Yes for scheduled ingestion | Long random secret for the ingestion endpoint |
| `ADMIN_SECRET` | Yes for moderation | Different long random secret for admin actions |
| `JOB_FEEDS` | Yes for ingestion | Comma-separated RSS/Atom feed URLs you are permitted to monitor |
| `DEFAULT_SOURCE_NAME` | No | Default source label for ingested notices |
| `OFFICIAL_DOMAINS` | Recommended for auto-publishing | Comma-separated exact official domains, e.g. `ssc.gov.in,upsc.gov.in`; never add aggregator domains. Leave empty to disable automatic publishing safely. |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Canonical public site URL used for metadata and sitemap |

Generate separate secrets; do not reuse the same value for `CRON_SECRET` and `ADMIN_SECRET`.

## Feed ingestion and moderation

Vercel Cron calls `/api/cron/ingest` on the schedule configured in `vercel.json`. The request must include `Authorization: Bearer YOUR_CRON_SECRET`. For a manual test, send that header from a secure API client; do not place the secret in a URL or browser code.

Use `/admin` for the visual review workflow. The protected API uses `Authorization: Bearer YOUR_ADMIN_SECRET`. Publishing requires a valid HTTP(S) URL and `official_verified: true`. On each cron run, up to 40 pending records with article URLs are checked automatically. The verifier fails closed: it will not publish unless a destination page is reachable, the final hostname is on `OFFICIAL_DOMAINS`, and the page text sufficiently matches the notice title. For aggregator feeds, only links to allowlisted official domains are considered. Configure `OFFICIAL_DOMAINS` in Vercel Project Settings → Environment Variables and redeploy. Notices that cannot be confidently verified remain pending for manual review.

## Important limitations and accuracy

- This is a starter portal, not a universal government-site crawler. Add only feeds you are allowed to monitor; many official sites do not publish RSS/Atom feeds.
- Category assignment is keyword-based and can be wrong. Automated title matching is a conservative heuristic, not a guarantee of factual correctness; keep the allowlist narrow and periodically audit auto-published notices.
- Check dates, eligibility, fees and final application/download links against the official source.
- Do not bypass CAPTCHAs, logins, rate limits or access controls.
- The admin API and dashboard are protected by `ADMIN_SECRET`. Keep it private and rotate it if exposed. The dashboard is intended for a trusted administrator; do not share the secret with visitors.
- Email/SMS alerts and multi-language support are not included.

## Useful commands

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Google AdSense

- The AdSense Auto ads loader is included in `app/layout.tsx` using the publisher ID supplied by the site owner.
- `public/ads.txt` publishes the matching seller declaration at `/ads.txt`. Confirm this publisher ID and seller relationship in your AdSense account before deploying.
- Adding the code does not guarantee ads will appear: the site must be added to AdSense and approved.
- Do not add additional ad-loader scripts elsewhere; load the AdSense script only once.
- Test the live site on phone, tablet, and desktop after deployment.

## Responsive checks

The homepage stylesheet includes tablet and mobile breakpoints and reduced-motion handling. After deployment, test the navigation, search field, category filters, notice cards, and admin review page at narrow phone widths as well as desktop.
