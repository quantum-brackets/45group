
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Mountain } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/types';
import { UserNav } from '../auth/UserNav';

const navLinks = [
  { href: '/search', label: 'Search' },
  { href: '/ai-recommendations', label: 'AI Recommendations' },
  { href: '/admin', label: 'Admin' },
  { href: '/bookings', label: 'Bookings' },
];

export function Header({ session }: { session: User | null }) {
  const pathname = usePathname();

  const visibleNavLinks = navLinks.filter(link => {
    if (link.href.startsWith('/admin') && session?.role !== 'admin') {
      return false;
    }
    if (link.href.startsWith('/bookings') && !session) {
        return false;
    }
    return true;
  });

  return (
    <header className="bg-card shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Mountain className="h-6 w-6 text-primary" />
            <span className="font-headline">Book45</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {visibleNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'transition-colors hover:text-primary',
                  pathname === link.href ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
            {session ? (
                <UserNav user={session} />
            ) : (
                <div className="hidden md:flex items-center gap-2">
                    <Button variant="ghost" asChild>
                        <Link href="/login">Login</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/signup">Sign Up</Link>
                    </Button>
                </div>
            )}
            <div className="md:hidden">
            <Sheet>
                <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle navigation menu</span>
                </Button>
                </SheetTrigger>
                <SheetContent side="left">
                <nav className="grid gap-6 text-lg font-medium p-6">
                    <Link href="/" className="flex items-center gap-2 font-bold text-lg mb-4">
                    <Mountain className="h-6 w-6 text-primary" />
                    <span className="font-headline">Book45</span>
                    </Link>
                    {visibleNavLinks.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                        'transition-colors hover:text-primary',
                        pathname === link.href ? 'text-primary' : 'text-muted-foreground'
                        )}
                    >
                        {link.label}
                    </Link>
                    ))}
                    <div className="border-t pt-6 mt-4">
                        {session ? (
                             <UserNav user={session} />
                        ): (
                            <div className="grid gap-4">
                                <Button variant="ghost" asChild><Link href="/login">Login</Link></Button>
                                <Button asChild><Link href="/signup">Sign Up</Link></Button>
                            </div>
                        )}
                    </div>
                </nav>
                </SheetContent>
            </Sheet>
            </div>
        </div>
      </div>
    </header>
  );
}
