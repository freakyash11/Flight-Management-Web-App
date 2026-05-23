'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SeatRow } from '@/types';
import type { RealtimePostgresUpdatePayload } from '@supabase/realtime-js';

/**
 * Subscribes to Supabase Realtime postgres_changes UPDATE events on the
 * `seats` table filtered by `flight_id = flightId`.
 *
 * When a seat's `is_available` (or any column) changes, the provided setter
 * is called with a functional update that merges the changed row into the
 * local state array.
 *
 * The channel is automatically removed on unmount.
 *
 * @param flightId  UUID of the flight whose seats to watch.
 * @param setSeats  React state setter for the SeatRow array.
 */
export function useRealtimeSeatUpdates(
  flightId: string,
  setSeats: React.Dispatch<React.SetStateAction<SeatRow[]>>,
): void {
  useEffect(() => {
    if (!flightId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`seats-flight-${flightId}`)
      .on<SeatRow>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'seats',
          // Supabase realtime filter syntax: column=operator.value
          filter: `flight_id=eq.${flightId}`,
        },
        (payload: RealtimePostgresUpdatePayload<SeatRow>) => {
          const updated = payload.new;
          setSeats((prev) =>
            prev.map((seat) => (seat.id === updated.id ? updated : seat)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [flightId, setSeats]);
}
