import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'NaukriSetu | Jobs, Results & Admit Cards', description: 'Find job notifications, exam results, admit cards, answer keys and admissions in one place. Verify every notice at its official source.' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
