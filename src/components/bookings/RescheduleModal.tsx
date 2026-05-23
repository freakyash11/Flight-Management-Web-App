'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUserStore } from '@/store/useUserStore';
import ConfirmDialog from './ConfirmDialog';
import type { FlightRow, BookingWithDetails } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  booking: BookingWithDetails;
  onClose: () => void;
  /** Called with the updated booking after a successful reschedule. */
  onSuccess: (msg: string) => void;
};

type FetchState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done'; flights: FlightRow[] };

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

function formatPrice(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function computeDuration(departsAt: string, arrivesAt: string): string {
  const diffMs = new Date(arrivesAt).getTime() - new Date(departsAt).getTime();
  const total  = Math.round(diffMs / 60_000);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/**
 * Rescheduling fee: difference in base_price if the new flight is more
 * expensive; zero if it's the same or cheaper.
 */
function calcFee(currentBasePrice: number, newBasePrice: number): number {
  return Math.max(0, newBasePrice - currentBasePrice);
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact alternative flight row
// ─────────────────────────────────────────────────────────────────────────────

type AltFlightRowProps = {
  flight: FlightRow;
  currentBasePrice: number;
  selected: boolean;
  onSelect: (flight: FlightRow) => void;
};

function AltFlightRow({ flight, currentBasePrice, selected, onSelect }: AltFlightRowProps) {
  const fee = calcFee(currentBasePrice, Number(flight.base_price));

  return (
    <button
      type="button"
      id={`alt-flight-${flight.id}`}
      onClick={() => onSelect(flight)}
      className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all duration-150
                  ${selected
                    ? 'border-[#c8a84b] bg-[#c8a84b]/5 shadow-sm'
                    : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                  }`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Route + time */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-center shrink-0">
            <div className="text-lg font-black text-slate-800 tabular-nums leading-none">
              {formatTime(flight.departs_at)}
            </div>
            <div className="text-[10px] text-slate-400">{flight.origin}</div>
          </div>

          <div className="flex flex-col items-center gap-0.5 w-16 shrink-0">
            <span className="text-[10px] text-slate-400">
              {computeDuration(flight.departs_at, flight.arrives_at)}
            </span>
            <div className="w-full flex items-center gap-0.5">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[#c8a84b] text-[10px]">✈</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
          </div>

          <div className="text-center shrink-0">
            <div className="text-lg font-black text-slate-800 tabular-nums leading-none">
              {formatTime(flight.arrives_at)}
            </div>
            <div className="text-[10px] text-slate-400">{flight.destination}</div>
          </div>

          <div className="hidden sm:block min-w-0">
            <div className="text-xs font-semibold text-slate-700 truncate">{flight.flight_no}</div>
            <div className="text-[10px] text-slate-400 truncate">{formatDate(flight.departs_at)}</div>
          </div>
        </div>

        {/* Fee / price */}
        <div className="text-right shrink-0">
          {fee > 0 ? (
            <>
              <div className="text-xs font-bold text-amber-600">+{formatPrice(fee)}</div>
              <div className="text-[10px] text-slate-400">fee</div>
            </>
          ) : (
            <div className="text-xs font-semibold text-emerald-600">No extra fee</div>
          )}
          {selected && (
            <div className="mt-1 w-4 h-4 rounded-full bg-[#c8a84b] flex items-center
                            justify-center text-white text-[10px] font-black ml-auto">
              ✓
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RescheduleModal
// ─────────────────────────────────────────────────────────────────────────────

export default function RescheduleModal({ booking, onClose, onSuccess }: Props) {
  const session            = useUserStore((s) => s.session);
  const updateBookingInCache = useUserStore((s) => s.updateBookingInCache);

  const { flight: currentFlight } = booking;
  const currentBasePrice = Number(currentFlight.base_price);

  // ── Fetch state ────────────────────────────────────────────────────────────
  const [fetchState, setFetchState] = useState<FetchState>({ status: 'loading' });

  // ── Selection + confirm dialog ─────────────────────────────────────────────
  const [selectedFlight, setSelectedFlight] = useState<FlightRow | null>(null);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [submitError, setSubmitError]       = useState<string | null>(null);

  // ── Fetch alternative flights ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function fetchAlternatives() {
      const supabase = createClient();
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('flights')
        .select('*')
        .eq('origin', currentFlight.origin)
        .eq('destination', currentFlight.destination)
        .neq('id', currentFlight.id)
        .neq('status', 'cancelled')
        .gt('departs_at', now)
        .order('departs_at', { ascending: true })
        .limit(20);

      if (cancelled) return;

      if (error) {
        setFetchState({ status: 'error', message: error.message });
      } else {
        setFetchState({ status: 'done', flights: (data ?? []) as FlightRow[] });
      }
    }

    fetchAlternatives();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFlight.id]);

  // ── Reschedule submit ──────────────────────────────────────────────────────
  async function handleConfirm() {
    if (!selectedFlight || !session) return;

    const fee = calcFee(currentBasePrice, Number(selectedFlight.base_price));
    setSubmitting(true);
    setSubmitError(null);

    try {
      const supabase = createClient();

      // Step a: INSERT into reschedules
      const { error: rescheduleErr } = await supabase
        .from('reschedules')
        .insert({
          booking_id:    booking.id,
          old_flight_id: currentFlight.id,
          new_flight_id: selectedFlight.id,
          fee_charged:   fee,
        });

      if (rescheduleErr) throw new Error(rescheduleErr.message);

      // Step b: UPDATE booking
      const newTotalPrice = Number(booking.total_price) + fee;

      const { data: updatedRows, error: bookingErr } = await supabase
        .from('bookings')
        .update({
          flight_id:   selectedFlight.id,
          status:      'rescheduled',
          total_price: newTotalPrice,
        })
        .eq('id', booking.id)
        .select('*')
        .single();

      if (bookingErr) throw new Error(bookingErr.message);

      // Step c: Patch the Zustand cache with the new flight + updated fields.
      updateBookingInCache(booking.id, {
        flight:      selectedFlight,
        flight_id:   selectedFlight.id,
        status:      'rescheduled',
        total_price: (updatedRows as { total_price: number }).total_price ?? newTotalPrice,
      });

      setShowConfirm(false);
      onSuccess(
        fee > 0
          ? `Rescheduled to ${selectedFlight.flight_no}. Rescheduling fee ${formatPrice(fee)} applied.`
          : `Rescheduled to ${selectedFlight.flight_no}. No additional charge.`,
      );
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Reschedule failed. Please try again.');
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Derived
  // ─────────────────────────────────────────────────────────────────────────

  const fee = selectedFlight
    ? calcFee(currentBasePrice, Number(selectedFlight.base_price))
    : 0;

  const confirmDescription = selectedFlight
    ? fee > 0
      ? `This will reschedule your flight to ${selectedFlight.flight_no} (${formatDate(selectedFlight.departs_at)}). A rescheduling fee of ${formatPrice(fee)} will be charged.`
      : `This will reschedule your flight to ${selectedFlight.flight_no} (${formatDate(selectedFlight.departs_at)}). No additional charge.`
    : '';

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={!submitting ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Slide-up panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reschedule-modal-title"
        className="fixed bottom-0 left-0 right-0 z-50 max-h-[90dvh] flex flex-col
                   bg-white rounded-t-3xl shadow-2xl shadow-black/30
                   animate-[slide-up_0.25s_ease-out]"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-slate-200" />
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 sm:px-8 pb-10 pt-2">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2
                id="reschedule-modal-title"
                className="text-xl font-extrabold text-slate-800"
              >
                Reschedule Flight
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {currentFlight.origin} → {currentFlight.destination} &middot; currently{' '}
                <span className="font-semibold text-slate-600">{currentFlight.flight_no}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100
                         transition-all disabled:opacity-50"
              aria-label="Close reschedule panel"
            >
              ✕
            </button>
          </div>

          {/* Error banner */}
          {submitError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3
                            flex items-start gap-2">
              <span className="text-red-500 shrink-0">⚠</span>
              <p className="text-sm text-red-600">{submitError}</p>
            </div>
          )}

          {/* Flight list */}
          {fetchState.status === 'loading' && (
            <div className="flex flex-col items-center py-12 gap-3">
              <svg className="animate-spin h-8 w-8 text-slate-300" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="text-sm text-slate-400">Finding available flights…</p>
            </div>
          )}

          {fetchState.status === 'error' && (
            <div className="py-10 text-center">
              <p className="text-sm text-red-500 mb-2">Failed to load flights</p>
              <p className="text-xs text-slate-400">{fetchState.message}</p>
            </div>
          )}

          {fetchState.status === 'done' && fetchState.flights.length === 0 && (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="text-4xl mb-4">✈</div>
              <p className="text-slate-600 font-semibold mb-1">No alternative flights</p>
              <p className="text-sm text-slate-400">
                There are no other scheduled flights on this route right now.
              </p>
            </div>
          )}

          {fetchState.status === 'done' && fetchState.flights.length > 0 && (
            <>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                Available alternatives
              </p>
              <div className="space-y-2 mb-6">
                {fetchState.flights.map((f) => (
                  <AltFlightRow
                    key={f.id}
                    flight={f}
                    currentBasePrice={currentBasePrice}
                    selected={selectedFlight?.id === f.id}
                    onSelect={setSelectedFlight}
                  />
                ))}
              </div>

              {/* Fee summary */}
              {selectedFlight && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 mb-5
                                flex items-center justify-between">
                  <div className="text-sm text-slate-500">
                    {fee > 0 ? (
                      <>
                        <div>Original fare: {formatPrice(currentBasePrice)}</div>
                        <div className="text-amber-600 font-semibold">
                          Rescheduling fee: +{formatPrice(fee)}
                        </div>
                      </>
                    ) : (
                      <div className="text-emerald-600 font-semibold">No extra charge</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">New total</div>
                    <div className="text-xl font-black text-slate-800">
                      {formatPrice(Number(booking.total_price) + fee)}
                    </div>
                  </div>
                </div>
              )}

              {/* Confirm button */}
              <button
                id="reschedule-confirm-btn"
                type="button"
                onClick={() => { setSubmitError(null); setShowConfirm(true); }}
                disabled={!selectedFlight || submitting}
                className="w-full py-4 px-6 rounded-xl font-bold text-sm tracking-wide
                           bg-gradient-to-r from-[#0a1628] to-[#1e3a5f] text-white
                           hover:from-[#0d1f3c] hover:to-[#243f6a]
                           active:scale-[0.98] transition-all duration-150
                           shadow-lg shadow-[#0a1628]/30
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {selectedFlight
                  ? `Reschedule to ${selectedFlight.flight_no} →`
                  : 'Select a flight to continue'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Confirmation dialog — rendered on top of the slide-up panel */}
      {showConfirm && selectedFlight && (
        <ConfirmDialog
          title="Confirm Reschedule?"
          description={confirmDescription}
          confirmLabel={fee > 0 ? `Pay ${formatPrice(fee)} & Reschedule` : 'Confirm Reschedule'}
          confirmDanger={false}
          loading={submitting}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
