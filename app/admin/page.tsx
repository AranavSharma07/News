'use client';

import { useCallback, useState } from 'react';

type Notice = {
  id: string | number;
  title: string;
  category: string;
  organization: string | null;
  summary: string | null;
  official_url: string | null;
  article_url: string | null;
  source_url: string | null;
  source_name: string | null;
  official_verified: boolean;
  deadline_at: string | null;
  created_at: string;
};

const categories = ['Jobs', 'Results', 'Admit Cards', 'Answer Keys', 'Admissions', 'Notifications'];

export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [message, setMessage] = useState('Enter your ADMIN_SECRET to load pending notices.');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!secret.trim()) { setMessage('Enter the ADMIN_SECRET configured in Vercel.'); return; }
    setBusy(true); setMessage('Loading pending notices…');
    try {
      const response = await fetch('/api/admin/notices', { headers: { Authorization: `Bearer ${secret}` }, cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load notices.');
      setNotices(Array.isArray(data.notices) ? data.notices : []);
      setLoaded(true);
      setMessage(`${Array.isArray(data.notices) ? data.notices.length : 0} pending notice(s) loaded.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load notices.');
    } finally { setBusy(false); }
  }, [secret]);

  function change(id: Notice['id'], field: keyof Notice, value: string | boolean) {
    setNotices(current => current.map(item => item.id === id ? { ...item, [field]: value } : item));
  }

  async function save(notice: Notice, status: 'pending' | 'published' | 'rejected') {
    setBusy(true); setMessage(`Saving “${notice.title}”…`);
    try {
      const response = await fetch('/api/admin/notices', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: notice.id, status, title: notice.title, category: notice.category,
          organization: notice.organization, summary: notice.summary,
          official_url: notice.official_url, official_verified: notice.official_verified,
          deadline_at: notice.deadline_at || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save notice.');
      setNotices(current => status === 'pending' ? current.map(item => item.id === notice.id ? { ...item, ...data.notice } : item) : current.filter(item => item.id !== notice.id));
      setMessage(status === 'published' ? 'Notice published.' : status === 'rejected' ? 'Notice rejected.' : 'Notice saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save notice.');
    } finally { setBusy(false); }
  }

  return <main style={{ minHeight: '100vh', background: '#f5f7fb', color: '#172033', padding: '28px 16px 60px', fontFamily: 'Arial, sans-serif' }}>
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <a href="/" style={{ color: '#52617a', textDecoration: 'none' }}>← Back to NaukriSetu</a>
      <header style={{ margin: '20px 0 24px' }}>
        <p style={{ color: '#3265d7', fontWeight: 700, letterSpacing: 2, fontSize: 12 }}>NAUKRISETU · MODERATION</p>
        <h1 style={{ fontSize: 'clamp(30px, 5vw, 42px)', margin: '8px 0' }}>Notice review</h1>
        <p style={{ color: '#64748b', lineHeight: 1.6 }}>Review source articles, add the issuing organisation’s official URL, then mark it verified before publishing.</p>
      </header>
      <section style={{ background: '#fff', padding: 18, borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 18 }}>
        <label htmlFor="admin-secret" style={{ display: 'block', fontWeight: 700, marginBottom: 8 }}>Admin secret</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input id="admin-secret" type="password" autoComplete="current-password" value={secret} onChange={e => setSecret(e.target.value)} placeholder="Paste ADMIN_SECRET from Vercel" style={{ flex: '1 1 280px', padding: 12, border: '1px solid #cbd5e1', borderRadius: 9 }} />
          <button onClick={() => void load()} disabled={busy} style={buttonStyle}>{busy ? 'Please wait…' : 'Load pending notices'}</button>
        </div>
        <p role="status" style={{ color: '#52617a', marginBottom: 0, fontSize: 14 }}>{message}</p>
      </section>
      {loaded && notices.length === 0 && <section style={panelStyle}>No pending notices. New feed entries will appear here after the next successful ingestion.</section>}
      <div style={{ display: 'grid', gap: 16 }}>
        {notices.map(notice => <article key={notice.id} style={panelStyle}>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>ID: {notice.id} · Source: {notice.source_name || 'Unknown feed'}</span>
            <span style={{ fontSize: 12, color: '#9a5b00', background: '#fff4d6', padding: '5px 9px', borderRadius: 99 }}>Pending review</span>
          </div>
          <Field label="Notice title"><input value={notice.title || ''} onChange={e => change(notice.id, 'title', e.target.value)} style={inputStyle} /></Field>
          <Field label="Category"><select value={notice.category} onChange={e => change(notice.id, 'category', e.target.value)} style={inputStyle}>{categories.map(c => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Issuing organisation"><input value={notice.organization || ''} onChange={e => change(notice.id, 'organization', e.target.value)} placeholder="e.g. official recruiting organisation" style={inputStyle} /></Field>
          <Field label="Summary"><textarea value={notice.summary || ''} onChange={e => change(notice.id, 'summary', e.target.value)} rows={3} style={inputStyle} /></Field>
          <Field label="Source article URL (reference only)"><input value={notice.article_url || ''} readOnly style={{ ...inputStyle, background: '#f1f5f9' }} /></Field>
          <Field label="Official notice/application URL"><input value={notice.official_url || ''} onChange={e => change(notice.id, 'official_url', e.target.value)} placeholder="https://official-government-domain/..." style={inputStyle} /></Field>
          <Field label="Deadline (optional)"><input type="date" value={notice.deadline_at ? notice.deadline_at.slice(0, 10) : ''} onChange={e => change(notice.id, 'deadline_at', e.target.value ? new Date(`${e.target.value}T12:00:00Z`).toISOString() : '')} style={inputStyle} /></Field>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, lineHeight: 1.5, margin: '14px 0', fontSize: 14 }}>
            <input type="checkbox" checked={Boolean(notice.official_verified)} onChange={e => change(notice.id, 'official_verified', e.target.checked)} style={{ marginTop: 4 }} />
            I opened and verified the official URL and checked that it matches this notice.
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => void save(notice, 'pending')} disabled={busy} style={secondaryButtonStyle}>Save edits</button>
            <button onClick={() => void save(notice, 'published')} disabled={busy || !notice.official_verified || !notice.official_url} style={buttonStyle}>Verify & publish</button>
            <button onClick={() => void save(notice, 'rejected')} disabled={busy} style={rejectButtonStyle}>Reject</button>
            {notice.article_url && <a href={notice.article_url} target="_blank" rel="noreferrer" style={{ alignSelf: 'center', color: '#3265d7', fontSize: 14 }}>Open source article ↗</a>}
          </div>
        </article>)}
      </div>
      <p style={{ color: '#64748b', fontSize: 12, lineHeight: 1.6, marginTop: 24 }}>Security note: the admin secret is used only in requests from this page and is not saved to browser storage. Do not share it or place it in a public URL.</p>
    </div>
  </main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: 'block', margin: '12px 0' }}><span style={{ display: 'block', fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{label}</span>{children}</label>;
}

const inputStyle: React.CSSProperties = { width: '100%', padding: 11, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box', font: 'inherit', background: '#fff' };
const panelStyle: React.CSSProperties = { background: '#fff', padding: 18, borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 5px 20px rgba(15, 23, 42, .04)' };
const buttonStyle: React.CSSProperties = { background: '#2458d3', color: '#fff', border: 0, borderRadius: 9, padding: '11px 15px', fontWeight: 700, cursor: 'pointer' };
const secondaryButtonStyle: React.CSSProperties = { background: '#edf2ff', color: '#244cb5', border: '1px solid #cbd7ff', borderRadius: 9, padding: '11px 15px', fontWeight: 700, cursor: 'pointer' };
const rejectButtonStyle: React.CSSProperties = { background: '#fff1f2', color: '#b42332', border: '1px solid #fecdd3', borderRadius: 9, padding: '11px 15px', fontWeight: 700, cursor: 'pointer' };
