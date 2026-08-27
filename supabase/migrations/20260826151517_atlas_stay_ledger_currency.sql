/*
# Atlas Stay — Financial Ledger, Currency, GPS Precision

## New Tables
- `ledger_entries` — income/expense tracking per org with categories and currency.

## Modified Tables
- `organizations` — adds `currency` (default 'USD'), `tot_tax_rate` (default 0.12).
- `properties` — adds `exact_lat`, `exact_lng` for precise GPS (separate from public approx lat/lng).

## Security
- ledger_entries: org-scoped, host-only access.
- organizations: already public SELECT, host UPDATE.

## Notes
1. Ledger categories: RENT_INCOME, CLEANING_INCOME, TAX_COLLECTED, RENT_EXPENSE, CLEANING_EXPENSE, UTILITIES, MAINTENANCE, AMENITIES, PLATFORM_FEES, OTHER.
2. Currency supports USD and XCG (Caribbean Guilder).
3. Properties keep `latitude`/`longitude` as public approx coords; `exact_lat`/`exact_lng` are only revealed post-booking or to hosts.
*/

CREATE TABLE IF NOT EXISTS ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN (
    'RENT_INCOME', 'CLEANING_INCOME', 'TAX_COLLECTED',
    'RENT_EXPENSE', 'CLEANING_EXPENSE', 'UTILITIES',
    'MAINTENANCE', 'AMENITIES', 'PLATFORM_FEES', 'OTHER'
  )),
  type text NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'XCG')),
  description text NOT NULL DEFAULT '',
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  synced boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_host_select_ledger" ON ledger_entries;
CREATE POLICY "org_host_select_ledger" ON ledger_entries FOR SELECT
  TO authenticated USING (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members m WHERE m.org_id = ledger_entries.org_id AND m.user_id = auth.uid() AND m.role = 'host'
    )
  );

DROP POLICY IF EXISTS "org_host_insert_ledger" ON ledger_entries;
CREATE POLICY "org_host_insert_ledger" ON ledger_entries FOR INSERT
  TO authenticated WITH CHECK (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members m WHERE m.org_id = ledger_entries.org_id AND m.user_id = auth.uid() AND m.role = 'host'
    )
  );

DROP POLICY IF EXISTS "org_host_update_ledger" ON ledger_entries;
CREATE POLICY "org_host_update_ledger" ON ledger_entries FOR UPDATE
  TO authenticated USING (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members m WHERE m.org_id = ledger_entries.org_id AND m.user_id = auth.uid() AND m.role = 'host'
    )
  ) WITH CHECK (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members m WHERE m.org_id = ledger_entries.org_id AND m.user_id = auth.uid() AND m.role = 'host'
    )
  );

DROP POLICY IF EXISTS "org_host_delete_ledger" ON ledger_entries;
CREATE POLICY "org_host_delete_ledger" ON ledger_entries FOR DELETE
  TO authenticated USING (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_members m WHERE m.org_id = ledger_entries.org_id AND m.user_id = auth.uid() AND m.role = 'host'
    )
  );

-- Add currency and TOT rate to organizations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'currency') THEN
    ALTER TABLE organizations ADD COLUMN currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'XCG'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'tot_tax_rate') THEN
    ALTER TABLE organizations ADD COLUMN tot_tax_rate numeric(5,4) NOT NULL DEFAULT 0.1200;
  END IF;
END $$;

-- Add exact GPS coordinates to properties
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'exact_lat') THEN
    ALTER TABLE properties ADD COLUMN exact_lat numeric(10,7);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'exact_lng') THEN
    ALTER TABLE properties ADD COLUMN exact_lng numeric(10,7);
  END IF;
END $$;

-- Populate exact GPS from existing approximate coords
UPDATE properties SET exact_lat = latitude, exact_lng = longitude WHERE exact_lat IS NULL AND latitude IS NOT NULL;

-- Seed some demo ledger entries
DO $$
DECLARE
  v_org_id uuid;
  v_prop_ids uuid[];
BEGIN
  SELECT id INTO v_org_id FROM organizations WHERE slug = 'coastal-vacations' LIMIT 1;
  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  SELECT array_agg(id) INTO v_prop_ids FROM properties WHERE org_id = v_org_id;

  IF NOT EXISTS (SELECT 1 FROM ledger_entries WHERE org_id = v_org_id) THEN
    INSERT INTO ledger_entries (org_id, property_id, category, type, amount, currency, description, entry_date) VALUES
      (v_org_id, v_prop_ids[1], 'RENT_INCOME', 'INCOME', 945, 'USD', 'Booking: Skyline Loft 5 nights', CURRENT_DATE - 10),
      (v_org_id, v_prop_ids[1], 'CLEANING_INCOME', 'INCOME', 75, 'USD', 'Cleaning fee: Skyline Loft', CURRENT_DATE - 10),
      (v_org_id, v_prop_ids[1], 'CLEANING_EXPENSE', 'EXPENSE', 45, 'USD', 'Turnover cleaning service', CURRENT_DATE - 10),
      (v_org_id, v_prop_ids[1], 'UTILITIES', 'EXPENSE', 120, 'USD', 'Monthly electricity + water', CURRENT_DATE - 5),
      (v_org_id, v_prop_ids[2], 'RENT_INCOME', 'INCOME', 1225, 'USD', 'Booking: Coastal Retreat 5 nights', CURRENT_DATE - 7),
      (v_org_id, v_prop_ids[2], 'PLATFORM_FEES', 'EXPENSE', 183, 'USD', 'Platform service fee 15%', CURRENT_DATE - 7),
      (v_org_id, v_prop_ids[2], 'MAINTENANCE', 'EXPENSE', 250, 'USD', 'AC repair', CURRENT_DATE - 3),
      (v_org_id, v_prop_ids[3], 'RENT_INCOME', 'INCOME', 1550, 'USD', 'Booking: Minimalist Penthouse 5 nights', CURRENT_DATE - 15),
      (v_org_id, v_prop_ids[3], 'RENT_EXPENSE', 'EXPENSE', 2100, 'USD', 'Monthly lease payment', CURRENT_DATE - 1),
      (v_org_id, v_prop_ids[3], 'AMENITIES', 'EXPENSE', 85, 'USD', 'Welcome basket restock', CURRENT_DATE - 2);
  END IF;
END $$;
