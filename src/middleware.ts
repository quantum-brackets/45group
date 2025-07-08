
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession();


  const protectedRoutes = ['/bookings', '/booking', '/recommendations', '/dashboard', '/profile'];
  const authRoutes = ['/login', '/signup'];

  const { pathname } = request.nextUrl;
  const isAccessingAuthRoute = authRoutes.some(route => pathname.startsWith(route));
  const isAccessingProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // If the user has a session and is trying to access an auth page,
  // redirect them to a default authenticated page.
  if (session && isAccessingAuthRoute) {
    return NextResponse.redirect(new URL('/bookings', request.url));
  }

  // If the user does not have a session and is trying to access a protected page,
  // redirect them to the login page.
  if (!session && isAccessingProtectedRoute) {
    const url = new URL('/login', request.url);
    url.searchParams.set('from', pathname); // Let login page know where to redirect back.
    return NextResponse.redirect(url);
  }

  return response
}

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
