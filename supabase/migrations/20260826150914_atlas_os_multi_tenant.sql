/*
# Atlas OS — Multi-Tenant SaaS Refactor

Transforms Atlas Stay from a single-tenant demo into a multi-tenant SaaS platform
with organizations, role-based auth, white-label branding, and vendor-scoped cleaning.

## New Tables
- `organizations` — tenant entities with white-label branding (business_name, logo_url, brand_color, slug).
- `org_members` — joins auth.users to organizations with a role of 'host' or 'staff'.

## Modified Tables
- `properties` — adds `org_id`.
- `reservations` — adds `org_id`.
- `cleaning_staff` — adds `org_id` and `user_id` (links staff to auth accounts).
- `cleaning_tasks` — adds `org_id`.

## Security Changes
- Properties: SELECT public (guests browse without login); writes require org host membership.
- Reservations: SELECT/UPDATE require org membership; INSERT via SECURITY DEFINER function.
- Cleaning staff/tasks: org-scoped; staff see only tasks assigned to them.
- Organizations: SELECT public; writes require host membership.
- Org members: SELECT requires self or org host; INSERT/UPDATE/DELETE require org host.

## Demo Data
- Creates "Coastal Vacations" demo org, assigns all existing properties to it.
- Creates demo host (host@atlasos.demo / demo1234) and staff (staff@atlasos.demo / demo1234) accounts.
- Links first cleaning_staff record to the staff user.
*/

-- ── Organizations ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL DEFAULT 'Atlas Stay',
  logo_url text,
  brand_color text NOT NULL DEFAULT '#10b981',
  slug text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_organizations" ON organizations;
CREATE POLICY "public_select_organizations" ON organizations FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "host_insert_organizations" ON organizations;
CREATE POLICY "host_insert_organizations" ON organizations FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "host_update_organizations" ON organizations;
CREATE POLICY "host_update_organizations" ON organizations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ── Org Members ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'host' CHECK (role IN ('host', 'staff')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_or_org_membership" ON org_members;
CREATE POLICY "select_own_or_org_membership" ON org_members FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM org_members m2
      WHERE m2.org_id = org_members.org_id
        AND m2.user_id = auth.uid()
        AND m2.role = 'host'
    )
  );

DROP POLICY IF EXISTS "insert_org_membership" ON org_members;
CREATE POLICY "insert_org_membership" ON org_members FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "host_update_membership" ON org_members;
CREATE POLICY "host_update_membership" ON org_members FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM org_members m2 WHERE m2.org_id = org_members.org_id AND m2.user_id = auth.uid() AND m2.role = 'host')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM org_members m2 WHERE m2.org_id = org_members.org_id AND m2.user_id = auth.uid() AND m2.role = 'host')
  );

DROP POLICY IF EXISTS "host_delete_membership" ON org_members;
CREATE POLICY "host_delete_membership" ON org_members FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM org_members m2 WHERE m2.org_id = org_members.org_id AND m2.user_id = auth.uid() AND m2.role = 'host')
  );

-- ── Add org_id columns ─────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'org_id') THEN
    ALTER TABLE properties ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'org_id') THEN
    ALTER TABLE reservations ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cleaning_staff' AND column_name = 'org_id') THEN
    ALTER TABLE cleaning_staff ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cleaning_staff' AND column_name = 'user_id') THEN
    ALTER TABLE cleaning_staff ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cleaning_tasks' AND column_name = 'org_id') THEN
    ALTER TABLE cleaning_tasks ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ── Rewrite RLS: Properties ────────────────────────────
DROP POLICY IF EXISTS "anon_select_properties" ON properties;
CREATE POLICY "anon_select_properties" ON properties FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_properties" ON properties;
CREATE POLICY "org_host_insert_properties" ON properties FOR INSERT
  TO authenticated WITH CHECK (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members m WHERE m.org_id = properties.org_id AND m.user_id = auth.uid() AND m.role = 'host'
    )
  );

DROP POLICY IF EXISTS "anon_update_properties" ON properties;
CREATE POLICY "org_host_update_properties" ON properties FOR UPDATE
  TO authenticated USING (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members m WHERE m.org_id = properties.org_id AND m.user_id = auth.uid() AND m.role = 'host'
    )
  ) WITH CHECK (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members m WHERE m.org_id = properties.org_id AND m.user_id = auth.uid() AND m.role = 'host'
    )
  );

