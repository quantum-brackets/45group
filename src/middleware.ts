/**
 * @fileoverview This file defines the Next.js middleware for the application.
 * Middleware runs on the server before a request is completed. It's used here
 * to protect routes based on the user's authentication status.
 */
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Get the session token from the user's cookies.
  const sessionToken = request.cookies.get('session')?.value;

  // Define routes that require authentication.
  // TODO: This could be managed by the permission system for more granular control.
  const protectedRoutes = ['/bookings', '/booking', '/recommendations', '/dashboard', '/profile'];
  // Define routes that should only be accessible to unauthenticated users.
  const authRoutes = ['/login', '/signup'];

  const { pathname } = request.nextUrl;
  const isAccessingAuthRoute = authRoutes.some(route => pathname.startsWith(route));
  const isAccessingProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // --- Rule 1: Authenticated users should not access login/signup pages ---
  if (sessionToken && isAccessingAuthRoute) {
    // Redirect them to a default authenticated page (e.g., their bookings).
    return NextResponse.redirect(new URL('/bookings', request.url));
  }

  // --- Rule 2: Unauthenticated users should not access protected pages ---
  if (!sessionToken && isAccessingProtectedRoute) {
    const url = new URL('/login', request.url);
    // Add a `from` query parameter to the login URL. This tells the login page
    // where to redirect the user back to after a successful login.
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // If none of the above rules match, allow the request to proceed.
  return NextResponse.next();
}

// The `config.matcher` tells Next.js which paths the middleware should run on.
// This pattern excludes static files, image optimization files, and favicons,
// as they do not require authentication checks.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
