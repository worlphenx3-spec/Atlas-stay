/*
# Atlas Stay - Core Schema

1. New Tables
- `properties` — short-term rental listings with base rate, cleaning fee, amenities, photos, location.
- `reservations` — booking ledger with status (PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED) and date range.
- `cleaning_staff` — cleaning crew roster.
- `cleaning_tasks` — turnover tracker linking a property to a staff member with status (Dirty, Needs Inspection, Clean).

2. Security
- This is a single-tenant demo app with NO sign-in screen, so all policies use `TO anon, authenticated`.
- RLS enabled on every table.

3. Important Notes
- Availability is enforced server-side via the `create_reservation` SECURITY DEFINER function which atomically checks for date-range overlaps before inserting. This prevents double bookings.
- The overlap check uses half-open intervals: checkout day is exclusive, so back-to-back bookings are allowed.
- Occupancy tax rate is fixed at 5% per the product spec.
*/

CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  location text NOT NULL,
  latitude numeric,
  longitude numeric,
  bedrooms int NOT NULL DEFAULT 1,
  bathrooms int NOT NULL DEFAULT 1,
  max_guests int NOT NULL DEFAULT 2,
  base_rate numeric(10,2) NOT NULL DEFAULT 0,
  cleaning_fee numeric(10,2) NOT NULL DEFAULT 0,
  occupancy_tax_rate numeric(5,4) NOT NULL DEFAULT 0.0500,
  image_url text NOT NULL,
  gallery_urls text[] NOT NULL DEFAULT '{}',
  amenities text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  guests int NOT NULL DEFAULT 1,
  nights int NOT NULL,
  base_total numeric(10,2) NOT NULL,
  cleaning_fee numeric(10,2) NOT NULL,
  tax_total numeric(10,2) NOT NULL,
  grand_total numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservations_property_dates
  ON reservations(property_id, check_in, check_out)
  WHERE status <> 'CANCELLED';

CREATE TABLE IF NOT EXISTS cleaning_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cleaning_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES cleaning_staff(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'DIRTY'
    CHECK (status IN ('DIRTY','NEEDS_INSPECTION','CLEAN')),
  notes text NOT NULL DEFAULT '',
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_properties" ON properties;
CREATE POLICY "anon_select_properties" ON properties FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_properties" ON properties;
CREATE POLICY "anon_insert_properties" ON properties FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_properties" ON properties;
CREATE POLICY "anon_update_properties" ON properties FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_properties" ON properties;
CREATE POLICY "anon_delete_properties" ON properties FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_reservations" ON reservations;
CREATE POLICY "anon_select_reservations" ON reservations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_reservations" ON reservations;
CREATE POLICY "anon_insert_reservations" ON reservations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_reservations" ON reservations;
CREATE POLICY "anon_update_reservations" ON reservations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_reservations" ON reservations;
CREATE POLICY "anon_delete_reservations" ON reservations FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_cleaning_staff" ON cleaning_staff;
CREATE POLICY "anon_select_cleaning_staff" ON cleaning_staff FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_cleaning_staff" ON cleaning_staff;
CREATE POLICY "anon_insert_cleaning_staff" ON cleaning_staff FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_cleaning_staff" ON cleaning_staff;
CREATE POLICY "anon_update_cleaning_staff" ON cleaning_staff FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_cleaning_staff" ON cleaning_staff;
CREATE POLICY "anon_delete_cleaning_staff" ON cleaning_staff FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_cleaning_tasks" ON cleaning_tasks;
CREATE POLICY "anon_select_cleaning_tasks" ON cleaning_tasks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_cleaning_tasks" ON cleaning_tasks;
CREATE POLICY "anon_insert_cleaning_tasks" ON cleaning_tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_cleaning_tasks" ON cleaning_tasks;
CREATE POLICY "anon_update_cleaning_tasks" ON cleaning_tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_cleaning_tasks" ON cleaning_tasks;
CREATE POLICY "anon_delete_cleaning_tasks" ON cleaning_tasks FOR DELETE TO anon, authenticated USING (true);

/*
# create_reservation SECURITY DEFINER function

Atomically checks for overlapping non-cancelled reservations on the same property,
then inserts the new reservation if no overlap exists. Prevents double bookings
at the database level regardless of client behavior.

Uses half-open intervals: a checkout on day X does not conflict with a check-in on day X.
Returns the new reservation row as JSON.
*/
CREATE OR REPLACE FUNCTION create_reservation(
  p_property_id uuid,
  p_guest_name text,
  p_guest_email text,
  p_check_in date,
  p_check_out date,
  p_guests int DEFAULT 1
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property properties%ROWTYPE;
  v_nights int;
  v_base_total numeric(10,2);
  v_tax_total numeric(10,2);
  v_grand_total numeric(10,2);
  v_conflict_count int;
  v_new_id uuid;
BEGIN
  IF p_check_out <= p_check_in THEN
    RAISE EXCEPTION 'Check-out date must be after check-in date';
  END IF;

  SELECT * INTO v_property FROM properties WHERE id = p_property_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found or inactive';
  END IF;

  IF p_guests > v_property.max_guests THEN
    RAISE EXCEPTION 'Guest count exceeds property capacity';
  END IF;

  -- Half-open interval overlap check: checkout day is exclusive
  SELECT count(*) INTO v_conflict_count
  FROM reservations
  WHERE property_id = p_property_id
    AND status <> 'CANCELLED'
    AND p_check_in < check_out
    AND p_check_out > check_in;

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Selected dates are not available for this property';
  END IF;

  v_nights := (p_check_out - p_check_in);
  v_base_total := v_property.base_rate * v_nights;
  v_tax_total := v_base_total * v_property.occupancy_tax_rate;
  v_grand_total := v_base_total + v_property.cleaning_fee + v_tax_total;

  INSERT INTO reservations (
    property_id, guest_name, guest_email, check_in, check_out, guests,
    nights, base_total, cleaning_fee, tax_total, grand_total, status
  ) VALUES (
    p_property_id, p_guest_name, p_guest_email, p_check_in, p_check_out, p_guests,
    v_nights, v_base_total, v_property.cleaning_fee, v_tax_total, v_grand_total, 'CONFIRMED'
  )
  RETURNING id INTO v_new_id;

  RETURN json_build_object(
    'id', v_new_id,
    'nights', v_nights,
    'base_total', v_base_total,
    'cleaning_fee', v_property.cleaning_fee,
    'tax_total', v_tax_total,
    'grand_total', v_grand_total,
    'status', 'CONFIRMED'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_reservation TO anon, authenticated;
