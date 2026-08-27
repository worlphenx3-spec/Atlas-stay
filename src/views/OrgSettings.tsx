import { useState } from 'react';
import { Save, Loader2, Building2, Palette, Globe, DollarSign, MapPin, Mail, Server, ShieldAlert, ExternalLink, Unlock, Check } from 'lucide-react';
import { apiGet, apiPatch } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Organization, IslandRegion } from '@/lib/types';
import { ISLAND_PRESETS, ISLAND_LIST } from '@/lib/types';

export default function OrgSettings() {
  const { org, refreshOrg } = useAuth();
  const [businessName, setBusinessName] = useState(org?.business_name || '');
  const [logoUrl, setLogoUrl] = useState(org?.logo_url || '');
  const [brandColor, setBrandColor] = useState(org?.brand_color || '#10b981');
  const [currency, setCurrency] = useState<'USD' | 'XCG' | 'AWG' | 'ANG'>(org?.currency || 'USD');
  const [totRate, setTotRate] = useState(String((org?.tot_tax_rate || 0.05) * 100));
  const [adminEmail, setAdminEmail] = useState(org?.admin_email || '');
  const [businessEmail, setBusinessEmail] = useState(org?.business_email || '');
  const [marketplaceUrl, setMarketplaceUrl] = useState(org?.sxm_marketplace_url || '');
  const [region, setRegion] = useState<IslandRegion>(org?.region || 'sint_maarten');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [domainRelease, setDomainRelease] = useState('');

  function save() {
    setSaving(true);
    setSaved(false);
    apiPatch<Organization>('/organization', {
      business_name: businessName,
      logo_url: logoUrl || null,
      brand_color: brandColor,
      currency,
      tot_tax_rate: Number(totRate) / 100,
      admin_email: adminEmail || null,
      business_email: businessEmail || null,
      sxm_marketplace_url: marketplaceUrl || null,
      region,
    })
      .then(() => {
        setSaved(true);
        refreshOrg();
        setTimeout(() => setSaved(false), 3000);
      })
      .catch((err) => alert(err.message))
      .finally(() => setSaving(false));
  }

  const presetColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6', '#f97316'];
  const currentIsland = ISLAND_PRESETS[region];

  return (
    <div className="max-w-2xl space-y-6">
      {/* Island Region Selection */}
      <div className="rounded-2xl bg-[#14151c] border border-white/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-emerald-400" />
          <h3 className="font-display text-lg text-white">Island Region</h3>
        </div>
        <p className="text-sm text-white/40 mb-4">Select your island to configure map presets, default tax rate, and currency.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {ISLAND_LIST.map((isl) => (
            <button
              key={isl.id}
              onClick={() => {
                setRegion(isl.id);
                setTotRate(String(isl.taxRate * 100));
                setCurrency(isl.currency);
              }}
              className={`flex flex-col items-start gap-1 px-3 py-3 rounded-lg text-sm text-left transition-colors border ${
                region === isl.id
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-[#1e1f28] border-white/10 text-white/50 hover:text-white/80'
              }`}
            >
              <span className="font-medium">{isl.shortLabel}</span>
              <span className="text-xs opacity-70">{isl.label}</span>
              <span className="text-xs opacity-50">Tax: {(isl.taxRate * 100).toFixed(0)}%</span>
            </button>
          ))}
        </div>
        <div className="mt-4 rounded-lg bg-[#1e1f28] border border-white/5 p-3">
          <p className="text-xs text-white/40 mb-1">Map Center for {currentIsland.label}:</p>
          <p className="text-xs font-mono text-white/60">
            [{currentIsland.center[0]}, {currentIsland.center[1]}] · Zoom {currentIsland.zoom}
          </p>
        </div>
      </div>

      {/* Branding section */}
      <div className="rounded-2xl bg-[#14151c] border border-white/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-emerald-400" />
          <h3 className="font-display text-lg text-white">White-Label Branding</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-white/60 mb-1 block">Public Website Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Paradise Stays"
              className="w-full bg-[#1e1f28] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <p className="text-xs text-white/30 mt-1">This name appears on your public booking pages.</p>
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1 block">Logo URL (optional)</label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full bg-[#1e1f28] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="text-sm text-white/60 mb-2 block flex items-center gap-1.5">
              <Palette className="w-4 h-4" /> Primary Brand Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-12 h-12 rounded-lg border border-white/10 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="bg-[#1e1f28] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-32"
              />
              <div className="flex flex-wrap gap-2">
                {presetColors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setBrandColor(c)}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${
                      brandColor === c ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-[#1e1f28] border border-white/5 p-4">
            <p className="text-xs text-white/40 mb-2">Preview</p>
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: brandColor }}>
                  <MapPin className="w-4 h-4 text-white" />
                </div>
              )}
              <span className="font-display text-lg text-white">{businessName || 'Your Brand'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial settings */}
      <div className="rounded-2xl bg-[#14151c] border border-white/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          <h3 className="font-display text-lg text-white">Financial Settings</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-white/60 mb-2 block flex items-center gap-1.5">
              <Globe className="w-4 h-4" /> Default Currency
            </label>
            <div className="flex gap-2 flex-wrap">
              {(['USD', 'XCG', 'AWG', 'ANG'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    currency === c ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-[#1e1f28] border-white/10 text-white/40'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1 block">Turnover Tax Rate (TOT) %</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={totRate}
                onChange={(e) => setTotRate(e.target.value)}
                step="0.5"
                min="0"
                max="30"
                className="w-32 bg-[#1e1f28] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <span className="text-white/40 text-sm">%</span>
              <span className="text-xs text-white/30 ml-2">Applied to gross rental revenue</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dual-Email System */}
      <div className="rounded-2xl bg-[#14151c] border border-white/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-emerald-400" />
          <h3 className="font-display text-lg text-white">Dual-Email System</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-white/60 mb-1 block flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Owner Administrative Email (Private)
            </label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="owner@paradise.com"
              className="w-full bg-[#1e1f28] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <p className="text-xs text-white/30 mt-1">Used for security alerts, billing, and private admin notifications. Never shown to guests.</p>
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1 block flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-400" /> Business System Email (Public)
            </label>
            <input
              type="email"
              value={businessEmail}
              onChange={(e) => setBusinessEmail(e.target.value)}
              placeholder="stays@paradise.com"
              className="w-full bg-[#1e1f28] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <p className="text-xs text-white/30 mt-1">Used for guest booking confirmations and public-facing communications.</p>
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1 block flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" /> Marketplace URL
            </label>
            <input
              type="text"
              value={marketplaceUrl}
              onChange={(e) => setMarketplaceUrl(e.target.value)}
              placeholder="https://sxmstays.com/paradise-stays"
              className="w-full bg-[#1e1f28] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <p className="text-xs text-white/30 mt-1">Your public listing page on the consumer marketplace.</p>
          </div>
        </div>
      </div>

      {/* Domain Management — internal only */}
      <div className="rounded-2xl bg-[#14151c] border border-white/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-5 h-5 text-emerald-400" />
          <h3 className="font-display text-lg text-white">Domain Engine</h3>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl bg-[#1e1f28] border border-white/5 p-4">
            <p className="text-xs text-white/40 mb-2">Internal DNS Setup (1-line CNAME):</p>
            <div className="flex items-center gap-3 text-sm font-mono text-white/70 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-white/40">Host:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">www</span>
              </div>
              <span className="text-white/20">→</span>
              <div className="flex items-center gap-1.5">
                <span className="text-white/40">Points to:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">cname.atlasstay.com</span>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3 flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-xs text-white/50">
              Domains are managed internally within the Atlas Stay workspace. Use the Website tab to preview your site and configure your domain — no external registrar required.
            </p>
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1 block">Domain Release (Security Check)</label>
            <p className="text-xs text-white/30 mb-2">Type your domain name to release it from the Atlas engine. This disconnects your custom domain.</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={domainRelease}
                onChange={(e) => setDomainRelease(e.target.value)}
                placeholder="e.g. paradise.com"
                className="flex-1 bg-[#1e1f28] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />
              <button
                disabled={!domainRelease.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Unlock className="w-4 h-4" /> Release Domain
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-medium transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </button>
        {saved && (
          <span className="text-sm text-emerald-400 fade-in-up">Settings saved successfully</span>
        )}
      </div>
    </div>
  );
}
