import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ADA Dashboard — Autonomous Dev Agent Teams',
  description: 'Monitor and manage your autonomous development agent teams. Track cycles, memory, and team performance in real-time.',
  keywords: ['autonomous agents', 'dev agents', 'AI development', 'agent dashboard'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans bg-n-bg text-n-text antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