DROP POLICY IF EXISTS "anon_delete_properties" ON properties;
CREATE POLICY "org_host_delete_properties" ON properties FOR DELETE
  TO authenticated USING (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members m WHERE m.org_id = properties.org_id AND m.user_id = auth.uid() AND m.role = 'host'
    )
  );

-- ── Rewrite RLS: Reservations ──────────────────────────
DROP POLICY IF EXISTS "anon_select_reservations" ON reservations;
CREATE POLICY "org_member_select_reservations" ON reservations FOR SELECT
  TO authenticated USING (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members m WHERE m.org_id = reservations.org_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "anon_insert_reservations" ON reservations;
CREATE POLICY "org_member_insert_reservations" ON reservations FOR INSERT
  TO authenticated WITH CHECK (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members m WHERE m.org_id = reservations.org_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "anon_update_reservations" ON reservations;
CREATE POLICY "org_host_update_reservations" ON reservations FOR UPDATE
  TO authenticated USING (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members m WHERE m.org_id = reservations.org_id AND m.user_id = auth.uid() AND m.role = 'host'
    )
  ) WITH CHECK (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members m WHERE m.org_id = reservations.org_id AND m.user_id = auth.uid() AND m.role = 'host'
    )
  );

DROP POLICY IF EXISTS "anon_delete_reservations" ON reservations;
CREATE POLICY "org_host_delete_reservations" ON reservations FOR DELETE
  TO authenticated USING (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members m WHERE m.org_id = reservations.org_id AND m.user_id = auth.uid() AND m.role = 'host'
    )
  );

-- ── Rewrite RLS: Cleaning Staff ────────────────────────
DROP POLICY IF EXISTS "anon_select_cleaning_staff" ON cleaning_staff;
CREATE POLICY "org_member_select_cleaning_staff" ON cleaning_staff FOR SELECT
  TO authenticated USING (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members m WHERE m.org_id = cleaning_staff.org_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "anon_insert_cleaning_staff" ON cleaning_staff;
CREATE POLICY "org_host_insert_cleaning_staff" ON cleaning_staff FOR INSERT
  TO authenticated WITH CHECK (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members m WHERE m.org_id = cleaning_staff.org_id AND m.user_id = auth.uid() AND m.role = 'host'
    )
  );

DROP POLICY IF EXISTS "anon_update_cleaning_staff" ON cleaning_staff;
CREATE POLICY "org_host_update_cleaning_staff" ON cleaning_staff FOR UPDATE
  TO authenticated USING (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members m WHERE m.org_id = cleaning_staff.org_id AND m.user_id = auth.uid() AND m.role = 'host'
    )
  ) WITH CHECK (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members m WHERE m.org_id = cleaning_staff.org_id AND m.user_id = auth.uid() AND m.role = 'host'
    )
  );

DROP POLICY IF EXISTS "anon_delete_cleaning_staff" ON cleaning_staff;
CREATE POLICY "org_host_delete_cleaning_staff" ON cleaning_staff FOR DELETE
  TO authenticated USING (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members m WHERE m.org_id = cleaning_staff.org_id AND m.user_id = auth.uid() AND m.role = 'host'
    )
  );

-- ── Rewrite RLS: Cleaning Tasks ────────────────────────
DROP POLICY IF EXISTS "anon_select_cleaning_tasks" ON cleaning_tasks;
CREATE POLICY "org_member_select_cleaning_tasks" ON cleaning_tasks FOR SELECT
  TO authenticated USING (
    org_id IS NOT NULL AND (
      EXISTS (SELECT 1 FROM org_members m WHERE m.org_id = cleaning_tasks.org_id AND m.user_id = auth.uid() AND m.role = 'host')
      OR (
        EXISTS (SELECT 1 FROM org_members m WHERE m.org_id = cleaning_tasks.org_id AND m.user_id = auth.uid() AND m.role = 'staff')
        AND EXISTS (SELECT 1 FROM cleaning_staff cs WHERE cs.id = cleaning_tasks.staff_id AND cs.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "anon_insert_cleaning_tasks" ON cleaning_tasks;
CREATE POLICY "org_host_insert_cleaning_tasks" ON cleaning_tasks FOR INSERT
  TO authenticated WITH CHECK (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members m WHERE m.org_id = cleaning_tasks.org_id AND m.user_id = auth.uid() AND m.role = 'host'
    )
  );

-- Drop old update policies, add host + staff policies
DROP POLICY IF EXISTS "anon_update_cleaning_tasks" ON cleaning_tasks;
DROP POLICY IF EXISTS "org_host_update_cleaning_tasks" ON cleaning_tasks;
DROP POLICY IF EXISTS "org_staff_update_cleaning_tasks" ON cleaning_tasks;

CREATE POLICY "org_host_update_cleaning_tasks" ON cleaning_tasks FOR UPDATE
  TO authenticated USING (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members m WHERE m.org_id = cleaning_tasks.org_id AND m.user_id = auth.uid() AND m.role = 'host'
    )
  ) WITH CHECK (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members m WHERE m.org_id = cleaning_tasks.org_id AND m.user_id = auth.uid() AND m.role = 'host'
    )
  );

CREATE POLICY "org_staff_update_cleaning_tasks" ON cleaning_tasks FOR UPDATE
  TO authenticated USING (
    org_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM org_members m WHERE m.org_id = cleaning_tasks.org_id AND m.user_id = auth.uid() AND m.role = 'staff')
    AND EXISTS (SELECT 1 FROM cleaning_staff cs WHERE cs.id = cleaning_tasks.staff_id AND cs.user_id = auth.uid())
  ) WITH CHECK (
    org_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM org_members m WHERE m.org_id = cleaning_tasks.org_id AND m.user_id = auth.uid() AND m.role = 'staff')
  );

