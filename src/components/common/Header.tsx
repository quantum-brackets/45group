
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Menu, ChevronDown } from 'lucide-react';
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
import { useState, useEffect } from 'react';

const navLinks = [
  { href: '/search', label: 'Search' },
  { href: '/recommendations', label: 'Recommendations' },
  { href: '/bookings', label: 'Bookings' },
  { href: '/dashboard', label: 'Dashboard' },
];

export function Header({ session }: { session: User | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const visibleNavLinks = navLinks.filter(link => {
    if (link.href.startsWith('/dashboard') && session?.role !== 'admin' && session?.role !== 'staff') {
      return false;
    }
    if (link.href.startsWith('/bookings') && !session) {
        return false;
    }
    return true;
  });

  return (
    <header className="bg-card shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between relative">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <img src="/icon.svg" alt="Hospitality Logo" className="h-6 w-6" />
            <span className="font-headline">Hospitality</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium absolute left-1/2 -translate-x-1/2">
            {visibleNavLinks.map((link) => (
              link.href.startsWith('/dashboard') ? (
                <DropdownMenu key={link.href}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                        variant="ghost" 
                        data-active={isClient && pathname.startsWith('/dashboard')}
                        className={cn(
                            'flex items-center gap-1 p-0 h-auto text-sm font-medium hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0',
                            'transition-colors hover:text-primary text-muted-foreground data-[active=true]:text-primary'
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
                  data-active={isClient && pathname === link.href}
                  className={cn(
                    'transition-colors hover:text-primary text-muted-foreground data-[active=true]:text-primary'
                  )}
                >
                  {link.label}
                </Link>
              )
            ))}
        </nav>

        <div className="flex items-center gap-4">
            {session ? (
                <UserNav user={session} />
            ) : (
                <div className="hidden md:flex items-center gap-2">
                    <Button asChild>
                        <Link href="/login">Account</Link>
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
                <SheetHeader className="sr-only">
                    <SheetTitle>Mobile Menu</SheetTitle>
                    <SheetDescription>Main navigation for Hospitality.</SheetDescription>
                </SheetHeader>
                <nav className="grid gap-6 text-lg font-medium">
                    <Link href="/" className="flex items-center gap-2 font-bold text-lg mb-4">
                      <img src="/icon.svg" alt="Hospitality Logo" className="h-6 w-6" />
                      <span className="font-headline">Hospitality</span>
                    </Link>
                    {visibleNavLinks.map((link) => (
                      link.href.startsWith('/dashboard') ? (
                        <Accordion key={link.href} type="single" collapsible className="w-full -my-2">
                            <AccordionItem value="dashboard" className="border-b-0">
                                <AccordionTrigger
                                    data-active={isClient && pathname.startsWith('/dashboard')}
                                    className={cn(
                                        'py-2 hover:no-underline transition-colors hover:text-primary [&[data-state=open]>svg]:text-primary',
                                        'text-muted-foreground data-[active=true]:text-primary'
                                )}>
                                    {link.label}
                                </AccordionTrigger>
                                <AccordionContent className="pl-6 pt-4 pb-0 flex flex-col gap-4">
                                    <Link 
                                        href="/dashboard?tab=listings" 
                                        data-active={isClient && pathname === '/dashboard' && (searchParams.get('tab') === 'listings' || !searchParams.has('tab'))}
                                        className={cn(
                                            'text-muted-foreground hover:text-primary data-[active=true]:text-primary data-[active=true]:font-semibold'
                                    )}>Listings</Link>
                                    <Link 
                                        href="/dashboard?tab=users"
                                        data-active={isClient && pathname === '/dashboard' && searchParams.get('tab') === 'users'} 
                                        className={cn(
                                            'text-muted-foreground hover:text-primary data-[active=true]:text-primary data-[active=true]:font-semibold'
                                    )}>Users</Link>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                      ) : (
                        <Link
                            key={link.href}
                            href={link.href}
                            data-active={isClient && pathname === link.href}
                            className={cn(
                            'transition-colors hover:text-primary',
                            'text-muted-foreground data-[active=true]:text-primary'
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
                                <Button asChild><Link href="/login">Account</Link></Button>
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
