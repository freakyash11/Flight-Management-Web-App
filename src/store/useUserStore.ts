import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BookingWithDetails } from '@/types';
import { useFlightStore } from './useFlightStore';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimal session snapshot stored after Supabase Auth sign-in.
 *
 * We deliberately store only the three fields needed for UI state and RPC
 * calls. The full Supabase Session object (including the raw JWT) is managed
 * by @supabase/ssr's cookie layer — duplicating it in Zustand would cause
 * stale-token bugs.
 */
export type UserSession = {
  accessToken: string;
  userId: string;
  email: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Store state & actions
// ─────────────────────────────────────────────────────────────────────────────

export type UserStoreState = {
  // ── State ────────────────────────────────────────────────────────────────
  session: UserSession | null;
  cachedBookings: BookingWithDetails[];
  isLoadingBookings: boolean;

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Call after a successful Supabase Auth sign-in. */
  setSession: (session: UserSession) => void;

  /**
   * Call on logout.
   * Clears the session, wipes the booking cache, and also resets the
   * active booking flow in useFlightStore so no flight/seat state leaks
   * across user sessions.
   */
  clearSession: () => void;

  /** Replace the full booking list (e.g. after a fresh fetch). */
  setCachedBookings: (bookings: BookingWithDetails[]) => void;

  /** Prepend a newly created booking so it appears immediately. */
  addBookingToCache: (booking: BookingWithDetails) => void;

  /**
   * Patch a single booking in the cache by id.
   * Pass a partial BookingWithDetails — only the provided keys are merged.
   */
  updateBookingInCache: (
    bookingId: string,
    updates: Partial<BookingWithDetails>,
  ) => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// Subset of state that is safe to persist in localStorage.
//
// cachedBookings  — always re-fetched; stale cache on next load is misleading.
// isLoadingBookings — transient UI flag, meaningless across sessions.
// ─────────────────────────────────────────────────────────────────────────────

type PersistedState = Pick<UserStoreState, 'session'>;

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useUserStore = create<UserStoreState>()(
  persist(
    (set) => ({
      // ── Initial state ───────────────────────────────────────────────────
      session: null,
      cachedBookings: [],
      isLoadingBookings: false,

      // ── Session management ───────────────────────────────────────────────
      setSession: (session) => set({ session }),

      clearSession: () => {
        // Reset the active booking flow so no flight/seat/passenger state
        // from the previous user leaks into the next session.
        useFlightStore.getState().resetBooking();

        set({
          session: null,
          cachedBookings: [],
          isLoadingBookings: false,
        });
      },

      // ── Booking cache management ─────────────────────────────────────────
      setCachedBookings: (bookings) =>
        set({ cachedBookings: bookings, isLoadingBookings: false }),

      addBookingToCache: (booking) =>
        set((state) => ({
          cachedBookings: [booking, ...state.cachedBookings],
        })),

      updateBookingInCache: (bookingId, updates) =>
        set((state) => ({
          cachedBookings: state.cachedBookings.map((b) =>
            b.id === bookingId ? { ...b, ...updates } : b,
          ),
        })),
    }),
    {
      name: 'user-store',

      // Defer localStorage access until after hydration (SSR-safe).
      storage: createJSONStorage(() => localStorage),

      // Only the session snapshot goes to localStorage.
      partialize: (state): PersistedState => ({
        session: state.session,
      }),

      // Bump this version if UserSession's shape changes.
      version: 1,
    },
  ),
);
