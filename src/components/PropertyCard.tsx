import { useState } from 'react';
import { Bed, Bath, Users, MapPin, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Property } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface PropertyCardProps {
  property: Property;
  onSelect: (property: Property) => void;
  selected?: boolean;
}

export default function PropertyCard({ property, onSelect, selected }: PropertyCardProps) {
  const [imgIdx, setImgIdx] = useState(0);
  const gallery = [property.image_url, ...property.gallery_urls];
  const hasGallery = gallery.length > 1;

  return (
    <div
      onClick={() => onSelect(property)}
      className={`
        card-lift group cursor-pointer rounded-2xl overflow-hidden bg-[#14151c] border
        ${selected ? 'border-emerald-500/60 ring-2 ring-emerald-500/30' : 'border-white/5'}
      `}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#1e1f28]">
        <img
          src={gallery[imgIdx]}
          alt={property.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {hasGallery && (
          <>
            <div className="flex gap-1 absolute bottom-3 left-1/2 -translate-x-1/2">
              {gallery.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setImgIdx(i);
                  }}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === imgIdx ? 'bg-white w-4' : 'bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setImgIdx((imgIdx - 1 + gallery.length) % gallery.length); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setImgIdx((imgIdx + 1) % gallery.length); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </>
        )}

        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm">
          <span className="text-sm font-semibold text-white">
            {formatCurrency(property.base_rate)}
          </span>
          <span className="text-xs text-white/60"> /night</span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-white text-base leading-tight">{property.title}</h3>
          <div className="flex items-center gap-1 text-xs text-white/60 shrink-0">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="font-medium text-white">4.9</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-sm text-white/50 mb-3">
          <MapPin className="w-3.5 h-3.5" />
          <span>{property.location}</span>
        </div>

        <div className="flex items-center gap-4 text-sm text-white/60 mb-3">
          <span className="flex items-center gap-1.5">
            <Bed className="w-4 h-4" /> {property.bedrooms}
          </span>
          <span className="flex items-center gap-1.5">
            <Bath className="w-4 h-4" /> {property.bathrooms}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4" /> {property.max_guests}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {property.amenities.slice(0, 4).map((a) => (
            <span
              key={a}
              className="px-2 py-0.5 text-xs rounded-md bg-white/5 text-white/50 border border-white/5"
            >
              {a}
            </span>
          ))}
          {property.amenities.length > 4 && (
            <span className="px-2 py-0.5 text-xs rounded-md bg-white/5 text-white/50 border border-white/5">
              +{property.amenities.length - 4} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
