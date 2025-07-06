
import { type NextRequest, NextResponse } from 'next/server';

// Note: Authorization (role checks) is now handled in layouts (e.g., /admin/layout.tsx)
// The middleware is only responsible for authentication (is user logged in?).
const protectedRoutes = ['/bookings', '/booking', '/ai-recommendations', '/admin', '/edit-listing', '/dashboard'];
const authRoutes = ['/login', '/signup', '/set-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionId = request.cookies.get('session')?.value;

  const isAccessingAuthRoute = authRoutes.some(route => pathname.startsWith(route));
  const isAccessingProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // If the user has a session cookie and is trying to access a login/signup page,
  // redirect them to a default authenticated page.
  if (sessionId && isAccessingAuthRoute) {
    return NextResponse.redirect(new URL('/bookings', request.url));
  }

  // If the user does not have a session cookie and is trying to access a protected page,
  // redirect them to the login page.
  if (!sessionId && isAccessingProtectedRoute) {
    const url = new URL('/login', request.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
