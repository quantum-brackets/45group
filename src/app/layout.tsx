import type {Metadata} from 'next';
import Script from 'next/script';
import './globals.css';
import { Header } from '@/components/common/Header';
import { Toaster } from "@/components/ui/toaster"
import { getSession } from '@/lib/session';

export const metadata: Metadata = {
  title: {
    default: 'Hospitality',
    template: '%s | Hospitality',
  },
  description: 'Book hotels, event venues, and restaurants.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background min-h-screen flex flex-col">
        <Header session={session} />
        <main className="flex-grow">
          {children}
        </main>
        <Toaster />
        <Script
          src="https://cdn.jsdelivr.net/gh/iamogbz/oh-my-wcs@6b7a7b0/components/carousel-stack.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
