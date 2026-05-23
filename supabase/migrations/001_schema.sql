-- =============================================================================
-- Migration: 001_schema.sql
-- Description: Initial schema for flight-app
--              Tables, constraints, indexes, RLS, policies, triggers
-- =============================================================================

-- Enable the uuid extension (already available in Supabase, but guard anyway)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- =============================================================================
-- 1. TABLES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- flights
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS flights (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  flight_no     text        NOT NULL,
  origin        text        NOT NULL,
  destination   text        NOT NULL,
  departs_at    timestamptz NOT NULL,
  arrives_at    timestamptz NOT NULL,
  aircraft_type text        NOT NULL,
  status        text        NOT NULL DEFAULT 'scheduled'
                            CHECK (status IN ('scheduled', 'boarding', 'departed', 'cancelled')),
  base_price    numeric     NOT NULL CHECK (base_price >= 0),

  -- A flight must arrive after it departs
  CONSTRAINT flights_arrives_after_departs CHECK (arrives_at > departs_at)
);

-- Composite index for the most common search query pattern
CREATE INDEX IF NOT EXISTS idx_flights_route_departs
  ON flights (origin, destination, departs_at);


-- ---------------------------------------------------------------------------
-- seats
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seats (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  flight_id     uuid        NOT NULL REFERENCES flights (id) ON DELETE CASCADE,
  seat_number   text        NOT NULL,
  class         text        NOT NULL
                            CHECK (class IN ('economy', 'business', 'first')),
  is_available  boolean     NOT NULL DEFAULT true,
  extra_fee     numeric     NOT NULL DEFAULT 0 CHECK (extra_fee >= 0),

  -- Each seat number must be unique within a flight
  CONSTRAINT seats_flight_seat_unique UNIQUE (flight_id, seat_number)
);


-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id           uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  flight_id    uuid        NOT NULL REFERENCES flights (id) ON DELETE CASCADE,
  seat_id      uuid        NOT NULL REFERENCES seats (id) ON DELETE CASCADE,
  status       text        NOT NULL DEFAULT 'confirmed'
                           CHECK (status IN ('confirmed', 'rescheduled', 'cancelled')),
  booked_at    timestamptz NOT NULL DEFAULT now(),
  total_price  numeric     NOT NULL CHECK (total_price >= 0),
  pnr_code     text        NOT NULL,

  CONSTRAINT bookings_pnr_unique UNIQUE (pnr_code)
);


-- ---------------------------------------------------------------------------
-- passengers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS passengers (
  id           uuid  PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id   uuid  NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  full_name    text  NOT NULL,
  passport_no  text  NOT NULL,
  nationality  text  NOT NULL,
  dob          date  NOT NULL
);


-- ---------------------------------------------------------------------------
-- reschedules
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reschedules (
  id             uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id     uuid        NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  old_flight_id  uuid        NOT NULL REFERENCES flights (id) ON DELETE CASCADE,
  new_flight_id  uuid        NOT NULL REFERENCES flights (id) ON DELETE CASCADE,
  requested_at   timestamptz NOT NULL DEFAULT now(),
  fee_charged    numeric     NOT NULL DEFAULT 0 CHECK (fee_charged >= 0),

  -- A reschedule must actually change the flight
  CONSTRAINT reschedules_different_flights CHECK (old_flight_id <> new_flight_id)
);


-- =============================================================================
-- 2. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE flights     ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE passengers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reschedules ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 3. RLS POLICIES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- flights: anyone can read (public schedule)
-- ---------------------------------------------------------------------------
CREATE POLICY "flights_select_public"
  ON flights
  FOR SELECT
  TO anon, authenticated
  USING (true);


-- ---------------------------------------------------------------------------
-- seats: anyone can read; only authenticated users can update availability
-- ---------------------------------------------------------------------------
CREATE POLICY "seats_select_public"
  ON seats
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "seats_update_authenticated"
  ON seats
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ---------------------------------------------------------------------------
-- bookings: users can only see / manage their own bookings
-- ---------------------------------------------------------------------------
CREATE POLICY "bookings_select_own"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "bookings_insert_own"
  ON bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bookings_update_own"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- passengers: accessible only through a booking the caller owns
-- ---------------------------------------------------------------------------
CREATE POLICY "passengers_select_via_booking"
  ON passengers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = passengers.booking_id
        AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "passengers_insert_via_booking"
  ON passengers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = passengers.booking_id
        AND bookings.user_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------------
-- reschedules: accessible only through a booking the caller owns
-- ---------------------------------------------------------------------------
CREATE POLICY "reschedules_select_via_booking"
  ON reschedules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = reschedules.booking_id
        AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "reschedules_insert_via_booking"
  ON reschedules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = reschedules.booking_id
        AND bookings.user_id = auth.uid()
    )
  );


-- =============================================================================
-- 4. TRIGGER: Prevent late cancellations (< 2 hours before departure)
-- =============================================================================

CREATE OR REPLACE FUNCTION prevent_late_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER          -- runs with the privileges of the function owner
SET search_path = public  -- guard against search_path injection
AS $$
DECLARE
  v_departs_at timestamptz;
BEGIN
  -- Only act when the booking is being cancelled
  IF NEW.status <> 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Skip if the status hasn't changed (UPDATE scenario)
  IF TG_OP = 'UPDATE' AND OLD.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Look up the flight's departure time
  SELECT departs_at
    INTO v_departs_at
    FROM flights
   WHERE id = NEW.flight_id;

  -- Block if departure is within 2 hours from now
  IF v_departs_at <= (now() + INTERVAL '2 hours') THEN
    RAISE EXCEPTION
      'Cancellations within 2 hours of departure are not allowed. '
      'Flight departs at %.', v_departs_at
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- Attach the trigger to bookings (fires before INSERT and UPDATE)
CREATE TRIGGER trg_prevent_late_cancellation
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION prevent_late_cancellation();
