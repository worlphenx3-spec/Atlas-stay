import { useState } from 'react';
import {
  X, Home, Calendar, Server, ArrowRight, ArrowLeft, Check, Loader2,
  Globe, Mail, Phone, Link, MapPin, Plus, Zap,
} from 'lucide-react';
import { apiPost } from '@/lib/supabase';
import type { OnboardingTier, IslandRegion } from '@/lib/types';
import { ISLAND_LIST, ISLAND_PRESETS } from '@/lib/types';

interface WebsiteCreatorWizardProps {
  onClose: () => void;
  onCreated: () => void;
}

type Step = 'tier-select' | 'tier-details' | 'property-details' | 'done';

export default function WebsiteCreatorWizard({ onClose, onCreated }: WebsiteCreatorWizardProps) {
  const [step, setStep] = useState<Step>('tier-select');
  const [tier, setTier] = useState<OnboardingTier | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [region, setRegion] = useState<IslandRegion>('sint_maarten');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [icalUrl, setIcalUrl] = useState('');
  const [siteSlug, setSiteSlug] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [baseRate, setBaseRate] = useState('150');

  const island = ISLAND_PRESETS[region];

  function selectTier(t: OnboardingTier) {
    setTier(t);
    setStep('tier-details');
  }

  function proceedToPropertyDetails() {
    setStep('property-details');
  }

  function createSite() {
    if (!title || !location) {
      setError('Property title and location are required');
      return;
    }
    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {
      title,
      location,
      description: description || '',
      image_url: imageUrl || 'https://images.pexels.com/photos/6585598/pexels-photo-6585598.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      base_rate: Number(baseRate) || 150,
      cleaning_fee: 75,
      occupancy_tax_rate: island.taxRate,
      bedrooms: 1,
      bathrooms: 1,
      max_guests: 2,
      active: true,
      onboarding_tier: tier,
      region,
      website_config: { template: 'tropical', primaryColor: '#10b981' },
      latitude: island.center[0],
      longitude: island.center[1],
    };

    if (tier === 'independent') {
      payload.external_listing_url = websiteUrl || null;
      payload.contact_email = contactEmail || null;
      payload.contact_whatsapp = contactWhatsapp || null;
    } else if (tier === 'ical_sync') {
      payload.ical_feed_url = icalUrl || null;
    } else if (tier === 'native') {
      payload.site_slug = siteSlug || null;
      payload.custom_domain = customDomain || null;
    }

    apiPost('/properties', payload)
      .then(() => {
        setStep('done');
        setTimeout(() => onCreated(), 1500);
      })
      .catch((err) => setError(err.message))
      .finally(() => setSaving(false));
  }

  const tiers: {
    id: OnboardingTier;
    label: string;
    icon: typeof Home;
    description: string;
    features: string[];
    color: string;
  }[] = [
    {
      id: 'independent',
      label: 'Tier 1: External Site Link',
      icon: Home,
      description: 'Already have a website? Link it here. Guests are redirected to your existing site.',
      features: ['Link your existing website', 'Add contact email & WhatsApp', 'Guests book on your external site', 'Fastest setup — no migration needed'],
      color: '#3b82f6',
    },
    {
      id: 'ical_sync',
      label: 'Tier 2: Airbnb / iCal Sync',
      icon: Calendar,
      description: 'Sync your Airbnb listing or any iCal feed for automated availability synchronization.',
      features: ['Paste Airbnb listing URL or iCal feed', 'Automatic availability sync', 'Import photos & details', 'Keep using Airbnb for bookings'],
      color: '#f59e0b',
    },
    {
      id: 'native',
      label: 'Tier 3: Native Atlas Site Builder',
      icon: Server,
      description: 'Full Atlas website engine with custom domain, native checkout, and interactive map pin builder.',
      features: ['Custom domain (CNAME to cname.atlasstay.com)', 'Native checkout & booking engine', 'Interactive map pin builder', 'Choose templates & branding', 'Direct bookings — no platform fees'],
      color: '#10b981',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#14151c] border border-white/10 rounded-2xl p-6 fade-in-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Globe className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-display text-xl text-white">Website Creator Wizard</h3>
              <p className="text-xs text-white/40">
                {step === 'tier-select' && 'Choose your hosting tier'}
                {step === 'tier-details' && 'Configure your tier settings'}
                {step === 'property-details' && 'Property details'}
                {step === 'done' && 'Website created!'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step: Tier Select */}
        {step === 'tier-select' && (
          <div className="space-y-3">
            {tiers.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => selectTier(t.id)}
                  className="w-full text-left rounded-xl bg-[#1e1f28] border border-white/5 hover:border-white/20 p-5 transition-all hover:scale-[1.01] group"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: t.color + '20' }}
                    >
                      <Icon className="w-6 h-6" style={{ color: t.color }} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-1 group-hover:text-emerald-300 transition-colors">
                        {t.label}
                      </h4>
                      <p className="text-sm text-white/50 mb-3">{t.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {t.features.map((f) => (
                          <span
                            key={f}
                            className="px-2 py-0.5 text-xs rounded-md bg-white/5 text-white/50 border border-white/5"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-emerald-400 transition-colors shrink-0 mt-1" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Step: Tier Details */}
        {step === 'tier-details' && tier && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[#1e1f28] border border-white/5 p-4">
              {(() => {
                const t = tiers.find((x) => x.id === tier)!;
              const Icon = t.icon;
              return (
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: t.color + '20' }}
                  >
                    <Icon className="w-5 h-5" style={{ color: t.color }} />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{t.label}</p>
                    <p className="text-xs text-white/40">{t.description}</p>
                  </div>
                </div>
              );
              })()}
            </div>

            {tier === 'independent' && (
              <div className="space-y-3">
                <Field label="Your existing website URL" icon={Link} value={websiteUrl} onChange={setWebsiteUrl} placeholder="https://my-paradise-villa.com" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Contact email" icon={Mail} value={contactEmail} onChange={setContactEmail} placeholder="owner@paradise.com" />
                  <Field label="WhatsApp number" icon={Phone} value={contactWhatsapp} onChange={setContactWhatsapp} placeholder="+1 721 555 1234" />
                </div>
              </div>
            )}

            {tier === 'ical_sync' && (
              <div className="space-y-3">
                <Field label="Airbnb listing URL or iCal feed URL" icon={Calendar} value={icalUrl} onChange={setIcalUrl} placeholder="https://www.airbnb.com/rooms/12345678" />
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
                  <p className="text-xs text-amber-300">
                    Paste your Airbnb listing link or your calendar iCal feed URL. We'll sync availability automatically.
                  </p>
                </div>
              </div>
            )}

            {tier === 'native' && (
              <div className="space-y-3">
                <Field label="Site slug (your atlasstay.com subdomain)" icon={Globe} value={siteSlug} onChange={setSiteSlug} placeholder="my-paradise-villa" />
                {siteSlug && (
                  <p className="text-xs text-emerald-400 font-mono">→ {siteSlug}.atlasstay.com</p>
                )}
                <Field label="Custom domain (optional)" icon={Server} value={customDomain} onChange={setCustomDomain} placeholder="www.my-paradise-villa.com" />
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 space-y-1.5">
                  <p className="text-xs text-white/50 mb-1">DNS Setup (1-line CNAME):</p>
                  <div className="flex items-center gap-2 text-xs font-mono text-white/70 flex-wrap">
                    <span className="text-emerald-400">Host:</span> www
                    <span className="text-white/20">|</span>
                    <span className="text-emerald-400">Points to:</span> cname.atlasstay.com
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setStep('tier-select')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={proceedToPropertyDetails}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-medium text-sm transition-colors"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step: Property Details */}
        {step === 'property-details' && (
          <div className="space-y-4">
            <Field label="Property title" icon={MapPin} value={title} onChange={setTitle} placeholder="Sunset Villa Retreat" />

            <div>
              <label className="text-xs text-white/40 mb-1 block">Island Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as IslandRegion)}
                className="w-full bg-[#1e1f28] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                {ISLAND_LIST.map((isl) => (
                  <option key={isl.id} value={isl.id}>{isl.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-white/40 mb-1 block">Location (area on {island.label})</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-[#1e1f28] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="">Select an area...</option>
                {island.areas.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-white/40 mb-1 block">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="A beautiful beachfront villa with stunning views..."
                className="w-full bg-[#1e1f28] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Base nightly rate ($)" value={baseRate} onChange={setBaseRate} placeholder="150" />
              <Field label="Photo URL (optional)" value={imageUrl} onChange={setImageUrl} placeholder="https://..." />
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setStep('tier-details')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={createSite}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-medium text-sm transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {saving ? 'Creating...' : 'Create Website'}
              </button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="font-display text-xl text-white mb-2">Website Created!</h3>
            <p className="text-sm text-white/40 mb-4">Redirecting to your Host Operations Hub...</p>
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400 mx-auto" />
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, value, onChange, placeholder }: {
  label: string;
  icon: typeof Link;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-white/40 mb-1 block flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" /> {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#1e1f28] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      />
    </div>
  );
}
