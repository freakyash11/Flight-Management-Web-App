'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useUserStore } from '@/store/useUserStore';
import BookingCard from './BookingCard';
import type { BookingWithDetails } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  /** Initial booking list fetched server-side. */
  initialBookings: BookingWithDetails[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function BookingList({ initialBookings }: Props) {
  const cachedBookings    = useUserStore((s) => s.cachedBookings);
  const setCachedBookings = useUserStore((s) => s.setCachedBookings);

  // Hydrate the store with the fresh server-fetched list on first mount.
  // After this, the store is the source of truth (CancelButton patches it live).
  useEffect(() => {
    setCachedBookings(initialBookings);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once — initialBookings won't change after SSR.

  // Display from store so optimistic cancel updates are reflected immediately.
  const bookings = cachedBookings.length > 0 ? cachedBookings : initialBookings;

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-4xl mb-5">
          🎫
        </div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">No bookings yet</h2>
        <p className="text-slate-400 text-sm max-w-xs leading-relaxed mb-6">
          You haven&apos;t booked any flights yet. Search for a flight to get started.
        </p>
        <Link
          href="/"
          className="px-6 py-3 rounded-xl font-semibold text-sm
                     bg-gradient-to-r from-[#0a1628] to-[#1e3a5f] text-white
                     hover:from-[#0d1f3c] hover:to-[#243f6a] transition-all shadow-md"
        >
          ✈ Search Flights
        </Link>
      </div>
    );
  }

  const confirmed   = bookings.filter((b) => b.status === 'confirmed');
  const other       = bookings.filter((b) => b.status !== 'confirmed');

  return (
    <div className="space-y-8">
      {/* Active bookings */}
      {confirmed.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#c8a84b] to-[#e2c068]" />
            <h2 className="text-base font-bold text-slate-700">
              Active ({confirmed.length})
            </h2>
          </div>
          <div className="space-y-4">
            {confirmed.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        </section>
      )}

      {/* Past / cancelled */}
      {other.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full bg-slate-300" />
            <h2 className="text-base font-bold text-slate-500">
              Past & Cancelled ({other.length})
            </h2>
          </div>
          <div className="space-y-4">
            {other.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
