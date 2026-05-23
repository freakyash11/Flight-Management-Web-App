-- =============================================================================
-- seed.sql — Flight App development seed data
-- =============================================================================
--
-- HOW TO RUN
-- ----------
-- Option A (Supabase CLI — resets DB then applies migrations + seed):
--   supabase db reset
--
-- Option B (paste directly into Supabase SQL Editor):
--   Copy everything below and execute in your project's SQL Editor.
--
-- NOTE: The trigger on bookings enforces a 2-hour cancellation window.
--       Flight departure times are relative to NOW() so the seed stays
--       valid whenever it is run.
--
-- TEST USER
-- ---------
-- Create the test user manually before running any booking tests:
--   • Supabase Dashboard → Authentication → Users → Add User
--   • Email:    test@flightapp.com
--   • Password: Test@12345
-- =============================================================================


-- =============================================================================
-- 0. Clean slate (safe to re-run)
-- =============================================================================
TRUNCATE TABLE
  reschedules,
  passengers,
  bookings,
  seats,
  flights
RESTART IDENTITY CASCADE;


-- =============================================================================
-- 1. FLIGHTS (8 flights across 4 routes)
--    Departure times spread across the next 30 days relative to NOW()
-- =============================================================================
DO $$
DECLARE
  -- Flight IDs — hardcoded so we can reference them in the seat block below
  f1  uuid := 'a1000000-0000-0000-0000-000000000001'; -- DEL→BOM #1
  f2  uuid := 'a1000000-0000-0000-0000-000000000002'; -- DEL→BOM #2
  f3  uuid := 'a1000000-0000-0000-0000-000000000003'; -- BOM→DEL #1
  f4  uuid := 'a1000000-0000-0000-0000-000000000004'; -- BOM→DEL #2
  f5  uuid := 'a1000000-0000-0000-0000-000000000005'; -- DEL→BLR #1
  f6  uuid := 'a1000000-0000-0000-0000-000000000006'; -- DEL→BLR #2
  f7  uuid := 'a1000000-0000-0000-0000-000000000007'; -- BLR→DEL #1
  f8  uuid := 'a1000000-0000-0000-0000-000000000008'; -- BLR→DEL #2
BEGIN
  INSERT INTO flights
    (id, flight_no, origin, destination, departs_at, arrives_at, aircraft_type, status, base_price)
  VALUES
    -- ── DEL → BOM ────────────────────────────────────────────────────────────
    (f1,
     'IX-202', 'DEL', 'BOM',
     NOW() + INTERVAL '3 days 6 hours',
     NOW() + INTERVAL '3 days 8 hours 15 minutes',
     'A320', 'scheduled', 3500),

    (f2,
     'IX-204', 'DEL', 'BOM',
     NOW() + INTERVAL '7 days 14 hours',
     NOW() + INTERVAL '7 days 16 hours 15 minutes',
     'B737', 'scheduled', 4200),

    -- ── BOM → DEL ────────────────────────────────────────────────────────────
    (f3,
     'IX-203', 'BOM', 'DEL',
     NOW() + INTERVAL '4 days 9 hours',
     NOW() + INTERVAL '4 days 11 hours 20 minutes',
     'A320', 'scheduled', 3800),

    (f4,
     'IX-205', 'BOM', 'DEL',
     NOW() + INTERVAL '10 days 18 hours',
     NOW() + INTERVAL '10 days 20 hours 20 minutes',
     'A321', 'scheduled', 5100),

    -- ── DEL → BLR ────────────────────────────────────────────────────────────
    (f5,
     'AI-501', 'DEL', 'BLR',
     NOW() + INTERVAL '5 days 7 hours',
     NOW() + INTERVAL '5 days 9 hours 50 minutes',
     'A321', 'scheduled', 4800),

    (f6,
     'AI-503', 'DEL', 'BLR',
     NOW() + INTERVAL '14 days 15 hours',
     NOW() + INTERVAL '14 days 17 hours 50 minutes',
     'B737', 'scheduled', 7500),

    -- ── BLR → DEL ────────────────────────────────────────────────────────────
    (f7,
     'AI-502', 'BLR', 'DEL',
     NOW() + INTERVAL '6 days 10 hours',
     NOW() + INTERVAL '6 days 13 hours',
     'B737', 'scheduled', 5500),

    (f8,
     'AI-504', 'BLR', 'DEL',
     NOW() + INTERVAL '21 days 8 hours',
     NOW() + INTERVAL '21 days 10 hours 55 minutes',
     'A320', 'scheduled', 11500);

