'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';
import { createClient } from '@/lib/supabase/client';
import type { BookingWithDetails } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

// Next.js 16: searchParams is a Promise — use React.use() in Client Components.
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

type Props = {
  searchParams: SearchParams;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function firstString(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] ?? '';
  return val ?? '';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function formatPrice(amount: number | string): string {
  return `₹${Math.round(Number(amount)).toLocaleString('en-IN')}`;
}

function computeDuration(departsAt: string, arrivesAt: string): string {
  const diffMs = new Date(arrivesAt).getTime() - new Date(departsAt).getTime();
  const totalMinutes = Math.round(diffMs / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const CLASS_LABEL: Record<string, string> = {
  economy: 'Economy',
  business: 'Business',
  first: 'First Class',
};

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function BookingConfirmPage({ searchParams }: Props) {
  const router = useRouter();

  // Unwrap the Promise synchronously with React.use() — valid in Client Components.
  const params = use(searchParams);
  const bookingIdParam = firstString(params.bookingId);

  // ── Store data ─────────────────────────────────────────────────────────────
  const cachedBookings = useUserStore((s) => s.cachedBookings);

  // ── Local state ────────────────────────────────────────────────────────────
  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Resolve booking: store first, then Supabase fallback ──────────────────
  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      setLoading(true);
      setFetchError(null);

      // 1. Try cache first — either the most recent booking or a matching id.
      if (bookingIdParam) {
        const found = cachedBookings.find((b) => b.id === bookingIdParam);
        if (found) {
          if (!cancelled) { setBooking(found); setLoading(false); }
          return;
        }
      } else if (cachedBookings.length > 0) {
        // Most recently added (addBookingToCache prepends, so index 0 is newest).
        if (!cancelled) { setBooking(cachedBookings[0]); setLoading(false); }
        return;
      }

      // 2. Cache miss — fetch from Supabase using the bookingId query param.
      if (!bookingIdParam) {
        // No id and no cache → nothing to show.
        if (!cancelled) { setLoading(false); }
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *,
            flight:flights(*),
            seat:seats(*),
            passengers(*)
          `)
          .eq('id', bookingIdParam)
          .single();

        if (error) throw error;
        if (!cancelled) setBooking(data as BookingWithDetails);
      } catch (err) {
        if (!cancelled) setFetchError(err instanceof Error ? err.message : 'Failed to load booking.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    resolve();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingIdParam]); // Re-run only if the query param changes.

  // ── Redirect if truly nothing to show (after loading) ─────────────────────
  useEffect(() => {
    if (!loading && !booking && !fetchError) {
      router.replace('/');
    }
  }, [loading, booking, fetchError, router]);

  // ─────────────────────────────────────────────────────────────────────────
  // Loading skeleton
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-500/30 border-t-emerald-500
                          animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-medium">Loading your booking…</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Error state
  // ─────────────────────────────────────────────────────────────────────────

  if (fetchError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-red-100 shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Could not load booking</h2>
          <p className="text-sm text-red-500 mb-6">{fetchError}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-xl font-semibold text-sm
                       bg-gradient-to-r from-[#0a1628] to-[#1e3a5f] text-white
                       hover:from-[#0d1f3c] hover:to-[#1e3a5f] transition-all"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!booking) return null; // redirect effect handles this

  const { flight, seat, passengers, pnr_code, total_price } = booking;
  const primaryPassenger = passengers[0];

  // ─────────────────────────────────────────────────────────────────────────
  // Success UI
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30 flex items-center justify-center px-4 py-12">
      {/* Confetti-like background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-emerald-400/8 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-emerald-300/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg space-y-4">
        {/* ── Success header card ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-xl shadow-emerald-100/50 border border-emerald-100 overflow-hidden">
          {/* Green accent top bar */}
          <div className="h-2 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500" />

          <div className="px-6 py-8 text-center">
            {/* Success icon */}
            <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200
                            flex items-center justify-center text-3xl mx-auto mb-4
                            shadow-inner">
              ✅
            </div>

            <h1 className="text-2xl font-extrabold text-slate-800 mb-1">
              Booking Confirmed!
            </h1>
            <p className="text-sm text-slate-400 mb-6">
              Your seat is reserved. Have a great flight!
            </p>

            {/* PNR code */}
            <div className="inline-flex flex-col items-center bg-slate-50 border border-slate-200
                            rounded-xl px-8 py-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">
                PNR Code
              </span>
              <span className="text-3xl font-black tracking-[0.25em] text-slate-800 font-mono">
                {pnr_code}
              </span>
            </div>
          </div>
        </div>

        {/* ── Flight details card ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-100/80 border border-slate-100 overflow-hidden">
          {/* Airline-ticket top notch effect */}
          <div className="h-1 w-full bg-gradient-to-r from-[#0a1628] via-[#1e3a5f] to-[#c8a84b]" />

          <div className="px-6 py-6 space-y-5">
            {/* Section: Flight */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Flight Details
              </p>

              {/* Route */}
              <div className="flex items-center gap-3 mb-3">
                <div className="text-center">
                  <div className="text-2xl font-black text-slate-800 leading-none tabular-nums">
                    {formatTime(flight.departs_at)}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">{flight.origin}</div>
                </div>
                <div className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-[11px] text-slate-400">
                    {computeDuration(flight.departs_at, flight.arrives_at)}
                  </span>
                  <div className="w-full flex items-center gap-1">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-[#c8a84b] text-xs">✈</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                  <span className="text-[11px] text-slate-400">Direct</span>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-slate-800 leading-none tabular-nums">
                    {formatTime(flight.arrives_at)}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">{flight.destination}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Date</div>
                  <div className="font-semibold text-slate-700 text-xs mt-0.5">
                    {formatDate(flight.departs_at)}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Flight No.</div>
                  <div className="font-semibold text-slate-700 mt-0.5">{flight.flight_no}</div>
                </div>
              </div>
            </div>

            {/* Dashed separator — boarding-pass style */}
            <div className="relative">
              <div className="border-t border-dashed border-slate-200" />
              <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-50 border border-slate-200" />
              <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-50 border border-slate-200" />
            </div>

            {/* Section: Seat */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Seat &amp; Passenger
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Seat</div>
                  <div className="font-black text-slate-800 text-lg mt-0.5">{seat.seat_number}</div>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Class</div>
                  <div className="font-semibold text-slate-700 mt-0.5">
                    {CLASS_LABEL[seat.class] ?? seat.class}
                  </div>
                </div>
                {primaryPassenger && (
                  <div className="col-span-2 bg-slate-50 rounded-lg px-3 py-2">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">Passenger</div>
                    <div className="font-semibold text-slate-700 mt-0.5">{primaryPassenger.full_name}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Dashed separator */}
            <div className="relative">
              <div className="border-t border-dashed border-slate-200" />
              <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-50 border border-slate-200" />
              <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-50 border border-slate-200" />
            </div>

            {/* Section: Total price */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">Total Paid</span>
              <span className="text-2xl font-black text-slate-800">
                {formatPrice(total_price)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Actions ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/my-bookings"
            id="confirm-view-bookings"
            className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl
                       font-semibold text-sm border-2 border-[#0a1628] text-[#0a1628]
                       hover:bg-[#0a1628] hover:text-white
                       transition-all duration-150 text-center"
          >
            📋 My Bookings
          </Link>

          <Link
            href="/"
            id="confirm-book-another"
            className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl
                       font-semibold text-sm
                       bg-gradient-to-r from-[#0a1628] to-[#1e3a5f] text-white
                       hover:from-[#0d1f3c] hover:to-[#1e3a5f]
                       transition-all duration-150 shadow-md shadow-[#0a1628]/20 text-center"
          >
            ✈ Book Another
          </Link>
        </div>

        <p className="text-center text-xs text-slate-400 pt-1">
          A confirmation email has been sent to your registered address.
        </p>
      </div>
    </div>
  );
}
