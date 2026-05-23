'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';

/**
 * Returns the singleton Supabase browser client.
 *
 * Safe to call multiple times — @supabase/ssr caches the instance automatically
 * when running in a browser context (isSingleton defaults to true).
 *
 * Usage (Client Component):
 *   const supabase = createClient();
 *   const { data } = await supabase.from('flights').select();
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
