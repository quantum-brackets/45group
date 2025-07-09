import type {Metadata} from 'next';
import Script from 'next/script';
import './globals.css';
import { Header } from '@/components/common/Header';
import { Toaster } from "@/components/ui/toaster"
import { getSession } from '@/lib/session';
import { Twitter, Instagram, Facebook } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: {
    default: 'Hospitality | 45 Group',
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
        <footer className="bg-card border-t">
          <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <Link href={"/#contact"}>
              <img src="/icon.svg" alt="Hospitality Logo" className="h-8 w-8" />
            </Link>
            <div className="flex items-center gap-6">
              <Link href={"https://x.com/hotel45ng"} target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                <Twitter className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
              </Link>
              <Link href={"https://www.instagram.com/hotel45.ng"} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <Instagram className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
              </Link>
              <Link href={"https://www.facebook.com/Hotel45.ng"} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <Facebook className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
              </Link>
            </div>
          </div>
        </footer>
        <Toaster />
        <Script
          src="https://cdn.jsdelivr.net/gh/iamogbz/oh-my-wcs@6b7a7b0/components/carousel-stack.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
