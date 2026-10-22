import { NextResponse } from 'next/server';
import { collectFeed } from '../../../../lib/feeds';
import { dbReady, supabase } from '../../../../lib/db';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  const url = new URL(request.url);
  if (!secret || (auth !== `Bearer ${secret}` && url.searchParams.get('secret') !== secret)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!dbReady()) return NextResponse.json({ error: 'Database is not configured. Add Supabase environment variables.' }, { status: 503 });
  const feeds = (process.env.JOB_FEEDS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!feeds.length) return NextResponse.json({ error: 'No feeds configured. Set JOB_FEEDS to approved RSS/Atom feed URLs.' }, { status: 400 });
  const report: any[] = [];
  for (const feed of feeds) {
    try {
      const items = await collectFeed(feed);
      let inserted = 0;
      for (const item of items as any[]) {
        try {
          // New items are pending review; the system does not publish unverified notices automatically.
          await supabase('notices', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ ...item, status: 'pending' }) });
          inserted++;
        } catch (e: any) {
          // A duplicate official_url is expected and should not stop other notices.
          if (!String(e.message).includes('duplicate') && !String(e.message).includes('23505')) throw e;
        }
      }
      report.push({ feed, itemsFound: items.length, processed: inserted, ok: true });
    } catch (e: any) { report.push({ feed, ok: false, error: e.message }); }
  }
  return NextResponse.json({ checkedAt: new Date().toISOString(), feeds: report });
}
