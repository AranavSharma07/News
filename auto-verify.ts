/**
 * Conservative automatic verification for notices collected from existing RSS/Atom feeds.
 * Only domains explicitly listed in OFFICIAL_DOMAINS may be published as official.
 * Third-party feed pages are inspected for links to those domains; they are never
 * themselves labelled official unless their hostname is allowlisted.
 */
import { supabase } from './db';

type PendingNotice = {
  id: string;
  title: string;
  article_url?: string | null;
  source_url?: string | null;
  status?: string;
};

const officialDomains = () => (process.env.OFFICIAL_DOMAINS || '')
  .split(',')
  .map((domain) => domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, ''))
  .filter(Boolean);

function safePublicUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return null;
    if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) || host === '::1') return null;
    return url;
  } catch { return null; }
}

function isOfficialHost(url: URL, domains: string[]) {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function decodeHtml(value: string) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function plainText(html: string) {
  return decodeHtml(html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).slice(0, 250_000);
}

function titleMatches(noticeTitle: string, pageText: string) {
  const stop = new Set(['the','and','for','with','from','online','official','notification','notifications','latest','2025','2026','2027','2028']);
  const words = noticeTitle.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter((word) => word.length >= 3 && !stop.has(word));
  if (words.length < 2) return false;
  const sample = pageText.toLowerCase();
  const unique = [...new Set(words)];
  const hits = unique.filter((word) => sample.includes(word)).length;
  return hits >= Math.min(3, unique.length) && hits / unique.length >= 0.45;
}

async function fetchPage(rawUrl: string) {
  const start = safePublicUrl(rawUrl);
  if (!start) return null;
  try {
    const response = await fetch(start.toString(), {
      redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'NaukriSetuVerifier/1.0 (+official-notice-check)', Accept: 'text/html,application/xhtml+xml,application/pdf;q=0.8,*/*;q=0.2' },
    });
    const finalUrl = safePublicUrl(response.url || start.toString());
    if (!response.ok || !finalUrl || !/^text\/(html|plain)|application\/xhtml\+xml/i.test(response.headers.get('content-type') || '')) return null;
    const html = (await response.text()).slice(0, 1_000_000);
    if (/captcha|access denied|checking your browser|temporarily blocked/i.test(html.slice(0, 12000))) return null;
    const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
    const text = `${decodeHtml(title)} ${plainText(html)}`;
    return { url: finalUrl, html, text };
  } catch { return null; }
}

function extractOfficialLinks(html: string, base: URL, domains: string[]) {
  const links: Array<{ url: string; score: number }> = [];
  const anchorRegex = /<a\b([^>]*?)href\s*=\s*(["'])(.*?)\2([^>]*)>([\s\S]*?)<\/a>/gi;
  const intent = /official|apply online|apply now|notification pdf|official notification|download notification|advertisement|recruitment notice|view notice|website|download pdf/i;
  let match: RegExpExecArray | null;
  while ((match = anchorRegex.exec(html)) !== null) {
    const href = decodeHtml(match[3].trim());
    const label = plainText(match[5]).slice(0, 300);
    if (!href || /^(javascript:|mailto:|tel:|#)/i.test(href)) continue;
    let candidate: URL;
    try { candidate = new URL(href, base); } catch { continue; }
    const safe = safePublicUrl(candidate.toString());
    if (!safe || !isOfficialHost(safe, domains)) continue;
    const score = (intent.test(label) ? 3 : 0) + (/\.gov\.in$|\.nic\.in$|\.ac\.in$/i.test(safe.hostname) ? 2 : 0) + (/\.pdf(?:$|\?)/i.test(safe.pathname + safe.search) ? 1 : 0);
    links.push({ url: safe.toString(), score });
  }
  return [...new Map(links.sort((a,b) => b.score - a.score).map((link) => [link.url, link])).values()].slice(0, 8);
}

export async function verifyNotice(notice: PendingNotice): Promise<{ officialUrl: string; reason: string } | null> {
  const domains = officialDomains();
  if (!domains.length) return null; // Fail closed until owner configures the trusted official domain allowlist.
  if (!notice.title || notice.title.trim().length < 8) return null;

  const articleRaw = notice.article_url || '';
  const articleUrl = safePublicUrl(articleRaw);
  if (!articleUrl) return null;
  const article = await fetchPage(articleUrl.toString());
  if (!article) return null;

  // A page is directly publishable only when its final host is explicitly trusted and its content matches.
  if (isOfficialHost(article.url, domains) && titleMatches(notice.title, article.text)) {
    return { officialUrl: article.url.toString(), reason: 'trusted-domain-and-title-match' };
  }

  // If the feed points to an aggregator, follow only candidate links on explicitly trusted official domains.
  const candidates = extractOfficialLinks(article.html, article.url, domains);
  for (const candidate of candidates) {
    const page = await fetchPage(candidate.url);
    if (!page || !isOfficialHost(page.url, domains)) continue;
    if (titleMatches(notice.title, page.text)) {
      return { officialUrl: page.url.toString(), reason: 'official-link-and-title-match' };
    }
  }
  return null;
}

export async function autoVerifyPending(limit = 40) {
  const pending = await supabase(
    `notices?select=id,title,article_url,source_url,status&status=eq.pending&article_url=not.is.null&order=created_at.desc&limit=${Math.max(1, Math.min(limit, 100))}`
  ) as PendingNotice[];
  const report = { checked: 0, published: 0, leftPending: 0, errors: 0 };
  for (const notice of pending || []) {
    report.checked++;
    try {
      const result = await verifyNotice(notice);
      if (!result) { report.leftPending++; continue; }
      const updated = await supabase(`notices?id=eq.${encodeURIComponent(notice.id)}&status=eq.pending`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ official_url: result.officialUrl, official_verified: true, status: 'published', updated_at: new Date().toISOString() }),
      });
      if (Array.isArray(updated) && updated.length) report.published++;
      else report.leftPending++;
    } catch {
      report.errors++;
    }
  }
  return report;
}
