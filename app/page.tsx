'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Notice = {
  id: string;
  title: string;
  category: string;
  organization?: string | null;
  summary?: string | null;
  official_url: string;
  source_name?: string | null;
  published_at?: string | null;
  deadline_at?: string | null;
};

const categories = ['All Updates', 'Jobs', 'Results', 'Admit Cards', 'Answer Keys', 'Admissions', 'Notifications'];
const dateFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function safeDate(value?: string | null) {
  if (!value) return 'Recently added';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Recently added' : dateFormat.format(date);
}

function categoryIcon(category: string) {
  const icons: Record<string, string> = { Jobs: '↗', Results: '✓', 'Admit Cards': '▤', 'Answer Keys': '⌕', Admissions: '✳', Notifications: '◉' };
  return icons[category] || '✦';
}

export default function Home() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [category, setCategory] = useState('All Updates');
  const [query, setQuery] = useState('');
  const [setup, setSetup] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadNotices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/notices', { cache: 'no-store' });
      if (!response.ok) throw new Error('The update service is temporarily unavailable. Please try again.');
      const data = await response.json();
      setNotices(Array.isArray(data.notices) ? data.notices : []);
      setSetup(Boolean(data.setupRequired));
      setLastUpdated(new Date());
      if (data.error) setError('Updates could not be loaded right now.');
    } catch {
      setError('We could not connect to the update service. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadNotices(); }, [loadNotices]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return notices.filter((notice) => {
      const matchesCategory = category === 'All Updates' || notice.category === category;
      const searchable = [notice.title, notice.organization, notice.summary, notice.source_name].filter(Boolean).join(' ').toLocaleLowerCase();
      return matchesCategory && (!needle || searchable.includes(needle));
    });
  }, [notices, category, query]);

  return (
    <main>
      <div className="announcement"><span className="live-dot" /> A clearer way to stay on top of your next opportunity <span className="announcement-arrow">↗</span></div>
      <header className="top">
        <a className="brand" href="#top" aria-label="NaukriSetu home"><span className="mark">N<span>S</span></span><span className="brand-copy"><strong>NaukriSetu</strong><small>Your next step starts here</small></span></a>
        <nav className="nav-links" aria-label="Main navigation"><a href="#updates">Latest updates</a><a href="#how">How it works</a><a className="nav-cta" href="#updates">Explore notices <span>↗</span></a></nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-grid" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
        <div className="hero-inner">
          <div className="eyebrow"><span className="eyebrow-line" /> OPPORTUNITIES, WITHOUT THE NOISE</div>
          <h1>Make your next move<br /><em>with confidence.</em></h1>
          <p className="hero-lede">Find job notifications, exam results, admit cards and education updates — all in one simple place, with links to official sources.</p>
          <form className="search" onSubmit={(event) => { event.preventDefault(); document.getElementById('updates')?.scrollIntoView({ behavior: 'smooth' }); }} role="search">
            <span className="search-icon" aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search jobs, exams, results…" aria-label="Search notices" />
            {query && <button type="button" className="clear-search" onClick={() => setQuery('')} aria-label="Clear search">×</button>}
            <button type="submit" className="search-submit">Search <span>↗</span></button>
          </form>
          <div className="trust-row"><span><i>✓</i> Official source links</span><span><i>✓</i> Reviewed before publishing</span><span><i>✓</i> Free to explore</span></div>
        </div>
        <div className="hero-bottom"><span>BUILT FOR STUDENTS & JOB SEEKERS</span><span>ONE PLACE. CLEAR NEXT STEPS. <b>↘</b></span></div>
      </section>

      <section className="content" id="updates">
        <div className="sectionHead"><div><div className="eyebrow"><span className="eyebrow-line" /> THE LATEST</div><h2>Find what moves you forward.</h2><p className="section-subtitle">Explore the latest notices and go straight to the official source.</p></div><button className="refresh" onClick={() => void loadNotices()} disabled={loading}><span className={loading ? 'refresh-symbol spinning' : 'refresh-symbol'}>↻</span> {loading ? 'Checking…' : 'Refresh updates'}</button></div>
        <div className="filter-bar"><div className="tabs" role="group" aria-label="Filter by category">{categories.map((item) => <button key={item} className={category === item ? 'active' : ''} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="result-meta"><span className="result-count">{filtered.length}</span> {filtered.length === 1 ? 'notice' : 'notices'}{lastUpdated && <span className="updated-at">Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}</div></div>

        {loading && notices.length === 0 ? <div className="empty"><span className="loading-orbit" /><h3>Finding the latest updates</h3><p>Checking the notice board. This should only take a moment.</p></div> : setup ? <div className="empty setup-empty"><span className="empty-icon">⌘</span><h3>Your notice board is almost ready.</h3><p>The website is running, but its database is not connected yet. Configure Supabase and approved RSS/Atom feeds using the deployment guide to publish verified updates.</p><a href="https://supabase.com/" target="_blank" rel="noreferrer" className="text-link">Explore Supabase ↗</a></div> : error ? <div className="empty"><span className="empty-icon">↻</span><h3>We’ll be right back.</h3><p>{error}</p><button className="retry-button" onClick={() => void loadNotices()}>Try again</button></div> : filtered.length === 0 ? <div className="empty"><span className="empty-icon">⌕</span><h3>{query ? 'No matches this time.' : 'New opportunities are on the way.'}</h3><p>{query ? 'Try a different keyword or clear your search to see all available notices.' : 'No published notices are available yet. Check back soon, or try another category.'}</p>{(query || category !== 'All Updates') && <button className="retry-button" onClick={() => { setQuery(''); setCategory('All Updates'); }}>Clear filters</button>}</div> : <div className="cards">{filtered.map((notice) => <article className="notice" key={notice.id}><div className="noticeTop"><span className={`tag tag-${notice.category.toLowerCase().replaceAll(' ', '-')}`}><span>{categoryIcon(notice.category)}</span>{notice.category}</span><span className="date">{safeDate(notice.published_at)}</span></div><h3>{notice.title}</h3>{notice.organization && <p className="org">{notice.organization}</p>}{notice.summary && <p className="summary">{notice.summary}</p>}<div className="noticeFoot"><span className="source"><span className="source-check">✓</span>{notice.source_name || 'Official source'}</span><a href={notice.official_url} target="_blank" rel="noopener noreferrer" aria-label={`Open verified notice: ${notice.title}`}>View official notice <span>↗</span></a></div></article>)}</div>}
        <div className="source-note"><span className="note-icon">i</span><p><strong>Always check the official notice.</strong> Confirm eligibility, deadlines, fees and instructions on the issuing organisation’s website before applying.</p></div>
      </section>

      <section id="how" className="how"><div className="how-copy"><div className="eyebrow"><span className="eyebrow-line" /> SIMPLE BY DESIGN</div><h2>Less searching.<br /><em>More moving forward.</em></h2><p>Important opportunities can be easy to miss. NaukriSetu brings updates together and keeps the official source one click away.</p><a className="how-link" href="#updates">Explore latest notices <span>↗</span></a></div><div className="steps"><div className="step"><b>01</b><span><strong>Discover in one place</strong><small>Browse jobs, results, admit cards and education notices in one organised feed.</small></span><span className="step-arrow">↗</span></div><div className="step"><b>02</b><span><strong>Know what you’re opening</strong><small>Each listing shows its category, source and available publication date.</small></span><span className="step-arrow">↗</span></div><div className="step"><b>03</b><span><strong>Verify before you act</strong><small>Follow the official link to confirm details before submitting an application.</small></span><span className="step-arrow">↗</span></div></div></section>

      <footer><div className="footer-main"><a className="brand" href="#top"><span className="mark">N<span>S</span></span><span className="brand-copy"><strong>NaukriSetu</strong><small>Your next step starts here</small></span></a><p>Helping you find the next opportunity, one update at a time.</p><a href="#top" className="back-top">Back to top ↑</a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} NaukriSetu. Built for the next generation.</span><span>Independent information portal · Always verify at the official source</span></div></footer>
    </main>
  );
}
