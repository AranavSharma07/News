const htmlDecode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/\s+/g, ' ')
    .trim();

const tag = (xml: string, name: string) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = xml.match(
    new RegExp(
      `<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}\\s*>`,
      'i'
    )
  );

  if (match) return htmlDecode(match[1]);

  const attr = xml.match(
    new RegExp(`<${escaped}[^>]*href=["']([^"']+)["'][^>]*/?>`, 'i')
  );

  return attr?.[1] || '';
};

function categorize(title: string): string {
  const t = title.toLowerCase();

  if (/admit card|hall ticket|call letter/.test(t)) return 'Admit Cards';
  if (/result|merit list|score ?card/.test(t)) return 'Results';
  if (/answer[\s-]?key/.test(t)) return 'Answer Keys';
  if (/admission|entrance/.test(t)) return 'Admissions';
  if (
    /recruitment|vacanc(?:y|ies)|government job|apply online|application form|selection|exam notification/.test(t)
  ) {
    return 'Jobs';
  }

  return 'Notifications';
}

export async function collectFeed(url: string) {
  const parsedUrl = new URL(url);

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    throw new Error('Feed URL must use HTTP or HTTPS.');
  }

  const response = await fetch(parsedUrl.toString(), {
    headers: {
      'User-Agent': 'NaukriSetuBot/1.0 (+official-source-monitoring)',
      Accept:
        'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
    },
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Feed returned HTTP ${response.status}`);
  }

  const xml = await response.text();

  if (!/<(?:rss|feed|rdf:RDF)\b/i.test(xml)) {
    throw new Error('The URL did not return a recognized RSS or Atom feed.');
  }

  const chunks =
    xml.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) || [];

  const results = chunks.map((chunk) => {
    const title = tag(chunk, 'title');
    const link = tag(chunk, 'link') || tag(chunk, 'guid');
    const date =
      tag(chunk, 'pubDate') ||
      tag(chunk, 'published') ||
      tag(chunk, 'updated');
    const description =
      tag(chunk, 'description') ||
      tag(chunk, 'summary') ||
      tag(chunk, 'content');

    if (!title || !/^https?:\/\//i.test(link)) return null;

    let officialUrl: URL;

    try {
      officialUrl = new URL(link);
    } catch {
      return null;
    }

    if (!['http:', 'https:'].includes(officialUrl.protocol)) return null;

    return {
      title: title.slice(0, 500),
      category: categorize(title),
      summary: description.slice(0, 2000),
      // A feed item is not proof of an official destination. Keep it as an article
      // URL and require a reviewer to add/verify the issuing body's official URL.
      official_url: null,
      article_url: officialUrl.toString(),
      official_verified: false,
      source_url: parsedUrl.toString(),
      source_name:
        process.env.DEFAULT_SOURCE_NAME || parsedUrl.hostname,
      published_at:
        date && !Number.isNaN(Date.parse(date))
          ? new Date(date).toISOString()
          : null,
    };
  });

  return results.filter((item) => item !== null);
}
