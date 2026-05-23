'use client';

import FlightCard, { type FlightWithMinFee } from './FlightCard';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  flights: FlightWithMinFee[];
  origin: string;
  destination: string;
  date: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function FlightList({ flights, origin, destination, date }: Props) {
  // ── Empty state ────────────────────────────────────────────────────────────
  if (flights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-4xl mb-5">
          ✈
        </div>
        <h3 className="text-xl font-bold text-slate-700 mb-2">No flights found</h3>
        <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
          There are no available flights from{' '}
          <span className="font-semibold text-slate-600">{origin}</span> to{' '}
          <span className="font-semibold text-slate-600">{destination}</span> on{' '}
          <span className="font-semibold text-slate-600">{date}</span>.
          <br />
          Try a different date or route.
        </p>
      </div>
    );
  }

  // ── Results ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Summary header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#c8a84b] to-[#e2c068]" />
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            {flights.length} flight{flights.length !== 1 ? 's' : ''} found
          </h2>
          <p className="text-sm text-slate-400">
            {origin} → {destination} &middot; {date}
          </p>
        </div>
      </div>

      {/* Flight cards */}
      <div className="space-y-4">
        {flights.map((flight) => (
          <FlightCard key={flight.id} flight={flight} />
        ))}
      </div>
    </div>
  );
}
