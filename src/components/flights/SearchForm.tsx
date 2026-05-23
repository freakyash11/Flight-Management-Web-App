'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFlightStore } from '@/store/useFlightStore';

// ─────────────────────────────────────────────────────────────────────────────
// Airport data
// ─────────────────────────────────────────────────────────────────────────────

export type Airport = {
  code: string;
  city: string;
  name: string;
};

export const AIRPORTS: Airport[] = [
  { code: 'DEL', city: 'Delhi', name: 'Indira Gandhi International' },
  { code: 'BOM', city: 'Mumbai', name: 'Chhatrapati Shivaji Maharaj International' },
  { code: 'BLR', city: 'Bengaluru', name: 'Kempegowda International' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns today as YYYY-MM-DD in the local timezone. */
function todayISO(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function SearchForm() {
  const router = useRouter();
  const { searchQuery, setSearchQuery } = useFlightStore();

  // Pre-fill from stored query so the user can resume their last search.
  const [origin, setOrigin] = useState(searchQuery?.origin ?? 'DEL');
  const [destination, setDestination] = useState(searchQuery?.destination ?? 'BOM');
  const [date, setDate] = useState(searchQuery?.date ?? todayISO());
  const [passengers, setPassengers] = useState(searchQuery?.passengerCount ?? 1);
  const [error, setError] = useState<string | null>(null);

  // Sync if store hydrates from localStorage after initial render.
  useEffect(() => {
    if (searchQuery) {
      setOrigin(searchQuery.origin);
      setDestination(searchQuery.destination);
      setDate(searchQuery.date);
      setPassengers(searchQuery.passengerCount);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount — intentionally not re-running on every store change.

  function handleSearch() {
    setError(null);

    if (!origin || !destination || !date) {
      setError('Please fill in all fields.');
      return;
    }

    if (origin === destination) {
      setError('Origin and destination cannot be the same.');
      return;
    }

    const query = {
      origin,
      destination,
      date,
      passengerCount: passengers,
    };

    setSearchQuery(query);

    const params = new URLSearchParams({
      origin,
      destination,
      date,
      passengers: String(passengers),
    });

    router.push(`/flights?${params.toString()}`);
  }

  return (
    <div className="w-full">
      {/* Error banner */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2">
          <span className="text-red-500 shrink-0">⚠</span>
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Origin */}
        <div className="space-y-1.5">
          <label
            htmlFor="search-origin"
            className="block text-xs font-bold uppercase tracking-widest text-slate-500"
          >
            From
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
              🛫
            </span>
            <select
              id="search-origin"
              value={origin}
              onChange={(e) => {
                setOrigin(e.target.value);
                setError(null);
              }}
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50
                         text-slate-800 font-medium text-sm appearance-none
                         focus:outline-none focus:border-[#c8a84b] focus:ring-2 focus:ring-[#c8a84b]/20
                         transition-all duration-150 cursor-pointer"
            >
              {AIRPORTS.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} — {a.city}
                </option>
              ))}
            </select>
            {/* Custom chevron */}
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</span>
          </div>
        </div>

        {/* Destination */}
        <div className="space-y-1.5">
          <label
            htmlFor="search-destination"
            className="block text-xs font-bold uppercase tracking-widest text-slate-500"
          >
            To
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
              🛬
            </span>
            <select
              id="search-destination"
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setError(null);
              }}
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50
                         text-slate-800 font-medium text-sm appearance-none
                         focus:outline-none focus:border-[#c8a84b] focus:ring-2 focus:ring-[#c8a84b]/20
                         transition-all duration-150 cursor-pointer"
            >
              {AIRPORTS.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} — {a.city}
                </option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</span>
          </div>
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <label
            htmlFor="search-date"
            className="block text-xs font-bold uppercase tracking-widest text-slate-500"
          >
            Departure Date
          </label>
          <div className="relative">
            <input
              id="search-date"
              type="date"
              value={date}
              min={todayISO()}
              onChange={(e) => {
                setDate(e.target.value);
                setError(null);
              }}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50
                         text-slate-800 font-medium text-sm
                         focus:outline-none focus:border-[#c8a84b] focus:ring-2 focus:ring-[#c8a84b]/20
                         transition-all duration-150 cursor-pointer"
            />
          </div>
        </div>

        {/* Passengers */}
        <div className="space-y-1.5">
          <label
            htmlFor="search-passengers"
            className="block text-xs font-bold uppercase tracking-widest text-slate-500"
          >
            Passengers
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
              👤
            </span>
            <input
              id="search-passengers"
              type="number"
              min={1}
              max={9}
              value={passengers}
              onChange={(e) => {
                const val = Math.min(9, Math.max(1, Number(e.target.value)));
                setPassengers(val);
              }}
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50
                         text-slate-800 font-medium text-sm
                         focus:outline-none focus:border-[#c8a84b] focus:ring-2 focus:ring-[#c8a84b]/20
                         transition-all duration-150"
            />
          </div>
        </div>
      </div>

      {/* Search button */}
      <button
        id="search-submit"
        type="button"
        onClick={handleSearch}
        className="mt-5 w-full py-4 px-8 rounded-xl font-bold text-base tracking-wide
                   bg-gradient-to-r from-[#0a1628] to-[#1e3a5f] text-white
                   hover:from-[#0d1f3c] hover:to-[#1e3a5f]
                   active:scale-[0.99] transition-all duration-200
                   shadow-lg shadow-[#0a1628]/30
                   flex items-center justify-center gap-2"
      >
        <span>✈</span>
        Search Flights
      </button>
    </div>
  );
}
