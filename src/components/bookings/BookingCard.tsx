'use client';

import { useState } from 'react';
import CancelButton from './CancelButton';
import RescheduleModal from './RescheduleModal';
import { useToast } from '@/components/ui/Toast';
import type { BookingWithDetails } from '@/types';

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

function formatPrice(amount: number | string): string {
  return `₹${Math.round(Number(amount)).toLocaleString('en-IN')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────────────────────────

type StatusConfig = { label: string; classes: string };

const STATUS_MAP: Record<string, StatusConfig> = {
  confirmed:   { label: 'Confirmed',   classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rescheduled: { label: 'Rescheduled', classes: 'bg-sky-100 text-sky-700 border-sky-200' },
  cancelled:   { label: 'Cancelled',   classes: 'bg-red-100 text-red-600 border-red-200' },
};

const CLASS_LABEL: Record<string, string> = {
  economy:  'Economy',
  business: 'Business',
  first:    'First Class',
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  booking: BookingWithDetails;
};

export default function BookingCard({ booking }: Props) {
  const { flight, seat, passengers, pnr_code, total_price, status } = booking;
  const primaryPassenger = passengers[0];

  const statusConfig = STATUS_MAP[status] ?? {
    label: status,
    classes: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const isCancelled = status === 'cancelled';
  const isConfirmed = status === 'confirmed';

  const [showReschedule, setShowReschedule] = useState(false);
  const { toast } = useToast();

  function handleRescheduleSuccess(msg: string) {
    setShowReschedule(false);
    toast({ message: msg, variant: 'success' });
  }

  return (
    <>
    <article
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-200
                  ${isCancelled
                    ? 'border-slate-100 opacity-70'
                    : 'border-slate-100 hover:shadow-md hover:border-[#c8a84b]/25'
                  }`}
    >
      {/* Top accent bar */}
      <div
        className={`h-1 w-full ${
          isCancelled
            ? 'bg-slate-200'
            : 'bg-gradient-to-r from-[#0a1628] via-[#1e3a5f] to-[#c8a84b]'
        }`}
      />

      <div className="p-5 sm:p-6">
        {/* Row 1: PNR + status */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-0.5">
              PNR
            </p>
            <p
              className={`text-xl font-black tracking-[0.2em] font-mono
                          ${isCancelled ? 'line-through text-slate-400' : 'text-slate-800'}`}
            >
              {pnr_code}
            </p>
          </div>

          <span
            className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5
                        rounded-full border shrink-0 ${statusConfig.classes}`}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* Row 2: Route */}
        <div className="flex items-center gap-3 mb-4">
          <div className="text-center">
            <div className={`text-2xl font-black leading-none tabular-nums
                             ${isCancelled ? 'text-slate-400' : 'text-slate-800'}`}>
              {formatTime(flight.departs_at)}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">{flight.origin}</div>
          </div>

          <div className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
            <span className="text-[11px] text-slate-400">{flight.flight_no}</span>
            <div className="w-full flex items-center gap-1">
              <div className="flex-1 h-px bg-slate-200" />
              <span className={`text-sm ${isCancelled ? 'text-slate-300' : 'text-[#c8a84b]'}`}>✈</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            <span className="text-[11px] text-slate-400">Direct</span>
          </div>

          <div className="text-center">
            <div className={`text-2xl font-black leading-none tabular-nums
                             ${isCancelled ? 'text-slate-400' : 'text-slate-800'}`}>
              {formatTime(flight.arrives_at)}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">{flight.destination}</div>
          </div>
        </div>

        {/* Row 3: Date + details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="col-span-2 bg-slate-50 rounded-lg px-3 py-2">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Date</div>
            <div className="text-xs font-semibold text-slate-700 mt-0.5">
              {formatDate(flight.departs_at)}
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg px-3 py-2">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Seat</div>
            <div className="font-black text-slate-800 mt-0.5">{seat.seat_number}</div>
            <div className="text-[10px] text-slate-400 capitalize">{CLASS_LABEL[seat.class] ?? seat.class}</div>
          </div>

          <div className="bg-slate-50 rounded-lg px-3 py-2">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Paid</div>
            <div className="font-black text-slate-800 mt-0.5">{formatPrice(total_price)}</div>
          </div>
        </div>

        {/* Row 4: Passenger */}
        {primaryPassenger && (
          <div className="bg-slate-50 rounded-lg px-3 py-2 mb-4">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Passenger</div>
            <div className="text-sm font-semibold text-slate-700 mt-0.5">
              {primaryPassenger.full_name}
            </div>
          </div>
        )}

        {/* Row 5: Actions (confirmed only) */}
        {isConfirmed && (
          <div className="flex gap-2 pt-1">
            <button
              id={`reschedule-booking-${booking.id}`}
              type="button"
              onClick={() => setShowReschedule(true)}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold
                         border-2 border-[#1e3a5f]/30 text-[#1e3a5f]
                         hover:bg-[#1e3a5f]/5 hover:border-[#1e3a5f]/50
                         transition-all duration-150 active:scale-[0.97]"
            >
              Reschedule
            </button>

            <CancelButton bookingId={booking.id} flightNo={flight.flight_no} />
          </div>
        )}
      </div>
    </article>

    {/* Reschedule modal — portalled above the card */}
    {showReschedule && (
      <RescheduleModal
        booking={booking}
        onClose={() => setShowReschedule(false)}
        onSuccess={handleRescheduleSuccess}
      />
    )}
    </>
  );
}
