const htmlDecode = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  if (m) return htmlDecode(m[1]);
  const attr = xml.match(new RegExp(`<${name}[^>]*href=["']([^"']+)["'][^>]*/?>`, 'i'));
  return attr?.[1] || '';
};
function categorize(title: string): string {
  const t = title.toLowerCase();
  if (/admit card|hall ticket|call letter/.test(t)) return 'Admit Cards';
  if (/result|merit list|score card|scorecard/.test(t)) return 'Results';
  if (/answer key|answer-key/.test(t)) return 'Answer Keys';
  if (/admission|entrance/.test(t)) return 'Admissions';
  if (/recruitment|vacancy|vacancies|job|application form|apply online|selection|exam notification/.test(t)) return 'Jobs';
  return 'Notifications';
}
export async function collectFeed(url: string) {
  const response = await fetch(url, { headers: { 'User-Agent': 'NaukriSetuBot/1.0 (+official-source-monitoring)' }, signal: AbortSignal.timeout(15000), cache: 'no-store' });
  if (!response.ok) throw new Error(`Feed returned HTTP ${response.status}`);
  const xml = await response.text();
  const chunks = xml.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) || [];
  return chunks.map(chunk => {
    const title = tag(chunk, 'title');
    const link = tag(chunk, 'link') || tag(chunk, 'guid');
    const date = tag(chunk, 'pubDate') || tag(chunk, 'published') || tag(chunk, 'updated');
    const desc = tag(chunk, 'description') || tag(chunk, 'summary') || tag(chunk, 'content');
    if (!title || !/^https?:\/\//i.test(link)) return null;
    return { title: title.slice(0,500), category: categorize(title), summary: desc.slice(0,2000), official_url: link, source_url: url, source_name: process.env.DEFAULT_SOURCE_NAME || new URL(url).hostname, published_at: date && !Number.isNaN(Date.parse(date)) ? new Date(date).toISOString() : null };
  }).filter(Boolean);
}
