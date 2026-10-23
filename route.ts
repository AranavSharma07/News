import { NextResponse } from 'next/server';
import { collectFeed } from '../../../../lib/feeds';
import { dbReady, supabase } from '../../../../lib/db';
import { autoVerifyPending } from '../../../../lib/auto-verify';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');

  // Accept secrets only in the Authorization header; query strings can leak into logs.
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!dbReady()) {
    return NextResponse.json(
      { error: 'Database is not configured. Check Supabase environment variables.' },
      { status: 503 }
    );
  }

  const feeds = (process.env.JOB_FEEDS || '')
    .split(',')
    .map((feed) => feed.trim())
    .filter(Boolean);

  if (feeds.length === 0) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      message:
        'No feeds configured yet. Add verified RSS or Atom feed URLs to JOB_FEEDS.',
      feeds: [],
    });
  }

  const report: Array<{
    feed: string;
    ok: boolean;
    itemsFound?: number;
    inserted?: number;
    error?: string;
  }> = [];

  for (const feed of feeds) {
    try {
      const items = await collectFeed(feed);
      let inserted = 0;

      for (const item of items) {
        try {
          const created = await supabase('notices', {
            method: 'POST',
            headers: {
              Prefer: 'resolution=ignore-duplicates,return=representation',
            },
            body: JSON.stringify({
              ...item,
              status: 'pending',
            }),
          });

          if (Array.isArray(created) && created.length > 0) inserted++;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);

          if (
            !message.includes('duplicate') &&
            !message.includes('23505')
          ) {
            throw error;
          }
        }
      }

      report.push({
        feed,
        ok: true,
        itemsFound: items.length,
        inserted,
      });
    } catch (error) {
      report.push({
        feed,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  let autoVerification: { checked: number; published: number; leftPending: number; errors: number } | null = null;
  let verificationError: string | undefined;
  try {
    autoVerification = await autoVerifyPending(40);
  } catch (error) {
    verificationError = error instanceof Error ? error.message : String(error);
  }

  const failed = report.some((item) => !item.ok);

  return NextResponse.json(
    {
      ok: !failed && !verificationError,
      checkedAt: new Date().toISOString(),
      feeds: report,
      autoVerification,
      ...(verificationError ? { verificationError } : {}),
      note: process.env.OFFICIAL_DOMAINS
        ? 'Only notices matching a page on OFFICIAL_DOMAINS are auto-published; others remain pending.'
        : 'Auto-publishing is disabled until OFFICIAL_DOMAINS is configured with trusted official domains.',
    },
    { status: failed || verificationError ? 207 : 200 }
  );
}
