-- =============================================================================
-- Migration: 002_functions.sql
-- Description: RPC functions for atomic seat reservation and booking cancellation
-- =============================================================================


-- =============================================================================
-- HELPER: generate a PNR code in the format FL + 6 uppercase alphanumeric chars
--         e.g. FLAB3X9Q
-- =============================================================================
CREATE OR REPLACE FUNCTION generate_pnr()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chars  text    := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  v_pnr    text    := 'FL';
  v_i      integer;
BEGIN
  FOR v_i IN 1..6 LOOP
    v_pnr := v_pnr || substr(v_chars, floor(random() * 36 + 1)::integer, 1);
  END LOOP;
  RETURN v_pnr;
END;
$$;


-- =============================================================================
-- 1. reserve_seat
--
-- Atomically:
--   1. Lock the seat row (FOR UPDATE) to prevent double-booking
--   2. Verify the seat is still available
--   3. Generate a collision-safe PNR code
--   4. INSERT booking
--   5. INSERT passenger
--   6. Mark seat as unavailable
--   7. Return (id, pnr_code, total_price)
--
-- Called from the client as:
--   supabase.rpc('reserve_seat', { p_flight_id, p_seat_id, p_user_id,
--                                   p_passenger, p_total_price })
-- =============================================================================
CREATE OR REPLACE FUNCTION reserve_seat(
  p_flight_id    uuid,
  p_seat_id      uuid,
  p_user_id      uuid,
  p_passenger    jsonb,   -- { full_name, passport_no, nationality, dob }
  p_total_price  numeric
)
RETURNS TABLE (
  id           uuid,
  pnr_code     text,
  total_price  numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id  uuid;
  v_pnr         text;
  v_available   boolean;
  v_attempts    integer := 0;
BEGIN
  -- ── 1. Lock the seat row to prevent concurrent double-bookings ─────────────
  SELECT is_available
    INTO v_available
    FROM seats
   WHERE seats.id = p_seat_id
     FOR UPDATE;           -- row-level lock held until end of transaction

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seat not found'
      USING ERRCODE = 'P0002';
  END IF;

  -- ── 2. Availability check ──────────────────────────────────────────────────
  IF NOT v_available THEN
    RAISE EXCEPTION 'Seat is no longer available'
      USING ERRCODE = 'P0001';
  END IF;

  -- ── 3. Generate a unique PNR (retry up to 5 times on collision) ────────────
  LOOP
    v_pnr := generate_pnr();
    -- Exit the loop if the PNR is not already in use
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM bookings WHERE bookings.pnr_code = v_pnr
    );
    v_attempts := v_attempts + 1;
    IF v_attempts >= 5 THEN
      RAISE EXCEPTION 'Failed to generate a unique PNR code after % attempts', v_attempts
        USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  -- ── 4. Create the booking ──────────────────────────────────────────────────
  INSERT INTO bookings (
    user_id,
    flight_id,
    seat_id,
    status,
    booked_at,
    total_price,
    pnr_code
  )
  VALUES (
    p_user_id,
    p_flight_id,
    p_seat_id,
    'confirmed',
    now(),
    p_total_price,
    v_pnr
  )
  RETURNING bookings.id INTO v_booking_id;

  -- ── 5. Create the passenger record ────────────────────────────────────────
  --      p_passenger must contain: full_name, passport_no, nationality, dob
  INSERT INTO passengers (
    booking_id,
    full_name,
    passport_no,
    nationality,
    dob
  )
  VALUES (
    v_booking_id,
    p_passenger ->> 'full_name',
    p_passenger ->> 'passport_no',
    p_passenger ->> 'nationality',
    (p_passenger ->> 'dob')::date
  );

  -- ── 6. Mark the seat as taken ─────────────────────────────────────────────
  UPDATE seats
     SET is_available = false
   WHERE seats.id = p_seat_id;

  -- ── 7. Return the new booking summary ─────────────────────────────────────
  RETURN QUERY
    SELECT b.id, b.pnr_code, b.total_price
      FROM bookings b
     WHERE b.id = v_booking_id;
END;
$$;

-- Grant execute rights to authenticated users only
GRANT EXECUTE ON FUNCTION reserve_seat(uuid, uuid, uuid, jsonb, numeric)
  TO authenticated;

-- Explicitly revoke from anon (belt-and-suspenders)
REVOKE EXECUTE ON FUNCTION reserve_seat(uuid, uuid, uuid, jsonb, numeric)
  FROM anon;


-- =============================================================================
-- 2. cancel_booking
--
-- Atomically:
--   1. Verify the booking exists and belongs to p_user_id
--   2. UPDATE booking status to 'cancelled'
--      (the trg_prevent_late_cancellation trigger enforces the 2-hour rule)
--   3. Mark the seat available again
--   4. Return the updated booking row
--
-- The trigger on bookings will RAISE EXCEPTION if the flight departs within
-- 2 hours, rolling back the entire transaction automatically.
--
-- Called from the client as:
--   supabase.rpc('cancel_booking', { p_booking_id, p_user_id })
-- =============================================================================
CREATE OR REPLACE FUNCTION cancel_booking(
  p_booking_id  uuid,
  p_user_id     uuid
)
RETURNS TABLE (
  id           uuid,
  user_id      uuid,
  flight_id    uuid,
  seat_id      uuid,
  status       text,
  booked_at    timestamptz,
  total_price  numeric,
  pnr_code     text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seat_id    uuid;
  v_owner_id   uuid;
BEGIN
  -- ── 1. Ownership check ────────────────────────────────────────────────────
  --      Lock the booking row immediately so no concurrent cancel can race us.
  SELECT b.user_id, b.seat_id
    INTO v_owner_id, v_seat_id
    FROM bookings b
   WHERE b.id = p_booking_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_owner_id <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: booking does not belong to the requesting user'
      USING ERRCODE = '42501';   -- standard insufficient_privilege code
  END IF;

  -- ── 2. Cancel the booking ─────────────────────────────────────────────────
  --      The BEFORE trigger trg_prevent_late_cancellation fires here.
  --      If the flight departs within 2 hours it raises an exception and the
  --      entire transaction is rolled back — no further code runs.
  UPDATE bookings b
     SET status = 'cancelled'
   WHERE b.id = p_booking_id;

  -- ── 3. Release the seat so other passengers can book it ──────────────────
  UPDATE seats s
     SET is_available = true
   WHERE s.id = v_seat_id;

  -- ── 4. Return the updated booking row ────────────────────────────────────
  RETURN QUERY
    SELECT b.id,
           b.user_id,
           b.flight_id,
           b.seat_id,
           b.status,
           b.booked_at,
           b.total_price,
           b.pnr_code
      FROM bookings b
     WHERE b.id = p_booking_id;
END;
$$;

-- Grant execute rights to authenticated users only
GRANT EXECUTE ON FUNCTION cancel_booking(uuid, uuid)
  TO authenticated;

-- Explicitly revoke from anon (belt-and-suspenders)
REVOKE EXECUTE ON FUNCTION cancel_booking(uuid, uuid)
  FROM anon;
