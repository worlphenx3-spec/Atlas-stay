/*
# Multi-Region Dutch Caribbean + Website Engine Columns

1. Overview
   Expands Atlas Stay from Sint Maarten-only to support the full Dutch Caribbean:
   Sint Maarten, Aruba, Curaçao, Bonaire, Saba, and St. Eustatius.
   Adds website template/branding configuration to properties and organizations
   so hosts can design and preview their property websites inside the Atlas workspace.

2. Changes to `organizations` table
   - `region` text column: which island this org operates on (default 'sint_maarten')
   - `website_template` text column: default website template (default 'tropical')
   - `website_config` jsonb column: template config (colors, tagline, hero image, etc.)

3. Changes to `properties` table
   - `region` text column: which island this property is on (default 'sint_maarten')
   - `website_config` jsonb column: per-property website config overrides
   - `site_slug` text column: slug for atlasstay.com subdomain
   - `custom_domain` text column: custom domain via CNAME to cname.atlasstay.com
   - `external_listing_url` text column: external redirect URL for Tier 1 hosts
   - `contact_email` text column: direct contact email for Tier 1
   - `contact_whatsapp` text column: WhatsApp number for Tier 1
   - `ical_feed_url` text column: iCal feed URL for Tier 2 sync
   - `onboarding_tier` text column: 'independent' | 'ical_sync' | 'native'

4. Security
   - No new tables created — existing RLS policies remain intact.
   - New columns inherit existing table-level RLS.

5. Notes
   - All new columns are nullable or have safe defaults so existing rows are not broken.
   - The `region` values map to the frontend ISLAND_PRESETS configuration.
*/

-- Add region + website columns to organizations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'region') THEN
    ALTER TABLE organizations ADD COLUMN region text NOT NULL DEFAULT 'sint_maarten';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'website_template') THEN
    ALTER TABLE organizations ADD COLUMN website_template text NOT NULL DEFAULT 'tropical';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'website_config') THEN
    ALTER TABLE organizations ADD COLUMN website_config jsonb;
  END IF;
END $$;

-- Add region + website + onboarding columns to properties
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'region') THEN
    ALTER TABLE properties ADD COLUMN region text NOT NULL DEFAULT 'sint_maarten';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'website_config') THEN
    ALTER TABLE properties ADD COLUMN website_config jsonb;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'site_slug') THEN
    ALTER TABLE properties ADD COLUMN site_slug text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'custom_domain') THEN
    ALTER TABLE properties ADD COLUMN custom_domain text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'external_listing_url') THEN
    ALTER TABLE properties ADD COLUMN external_listing_url text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'contact_email') THEN
    ALTER TABLE properties ADD COLUMN contact_email text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'contact_whatsapp') THEN
    ALTER TABLE properties ADD COLUMN contact_whatsapp text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'ical_feed_url') THEN
    ALTER TABLE properties ADD COLUMN ical_feed_url text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'onboarding_tier') THEN
    ALTER TABLE properties ADD COLUMN onboarding_tier text NOT NULL DEFAULT 'native';
  END IF;
END $$;

-- Update existing properties with Sint Maarten area names if they still have mock locations
UPDATE properties
SET location = CASE
  WHEN location ILIKE '%seattle%' THEN 'Simpson Bay'
  WHEN location ILIKE '%los angeles%' OR location ILIKE '%LA%' THEN 'Maho'
  WHEN location ILIKE '%malibu%' THEN 'Grand Case'
  ELSE location
END
WHERE location ILIKE '%seattle%' OR location ILIKE '%los angeles%' OR location ILIKE '%malibu%';

-- Set Sint Maarten coordinates for properties that have null coordinates
UPDATE properties
SET latitude = 18.0425, longitude = -63.0548
WHERE latitude IS NULL AND longitude IS NULL;
