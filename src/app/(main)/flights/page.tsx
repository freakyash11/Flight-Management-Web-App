// Search results page — route: /flights
// Server Component: fetches flights from Supabase, passes data to Client Components.

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import FlightList from '@/components/flights/FlightList';
import type { FlightWithMinFee } from '@/components/flights/FlightCard';
import type { FlightRow, SeatRow } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────────────────────────────────────

export const metadata = {
  title: 'Flight Results — SkyBook',
  description: 'Browse available flights matching your search criteria.',
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

// Next.js 16: searchParams is a Promise that must be awaited.
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

type Props = {
  searchParams: SearchParams;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Safely extract the first string value from a searchParam entry. */
function firstString(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] ?? '';
  return val ?? '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function FlightsPage({ searchParams }: Props) {
  // Await the Promise — required in Next.js 16.
  const params = await searchParams;

  const origin      = firstString(params.origin).toUpperCase();
  const destination = firstString(params.destination).toUpperCase();
  const date        = firstString(params.date);        // YYYY-MM-DD
  const passengers  = parseInt(firstString(params.passengers) || '1', 10);

  // ── Validate required params ───────────────────────────────────────────────
  const missingParams = !origin || !destination || !date;

  // ── Supabase data fetch ───────────────────────────────────────────────────
  let flights: FlightWithMinFee[] = [];
  let fetchError: string | null = null;

  if (!missingParams) {
    const supabase = await createClient();

    // 1. Fetch matching flights (status != cancelled, ordered by departs_at ASC).
    //    We cast departs_at to date in the filter via .gte/.lt on a date range
    //    to keep it type-safe without raw SQL.
    const dateStart = `${date}T00:00:00+05:30`;
    const dateEnd   = `${date}T23:59:59+05:30`;

    const { data: flightRows, error: flightErr } = await supabase
      .from('flights')
      .select('*')
      .eq('origin', origin)
      .eq('destination', destination)
      .gte('departs_at', dateStart)
      .lte('departs_at', dateEnd)
      .neq('status', 'cancelled')
      .order('departs_at', { ascending: true });

    if (flightErr) {
      fetchError = flightErr.message;
    } else if (flightRows && flightRows.length > 0) {
      // 2. Fetch available seats for these flights in one query.
      const flightIds = flightRows.map((f: FlightRow) => f.id);

      const { data: seatRows, error: seatErr } = await supabase
        .from('seats')
        .select('id, flight_id, extra_fee, is_available')
        .in('flight_id', flightIds)
        .eq('is_available', true);

      if (seatErr) {
        fetchError = seatErr.message;
      } else {
        // 3. Build a map: flightId → min extra_fee among available seats.
        const minFeeByFlight = new Map<string, number>();

        (seatRows ?? []).forEach((seat: Pick<SeatRow, 'id' | 'flight_id' | 'extra_fee' | 'is_available'>) => {
          const fee = Number(seat.extra_fee);
          const current = minFeeByFlight.get(seat.flight_id);
          if (current === undefined || fee < current) {
            minFeeByFlight.set(seat.flight_id, fee);
          }
        });

        // 4. Merge min fee onto each flight row.
        flights = flightRows.map((f: FlightRow): FlightWithMinFee => ({
          ...f,
          minSeatFee: minFeeByFlight.get(f.id) ?? null,
        }));
      }
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#0a1628] to-[#1e3a5f] border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-slate-400 mb-4">
            <Link href="/" className="hover:text-[#c8a84b] transition-colors">Home</Link>
            <span>›</span>
            <span className="text-slate-300">Flight Results</span>
          </nav>

          {missingParams ? (
            <h1 className="text-2xl font-bold text-white">Flight Search</h1>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {origin}
                <span className="mx-3 text-[#c8a84b]">→</span>
                {destination}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-400">
                <span>📅 {date}</span>
                <span>👤 {passengers} passenger{passengers !== 1 ? 's' : ''}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Missing params state */}
        {missingParams && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-xl font-bold text-slate-700 mb-2">No search criteria</h2>
            <p className="text-slate-400 mb-6">
              Please search for flights from the home page.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-xl font-semibold text-sm
                         bg-gradient-to-r from-[#0a1628] to-[#1e3a5f] text-white
                         hover:from-[#0d1f3c] hover:to-[#1e3a5f] transition-all shadow-md"
            >
              ← Back to Search
            </Link>
          </div>
        )}

        {/* Fetch error state */}
        {!missingParams && fetchError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-semibold mb-1">Failed to load flights</p>
            <p className="text-red-400 text-sm">{fetchError}</p>
          </div>
        )}

        {/* Results */}
        {!missingParams && !fetchError && (
          <FlightList
            flights={flights}
            origin={origin}
            destination={destination}
            date={date}
          />
        )}
      </main>
    </div>
  );
}
