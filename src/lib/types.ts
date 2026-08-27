export type IslandRegion =
  | 'sint_maarten'
  | 'aruba'
  | 'curacao'
  | 'bonaire'
  | 'saba'
  | 'statia';

export interface IslandPreset {
  id: IslandRegion;
  label: string;
  shortLabel: string;
  center: [number, number];
  zoom: number;
  areas: string[];
  taxRate: number;
  currency: 'USD' | 'XCG' | 'AWG' | 'ANG';
}

export const ISLAND_PRESETS: Record<IslandRegion, IslandPreset> = {
  sint_maarten: {
    id: 'sint_maarten',
    label: 'Sint Maarten / Saint-Martin',
    shortLabel: 'SXM',
    center: [18.0425, -63.0548],
    zoom: 12,
    areas: ['Simpson Bay', 'Maho', 'Grand Case', 'Orient Bay', 'Marigot', 'Philipsburg', 'Cupecoy', 'Dawn Beach', 'Pelican Key', 'Sandy Ground'],
    taxRate: 0.05,
    currency: 'XCG',
  },
  aruba: {
    id: 'aruba',
    label: 'Aruba',
    shortLabel: 'AW',
    center: [12.5211, -69.9683],
    zoom: 11,
    areas: ['Palm Beach', 'Eagle Beach', 'Oranjestad', 'Noord', 'San Nicolas', 'Savaneta', 'Malmok'],
    taxRate: 0.09,
    currency: 'AWG',
  },
  curacao: {
    id: 'curacao',
    label: 'Curaçao',
    shortLabel: 'CW',
    center: [12.1696, -68.9900],
    zoom: 11,
    areas: ['Willemstad', 'Jan Thiel', 'Piscadera', 'Westpunt', 'Mambo Beach', 'Jan Sofat', 'Zegelrijk'],
    taxRate: 0.07,
    currency: 'ANG',
  },
  bonaire: {
    id: 'bonaire',
    label: 'Bonaire',
    shortLabel: 'BQ',
    center: [12.1443, -68.2655],
    zoom: 11,
    areas: ['Kralendijk', 'Belnem', 'Hato', 'Sabadeco', 'North Salina', 'Playa Pariba'],
    taxRate: 0.06,
    currency: 'USD',
  },
  saba: {
    id: 'saba',
    label: 'Saba',
    shortLabel: 'SA',
    center: [17.6355, -63.2327],
    zoom: 13,
    areas: ['The Bottom', 'Windwardside', "Zion's Hill", 'St. Johns', "Hell's Gate"],
    taxRate: 0.06,
    currency: 'USD',
  },
  statia: {
    id: 'statia',
    label: 'St. Eustatius (Statia)',
    shortLabel: 'ST',
    center: [17.4890, -62.9722],
    zoom: 13,
    areas: ['Oranjestad', 'Concordia', 'Zeelandia', "Gordon's"],
    taxRate: 0.06,
    currency: 'USD',
  },
};

export const ISLAND_LIST = Object.values(ISLAND_PRESETS);

export interface Organization {
  id: string;
  business_name: string;
  logo_url: string | null;
  brand_color: string;
  slug: string | null;
  currency: 'USD' | 'XCG' | 'AWG' | 'ANG';
  tot_tax_rate: number;
  admin_email: string | null;
  business_email: string | null;
  sxm_marketplace_url: string | null;
  region: IslandRegion;
  website_template: string;
  website_config: Record<string, unknown> | null;
  created_at: string;
}

export interface Property {
  id: string;
  org_id: string;
  title: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  exact_lat?: number | null;
  exact_lng?: number | null;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  base_rate: number;
  cleaning_fee: number;
  occupancy_tax_rate: number;
  image_url: string;
  gallery_urls: string[];
  amenities: string[];
  active: boolean;
  onboarding_tier: OnboardingTier;
  external_listing_url: string | null;
  contact_email: string | null;
  contact_whatsapp: string | null;
  ical_feed_url: string | null;
  custom_domain: string | null;
  site_slug: string | null;
  region: IslandRegion;
  website_config: Record<string, unknown> | null;
  created_at: string;
}

