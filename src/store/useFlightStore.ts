import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Tables } from '@/types/database.types';

// ─────────────────────────────────────────────────────────────────────────────
// Domain types (derived from the generated Supabase schema)
// ─────────────────────────────────────────────────────────────────────────────

/** Full flight row as returned by Supabase */
export type Flight = Tables<'flights'>;

/** Full seat row as returned by Supabase */
export type Seat = Tables<'seats'>;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-types used in the store
// ─────────────────────────────────────────────────────────────────────────────

export type SearchQuery = {
  origin: string;
  destination: string;
  /** ISO date string — "YYYY-MM-DD" */
  date: string;
  passengerCount: number;
};

export type BookingStep =
  | 'search'
  | 'results'
  | 'seats'
  | 'passenger-details'
  | 'confirmation';

/**
 * Sensitive passenger data — intentionally excluded from localStorage
 * via the persist `partialize` filter.
 */
export type PassengerForm = {
  fullName: string;
  passportNo: string;
  nationality: string;
  /** ISO date string — "YYYY-MM-DD" */
  dob: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Store state & actions
// ─────────────────────────────────────────────────────────────────────────────

export type FlightStoreState = {
  // ── State ────────────────────────────────────────────────────────────────
  searchQuery: SearchQuery | null;
  selectedFlight: Flight | null;
  selectedSeat: Seat | null;
  bookingStep: BookingStep;
  passengerForm: PassengerForm | null;

  // ── Actions ───────────────────────────────────────────────────────────────
  setSearchQuery: (query: SearchQuery) => void;
  setSelectedFlight: (flight: Flight | null) => void;
  setSelectedSeat: (seat: Seat | null) => void;
  setBookingStep: (step: BookingStep) => void;
  setPassengerForm: (form: PassengerForm | null) => void;

  /**
   * Immediately marks a seat as selected in the store before the Supabase
   * write completes, so the UI responds without waiting for the network.
   * If the write later fails, call setSelectedSeat(null) to roll back.
   */
  optimisticallySelectSeat: (seat: Seat) => void;

  /**
   * Resets all booking flow state back to initial values.
   * Call this after a successful booking, on logout, or on hard cancel.
   */
  resetBooking: () => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// Initial state (extracted so resetBooking() can reference it without drift)
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_STATE = {
  searchQuery: null,
  selectedFlight: null,
  selectedSeat: null,
  bookingStep: 'search' as BookingStep,
  passengerForm: null,
} satisfies Pick<
  FlightStoreState,
  | 'searchQuery'
  | 'selectedFlight'
  | 'selectedSeat'
  | 'bookingStep'
  | 'passengerForm'
>;

// ─────────────────────────────────────────────────────────────────────────────
// Subset of state that is safe to persist in localStorage.
//
// SECURITY: passengerForm (passportNo), selectedSeat, and selectedFlight are
// intentionally excluded. Sensitive PII must never reach localStorage.
// ─────────────────────────────────────────────────────────────────────────────

type PersistedState = Pick<FlightStoreState, 'searchQuery' | 'bookingStep'>;

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useFlightStore = create<FlightStoreState>()(
  persist(
    (set) => ({
      // ── Initial state ───────────────────────────────────────────────────
      ...INITIAL_STATE,

      // ── Setters ─────────────────────────────────────────────────────────
      setSearchQuery: (query) => set({ searchQuery: query }),

      setSelectedFlight: (flight) => set({ selectedFlight: flight }),

      setSelectedSeat: (seat) => set({ selectedSeat: seat }),

      setBookingStep: (step) => set({ bookingStep: step }),

      setPassengerForm: (form) => set({ passengerForm: form }),

      // ── Optimistic seat selection ────────────────────────────────────────
      // NOTE: Only selectedSeat is set here — bookingStep is intentionally
      // NOT updated because it is persisted to localStorage but selectedSeat
      // is not. Updating bookingStep here would leave a stale
      // 'passenger-details' step in localStorage after a page reload, which
      // could interfere with the booking flow on the next visit.
      optimisticallySelectSeat: (seat) =>
        set({ selectedSeat: seat }),

      // ── Hard reset ───────────────────────────────────────────────────────
      resetBooking: () => set(INITIAL_STATE),
    }),
    {
      name: 'flight-booking-store',

      // Use localStorage (default) with explicit JSON serialisation.
      // createJSONStorage is SSR-safe: it defers window.localStorage access
      // until after hydration so Next.js Server Components don't throw.
      storage: createJSONStorage(() => localStorage),

      // Only persist the safe subset — everything else stays in memory only.
      partialize: (state): PersistedState => ({
        searchQuery: state.searchQuery,
        bookingStep: state.bookingStep,
      }),

      // Bump this version if you ever change the shape of PersistedState.
      // Old persisted data will be discarded instead of causing hydration errors.
      version: 1,
    },
  ),
);
