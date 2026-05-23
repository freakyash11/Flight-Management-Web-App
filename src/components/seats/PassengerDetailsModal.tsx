'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useFlightStore } from '@/store/useFlightStore';
import { useUserStore } from '@/store/useUserStore';
import type { BookingWithDetails, FlightRow, SeatRow, PassengerRow, BookingRow } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type FieldErrors = {
  fullName?: string;
  passportNo?: string;
  nationality?: string;
  dob?: string;
};

type RpcRow = {
  id: string;
  pnr_code: string;
  total_price: number;
};

type Props = {
  /** Called when the user explicitly closes / dismisses the modal. */
  onClose: () => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true if the person is 18+ years old based on their DOB string (YYYY-MM-DD). */
function isAdult(dob: string): boolean {
  if (!dob) return false;
  const birth = new Date(dob);
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  return birth <= cutoff;
}

/** Basic passport pattern: 1–3 letters followed by 4–9 alphanumeric characters. */
const PASSPORT_PATTERN = /^[A-Z]{1,3}[0-9A-Z]{4,9}$/i;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function PassengerDetailsModal({ onClose }: Props) {
  const router = useRouter();

  // Store selectors
  const selectedFlight  = useFlightStore((s) => s.selectedFlight);
  const selectedSeat    = useFlightStore((s) => s.selectedSeat);
  const setPassengerForm = useFlightStore((s) => s.setPassengerForm);
  const setSelectedSeat  = useFlightStore((s) => s.setSelectedSeat);
  const resetBooking     = useFlightStore((s) => s.resetBooking);
  const session          = useUserStore((s) => s.session);
  const addBookingToCache = useUserStore((s) => s.addBookingToCache);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [fullName, setFullName]     = useState('');
  const [passportNo, setPassportNo] = useState('');
  const [nationality, setNationality] = useState('');
  const [dob, setDob]               = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);

  // ── Validation ─────────────────────────────────────────────────────────────

  function validate(): boolean {
    const errors: FieldErrors = {};

    if (!fullName.trim()) {
      errors.fullName = 'Full name is required.';
    } else if (fullName.trim().length < 2) {
      errors.fullName = 'Please enter your full name.';
    }

    if (!passportNo.trim()) {
      errors.passportNo = 'Passport number is required.';
    } else if (!PASSPORT_PATTERN.test(passportNo.trim())) {
      errors.passportNo = 'Invalid format. Example: A1234567 or ABC123456.';
    }

    if (!nationality.trim()) {
      errors.nationality = 'Nationality is required.';
    }

    if (!dob) {
      errors.dob = 'Date of birth is required.';
    } else if (!isAdult(dob)) {
      errors.dob = 'Passenger must be at least 18 years old.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    console.log('handleSubmit context:', { selectedFlight, selectedSeat, session });
    setSubmitError(null);

    if (!validate()) return;
    if (!selectedFlight || !selectedSeat || !session) {
      setSubmitError('Session expired. Please start over.');
      return;
    }

    const passengerData = {
      fullName:    fullName.trim(),
      passportNo:  passportNo.trim().toUpperCase(),
      nationality: nationality.trim(),
      dob,
    };

    // Store the form in memory (excluded from localStorage by partialize).
    setPassengerForm(passengerData);

    const totalPrice =
      Number(selectedFlight.base_price) + Number(selectedSeat.extra_fee);

    setLoading(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase.rpc('reserve_seat', {
        p_flight_id:   selectedFlight.id,
        p_seat_id:     selectedSeat.id,
        p_user_id:     session.userId,
        p_passenger: {
          full_name:    passengerData.fullName,
          passport_no:  passengerData.passportNo,
          nationality:  passengerData.nationality,
          dob:          passengerData.dob,
        },
        p_total_price: totalPrice,
      });

      if (error) {
        // ERRCODE P0001 = seat no longer available; P0002 = not found
        const isUnavailable =
          error.message.includes('no longer available') ||
          error.message.includes('not found') ||
          error.code === 'P0001' ||
          error.code === 'P0002';

        if (isUnavailable) {
          // Roll back the optimistic seat selection so the grid reflects reality.
          setSelectedSeat(null);
          setSubmitError(
            'This seat was just taken. Please go back and select another seat.',
          );
        } else {
          setSubmitError(`Booking failed: ${error.message}`);
        }
        return;
      }

      // RPC returns a row set — take the first (and only) row.
      const rpcRow = (Array.isArray(data) ? data[0] : data) as RpcRow;
      if (!rpcRow) {
        setSubmitError('Booking failed: unexpected empty response from server.');
        return;
      }

      // Build a BookingWithDetails shell for the cache.
      // Passenger PII is in-memory only; it will not be persisted to localStorage.
      const newPassenger: PassengerRow = {
        id:          crypto.randomUUID(),
        booking_id:  rpcRow.id,
        full_name:   passengerData.fullName,
        passport_no: passengerData.passportNo,
        nationality: passengerData.nationality,
        dob:         passengerData.dob,
      };

      const newBookingRow: BookingRow = {
        id:          rpcRow.id,
        user_id:     session.userId,
        flight_id:   selectedFlight.id,
        seat_id:     selectedSeat.id,
        status:      'confirmed',
        booked_at:   new Date().toISOString(),
        total_price: rpcRow.total_price,
        pnr_code:    rpcRow.pnr_code,
      };

      const bookingWithDetails: BookingWithDetails = {
        ...newBookingRow,
        flight: selectedFlight as FlightRow,
        seat:   selectedSeat   as SeatRow,
        passengers: [newPassenger],
      };

      // Prepend to cache (index 0 = newest — confirmation page reads [0]).
      addBookingToCache(bookingWithDetails);

      // Clear all booking flow state from memory (PII is gone here).
      resetBooking();

      router.push('/booking/confirm');
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Input classes helper
  // ─────────────────────────────────────────────────────────────────────────

  function inputCls(err?: string) {
    return `w-full px-4 py-3 rounded-xl border text-slate-800 text-sm
            focus:outline-none focus:ring-2 transition-all duration-150
            placeholder-slate-400
            ${err
              ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-200'
              : 'border-slate-200 bg-white focus:border-[#c8a84b] focus:ring-[#c8a84b]/20'
            }`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-up panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="passenger-modal-title"
        className="fixed bottom-0 left-0 right-0 z-50 max-h-[90dvh] overflow-y-auto
                   bg-white rounded-t-3xl shadow-2xl shadow-black/30
                   animate-[slide-up_0.25s_ease-out]"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-slate-200" />
        </div>

        <div className="px-5 sm:px-8 pb-10 pt-2">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2
                id="passenger-modal-title"
                className="text-xl font-extrabold text-slate-800"
              >
                Passenger Details
              </h2>
              {selectedSeat && (
                <p className="text-sm text-slate-400 mt-0.5">
                  Seat&nbsp;
                  <span className="font-bold text-slate-600">{selectedSeat.seat_number}</span>
                  &nbsp;·&nbsp;
                  <span className="capitalize">{selectedSeat.class}</span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100
                         transition-all"
              aria-label="Close passenger details panel"
            >
              ✕
            </button>
          </div>

          {/* Security notice */}
          <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3
                          flex items-start gap-2">
            <span className="text-amber-500 mt-0.5 shrink-0 text-sm">🔒</span>
            <p className="text-xs text-amber-700 leading-relaxed">
              Your passport number is transmitted securely and is{' '}
              <strong>never stored in your browser</strong>.
            </p>
          </div>

          {/* Global error */}
          {submitError && (
            <div className="mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3
                            flex items-start gap-2">
              <span className="text-red-500 shrink-0">⚠</span>
              <p className="text-sm text-red-600">{submitError}</p>
            </div>
          )}

          {/* Form fields */}
          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label
                htmlFor="pax-full-name"
                className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5"
              >
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                id="pax-full-name"
                type="text"
                autoComplete="name"
                placeholder="As on passport"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (fieldErrors.fullName) setFieldErrors((p) => ({ ...p, fullName: undefined }));
                }}
                disabled={loading}
                className={inputCls(fieldErrors.fullName)}
              />
              {fieldErrors.fullName && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <span>⚠</span> {fieldErrors.fullName}
                </p>
              )}
            </div>

            {/* Passport Number */}
            <div>
              <label
                htmlFor="pax-passport"
                className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5"
              >
                Passport Number <span className="text-red-400">*</span>
              </label>
              <input
                id="pax-passport"
                type="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="e.g. A1234567"
                value={passportNo}
                onChange={(e) => {
                  setPassportNo(e.target.value.toUpperCase());
                  if (fieldErrors.passportNo) setFieldErrors((p) => ({ ...p, passportNo: undefined }));
                }}
                disabled={loading}
                className={inputCls(fieldErrors.passportNo)}
              />
              {fieldErrors.passportNo && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <span>⚠</span> {fieldErrors.passportNo}
                </p>
              )}
            </div>

            {/* Nationality */}
            <div>
              <label
                htmlFor="pax-nationality"
                className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5"
              >
                Nationality <span className="text-red-400">*</span>
              </label>
              <input
                id="pax-nationality"
                type="text"
                autoComplete="country-name"
                placeholder="e.g. Indian"
                value={nationality}
                onChange={(e) => {
                  setNationality(e.target.value);
                  if (fieldErrors.nationality) setFieldErrors((p) => ({ ...p, nationality: undefined }));
                }}
                disabled={loading}
                className={inputCls(fieldErrors.nationality)}
              />
              {fieldErrors.nationality && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <span>⚠</span> {fieldErrors.nationality}
                </p>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <label
                htmlFor="pax-dob"
                className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5"
              >
                Date of Birth <span className="text-red-400">*</span>
              </label>
              <input
                id="pax-dob"
                type="date"
                autoComplete="bday"
                max={(() => {
                  const d = new Date();
                  d.setFullYear(d.getFullYear() - 18);
                  return d.toISOString().split('T')[0];
                })()}
                value={dob}
                onChange={(e) => {
                  setDob(e.target.value);
                  if (fieldErrors.dob) setFieldErrors((p) => ({ ...p, dob: undefined }));
                }}
                disabled={loading}
                className={inputCls(fieldErrors.dob)}
              />
              {fieldErrors.dob && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <span>⚠</span> {fieldErrors.dob}
                </p>
              )}
            </div>
          </div>

          {/* Price summary */}
          {selectedFlight && selectedSeat && (
            <div className="mt-6 bg-slate-50 rounded-xl border border-slate-100 px-4 py-3
                            flex items-center justify-between">
              <div className="text-sm text-slate-500">
                <div>Base fare: ₹{Number(selectedFlight.base_price).toLocaleString('en-IN')}</div>
                {Number(selectedSeat.extra_fee) > 0 && (
                  <div>Seat fee: +₹{Number(selectedSeat.extra_fee).toLocaleString('en-IN')}</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400 uppercase tracking-wider">Total</div>
                <div className="text-xl font-black text-slate-800">
                  ₹{(Number(selectedFlight.base_price) + Number(selectedSeat.extra_fee)).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            id="passenger-submit"
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="mt-5 w-full py-4 px-6 rounded-xl font-bold text-sm tracking-wide
                       bg-gradient-to-r from-[#0a1628] to-[#1e3a5f] text-white
                       hover:from-[#0d1f3c] hover:to-[#243f6a]
                       active:scale-[0.98] transition-all duration-150
                       shadow-lg shadow-[#0a1628]/30
                       disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100
                       flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Reserving your seat…
              </>
            ) : (
              'Confirm Booking'
            )}
          </button>
        </div>
      </div>
    </>
  );
}
