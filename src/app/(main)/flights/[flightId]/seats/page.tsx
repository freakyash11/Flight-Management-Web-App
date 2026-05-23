// Seat selection page — route: /flights/[flightId]/seats
// Server Component: fetches all seats, groups by class, passes to SeatMap.
// params is a Promise in this Next.js version — always await before use.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SeatMap from '@/components/seats/SeatMap';
import type { SeatRow, FlightRow } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SeatsPageProps = {
  params: Promise<{ flightId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

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
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

type SeatClass = 'first' | 'business' | 'economy';

type GroupedSeats = Record<SeatClass, SeatRow[]>;

function groupByClass(seats: SeatRow[]): GroupedSeats {
  return seats.reduce<GroupedSeats>(
    (acc, seat) => {
      const cls = seat.class as SeatClass;
      if (acc[cls]) acc[cls].push(seat);
      return acc;
    },
    { first: [], business: [], economy: [] },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function SeatsPage({ params }: SeatsPageProps) {
  const { flightId } = await params;

  const supabase = await createClient();

  // Fetch flight + all seats in parallel.
  const [{ data: flight, error: flightErr }, { data: seatRows, error: seatErr }] =
    await Promise.all([
      supabase.from('flights').select('*').eq('id', flightId).single(),
      supabase
        .from('seats')
        .select('*')
        .eq('flight_id', flightId)
        .order('seat_number', { ascending: true }),
    ]);

  if (flightErr || !flight) notFound();
  if (seatErr) {
    throw new Error(`Failed to load seats: ${seatErr.message}`);
  }

  const f = flight as FlightRow;
  const seats = (seatRows ?? []) as SeatRow[];
  const grouped = groupByClass(seats);

  const availableCount = seats.filter((s) => s.is_available).length;

  // Generate dynamic metadata-like title for the document.
  const pageTitle = `Select Seat — ${f.flight_no} ${f.origin} → ${f.destination}`;

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
            <Link href="/flights" className="hover:text-[#c8a84b] transition-colors">
              Flights
            </Link>
            <span>›</span>
            <span className="text-slate-300">Select Seat</span>
          </nav>

          <h1 className="sr-only">{pageTitle}</h1>

          {/* Flight summary strip */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">
                  {f.origin}
                </span>
                <span className="text-[#c8a84b] text-xl">✈</span>
                <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">
                  {f.destination}
                </span>
              </div>
              <p className="text-slate-400 text-sm">
                {f.flight_no} &middot; {f.aircraft_type} &middot; {formatDate(f.departs_at)}
              </p>
              <p className="text-slate-300 text-sm font-medium mt-0.5">
                {formatTime(f.departs_at)} → {formatTime(f.arrives_at)}
              </p>
            </div>

            <div className="text-right">
              <div className="text-2xl font-black text-white">
                {availableCount}
              </div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">
                Seats available
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Seat summary pills ─────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-3 py-4 border-b border-slate-100">
          {(
            [
              { key: 'first', label: 'First Class', color: 'text-amber-700 bg-amber-50 border-amber-200' },
              { key: 'business', label: 'Business', color: 'text-violet-700 bg-violet-50 border-violet-200' },
              { key: 'economy', label: 'Economy', color: 'text-sky-700 bg-sky-50 border-sky-200' },
            ] as const
          ).map(({ key, label, color }) => (
            <div
              key={key}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${color}`}
            >
              {label}&nbsp;
              <span className="opacity-70">
                {grouped[key].filter((s) => s.is_available).length} left
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Seat map ─────────────────────────────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
        <SeatMap initialSeats={seats} flightId={flightId} flight={f} />
      </main>
    </div>
  );
}
