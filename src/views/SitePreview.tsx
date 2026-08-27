import { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Bed, Bath, Users, Calendar, ExternalLink, Globe } from 'lucide-react';
import { apiGetPublic } from '@/lib/supabase';
import type { Property, WebsiteTemplate, IslandRegion } from '@/lib/types';
import { ISLAND_PRESETS } from '@/lib/types';
import { formatCurrency, calcPricing } from '@/lib/utils';

interface SitePreviewProps {
  siteId: string;
  onBack: () => void;
}

export default function SitePreview({ siteId, onBack }: SitePreviewProps) {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetPublic<Property>(`/properties/${siteId}`)
      .then(setProperty)
      .catch(() => setLoading(false))
      .finally(() => setLoading(false));
  }, [siteId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/50 mb-4">Site not found</p>
          <button onClick={onBack} className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm">Back</button>
        </div>
      </div>
    );
  }

  const config = (property.website_config || {}) as Record<string, unknown>;
  const template = (config.template as WebsiteTemplate) || 'tropical';
  const primaryColor = (config.primaryColor as string) || '#10b981';
  const tagline = (config.tagline as string) || property.description || 'Your perfect Caribbean escape';
  const heroImage = (config.heroImage as string) || property.image_url;
  const region = property.region || 'sint_maarten';
  const island = ISLAND_PRESETS[region] || ISLAND_PRESETS.sint_maarten;

  const fontMap: Record<WebsiteTemplate, string> = {
    tropical: "'Inter', sans-serif",
    minimal: "'Inter', sans-serif",
    boutique: "'Playfair Display', Georgia, serif",
    luxury: "'Playfair Display', Georgia, serif",
    family: "'Inter', sans-serif",
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: fontMap[template] }}>
      {/* Preview toolbar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#0a0b0f]/90 backdrop-blur-lg border-b border-white/10 px-4 py-2.5 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-400" />
          <span className="text-sm text-white/60 font-mono">
            {property.site_slug || property.id}.atlasstay.com
          </span>
          {property.custom_domain && (
            <span className="text-xs text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10">
              {property.custom_domain}
            </span>
          )}
        </div>
      </div>

      {/* Hero section */}
      <div className="relative h-[70vh] overflow-hidden pt-12">
        <img src={heroImage} alt={property.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-3" style={{ color: primaryColor }}>
              <MapPin className="w-5 h-5" />
              <span className="text-sm font-medium uppercase tracking-wide text-white/80">
                {property.location} · {island.label}
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-3 leading-tight">
              {property.title}
            </h1>
            <p className="text-lg text-white/70 max-w-2xl">{tagline}</p>
          </div>
        </div>
      </div>

      {/* Quick facts */}
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { icon: Bed, label: 'Bedrooms', value: property.bedrooms },
            { icon: Bath, label: 'Bathrooms', value: property.bathrooms },
            { icon: Users, label: 'Guests', value: property.max_guests },
            { icon: Calendar, label: 'From', value: formatCurrency(property.base_rate) + '/night' },
          ].map((fact) => {
            const Icon = fact.icon;
            return (
              <div key={fact.label} className="rounded-xl border border-gray-100 p-4 text-center">
                <Icon className="w-6 h-6 mx-auto mb-2" style={{ color: primaryColor }} />
                <p className="text-2xl font-bold text-gray-900">{fact.value}</p>
                <p className="text-sm text-gray-500">{fact.label}</p>
              </div>
            );
          })}
        </div>

        {/* Description */}
        <div className="prose max-w-none mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">About this property</h2>
          <p className="text-gray-600 leading-relaxed">{property.description || 'A beautiful Caribbean property ready for your next getaway.'}</p>
        </div>

        {/* Amenities */}
        {property.amenities.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Amenities</h2>
            <div className="flex flex-wrap gap-2">
              {property.amenities.map((a) => (
                <span
                  key={a}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm"
                  style={{ borderColor: primaryColor + '30' }}
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Gallery */}
        {property.gallery_urls.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {property.gallery_urls.slice(0, 6).map((url, i) => (
                <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden">
                  <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Booking CTA */}
        <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: primaryColor + '10' }}>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Book your stay</h2>
          <p className="text-gray-600 mb-4">
            From {formatCurrency(property.base_rate)} / night · {island.shortLabel} tax {(property.occupancy_tax_rate * 100).toFixed(0)}% included
          </p>
          {property.onboarding_tier === 'independent' && property.external_listing_url ? (
            <a
              href={property.external_listing_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              <ExternalLink className="w-4 h-4" /> Book on external site
            </a>
          ) : (
            <button
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              <Calendar className="w-4 h-4" /> Check availability
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 py-6 px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 text-sm text-gray-400">
          <span>Powered by</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
              <MapPin className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="font-semibold text-gray-600">Atlas Stay</span>
          </div>
        </div>
      </div>
    </div>
  );
}
