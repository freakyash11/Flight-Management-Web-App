'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUserStore } from '@/store/useUserStore';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  bookingId: string;
  flightNo: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CancelButton({ bookingId, flightNo }: Props) {
  const session              = useUserStore((s) => s.session);
  const updateBookingInCache = useUserStore((s) => s.updateBookingInCache);
  const { toast }            = useToast();

  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading]       = useState(false);

  async function handleConfirm() {
    if (!session) return;

    setLoading(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase.rpc('cancel_booking', {
        p_booking_id: bookingId,
        p_user_id:    session.userId,
      });

      if (error) {
        const is2HourRule =
          error.message.toLowerCase().includes('2 hour') ||
          error.message.toLowerCase().includes('within') ||
          error.code === 'P0001';

        toast({
          message: is2HourRule
            ? 'Cannot cancel within 2 hours of departure.'
            : `Cancellation failed: ${error.message}`,
          variant: 'error',
        });
        setShowDialog(false);
        return;
      }

      // RPC returns the updated booking row — update cache optimistically.
      const updated = Array.isArray(data) ? data[0] : data;
      if (updated) {
        updateBookingInCache(bookingId, { status: 'cancelled' });
      }

      setShowDialog(false);
      toast({ message: 'Booking cancelled successfully.', variant: 'success' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Cancel trigger button */}
      <button
        id={`cancel-booking-${bookingId}`}
        type="button"
        onClick={() => setShowDialog(true)}
        className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold
                   border-2 border-red-200 text-red-600
                   hover:bg-red-50 hover:border-red-300
                   transition-all duration-150 active:scale-[0.97]"
      >
        Cancel
      </button>

      {/* Confirmation dialog */}
      {showDialog && (
        <ConfirmDialog
          title="Cancel Booking?"
          description={`This will cancel your booking for flight ${flightNo}. This action cannot be undone.`}
          confirmLabel="Yes, Cancel Booking"
          confirmDanger
          loading={loading}
          onConfirm={handleConfirm}
          onCancel={() => setShowDialog(false)}
        />
      )}
    </>
  );
}
