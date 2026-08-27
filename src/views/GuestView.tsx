import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, SlidersHorizontal, Loader2, Navigation, Lock, Plus, Globe, ExternalLink, Eye, ArrowRight, Server, Home, Calendar } from 'lucide-react';
import PropertyCard from '@/components/PropertyCard';
import BookingSidebar from '@/components/BookingSidebar';
import MapView from '@/components/MapView';
import WebsiteCreatorWizard from '@/components/WebsiteCreatorWizard';
import { apiGetPublic, apiPostPublic } from '@/lib/supabase';
import type { Property, IslandRegion } from '@/lib/types';
import { ISLAND_PRESETS, ISLAND_LIST } from '@/lib/types';

export default function GuestView() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Property | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [maxRate, setMaxRate] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [hasBookedEmail, setHasBookedEmail] = useState<string | null>(null);
  const [exactLocation, setExactLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showCreator, setShowCreator] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<IslandRegion>('sint_maarten');
  const mapColumnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiGetPublic<Property[]>('/properties?active_only=true')
      .then((data) => setProperties(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = properties.filter((p) => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) &&
        !p.location.toLowerCase().includes(search.toLowerCase())) return false;
    if (maxRate !== null && p.base_rate > maxRate) return false;
    return true;
  });

  // Fetch exact location for a property (post-booking)
  async function unlockExactLocation(property: Property, email: string) {
    try {
      const data = await apiGetPublic<{ exact: boolean; exact_lat?: number; exact_lng?: number }>(
        `/properties/${property.id}/location?email=${encodeURIComponent(email)}`
      );
      if (data.exact && data.exact_lat != null && data.exact_lng != null) {
        setExactLocation({ lat: data.exact_lat, lng: data.exact_lng });
        setHasBookedEmail(email);
      }
    } catch { /* ignore — user hasn't booked yet */ }
  }

  return (
    <div className="min-h-screen bg-[#0a0b0f] flex flex-col">
      {/* Hero header */}
      <div className="relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1b26] via-[#0a0b0f] to-[#0a0b0f]" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6 pt-16 pb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-2xl text-white">Atlas Stay</span>
          </div>

          <h1 className="font-display text-4xl md:text-6xl text-white leading-tight max-w-3xl mb-3">
            Create & Deploy Your Island Property Website
          </h1>
          <p className="text-white/50 text-lg max-w-2xl mb-8">
            The Dutch Caribbean Engine for Direct Stays & Vacation Rental Websites. Build your site, sync listings, or link your existing domain.
          </p>

          {/* Primary CTA: Create New Property Website */}
          <div className="flex gap-3 flex-wrap mb-6">
            <button
              onClick={() => setShowCreator(true)}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-base transition-all hover:scale-[1.02] shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-5 h-5" /> Create New Property Website
            </button>
            <button
              onClick={() => {
                document.getElementById('sites-gallery')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-medium text-base transition-colors border border-white/10"
            >
              <Eye className="w-5 h-5" /> Browse Member Sites
            </button>
          </div>

          {/* Island region selector */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <span className="text-xs text-white/40">Island:</span>
            {ISLAND_LIST.map((isl) => (
              <button
                key={isl.id}
                onClick={() => setSelectedRegion(isl.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedRegion === isl.id
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-white/5 text-white/40 border border-white/5 hover:text-white/70'
                }`}
              >
                {isl.shortLabel}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="flex gap-3 max-w-2xl">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by location or property name..."
                className="w-full bg-[#14151c] border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 rounded-xl border transition-colors flex items-center gap-2 text-sm ${
                showFilters ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-[#14151c] border-white/10 text-white/60 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </button>
          </div>

          {showFilters && (
            <div className="mt-3 max-w-2xl rounded-xl bg-[#14151c] border border-white/10 p-4 fade-in-up">
              <label className="text-sm text-white/60 mb-2 block">Max rate per night</label>
              <div className="flex flex-wrap gap-2">
                {[100, 200, 300, 500].map((r) => (
                  <button
                    key={r}
                    onClick={() => setMaxRate(maxRate === r ? null : r)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      maxRate === r
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-[#1e1f28] border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    ≤ ${r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Split-screen: cards + map */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 pb-8 flex gap-6" style={{ minHeight: '600px' }}>
        {/* Left: Property list */}
        <div className="flex-1 min-w-0 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden bg-[#14151c] border border-white/5">
                  <div className="aspect-[4/3] skeleton" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 w-2/3 rounded skeleton" />
                    <div className="h-4 w-1/2 rounded skeleton" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-400 mb-2">Something went wrong loading properties.</p>
              <p className="text-sm text-white/40">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-white/60 text-lg">No properties match your search.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-white/40 mb-4">{filtered.length} stay{filtered.length !== 1 ? 's' : ''} available</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filtered.map((p) => (
                  <div
                    key={p.id}
                    onMouseEnter={() => setHoveredId(p.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <PropertyCard
                      property={p}
                      onSelect={setSelected}
                      selected={selected?.id === p.id}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right: Interactive map */}
        <div
          ref={mapColumnRef}
          className="hidden lg:block w-[45%] sticky top-14 rounded-2xl overflow-hidden border border-white/5 bg-[#14151c]"
          style={{ height: 'calc(100vh - 340px)', minHeight: '500px' }}
        >
          {!loading && filtered.length > 0 ? (
            <>
              <MapView
                properties={filtered}
                highlightedId={hoveredId}
                exactLocation={exactLocation}
                region={selectedRegion}
                mode={exactLocation ? 'exact' : 'public'}
              />
              {/* Map overlay info */}
              <div className="absolute bottom-4 left-4 z-[400] rounded-xl bg-[#14151c]/90 backdrop-blur-sm border border-white/10 px-3 py-2 max-w-[220px]">
                {exactLocation ? (
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-white">Exact location unlocked</p>
                      <a
                        href={`https://www.openstreetmap.org/directions?from=&to=${exactLocation.lat},${exactLocation.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-400 hover:underline"
                      >
                        Get directions →
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-white/40 shrink-0" />
                    <p className="text-xs text-white/50">Privacy-protected: approximate area shown. Exact address revealed after booking.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <MapPin className="w-10 h-10 text-white/20" />
            </div>
          )}
        </div>
      </div>

      {/* Sites Built on Atlas Stay — Gallery section */}
      <div id="sites-gallery" className="max-w-7xl mx-auto w-full px-6 py-12">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
          <div>
            <h2 className="font-display text-2xl md:text-3xl text-white mb-1">
              Sites Built on Atlas Stay
            </h2>
            <p className="text-sm text-white/40">Browse live member platforms — websites generated by hosts across the Dutch Caribbean</p>
          </div>
          <button
            onClick={() => setShowCreator(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Your Site
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-[#14151c] border border-white/5">
                <div className="aspect-[16/10] skeleton" />
                <div className="p-4 space-y-2">
                  <div className="h-5 w-2/3 rounded skeleton" />
                  <div className="h-4 w-1/2 rounded skeleton" />
                </div>
              </div>
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-[#14151c] border border-white/5">
            <Globe className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/50 text-lg mb-2">No member sites yet.</p>
            <p className="text-sm text-white/30 mb-4">Be the first to launch your property website on Atlas Stay.</p>
            <button
              onClick={() => setShowCreator(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Create New Property Website
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.map((p) => {
              const island = ISLAND_PRESETS[p.region || 'sint_maarten'] || ISLAND_PRESETS.sint_maarten;
              const tierIcon = p.onboarding_tier === 'independent' ? Home : p.onboarding_tier === 'ical_sync' ? Calendar : Server;
              const TierIcon = tierIcon;
              return (
                <div
                  key={p.id}
                  className="rounded-2xl bg-[#14151c] border border-white/5 overflow-hidden card-lift cursor-pointer group"
                  onMouseEnter={() => setHoveredId(p.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => setSelected(p)}
                >
                  <div className="aspect-[16/10] bg-[#1e1f28] overflow-hidden relative">
                    <img src={p.image_url} alt={p.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <div className="px-2 py-0.5 rounded-md text-xs font-medium bg-black/60 text-white/80 backdrop-blur-sm">
                        {island.shortLabel}
                      </div>
                      <div className="px-2 py-0.5 rounded-md text-xs font-medium bg-black/60 text-white/60 backdrop-blur-sm flex items-center gap-1">
                        <TierIcon className="w-3 h-3" /> {p.onboarding_tier === 'independent' ? 'Tier 1' : p.onboarding_tier === 'ical_sync' ? 'Tier 2' : 'Tier 3'}
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-white mb-1 group-hover:text-emerald-300 transition-colors">{p.title}</h3>
                    <p className="text-sm text-white/40 flex items-center gap-1 mb-3">
                      <MapPin className="w-3 h-3" /> {p.location} · {island.label}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/30 font-mono">
                        {(p.site_slug || p.id).slice(0, 16)}.atlasstay.com
                      </span>
                      <span className="text-xs text-emerald-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                        View <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreator && (
        <WebsiteCreatorWizard
          onClose={() => setShowCreator(false)}
          onCreated={() => { setShowCreator(false); window.location.hash = '#/host'; }}
        />
      )}

      {/* Post-booking email unlock */}
      {selected && (
        <BookingSidebar
          property={selected}
          onClose={() => { setSelected(null); setExactLocation(null); }}
          onBooked={(email) => unlockExactLocation(selected, email)}
        />
      )}
    </div>
  );
}
