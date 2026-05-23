'use client';

import { useRouter } from 'next/navigation';
import { useFlightStore, type Flight } from '@/store/useFlightStore';
import type { SeatRow } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type FlightWithMinFee = Flight & {
  /** Lowest extra_fee among available seats, or null if no seats available */
  minSeatFee: number | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Format a timestamptz string to a readable HH:MM display. */
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  });
}

/** Format a timestamptz string to a readable date. */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

/** Compute human-readable duration between two ISO timestamps. */
function computeDuration(departsAt: string, arrivesAt: string): string {
  const diffMs = new Date(arrivesAt).getTime() - new Date(departsAt).getTime();
  const totalMinutes = Math.round(diffMs / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Format a numeric price as ₹ with comma separators. */
function formatPrice(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status badge config
// ─────────────────────────────────────────────────────────────────────────────

type StatusConfig = {
  label: string;
  classes: string;
};

const STATUS_MAP: Record<string, StatusConfig> = {
  scheduled: {
    label: 'Scheduled',
    classes: 'bg-sky-100 text-sky-700 border-sky-200',
  },
  boarding: {
    label: 'Boarding',
    classes: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  departed: {
    label: 'Departed',
    classes: 'bg-slate-100 text-slate-500 border-slate-200',
  },
  cancelled: {
    label: 'Cancelled',
    classes: 'bg-red-100 text-red-600 border-red-200',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  flight: FlightWithMinFee;
};

export default function FlightCard({ flight }: Props) {
  const router = useRouter();
  const setSelectedFlight = useFlightStore((s) => s.setSelectedFlight);
  const setBookingStep = useFlightStore((s) => s.setBookingStep);

  const statusConfig = STATUS_MAP[flight.status] ?? {
    label: flight.status,
    classes: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const totalFrom =
    flight.minSeatFee !== null
      ? Number(flight.base_price) + flight.minSeatFee
      : Number(flight.base_price);

  const noSeatsAvailable = flight.minSeatFee === null;
  const isDeparted = flight.status === 'departed' || flight.status === 'cancelled';
  const isDisabled = noSeatsAvailable || isDeparted;

  function handleSelect() {
    setSelectedFlight(flight);
    setBookingStep('seats');
    router.push(`/flights/${flight.id}/seats`);
  }

  return (
    <article className="group bg-white rounded-2xl border border-slate-100 shadow-sm
                        hover:shadow-md hover:border-[#c8a84b]/30
                        transition-all duration-200 overflow-hidden">
      {/* Top accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-[#0a1628] via-[#1e3a5f] to-[#c8a84b]" />

      <div className="p-5 sm:p-6">
        {/* Row 1: flight number + status badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-widest text-slate-400 uppercase">
              {flight.aircraft_type}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-sm font-bold text-slate-700">{flight.flight_no}</span>
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1
                        rounded-full border ${statusConfig.classes}`}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* Row 2: Route timeline */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Departure */}
          <div className="text-left">
            <div className="text-3xl font-black text-slate-800 leading-none tabular-nums">
              {formatTime(flight.departs_at)}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-1">
              {flight.origin}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {formatDate(flight.departs_at)}
            </div>
          </div>

          {/* Duration line */}
          <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <span className="text-[11px] font-medium text-slate-400">
              {computeDuration(flight.departs_at, flight.arrives_at)}
            </span>
            <div className="w-full flex items-center gap-1">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[#c8a84b] text-sm group-hover:translate-x-0.5 transition-transform duration-200">
                ✈
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            <span className="text-[11px] text-slate-400">Direct</span>
          </div>

          {/* Arrival */}
          <div className="text-right">
            <div className="text-3xl font-black text-slate-800 leading-none tabular-nums">
              {formatTime(flight.arrives_at)}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-1">
              {flight.destination}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {formatDate(flight.arrives_at)}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-dashed border-slate-100" />

        {/* Row 3: price + CTA */}
        <div className="flex items-center justify-between gap-4">
          <div>
            {noSeatsAvailable ? (
              <span className="text-sm font-semibold text-red-500">No seats available</span>
            ) : (
              <>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider">from</span>
                <div className="text-2xl font-black text-slate-800 leading-none">
                  {formatPrice(totalFrom)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">per person</div>
              </>
            )}
          </div>

          <button
            id={`select-flight-${flight.id}`}
            type="button"
            onClick={handleSelect}
            disabled={isDisabled}
            className="px-6 py-3 rounded-xl font-bold text-sm tracking-wide
                       bg-gradient-to-r from-[#0a1628] to-[#1e3a5f] text-white
                       hover:from-[#0d1f3c] hover:to-[#1e3a5f]
                       active:scale-[0.97] transition-all duration-150
                       shadow-md shadow-[#0a1628]/20
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
                       shrink-0"
          >
            Select →
          </button>
        </div>
      </div>
    </article>
  );
}
