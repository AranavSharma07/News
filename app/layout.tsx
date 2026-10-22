import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://news.in'),
  title: { default: 'NaukriSetu — Jobs, Results & Exam Updates', template: '%s | NaukriSetu' },
  description: 'Discover job notifications, exam results, admit cards, answer keys and education updates in one place. Always verify details at the official source.',
  applicationName: 'NaukriSetu',
  keywords: ['government jobs', 'job notifications', 'exam results', 'admit cards', 'answer keys', 'admissions', 'education updates India'],
  openGraph: { title: 'NaukriSetu — Your next step starts here', description: 'Discover job, exam and education updates with links to official sources.', siteName: 'NaukriSetu', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'NaukriSetu — Jobs, Results & Exam Updates', description: 'Find your next opportunity with links to official sources.' },
  robots: { index: true, follow: true },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google AdSense Auto ads. Ads display only after Google approves the site/account. */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7274245941888092"
          crossOrigin="anonymous"
        />
        <meta name="theme-color" content="#0b3025" />
      </head>
      <body>{children}</body>
    </html>
  );
}
