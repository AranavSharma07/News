import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://news-aa-3d38.vercel.app').replace(/\/$/, '');
  const routes = [
    { path: '', priority: 1, changeFrequency: 'daily' as const },
    { path: '/about-admin', priority: 0.4, changeFrequency: 'monthly' as const },
    { path: '/privacy-policy', priority: 0.4, changeFrequency: 'yearly' as const },
    { path: '/terms-and-conditions', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/disclaimer', priority: 0.3, changeFrequency: 'yearly' as const },
  ];
  return routes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
