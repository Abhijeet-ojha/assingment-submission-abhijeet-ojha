import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lead Distribution System',
  description: 'Concurrency-safe lead allocation with persistent fairness and webhook idempotency.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
