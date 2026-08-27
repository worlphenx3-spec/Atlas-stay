import { useState, useEffect } from 'react';
import {
  Edit3, Save, X, Bed, Bath, Users, DollarSign, Loader2, Plus, Trash2,
  Sparkles, MapPin, Globe, Mail, Phone, Calendar, Server, Calculator,
  Home, ExternalLink, Eye, Palette, Layout, Check,
} from 'lucide-react';
import { apiGet, apiPatch, apiPost, apiDelete } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Property, ImportedListing, OnboardingTier, IslandRegion, WebsiteTemplate } from '@/lib/types';
import { ISLAND_PRESETS, ISLAND_LIST, TEMPLATE_PRESETS } from '@/lib/types';
import { formatCurrency, calcPricing } from '@/lib/utils';
import ImportListingModal from '@/components/ImportListingModal';
import MapView from '@/components/MapView';

interface PropertyEditForm {
  title: string;
  description: string;
  location: string;
  base_rate: number;
  cleaning_fee: number;
  occupancy_tax_rate: number;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  active: boolean;
  amenities: string;
  latitude: string;
  longitude: string;
  image_url: string;
  onboarding_tier: OnboardingTier;
  external_listing_url: string;
  contact_email: string;
  contact_whatsapp: string;
  ical_feed_url: string;
  custom_domain: string;
  site_slug: string;
  region: IslandRegion;
  template: WebsiteTemplate;
  tagline: string;
  hero_image: string;
  primary_color: string;
}

const DEFAULT_FORM: PropertyEditForm = {
  title: '', description: '', location: '', base_rate: 150, cleaning_fee: 75,
  occupancy_tax_rate: 0.05, bedrooms: 1, bathrooms: 1, max_guests: 2, active: true,
  amenities: '', latitude: '', longitude: '', image_url: '',
  onboarding_tier: 'native', external_listing_url: '', contact_email: '',
  contact_whatsapp: '', ical_feed_url: '', custom_domain: '', site_slug: '',
  region: 'sint_maarten', template: 'tropical', tagline: '', hero_image: '', primary_color: '#10b981',
};

const TIER_LABELS: Record<OnboardingTier, string> = {
  independent: 'Tier 1: Independent Host',
  ical_sync: 'Tier 2: Airbnb / iCal Sync',
  native: 'Tier 3: Native Atlas Ecosystem',
};

interface PropertyManagementProps {
  onPreviewSite?: (siteId: string) => void;
  websiteMode?: boolean;
  initialView?: 'websites' | 'properties';
}