export type OnboardingTier = 'independent' | 'ical_sync' | 'native';

export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CANCELLED';

export interface Reservation {
  id: string;
  org_id: string;
  property_id: string;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  guests: number;
  nights: number;
  base_total: number;
  cleaning_fee: number;
  tax_total: number;
  grand_total: number;
  status: ReservationStatus;
  created_at: string;
  property?: { title: string; image_url: string };
}

export interface CleaningStaff {
  id: string;
  org_id: string;
  user_id: string | null;
  name: string;
  phone: string;
  active: boolean;
  created_at: string;
}

export type CleaningStatus = 'DIRTY' | 'NEEDS_INSPECTION' | 'CLEAN';

export interface CleaningTask {
  id: string;
  org_id: string;
  property_id: string;
  staff_id: string | null;
  status: CleaningStatus;
  notes: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  property?: { title: string; image_url?: string; location?: string };
  staff?: { name: string } | null;
}

export interface BookedRange {
  check_in: string;
  check_out: string;
}

export interface BookingResult {
  id: string;
  org_id: string;
  nights: number;
  base_total: number;
  cleaning_fee: number;
  tax_total: number;
  grand_total: number;
  status: string;
}

export type LedgerCategory =
  | 'RENT_INCOME' | 'CLEANING_INCOME' | 'TAX_COLLECTED'
  | 'RENT_EXPENSE' | 'CLEANING_EXPENSE' | 'UTILITIES'
  | 'MAINTENANCE' | 'AMENITIES' | 'PLATFORM_FEES' | 'OTHER';

export type LedgerType = 'INCOME' | 'EXPENSE';

export interface LedgerEntry {
  id: string;
  org_id: string;
  property_id: string | null;
  reservation_id: string | null;
  category: LedgerCategory;
  type: LedgerType;
  amount: number;
  currency: 'USD' | 'XCG' | 'AWG' | 'ANG';
  description: string;
  entry_date: string;
  synced: boolean;
  created_at: string;
  property?: { title: string };
}

export interface ImportedListing {
  title: string;
  description: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  base_rate: number;
  cleaning_fee: number;
  occupancy_tax_rate: number;
  image_url: string;
  gallery_urls: string[];
  amenities: string[];
  source: string;
  source_listing_id: string;
  imported: boolean;
}

export interface FinanceSyncResult {
  synced: number;
  summary: {
    gross_revenue: number;
    total_expenses: number;
    net_income: number;
    projected_tot: number;
    tot_rate: number;
    business_name: string;
  };
  message: string;
}

export interface VendorProfile {
  user_id: string;
  role: 'staff';
  org_id: string;
  staff_id: string | null;
  name: string;
  email: string;
}

export type WebsiteTemplate = 'tropical' | 'minimal' | 'boutique' | 'luxury' | 'family';

export interface WebsiteTemplateConfig {
  template: WebsiteTemplate;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  heroImage: string;
  tagline: string;
  sections: string[];
}

export const TEMPLATE_PRESETS: Record<WebsiteTemplate, { label: string; description: string; preview: string }> = {
  tropical: {
    label: 'Tropical Paradise',
    description: 'Vibrant greens and warm sands — perfect for beachfront properties.',
    preview: '#10b981',
  },
  minimal: {
    label: 'Minimal Studio',
    description: 'Clean lines, neutral tones, and lots of white space.',
    preview: '#64748b',
  },
  boutique: {
    label: 'Boutique Charm',
    description: 'Elegant typography with warm accent colors.',
    preview: '#f59e0b',
  },
  luxury: {
    label: 'Luxury Estate',
    description: 'Dark theme with gold accents for high-end properties.',
    preview: '#1a1b26',
  },
  family: {
    label: 'Family Getaway',
    description: 'Bright blues and friendly, approachable design.',
    preview: '#3b82f6',
  },
};
