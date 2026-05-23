// My Bookings page — route: /my-bookings
// Server Component: fetches the authenticated user's bookings from Supabase.
// Authentication is enforced by middleware; if unauthenticated the user never
// reaches this page.

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import BookingList from '@/components/bookings/BookingList';
import type { BookingWithDetails } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────────────────────────────────────

export const metadata = {
  title: 'My Bookings — SkyBook',
  description: 'View and manage all your SkyBook flight bookings.',
};

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function MyBookingsPage() {
  const supabase = await createClient();

  // Verify the session server-side — an extra safety net beyond middleware.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch all bookings for this user, joined with related tables.
  // Supabase expands FK relationships using the foreign key column names.
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
      *,
      flight:flights(*),
      seat:seats(*),
      passengers(*)
    `,
    )
    .eq('user_id', user.id)
    .order('booked_at', { ascending: false });

  if (error) {
    // Surface a friendly error rather than crashing the page.
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-red-100 shadow-lg p-8 max-w-md text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">
            Could not load bookings
          </h1>
          <p className="text-sm text-red-500 mb-6">{error.message}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-xl font-semibold text-sm
                       bg-gradient-to-r from-[#0a1628] to-[#1e3a5f] text-white
                       hover:from-[#0d1f3c] hover:to-[#243f6a] transition-all"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const bookings = (data ?? []) as BookingWithDetails[];

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#0a1628] to-[#1e3a5f] border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-slate-400 mb-4">
            <Link href="/" className="hover:text-[#c8a84b] transition-colors">
              Home
            </Link>
            <span>›</span>
            <span className="text-slate-300">My Bookings</span>
          </nav>

          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                My Bookings
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {bookings.length > 0
                  ? `${bookings.length} booking${bookings.length !== 1 ? 's' : ''} found`
                  : 'No bookings yet'}
              </p>
            </div>

            <Link
              href="/"
              className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold
                         bg-[#c8a84b]/15 border border-[#c8a84b]/30 text-[#c8a84b]
                         hover:bg-[#c8a84b]/25 transition-all"
            >
              + New Booking
            </Link>
          </div>
        </div>
      </div>

      {/* ── Booking list ─────────────────────────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <BookingList initialBookings={bookings} />
      </main>
    </div>
  );
}
