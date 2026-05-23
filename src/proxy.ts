import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database.types';

// ─── Route protection config ────────────────────────────────────────────────

/**
 * Patterns that require an authenticated session.
 * Unauthenticated users will be redirected to /login.
 */
const PROTECTED_PREFIXES = ['/my-bookings', '/booking'];

/**
 * Paths that are always publicly accessible (no auth check needed).
 * We still run the proxy on them so token refreshes are propagated.
 */
const PUBLIC_PATHS = new Set(['/', '/flights', '/login', '/register']);

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  // /flights/* is also public
  if (pathname.startsWith('/flights/')) return true;
  return false;
}

// ─── Proxy function ─────────────────────────────────────────────────────────

/**
 * Next.js Proxy (formerly Middleware).
 *
 * Responsibilities:
 * 1. Refresh Supabase sessions on every request by creating a server client
 *    whose setAll handler writes the updated tokens back to the response.
 * 2. Protect authenticated routes: redirect to /login when unauthenticated.
 *
 * IMPORTANT: We call supabase.auth.getUser() — NOT getSession() — because
 * getSession() reads directly from the cookie without verifying the JWT with
 * the Auth server, making it unsafe for authorization decisions.
 */
export async function proxy(request: NextRequest) {
  // Start with a passthrough response. We will mutate its cookies below.
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        /**
         * Read cookies from the incoming request.
         */
        getAll() {
          return request.cookies.getAll();
        },
        /**
         * Write refreshed session tokens AND required cache-control headers
         * back onto both the request (so Server Components see them) and the
         * response (so the browser stores them).
         *
         * The second `headers` argument is provided by @supabase/ssr and
         * contains Cache-Control / Pragma headers that prevent CDN caching of
         * auth responses.
         */
        setAll(cookiesToSet, headers) {
          // Make refreshed cookies available to downstream Server Components.
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value),
          );

          // Rebuild the response with the updated request headers.
          response = NextResponse.next({ request });

          // Write the refreshed cookies to the response.
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );

          // Apply the anti-caching headers required for auth responses.
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // Verify the session server-side (validated JWT, not just the cookie value).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users away from protected routes.
  if (isProtected(pathname) && !user) {
    const loginUrl = new URL('/login', request.url);
    // Preserve the original destination so we can redirect back after login.
    loginUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Return the response (with any refreshed cookies baked in).
  return response;
}

// ─── Matcher ────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    /*
     * Run on all paths except:
     * - _next/static  (static assets)
     * - _next/image   (image optimisation)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - Any file with an extension (e.g. .png, .svg, .js)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\..*).*)',
  ],
};
