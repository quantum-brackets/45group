
import { type NextRequest, NextResponse } from 'next/server';
import { getUserFromSessionId } from '@/lib/session-middleware';

const protectedRoutes = ['/bookings', '/booking', '/ai-recommendations'];
const adminRoutes = ['/admin', '/edit-listing', '/dashboard', '/dashboard/booking', '/dashboard/bookings', '/dashboard/edit-listing'];
const authRoutes = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionId = request.cookies.get('session')?.value;
  const session = sessionId ? await getUserFromSessionId(sessionId) : null;

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // Combine protected and admin routes for the main login check
  const allProtected = [...protectedRoutes, ...adminRoutes];

  // If user is not logged in and tries to access a protected route, block them
  if (!session && allProtected.some(route => pathname.startsWith(route))) {
    const url = new URL('/forbidden', request.url);
    url.searchParams.set('error', 'Authentication Required');
    url.searchParams.set('message', 'You must be logged in to view this page.');
    return NextResponse.rewrite(url);
  }

  // If user is logged in, handle redirects and permissions
  if (session) {
    // If they try to access login/signup, redirect them to their dashboard
    if (isAuthRoute) {
      const redirectUrl = session.role === 'admin' ? '/admin' : '/bookings';
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    // If they are not an admin and try to access an admin route, block them
    if (session.role !== 'admin' && isAdminRoute) {
       const url = new URL('/forbidden', request.url);
        url.searchParams.set('error', 'Permission Denied');
        url.searchParams.set('message', 'You do not have the required permissions to access this page.');
        return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const runtime = 'nodejs';

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