END;
$$;


-- =============================================================================
-- 2. SEATS — full seat map for every flight
--
-- Layout per flight:
--   First class : rows 1–2,   seats A–D  →  8 seats,  extra_fee = 5000
--   Business    : rows 3–6,   seats A–F  → 24 seats,  extra_fee = 2000
--   Economy     : rows 7–30,  seats A–F  → 144 seats, extra_fee = 0
--   Total per flight: 176 seats   ×  8 flights = 1 408 seats
--
-- ~15% of seats set is_available = false (random per run to simulate bookings)
-- =============================================================================
DO $$
DECLARE
  flight_ids  uuid[] := ARRAY[
    'a1000000-0000-0000-0000-000000000001'::uuid,
    'a1000000-0000-0000-0000-000000000002'::uuid,
    'a1000000-0000-0000-0000-000000000003'::uuid,
    'a1000000-0000-0000-0000-000000000004'::uuid,
    'a1000000-0000-0000-0000-000000000005'::uuid,
    'a1000000-0000-0000-0000-000000000006'::uuid,
    'a1000000-0000-0000-0000-000000000007'::uuid,
    'a1000000-0000-0000-0000-000000000008'::uuid
  ];
  fid         uuid;
  row_num     integer;
  seat_letter text;
  seat_class  text;
  seat_fee    numeric;
  -- We use a fixed seed per flight index so the "booked" pattern is
  -- reproducible across re-seeds, while still looking realistic.
  -- setseed() accepts a value in [-1, 1]; we derive one per flight.
  fidx        integer;
BEGIN
  FOREACH fid IN ARRAY flight_ids LOOP

    fidx := array_position(flight_ids, fid);
    -- Seed random number generator for reproducible availability pattern
    PERFORM setseed(fidx * 0.1 - 0.5);

    -- ── First class: rows 1–2, seats A–D ─────────────────────────────────
    FOR row_num IN 1..2 LOOP
      FOREACH seat_letter IN ARRAY ARRAY['A','B','C','D'] LOOP
        INSERT INTO seats (flight_id, seat_number, class, is_available, extra_fee)
        VALUES (
          fid,
          row_num::text || seat_letter,
          'first',
          random() >= 0.15,   -- ~85% available
          5000
        );
      END LOOP;
    END LOOP;

    -- ── Business: rows 3–6, seats A–F ────────────────────────────────────
    FOR row_num IN 3..6 LOOP
      FOREACH seat_letter IN ARRAY ARRAY['A','B','C','D','E','F'] LOOP
        INSERT INTO seats (flight_id, seat_number, class, is_available, extra_fee)
        VALUES (
          fid,
          row_num::text || seat_letter,
          'business',
          random() >= 0.15,
          2000
        );
      END LOOP;
    END LOOP;

    -- ── Economy: rows 7–30, seats A–F ────────────────────────────────────
    FOR row_num IN 7..30 LOOP
      FOREACH seat_letter IN ARRAY ARRAY['A','B','C','D','E','F'] LOOP
        INSERT INTO seats (flight_id, seat_number, class, is_available, extra_fee)
        VALUES (
          fid,
          row_num::text || seat_letter,
          'economy',
          random() >= 0.15,
          0
        );
      END LOOP;
    END LOOP;

  END LOOP;
END;
$$;


-- =============================================================================
-- 3. SANITY CHECK (optional — comment out before pasting into SQL Editor
--    if you don't want the result sets returned)
-- =============================================================================
SELECT
  f.flight_no,
  f.origin || ' → ' || f.destination                    AS route,
  f.departs_at::date                                    AS departs_date,
  f.aircraft_type,
  '₹' || f.base_price                                   AS base_price,
  COUNT(s.id)                                           AS total_seats,
  COUNT(s.id) FILTER (WHERE s.is_available)             AS available,
  COUNT(s.id) FILTER (WHERE NOT s.is_available)         AS booked,
  ROUND(
    100.0 * COUNT(s.id) FILTER (WHERE NOT s.is_available)
    / COUNT(s.id), 1
  )                                                     AS "booked_%"
FROM flights f
JOIN seats   s ON s.flight_id = f.id
GROUP BY f.id, f.flight_no, f.origin, f.destination,
         f.departs_at, f.aircraft_type, f.base_price
ORDER BY f.departs_at;
