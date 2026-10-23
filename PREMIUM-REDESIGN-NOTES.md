# NaukriSetu Premium Redesign

This update refreshes the homepage presentation while preserving the existing Next.js application and its notice workflow.

## What changed
- Replaced the single-column hero with a responsive two-column introduction and an opportunity overview panel.
- Added live counts based on the published notices returned by the existing `/api/notices` endpoint. No sample or fabricated counts are displayed.
- Refined the visual language with a forest-green and soft-ivory palette, restrained gold accents, stronger typography hierarchy, layered surfaces, and more consistent radii and shadows.
- Polished search focus, buttons, category filters, notice cards, empty states, section spacing, and hover transitions.
- Added mobile layouts for the hero and opportunity panel, while retaining horizontal scrolling for category filters and a single-column notice feed on smaller screens.
- Preserved search, filtering, refresh, official notice links, the admin moderation flow, API routes, RSS/Atom ingestion, and Vercel cron configuration.
- Respects `prefers-reduced-motion` for animated/transitioning elements.

## Validation
- TypeScript/JSX syntax transpilation check: passed for `app/page.tsx` and `app/layout.tsx`.
- Full Next.js production build: not verified in this environment because installing npm dependencies timed out. Run `npm install` and `npm run build` before deployment.

## Deploy
Upload/commit the contents to the existing GitHub repository connected to Vercel, then allow Vercel to build and deploy. Existing environment variables and database settings should remain unchanged.
