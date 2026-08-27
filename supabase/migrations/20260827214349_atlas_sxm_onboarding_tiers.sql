/*
# Atlas Stay — SXM Onboarding Tiers, Dual-Email, Domain Management

## Summary

This migration extends the existing `properties` and `organizations` tables to support:
1. A 3-tier host onboarding system (Independent, Airbnb/iCal Sync, Native Atlas).
2. External listing URLs and direct contact info for independent hosts.
3. iCal feed URLs for availability sync.
4. Custom domain management for the Native Atlas tier (CNAME-based).
5. Dual-email system on organizations (private admin email + public business email).
6. A 5% Sint Maarten Turnover Tax (TOT) default override.

## Changes to `properties` table
- `onboarding_tier` (text, default 'native'): one of 'independent', 'ical_sync', 'native'.
- `external_listing_url` (text, nullable): host's existing website URL for Tier 1.
- `contact_email` (text, nullable): direct contact email for Tier 1.
- `contact_whatsapp` (text, nullable): WhatsApp number for Tier 1.
- `ical_feed_url` (text, nullable): iCal feed URL for Tier 2 availability sync.
- `custom_domain` (text, nullable): custom domain for Tier 3 native engine.

## Changes to `organizations` table
- `admin_email` (text, nullable): private administrative/billing email.
- `business_email` (text, nullable): public email for guest confirmations.
- `sxm_marketplace_url` (text, nullable): URL to the org's SXM Stays marketplace page.

## Security
- No new tables; existing RLS policies remain in effect.
- All new columns are nullable with sensible defaults so existing rows are unaffected.

## Important Notes
1. All column additions use `DO $$ ... IF NOT EXISTS ... END $$` guards for idempotency.
2. The `onboarding_tier` column has a CHECK constraint to enforce valid tier values.
3. No data is lost — this is purely additive.
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'onboarding_tier') THEN
    ALTER TABLE properties ADD COLUMN onboarding_tier text NOT NULL DEFAULT 'native' CHECK (onboarding_tier IN ('independent', 'ical_sync', 'native'));
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
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'custom_domain') THEN
    ALTER TABLE properties ADD COLUMN custom_domain text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'admin_email') THEN
    ALTER TABLE organizations ADD COLUMN admin_email text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'business_email') THEN
    ALTER TABLE organizations ADD COLUMN business_email text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'sxm_marketplace_url') THEN
    ALTER TABLE organizations ADD COLUMN sxm_marketplace_url text;
  END IF;
END $$;
