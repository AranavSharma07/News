import { NextResponse } from 'next/server';
import { dbReady, supabase } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

function authorized(req: Request) {
  const secret = process.env.ADMIN_SECRET;
  return Boolean(secret && req.headers.get('authorization') === `Bearer ${secret}`);
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!dbReady()) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  try {
    const notices = await supabase(
      'notices?select=id,title,category,organization,summary,official_url,article_url,source_url,source_name,official_verified,published_at,deadline_at,status,created_at&status=eq.pending&order=created_at.desc&limit=200'
    );
    return NextResponse.json({ notices }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Unable to load pending notices.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!dbReady()) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  try {
    const body = await req.json();
    const { id, status } = body ?? {};
    if (!id || !['published', 'rejected', 'expired', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'A valid id and status are required.' }, { status: 400 });
    }

    const allowedFields = ['title', 'category', 'organization', 'summary', 'official_url', 'official_verified', 'deadline_at'];
    const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) update[field] = body[field];
    }

    if (status === 'published') {
      const candidate = typeof update.official_url === 'string' ? update.official_url : '';
      let parsed: URL | null = null;
      try { parsed = new URL(candidate); } catch { /* validated below */ }
      if (!parsed || !['https:', 'http:'].includes(parsed.protocol)) {
        return NextResponse.json({ error: 'Add a valid official HTTP(S) URL before publishing.' }, { status: 400 });
      }
      if (update.official_verified !== true) {
        return NextResponse.json({ error: 'Mark the official link as verified before publishing.' }, { status: 400 });
      }
    }

    const updated = await supabase(
      `notices?id=eq.${encodeURIComponent(String(id))}`,
      { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(update) }
    );
    if (!updated?.length) return NextResponse.json({ error: 'Notice not found.' }, { status: 404 });
    return NextResponse.json({ notice: updated[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update notice.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
