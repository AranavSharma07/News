-- NaukriSetu notice-review migration.
-- Run once in Supabase SQL Editor before deploying the updated application.

ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS article_url text;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS official_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.notices ALTER COLUMN official_url DROP NOT NULL;

-- Reclassify legacy FreeJobAlert article links so they are not presented as official destinations.
-- The article URL is preserved for review; official_url is cleared until an official link is entered.
UPDATE public.notices
SET article_url = COALESCE(article_url, official_url),
    official_url = NULL,
    official_verified = false,
    status = 'pending',
    updated_at = now()
WHERE source_name ILIKE '%freejobalert%'
  AND official_url ILIKE '%freejobalert.com%';

CREATE UNIQUE INDEX IF NOT EXISTS notices_article_url_unique
  ON public.notices(article_url)
  WHERE article_url IS NOT NULL;