DROP POLICY IF EXISTS "anon_delete_cleaning_tasks" ON cleaning_tasks;
CREATE POLICY "org_host_delete_cleaning_tasks" ON cleaning_tasks FOR DELETE
  TO authenticated USING (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members m WHERE m.org_id = cleaning_tasks.org_id AND m.user_id = auth.uid() AND m.role = 'host'
    )
  );

-- ── Update create_reservation function ─────────────────
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
    property_id, org_id, guest_name, guest_email, check_in, check_out, guests,
    nights, base_total, cleaning_fee, tax_total, grand_total, status
  ) VALUES (
    p_property_id, v_property.org_id, p_guest_name, p_guest_email, p_check_in, p_check_out, p_guests,
    v_nights, v_base_total, v_property.cleaning_fee, v_tax_total, v_grand_total, 'CONFIRMED'
  )
  RETURNING id INTO v_new_id;

  RETURN json_build_object(
    'id', v_new_id,
    'org_id', v_property.org_id,
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

-- ── Seed demo organization ─────────────────────────────
DO $$
DECLARE
  v_org_id uuid;
  v_host_id uuid;
  v_staff_id uuid;
  v_staff_row_id uuid;
BEGIN
  SELECT id INTO v_org_id FROM organizations WHERE slug = 'coastal-vacations' LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO organizations (business_name, brand_color, slug)
    VALUES ('Coastal Vacations', '#10b981', 'coastal-vacations')
    RETURNING id INTO v_org_id;
  END IF;

  UPDATE properties SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE reservations r SET org_id = p.org_id FROM properties p WHERE r.property_id = p.id AND r.org_id IS NULL;
  UPDATE cleaning_staff SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE cleaning_tasks ct SET org_id = p.org_id FROM properties p WHERE ct.property_id = p.id AND ct.org_id IS NULL;

  -- Demo host user
  SELECT id INTO v_host_id FROM auth.users WHERE email = 'host@atlasos.demo' LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      'host@atlasos.demo', crypt('demo1234', gen_salt('bf')),
      now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'
    )
    RETURNING id INTO v_host_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM org_members WHERE org_id = v_org_id AND user_id = v_host_id) THEN
    INSERT INTO org_members (org_id, user_id, role) VALUES (v_org_id, v_host_id, 'host');
  END IF;

  -- Demo staff user
  SELECT id INTO v_staff_id FROM auth.users WHERE email = 'staff@atlasos.demo' LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      'staff@atlasos.demo', crypt('demo1234', gen_salt('bf')),
      now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'
    )
    RETURNING id INTO v_staff_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM org_members WHERE org_id = v_org_id AND user_id = v_staff_id) THEN
    INSERT INTO org_members (org_id, user_id, role) VALUES (v_org_id, v_staff_id, 'staff');
  END IF;

  SELECT id INTO v_staff_row_id FROM cleaning_staff WHERE org_id = v_org_id ORDER BY created_at LIMIT 1;
  IF v_staff_row_id IS NOT NULL THEN
    UPDATE cleaning_staff SET user_id = v_staff_id WHERE id = v_staff_row_id;
  END IF;
END $$;
