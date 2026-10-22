import { NextResponse } from 'next/server';
import { dbReady, supabase } from '../../../../lib/db';
export const dynamic = 'force-dynamic';
function authorized(req: Request) { const secret = process.env.ADMIN_SECRET; return Boolean(secret && req.headers.get('authorization') === `Bearer ${secret}`); }
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!dbReady()) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const notices = await supabase('notices?select=*&status=eq.pending&order=created_at.desc&limit=200');
  return NextResponse.json({ notices });
}
export async function PATCH(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!dbReady()) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const { id, status } = await req.json();
  if (!id || !['published','rejected','expired','pending'].includes(status)) return NextResponse.json({ error: 'Valid id and status required' }, { status: 400 });
  const updated = await supabase(`notices?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status, updated_at: new Date().toISOString() }) });
  return NextResponse.json({ notice: updated?.[0] || null });
}
