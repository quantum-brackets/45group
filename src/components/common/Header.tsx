"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Mountain, ChevronDown } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/types';
import { UserNav } from '../auth/UserNav';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const navLinks = [
  { href: '/search', label: 'Search' },
  { href: '/recommendations', label: 'Recommendations' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/bookings', label: 'Bookings' },
];

export function Header({ session }: { session: User | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const visibleNavLinks = navLinks.filter(link => {
    if (link.href.startsWith('/dashboard') && session?.role !== 'admin') {
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
              link.href.startsWith('/dashboard') ? (
                <DropdownMenu key={link.href}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className={cn(
                      'flex items-center gap-1 transition-colors hover:text-primary p-0 h-auto text-sm font-medium',
                      pathname.startsWith('/dashboard') ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {link.label}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard?tab=listings">Listings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard?tab=users">Users</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
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
              )
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
                      link.href.startsWith('/dashboard') ? (
                        <Accordion key={link.href} type="single" collapsible className="w-full -my-2">
                            <AccordionItem value="dashboard" className="border-b-0">
                                <AccordionTrigger className={cn(
                                    'py-2 hover:no-underline transition-colors hover:text-primary [&[data-state=open]>svg]:text-primary',
                                    pathname.startsWith('/dashboard') ? 'text-primary' : 'text-muted-foreground'
                                )}>
                                    {link.label}
                                </AccordionTrigger>
                                <AccordionContent className="pl-6 pt-4 pb-0 flex flex-col gap-4">
                                    <Link href="/dashboard?tab=listings" className={cn(
                                        'text-muted-foreground hover:text-primary',
                                        (pathname === '/dashboard' && (searchParams.get('tab') === 'listings' || !searchParams.has('tab'))) ? 'text-primary font-semibold' : ''
                                    )}>Listings</Link>
                                    <Link href="/dashboard?tab=users" className={cn(
                                        'text-muted-foreground hover:text-primary',
                                        pathname === '/dashboard' && searchParams.get('tab') === 'users' ? 'text-primary font-semibold' : ''
                                    )}>Users</Link>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                      ) : (
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
                      )
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