export default function PropertyManagement({ onPreviewSite, websiteMode, initialView = 'properties' }: PropertyManagementProps) {
  const { org } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<PropertyEditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [showMapBuilder, setShowMapBuilder] = useState<string | null>(null);
  const [view, setView] = useState<'websites' | 'properties'>(initialView);

  const orgRegion = org?.region || 'sint_maarten';

  useEffect(() => { loadProperties(); }, []);

  function loadProperties() {
    setLoading(true);
    apiGet<Property[]>('/host/properties')
      .then(setProperties)
      .catch(() => {
        apiGet<Property[]>('/properties').then(setProperties).catch(() => setProperties([]));
      })
      .finally(() => setLoading(false));
  }

  function startEdit(p: Property) {
    setEditing(p.id);
    const config = (p.website_config || {}) as Record<string, unknown>;
    setForm({
      title: p.title, description: p.description, location: p.location,
      base_rate: p.base_rate, cleaning_fee: p.cleaning_fee,
      occupancy_tax_rate: p.occupancy_tax_rate,
      bedrooms: p.bedrooms, bathrooms: p.bathrooms, max_guests: p.max_guests,
      active: p.active, amenities: p.amenities.join(', '),
      latitude: p.latitude?.toString() || '', longitude: p.longitude?.toString() || '',
      image_url: p.image_url,
      onboarding_tier: p.onboarding_tier || 'native',
      external_listing_url: p.external_listing_url || '',
      contact_email: p.contact_email || '',
      contact_whatsapp: p.contact_whatsapp || '',
      ical_feed_url: p.ical_feed_url || '',
      custom_domain: p.custom_domain || '',
      site_slug: p.site_slug || '',
      region: p.region || orgRegion,
      template: (config.template as WebsiteTemplate) || 'tropical',
      tagline: (config.tagline as string) || '',
      hero_image: (config.heroImage as string) || '',
      primary_color: (config.primaryColor as string) || org?.brand_color || '#10b981',
    });
  }

  function saveEdit(id: string) {
    if (!form) return;
    setSaving(true);
    const websiteConfig = {
      template: form.template,
      tagline: form.tagline,
      heroImage: form.hero_image || form.image_url,
      primaryColor: form.primary_color,
    };
    const payload: Record<string, unknown> = {
      title: form.title, description: form.description, location: form.location,
      base_rate: Number(form.base_rate), cleaning_fee: Number(form.cleaning_fee),
      occupancy_tax_rate: Number(form.occupancy_tax_rate),
      bedrooms: Number(form.bedrooms), bathrooms: Number(form.bathrooms),
      max_guests: Number(form.max_guests), active: form.active,
      amenities: form.amenities.split(',').map((s) => s.trim()).filter(Boolean),
      image_url: form.image_url,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      onboarding_tier: form.onboarding_tier,
      external_listing_url: form.external_listing_url || null,
      contact_email: form.contact_email || null,
      contact_whatsapp: form.contact_whatsapp || null,
      ical_feed_url: form.ical_feed_url || null,
      custom_domain: form.custom_domain || null,
      site_slug: form.site_slug || null,
      region: form.region,
      website_config: websiteConfig,
    };
    apiPatch<Property>(`/properties/${id}`, payload)
      .then(() => { setEditing(null); setForm(null); loadProperties(); })
      .catch((err) => alert(err.message))
      .finally(() => setSaving(false));
  }

  function deleteProperty(id: string) {
    if (!confirm('Delete this property? All its reservations and cleaning tasks will also be removed.')) return;
    apiDelete(`/properties/${id}`)
      .then(() => loadProperties())
      .catch((err) => alert(err.message));
  }

  function handleImport(listing: ImportedListing) {
    setSaving(true);
    apiPost<Property>('/properties', {
      title: listing.title, location: listing.location, description: listing.description,
      bedrooms: listing.bedrooms, bathrooms: listing.bathrooms, max_guests: listing.max_guests,
      base_rate: listing.base_rate, cleaning_fee: listing.cleaning_fee,
      occupancy_tax_rate: listing.occupancy_tax_rate,
      image_url: listing.image_url, gallery_urls: listing.gallery_urls,
      amenities: listing.amenities, active: true,
      onboarding_tier: 'ical_sync', region: orgRegion,
    })
      .then(() => { setShowImport(false); loadProperties(); })
      .catch((err) => alert(err.message))
      .finally(() => setSaving(false));
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>;
  }

  // Website card view (first tab)
  if (view === 'websites') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-display text-xl text-white">My Websites & Domains</h2>
            <p className="text-sm text-white/40">Create, customize, and preview your property websites</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView('properties')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors border border-white/10"
            >
              <Building2 className="w-4 h-4" /> Property Details
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Create Website
            </button>
          </div>
        </div>

        {properties.length === 0 ? (
          <div className="text-center py-20 rounded-2xl bg-[#14151c] border border-white/5">
            <Globe className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 mb-2">No websites yet.</p>
            <p className="text-sm text-white/30 mb-4">Create your first property website to get started.</p>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Create Website
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {properties.map((p) => {
              const config = (p.website_config || {}) as Record<string, unknown>;
              const template = (config.template as WebsiteTemplate) || 'tropical';
              const tplPreset = TEMPLATE_PRESETS[template];
              const island = ISLAND_PRESETS[p.region || orgRegion] || ISLAND_PRESETS.sint_maarten;
              return (
                <div key={p.id} className="rounded-2xl bg-[#14151c] border border-white/5 overflow-hidden">
                  <div className="aspect-[16/9] bg-[#1e1f28] overflow-hidden relative">
                    <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <div className="px-2 py-0.5 rounded-md text-xs font-medium" style={{ backgroundColor: tplPreset?.preview, color: 'white' }}>
                        {tplPreset?.label || 'Tropical'}
                      </div>
                      <div className="px-2 py-0.5 rounded-md text-xs font-medium bg-black/60 text-white/80 backdrop-blur-sm">
                        {island.shortLabel}
                      </div>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-white">{p.title}</h3>
                      <p className="text-sm text-white/40 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {p.location} · {island.label}
                      </p>
                    </div>

                    {/* Domain info */}
                    <div className="rounded-lg bg-[#1e1f28] border border-white/5 p-3 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        <Globe className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-white/50">Atlas subdomain:</span>
                        <span className="text-white/70 font-mono">{p.site_slug || p.id}.atlasstay.com</span>
                      </div>
                      {p.custom_domain && (
                        <div className="flex items-center gap-2 text-xs">
                          <Server className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-white/50">Custom domain:</span>
                          <span className="text-emerald-300 font-mono">{p.custom_domain}</span>
                        </div>
                      )}
                      {p.onboarding_tier === 'independent' && p.external_listing_url && (
                        <div className="flex items-center gap-2 text-xs">
                          <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-white/50">Redirects to:</span>
                          <span className="text-blue-400 truncate">{p.external_listing_url}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => onPreviewSite?.(p.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300 text-sm font-medium transition-colors"
                      >
                        <Eye className="w-4 h-4" /> Preview Site
                      </button>
                      <button
                        onClick={() => startEdit(p)}
                        className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteProperty(p.id)}
                        className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showAdd && <AddPropertyModal orgRegion={orgRegion} onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); loadProperties(); }} />}
        {editing && form && <EditPropertyModal form={form} setForm={setForm} saving={saving} onSave={() => saveEdit(editing)} onCancel={() => { setEditing(null); setForm(null); }} onShowMap={() => setShowMapBuilder(editing)} />}
        {showMapBuilder && form && (
          <MapBuilderModal
            form={form}
            setForm={setForm}
            onClose={() => setShowMapBuilder(null)}
          />
        )}
      </div>
    );
  }

  // Property details view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-display text-xl text-white">Properties & Rates</h2>
          <p className="text-sm text-white/40">{properties.length} propert{properties.length !== 1 ? 'ies' : 'y'}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {websiteMode && (
            <button
              onClick={() => setView('websites')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors border border-white/10"
            >
              <Globe className="w-4 h-4" /> Websites View
            </button>
          )}
          <button
            onClick={() => setShowCalc(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors border border-white/10"
          >
            <Calculator className="w-4 h-4 text-amber-400" /> Rate Calculator
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors border border-white/10"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" /> Import from Airbnb
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Property
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {properties.map((p) => {
          const isEditing = editing === p.id;
          const island = ISLAND_PRESETS[p.region || orgRegion] || ISLAND_PRESETS.sint_maarten;
          return (
            <div key={p.id} className="rounded-2xl bg-[#14151c] border border-white/5 overflow-hidden">
              <div className="aspect-[16/9] bg-[#1e1f28] overflow-hidden relative">
                <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                <div className="absolute top-3 left-3 flex gap-2">
                  <div className={`px-2 py-0.5 rounded-md text-xs font-medium ${p.active ? 'bg-emerald-500/80 text-white' : 'bg-red-500/80 text-white'}`}>
                    {p.active ? 'Active' : 'Inactive'}
                  </div>
                  <div className="px-2 py-0.5 rounded-md text-xs font-medium bg-black/60 text-white/80 backdrop-blur-sm">
                    {p.onboarding_tier === 'independent' ? 'Tier 1' : p.onboarding_tier === 'ical_sync' ? 'Tier 2' : 'Tier 3'}
                  </div>
                  <div className="px-2 py-0.5 rounded-md text-xs font-medium bg-black/60 text-white/80 backdrop-blur-sm">
                    {island.shortLabel}
                  </div>
                </div>
              </div>

              <div className="p-4">
                {isEditing && form ? (
                  <EditFormFields form={form} setForm={setForm} saving={saving} onSave={() => saveEdit(p.id)} onCancel={() => { setEditing(null); setForm(null); }} onShowMap={() => setShowMapBuilder(p.id)} />
                ) : (
                  <>
                    <h3 className="font-semibold text-white mb-1">{p.title}</h3>
                    <p className="text-sm text-white/40 mb-2 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {p.location}
                    </p>
                    <p className="text-xs text-white/30 mb-3">{TIER_LABELS[p.onboarding_tier || 'native']}</p>
                    <div className="flex items-center gap-4 text-sm text-white/60 mb-3">
                      <span className="flex items-center gap-1"><Bed className="w-4 h-4" />{p.bedrooms}</span>
                      <span className="flex items-center gap-1"><Bath className="w-4 h-4" />{p.bathrooms}</span>
                      <span className="flex items-center gap-1"><Users className="w-4 h-4" />{p.max_guests}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-white/60 flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                        {formatCurrency(p.base_rate)}/night
                      </span>
                      <span className="text-white/40">Cleaning: {formatCurrency(p.cleaning_fee)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/30 mb-3">
                      <span>Tax: {(p.occupancy_tax_rate * 100).toFixed(1)}%</span>
                      <span>{p.amenities.length} amenities</span>
                    </div>

                    {onPreviewSite && (
                      <button
                        onClick={() => onPreviewSite(p.id)}
                        className="w-full mb-2 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300 text-sm font-medium transition-colors"
                      >
                        <Eye className="w-4 h-4" /> Preview Website
                      </button>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(p)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm transition-colors"
                      >
                        <Edit3 className="w-4 h-4" /> Edit
                      </button>
                      <button
                        onClick={() => deleteProperty(p.id)}
                        className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && <AddPropertyModal orgRegion={orgRegion} onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); loadProperties(); }} />}
      {showImport && <ImportListingModal onClose={() => setShowImport(false)} onImported={handleImport} />}
      {showCalc && <RateCalculatorModal properties={properties} onClose={() => setShowCalc(false)} />}
      {showMapBuilder && form && (
        <MapBuilderModal form={form} setForm={setForm} onClose={() => setShowMapBuilder(null)} />
      )}
    </div>
  );
}

function EditFormFields({ form, setForm, saving, onSave, onCancel, onShowMap }: {
  form: PropertyEditForm;
  setForm: (f: PropertyEditForm) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  onShowMap: () => void;
}) {
  return (
    <div className="space-y-3">
      <Input label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
      <Input label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
      <div>
        <label className="text-xs text-white/40 mb-1 block">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          className="w-full bg-[#1e1f28] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
        />
      </div>
      <Input label="Image URL" value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} />

      {/* Website template */}
      <div>
        <label className="text-xs text-white/40 mb-1.5 block flex items-center gap-1.5">
          <Layout className="w-3.5 h-3.5" /> Website Template
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(TEMPLATE_PRESETS) as [WebsiteTemplate, { label: string; description: string; preview: string }][]).map(([tpl, info]) => (
            <button
              key={tpl}
              onClick={() => setForm({ ...form, template: tpl })}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-colors border ${
                form.template === tpl
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-[#1e1f28] border-white/10 text-white/50 hover:text-white/80'
              }`}
            >
              <div className="w-4 h-4 rounded shrink-0" style={{ backgroundColor: info.preview }} />
              <span className="truncate">{info.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Brand color */}
      <div>
        <label className="text-xs text-white/40 mb-1.5 block flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5" /> Website Accent Color
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={form.primary_color}
            onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
            className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
          />
          <input
            type="text"
            value={form.primary_color}
            onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
            className="bg-[#1e1f28] border border-white/10 rounded-lg px-3 py-2 text-white text-sm w-28"
          />
        </div>
      </div>

      <Input label="Tagline (hero subtitle)" value={form.tagline} onChange={(v) => setForm({ ...form, tagline: v })} />

      {/* Region selector */}
      <div>
        <label className="text-xs text-white/40 mb-1.5 block">Island Region</label>
        <select
          value={form.region}
          onChange={(e) => setForm({ ...form, region: e.target.value as IslandRegion })}
          className="w-full bg-[#1e1f28] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          {ISLAND_LIST.map((isl) => (
            <option key={isl.id} value={isl.id}>{isl.label}</option>
          ))}
        </select>
      </div>

      {/* Tier selector */}
      <div>
        <label className="text-xs text-white/40 mb-1.5 block">Onboarding Tier</label>
        <div className="space-y-1.5">
          {(['independent', 'ical_sync', 'native'] as OnboardingTier[]).map((tier) => {
            const Icon = tier === 'independent' ? Home : tier === 'ical_sync' ? Calendar : Server;
            return (
              <button
                key={tier}
                onClick={() => setForm({ ...form, onboarding_tier: tier })}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors border ${
                  form.onboarding_tier === tier
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-[#1e1f28] border-white/10 text-white/50 hover:text-white/80'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{TIER_LABELS[tier]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tier-specific fields */}
      {form.onboarding_tier === 'independent' && (
        <div className="space-y-3 rounded-lg bg-[#0f1016] border border-white/5 p-3">
          <p className="text-xs text-white/40">Guests are redirected to your external site.</p>
          <Input label="External Website URL" value={form.external_listing_url} onChange={(v) => setForm({ ...form, external_listing_url: v })} />
          <Input label="Contact Email" value={form.contact_email} onChange={(v) => setForm({ ...form, contact_email: v })} />
          <Input label="WhatsApp Number" value={form.contact_whatsapp} onChange={(v) => setForm({ ...form, contact_whatsapp: v })} />
        </div>
      )}

      {form.onboarding_tier === 'ical_sync' && (
        <div className="space-y-3 rounded-lg bg-[#0f1016] border border-white/5 p-3">
          <p className="text-xs text-white/40">Sync availability from Airbnb or an iCal feed.</p>
          <Input label="Airbnb Listing URL or iCal Feed URL" value={form.ical_feed_url} onChange={(v) => setForm({ ...form, ical_feed_url: v })} />
        </div>
      )}

      {form.onboarding_tier === 'native' && (
        <div className="space-y-3 rounded-lg bg-[#0f1016] border border-white/5 p-3">
          <p className="text-xs text-white/40">Full Atlas engine with native checkout and custom domain.</p>
          <Input label="Site Slug (for atlasstay.com subdomain)" value={form.site_slug} onChange={(v) => setForm({ ...form, site_slug: v })} />
          <Input label="Custom Domain (optional)" value={form.custom_domain} onChange={(v) => setForm({ ...form, custom_domain: v })} />
          <div className="rounded-lg bg-[#1e1f28] border border-white/5 px-3 py-2.5">
            <p className="text-xs text-white/40 mb-1">DNS Setup (1-line CNAME):</p>
            <div className="flex items-center gap-2 text-xs font-mono text-white/60">
              <span className="text-emerald-400">Host:</span> www
              <span className="text-white/20">|</span>
              <span className="text-emerald-400">Points to:</span> cname.atlasstay.com
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input label="Base rate ($)" type="number" value={String(form.base_rate)} onChange={(v) => setForm({ ...form, base_rate: Number(v) })} />
        <Input label="Cleaning fee ($)" type="number" value={String(form.cleaning_fee)} onChange={(v) => setForm({ ...form, cleaning_fee: Number(v) })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Tax rate (e.g. 0.05)" type="number" value={String(form.occupancy_tax_rate)} onChange={(v) => setForm({ ...form, occupancy_tax_rate: Number(v) })} />
        <Input label="Max guests" type="number" value={String(form.max_guests)} onChange={(v) => setForm({ ...form, max_guests: Number(v) })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Beds" type="number" value={String(form.bedrooms)} onChange={(v) => setForm({ ...form, bedrooms: Number(v) })} />
        <Input label="Baths" type="number" value={String(form.bathrooms)} onChange={(v) => setForm({ ...form, bathrooms: Number(v) })} />
      </div>
      <div>
        <label className="text-xs text-white/40 mb-1 block">Amenities (comma-separated)</label>
        <input
          type="text"
          value={form.amenities}
          onChange={(e) => setForm({ ...form, amenities: e.target.value })}
          placeholder="Wifi, Kitchen, AC, Pool"
          className="w-full bg-[#1e1f28] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </div>

      {/* Map pin builder */}
      <button
        onClick={onShowMap}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20 text-sky-300 text-sm font-medium transition-colors"
      >
        <MapPin className="w-4 h-4" /> Set Pin Location on Map
      </button>
      {form.latitude && form.longitude && (
        <p className="text-xs text-white/30 text-center">Pin set at {form.latitude}, {form.longitude}</p>
      )}

      <label className="flex items-center gap-2 text-sm text-white/60">
        <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-emerald-500" />
        Active (visible to guests)
      </label>
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function EditPropertyModal({ form, setForm, saving, onSave, onCancel, onShowMap }: {
  form: PropertyEditForm;
  setForm: (f: PropertyEditForm) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  onShowMap: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-lg bg-[#14151c] border border-white/10 rounded-2xl p-6 fade-in-up max-h-[90vh] overflow-y-auto">
        <h3 className="font-display text-xl text-white mb-4">Edit Property & Website</h3>
        <EditFormFields form={form} setForm={setForm} saving={saving} onSave={onSave} onCancel={onCancel} onShowMap={onShowMap} />
      </div>
    </div>
  );
}

function MapBuilderModal({ form, setForm, onClose }: {
  form: PropertyEditForm;
  setForm: (f: PropertyEditForm) => void;
  onClose: () => void;
}) {
  const preset = ISLAND_PRESETS[form.region] || ISLAND_PRESETS.sint_maarten;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-[#14151c] border border-white/10 rounded-2xl p-6 fade-in-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-xl text-white">Pin Location Builder</h3>
            <p className="text-sm text-white/40">{preset.label} — Click the map to drop your pin</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white/60">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Region selector inside map builder */}
        <div className="mb-4">
          <select
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value as IslandRegion })}
            className="bg-[#1e1f28] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            {ISLAND_LIST.map((isl) => (
              <option key={isl.id} value={isl.id}>{isl.label}</option>
            ))}
          </select>
        </div>

        <div className="h-[400px] rounded-xl overflow-hidden border border-white/5 mb-4">
          <MapView
            properties={[]}
            highlightedId={null}
            hostPinBuilder
            region={form.region}
            onPinPlace={(lat, lng) => {
              setForm({ ...form, latitude: lat.toFixed(6), longitude: lng.toFixed(6) });
            }}
          />
        </div>

        {form.latitude && form.longitude ? (
          <div className="flex items-center gap-2 text-sm text-emerald-300 mb-4">
            <Check className="w-4 h-4" />
            Pin set at {form.latitude}, {form.longitude}
          </div>
        ) : (
          <p className="text-sm text-white/40 mb-4">Click on the map to place your property pin.</p>
        )}

        <button
          onClick={onClose}
          disabled={!form.latitude}
          className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-medium transition-colors disabled:opacity-50"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs text-white/40 mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#1e1f28] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      />
    </div>
  );
}

function AddPropertyModal({ orgRegion, onClose, onCreated }: { orgRegion: IslandRegion; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<PropertyEditForm>({ ...DEFAULT_FORM, region: orgRegion });
  const [saving, setSaving] = useState(false);
  const [showMap, setShowMap] = useState(false);

  function save() {
    if (!form.title || !form.location) return;
    setSaving(true);
    const websiteConfig = {
      template: form.template,
      tagline: form.tagline,
      heroImage: form.hero_image || form.image_url,
      primaryColor: form.primary_color,
    };
    apiPost<Property>('/properties', {
      title: form.title, location: form.location, description: form.description,
      base_rate: Number(form.base_rate), cleaning_fee: Number(form.cleaning_fee),
      occupancy_tax_rate: Number(form.occupancy_tax_rate),
      bedrooms: Number(form.bedrooms), bathrooms: Number(form.bathrooms),
      max_guests: Number(form.max_guests), active: form.active,
      amenities: form.amenities.split(',').map((s) => s.trim()).filter(Boolean),
      image_url: form.image_url || 'https://images.pexels.com/photos/6585598/pexels-photo-6585598.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      onboarding_tier: form.onboarding_tier,
      external_listing_url: form.external_listing_url || null,
      contact_email: form.contact_email || null,
      contact_whatsapp: form.contact_whatsapp || null,
      ical_feed_url: form.ical_feed_url || null,
      custom_domain: form.custom_domain || null,
      site_slug: form.site_slug || null,
      region: form.region,
      website_config: websiteConfig,
    })
      .then(onCreated)
      .catch((err) => alert(err.message))
      .finally(() => setSaving(false));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#14151c] border border-white/10 rounded-2xl p-6 fade-in-up max-h-[90vh] overflow-y-auto">
        <h3 className="font-display text-xl text-white mb-4">Create New Website</h3>
        <EditFormFields
          form={form}
          setForm={setForm}
          saving={saving}
          onSave={save}
          onCancel={onClose}
          onShowMap={() => setShowMap(true)}
        />
        {showMap && (
          <MapBuilderModal form={form} setForm={setForm} onClose={() => setShowMap(false)} />
        )}
      </div>
    </div>
  );
}

function RateCalculatorModal({ properties, onClose }: { properties: Property[]; onClose: () => void }) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '');
  const [nights, setNights] = useState('7');
  const [baseRate, setBaseRate] = useState(String(properties[0]?.base_rate || 150));
  const [cleaningFee, setCleaningFee] = useState(String(properties[0]?.cleaning_fee || 75));
  const [taxRate, setTaxRate] = useState(String((properties[0]?.occupancy_tax_rate || 0.05) * 100));

  const selectedProp = properties.find((p) => p.id === propertyId);
  const n = parseInt(nights) || 0;
  const rate = Number(baseRate) || 0;
  const cleaning = Number(cleaningFee) || 0;
  const taxPct = Number(taxRate) || 0;
  const pricing = n > 0 ? calcPricing(rate, cleaning, taxPct / 100, n) : null;

  function selectProperty(id: string) {
    setPropertyId(id);
    const p = properties.find((x) => x.id === id);
    if (p) {
      setBaseRate(String(p.base_rate));
      setCleaningFee(String(p.cleaning_fee));
      setTaxRate(String(p.occupancy_tax_rate * 100));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#14151c] border border-white/10 rounded-2xl p-6 fade-in-up">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-amber-400" />
          <h3 className="font-display text-xl text-white">Rate & Tax Calculator</h3>
        </div>
        <div className="space-y-3">
          {properties.length > 0 && (
            <div>
              <label className="text-xs text-white/40 mb-1 block">Property</label>
              <select
                value={propertyId}
                onChange={(e) => selectProperty(e.target.value)}
                className="w-full bg-[#1e1f28] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Base nightly rate ($)" type="number" value={baseRate} onChange={setBaseRate} />
            <Input label="Nights" type="number" value={nights} onChange={setNights} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Cleaning fee ($)" type="number" value={cleaningFee} onChange={setCleaningFee} />
            <Input label="Tax rate (%)" type="number" value={taxRate} onChange={setTaxRate} />
          </div>
        </div>
        {pricing && n > 0 && (
          <div className="mt-5 rounded-xl bg-[#1e1f28] border border-white/5 p-4 space-y-2 text-sm fade-in-up">
            <CalcRow label={`${formatCurrency(rate)} × ${n} night${n > 1 ? 's' : ''}`} value={formatCurrency(pricing.baseTotal)} />
            <CalcRow label="Cleaning fee" value={formatCurrency(pricing.cleaningFee)} />
            <CalcRow label="Subtotal" value={formatCurrency(pricing.baseTotal + pricing.cleaningFee)} />
            <CalcRow label={`TOT tax (${taxPct}%)`} value={formatCurrency(pricing.taxTotal)} />
            <div className="border-t border-white/10 pt-2 mt-2">
              <CalcRow label="Grand total (guest pays)" value={formatCurrency(pricing.grandTotal)} bold />
              <CalcRow label="Net host payout (excl. tax)" value={formatCurrency(pricing.baseTotal + pricing.cleaningFee)} color="text-emerald-400" />
              <CalcRow label="TOT to set aside" value={formatCurrency(pricing.taxTotal)} color="text-amber-400" />
            </div>
          </div>
        )}
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}

function CalcRow({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className={bold ? 'text-white font-semibold' : 'text-white/50'}>{label}</span>
      <span className={`${bold ? 'text-white font-bold' : color || 'text-white/80'} font-semibold`}>{value}</span>
    </div>
  );
}
