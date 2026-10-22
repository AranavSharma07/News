import { NextResponse } from 'next/server';
import { collectFeed } from '../../../../lib/feeds';
import { dbReady, supabase } from '../../../../lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');
  const url = new URL(request.url);

  if (
    !secret ||
    (authorization !== `Bearer ${secret}` &&
      url.searchParams.get('secret') !== secret)
  ) {
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
          await supabase('notices', {
            method: 'POST',
            headers: {
              Prefer: 'resolution=ignore-duplicates,return=minimal',
            },
            body: JSON.stringify({
              ...item,
              status: 'pending',
            }),
          });

          inserted++;
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

  const failed = report.some((item) => !item.ok);

  return NextResponse.json(
    {
      ok: !failed,
      checkedAt: new Date().toISOString(),
      feeds: report,
    },
    { status: failed ? 207 : 200 }
  );
}
