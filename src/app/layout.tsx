/**
 * @fileoverview This is the root layout for the entire application.
 * It sets up the basic HTML structure, including the <head> and <body> tags,
 * loads global CSS, fonts, and sets up the main layout structure with a header and footer.
 */
import type {Metadata} from 'next';
import Script from 'next/script';
import './globals.css';
import { Header } from '@/components/common/Header';
import { Toaster } from "@/components/ui/toaster"
import { getSession } from '@/lib/session';
import { Twitter, Instagram, Facebook } from 'lucide-react';
import Link from 'next/link';

// Default metadata for the application, used for SEO.
// It can be overridden by individual pages.
export const metadata: Metadata = {
  title: {
    default: '45 Booking | Premier Hotel, Event & Restaurant Hospitality',
    template: '%s | 45 Booking Hospitality',
  },
  description: 'Discover and book premier hotel rooms, event venues, and restaurants with 45 Booking. Your expert partner in hospitality, ensuring memorable experiences.',
  keywords: 'hotel booking, restaurant reservations, event center, hospitality services, 45 Booking, book hotels, book restaurants, event spaces',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch the user's session on the server.
  // This is available to all child components and pages.
  const session = await getSession();

  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Preconnect to Google Fonts for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&display=swap" rel="stylesheet" />
      </head>
      {/* 
        The main body of the application.
        - `font-body` and `antialiased` are for typography styling.
        - `bg-background` sets the default background color from the theme.
        - `min-h-screen flex flex-col` ensures the footer stays at the bottom.
      */}
      <body className="font-body antialiased bg-background min-h-screen flex flex-col">
        {/* The site-wide header, which receives the session to display user-specific controls. */}
        <Header session={session} />
        {/* The main content area where pages will be rendered. `flex-grow` allows it to fill available space. */}
        <main className="flex-grow">
          {children}
        </main>
        {/* The site-wide footer. */}
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
        {/* The Toaster component is used for displaying pop-up notifications (toasts). */}
        <Toaster />
        {/* 
          This script loads an external web component for the image carousel.
          `strategy="beforeInteractive"` ensures it loads before Next.js hydrates the page,
          which is necessary for custom elements to be defined in time.
        */}
        <Script
          src="https://cdn.jsdelivr.net/gh/iamogbz/oh-my-wcs@6b7a7b0/components/carousel-stack.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
