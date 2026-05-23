import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database.types';

/**
 * Creates a Supabase server client for use in Server Components, Server
 * Actions, and Route Handlers.
 *
 * A **new** client must be created per request — never share across requests.
 *
 * The `cookies` option wires the Next.js cookie store so that:
 *   - `getAll` reads the incoming request cookies.
 *   - `setAll` writes refreshed session tokens back to the response, along with
 *     any cache-control headers the library requires.
 *
 * Usage (Server Component / Route Handler):
 *   const supabase = await createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 */
export async function createClient() {
  // In this Next.js version cookies() is async — always await it.
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        /**
         * Read all cookies from the incoming request.
         */
        getAll() {
          return cookieStore.getAll();
        },
        /**
         * Write refreshed session cookies (and required cache-control headers)
         * back to the response.
         *
         * NOTE: Next.js Server Components cannot set cookies directly. If this
         * is called from a Server Component the tokens can't be persisted here —
         * the proxy (proxy.ts) handles that instead via its own createServerClient.
         */
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll is called from a Server Component where cookies cannot be
            // mutated. The proxy must be configured to refresh sessions in that
            // case — this catch prevents a thrown error from crashing the render.
          }
        },
      },
    },
  );
}
