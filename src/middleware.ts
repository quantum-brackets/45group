
import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

const protectedRoutes = ['/dashboard', '/dashboard/bookings', '/dashboard/booking', '/dashboard/edit-listing', '/ai-recommendations'];
const adminRoutes = ['/dashboard', '/dashboard/edit-listing'];
const authRoutes = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSession();

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // If user is not logged in and tries to access a protected route
  if (!session && isProtectedRoute) {
    const url = new URL('/forbidden', request.url);
    url.searchParams.set('error', 'Authentication Required');
    url.searchParams.set('message', 'You must be logged in to view this page.');
    return NextResponse.rewrite(url);
  }

  // If user is logged in...
  if (session) {
    // ...and is trying to access an auth route (login/signup), redirect to dashboard
    if (isAuthRoute) {
      return NextResponse.redirect(new URL('/dashboard/bookings', request.url));
    }

    // ...but is not an admin and tries to access an admin route
    if (session.role !== 'admin' && isAdminRoute) {
       const url = new URL('/forbidden', request.url);
        url.searchParams.set('error', 'Permission Denied');
        url.searchParams.set('message', 'You do not have the required permissions to access this page.');
        return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
