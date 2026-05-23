'use client';

import { useState, useCallback, useEffect } from 'react';
import { useFlightStore } from '@/store/useFlightStore';
import { useRealtimeSeatUpdates } from '@/hooks/useRealtime';
import PassengerDetailsModal from './PassengerDetailsModal';
import type { SeatRow, FlightRow } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SeatClass = 'first' | 'business' | 'economy';

type Props = {
  initialSeats: SeatRow[];
  flightId: string;
  flight: FlightRow;
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** First class uses 4 columns (A B C D — wide seats, no centre aisle gap) */
const FIRST_COLUMNS = ['A', 'B', 'C', 'D'] as const;

/** Business + Economy use 6 columns with an aisle gap between C and D */
const MAIN_COLUMNS = ['A', 'B', 'C', null, 'D', 'E', 'F'] as const;

const ZONE_CONFIG: Record<
  SeatClass,
  { label: string; rows: readonly number[]; columns: readonly (string | null)[] }
> = {
  first: {
    label: '✦ FIRST CLASS',
    rows: [1, 2] as const,
    columns: FIRST_COLUMNS,
  },
  business: {
    label: '◈ BUSINESS',
    rows: [3, 4, 5, 6] as const,
    columns: MAIN_COLUMNS,
  },
  economy: {
    label: '◻ ECONOMY',
    rows: Array.from({ length: 24 }, (_, i) => i + 7) as unknown as readonly number[],
    columns: MAIN_COLUMNS,
  },
};

const ZONE_HEADER_STYLES: Record<SeatClass, string> = {
  first: 'text-amber-700 bg-amber-50 border-amber-200',
  business: 'text-violet-700 bg-violet-50 border-violet-200',
  economy: 'text-sky-700 bg-sky-50 border-sky-200',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

function formatFee(fee: number | string): string {
  const n = Number(fee);
  if (n === 0) return 'Included';
  return `+₹${n.toLocaleString('en-IN')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SeatButton sub-component
// ─────────────────────────────────────────────────────────────────────────────

type SeatState = 'available' | 'occupied' | 'selected' | 'your_seat';

type SeatButtonProps = {
  seat: SeatRow;
  state: SeatState;
  onClick: (seat: SeatRow) => void;
};

function SeatButton({ seat, state, onClick }: SeatButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const baseClasses =
    'relative w-9 h-9 rounded-md text-[10px] font-bold border-2 transition-all duration-150 flex items-center justify-center select-none';

  const stateClasses: Record<SeatState, string> = {
    available:
      'bg-green-100 border-green-400 text-green-800 cursor-pointer hover:bg-green-300 hover:border-green-500 hover:scale-110 active:scale-95',
    occupied:
      'bg-gray-300 border-gray-300 text-gray-400 cursor-not-allowed opacity-60',
    selected:
      'bg-blue-500 border-blue-600 text-white cursor-pointer shadow-lg shadow-blue-300/50 scale-110',
    your_seat:
      'bg-amber-400 border-amber-500 text-amber-900 cursor-default shadow-md shadow-amber-200/60',
  };

  return (
    <div className="relative">
      <button
        type="button"
        id={`seat-${seat.seat_number}`}
        disabled={state === 'occupied' || state === 'your_seat'}
        onClick={() => state === 'available' || state === 'selected' ? onClick(seat) : undefined}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        className={`${baseClasses} ${stateClasses[state]}`}
        aria-label={`Seat ${seat.seat_number}, ${seat.class}, ${formatFee(seat.extra_fee)}, ${state}`}
      >
        {seat.seat_number}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <div className="bg-slate-800 text-white text-[11px] rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
            <div className="font-bold">{seat.seat_number}</div>
            <div className="text-slate-300 capitalize">{seat.class}</div>
            <div className="text-[#c8a84b]">{formatFee(seat.extra_fee)}</div>
          </div>
          {/* Arrow */}
          <div className="w-2 h-2 bg-slate-800 rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SeatMap
// ─────────────────────────────────────────────────────────────────────────────

export default function SeatMap({ initialSeats, flightId, flight }: Props) {
  const { optimisticallySelectSeat, selectedSeat, setSelectedFlight } = useFlightStore();

  useEffect(() => {
    setSelectedFlight(flight);
  }, [flight, setSelectedFlight]);

  // Local seats state — updated optimistically and via Realtime.
  const [seats, setSeats] = useState<SeatRow[]>(initialSeats);
  const [showModal, setShowModal] = useState(false);

  // Wire Realtime updates — stable setter reference, no dep-array churn.
  const stableSetSeats = useCallback(
    (updater: React.SetStateAction<SeatRow[]>) => setSeats(updater),
    [],
  );
  useRealtimeSeatUpdates(flightId, stableSetSeats);

  // Build a lookup map for O(1) seat access by seat_number.
  const seatMap = new Map<string, SeatRow>(seats.map((s) => [s.seat_number, s]));

  function handleSeatClick(seat: SeatRow) {
    // Toggle off if same seat re-clicked — no-op, user can dismiss modal instead.
    if (selectedSeat?.id === seat.id) return;
    optimisticallySelectSeat(seat);
  }

  function handleContinue() {
    setShowModal(true);
  }

  function getSeatState(seat: SeatRow): SeatState {
    if (!seat.is_available) return 'occupied';
    if (selectedSeat?.id === seat.id) return 'selected';
    return 'available';
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 text-xs font-medium">
        {(
          [
            { state: 'available', label: 'Available', cls: 'bg-green-100 border-2 border-green-400' },
            { state: 'selected', label: 'Selected', cls: 'bg-blue-500 border-2 border-blue-600' },
            { state: 'occupied', label: 'Occupied', cls: 'bg-gray-300 border-2 border-gray-300 opacity-60' },
          ] as const
        ).map(({ state, label, cls }) => (
          <div key={state} className="flex items-center gap-1.5">
            <div className={`w-5 h-5 rounded ${cls}`} />
            <span className="text-slate-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Cabin scroll wrapper */}
      <div className="w-full overflow-x-auto touch-pan-x pb-2">
        <div className="inline-flex flex-col items-center gap-1 min-w-max mx-auto px-4">
          {/* Nose / front of plane */}
          <div className="text-slate-300 text-sm font-medium tracking-widest mb-2 text-center">
            ✈ FRONT
          </div>

          {(['first', 'business', 'economy'] as SeatClass[]).map((cls) => {
            const zone = ZONE_CONFIG[cls];
            const headerStyle = ZONE_HEADER_STYLES[cls];

            return (
              <div key={cls} className="w-full">
                {/* Zone header */}
                <div
                  className={`text-center text-[10px] font-black uppercase tracking-[0.2em]
                               border rounded-md py-1.5 px-4 mb-2 ${headerStyle}`}
                >
                  {zone.label}
                </div>

                {/* Column header labels */}
                <div className="flex items-center gap-1 justify-center mb-1">
                  {/* Row number spacer */}
                  <div className="w-7 shrink-0" />
                  {zone.columns.map((col, i) =>
                    col === null ? (
                      // Aisle gap
                      <div key={`aisle-${i}`} className="w-5 shrink-0" />
                    ) : (
                      <div
                        key={col}
                        className="w-9 text-center text-[10px] font-bold text-slate-400"
                      >
                        {col}
                      </div>
                    ),
                  )}
                </div>

                {/* Seat rows */}
                {zone.rows.map((rowNum) => (
                  <div key={rowNum} className="flex items-center gap-1 justify-center mb-1">
                    {/* Row number */}
                    <div className="w-7 text-right text-[10px] text-slate-400 font-medium shrink-0 pr-1">
                      {rowNum}
                    </div>

                    {zone.columns.map((col, i) => {
                      if (col === null) {
                        return <div key={`aisle-${i}`} className="w-5 shrink-0" />;
                      }

                      const seatNo = `${rowNum}${col}`;
                      const seat = seatMap.get(seatNo);

                      if (!seat) {
                        // Ghost placeholder for missing seats (shouldn't happen with seed data).
                        return (
                          <div
                            key={seatNo}
                            className="w-9 h-9 rounded-md bg-slate-100 border-2 border-slate-100 opacity-30"
                          />
                        );
                      }

                      return (
                        <SeatButton
                          key={seat.id}
                          seat={seat}
                          state={getSeatState(seat)}
                          onClick={handleSeatClick}
                        />
                      );
                    })}
                  </div>
                ))}

                <div className="my-3" />
              </div>
            );
          })}

          {/* Tail */}
          <div className="text-slate-300 text-sm font-medium tracking-widest mt-1 text-center">
            REAR ✈
          </div>
        </div>
      </div>

      {/* Continue bar — sticky on mobile */}
      {selectedSeat && (
        <div className="sticky bottom-0 left-0 right-0 w-full bg-white/95 backdrop-blur-sm
                        border-t border-slate-100 shadow-xl shadow-slate-200/60 p-4
                        flex flex-col sm:flex-row items-center justify-between gap-3 rounded-t-2xl">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Selected seat
            </p>
            <p className="text-lg font-black text-slate-800">
              {selectedSeat.seat_number}
              <span className="text-sm font-medium text-slate-500 ml-2 capitalize">
                {selectedSeat.class}
              </span>
            </p>
            <p className="text-sm text-[#c8a84b] font-semibold">
              {formatFee(selectedSeat.extra_fee)}
            </p>
          </div>

          <button
            id="seat-continue"
            type="button"
            onClick={handleContinue}
            className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-sm tracking-wide
                       bg-gradient-to-r from-[#0a1628] to-[#1e3a5f] text-white
                       hover:from-[#0d1f3c] hover:to-[#243f6a]
                       active:scale-[0.97] transition-all duration-150
                       shadow-lg shadow-[#0a1628]/30"
          >
            Continue →
          </button>
        </div>
      )}

      {/* Passenger details modal — rendered in the same layer as the seat map */}
      {showModal && (
        <PassengerDetailsModal onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
