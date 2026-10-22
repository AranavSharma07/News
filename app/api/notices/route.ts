import { NextResponse } from 'next/server';
import { dbReady, supabase } from '../../../lib/db';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  if (!dbReady()) return NextResponse.json({ notices: [], setupRequired: true });
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('q');
    const status = url.searchParams.get('status') === 'pending' ? 'pending' : 'published';
    let path = `notices?select=id,title,category,organization,summary,official_url,source_name,published_at,deadline_at,status,created_at&status=eq.${status}&official_url=not.is.null&order=published_at.desc.nullslast,created_at.desc&limit=100`;
    if (category) path += `&category=eq.${encodeURIComponent(category)}`;
    if (search) path += `&title=ilike.*${encodeURIComponent(search)}*`;
    const notices = await supabase(path);
    return NextResponse.json({ notices }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Unable to load notices right now.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } }); }
}
