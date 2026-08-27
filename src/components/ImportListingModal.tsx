import { useState } from 'react';
import { Loader2, X, Download, Sparkles, Check } from 'lucide-react';
import { apiPost } from '@/lib/supabase';
import type { ImportedListing } from '@/lib/types';

interface ImportListingModalProps {
  onClose: () => void;
  onImported: (listing: ImportedListing) => void;
}

export default function ImportListingModal({ onClose, onImported }: ImportListingModalProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportedListing | null>(null);

  function handleFetch() {
    if (!url) return;
    setLoading(true);
    setError(null);
    setPreview(null);
    apiPost<ImportedListing>('/import-listing', { url })
      .then((data) => setPreview(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  function handleImport() {
    if (!preview) return;
    onImported(preview);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#14151c] border border-white/10 rounded-2xl p-6 fade-in-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="font-display text-xl text-white">Import from Airbnb</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-white/50 mb-4">
          Paste an Airbnb listing URL and our AI parser will extract photos, title, description, and rates to auto-populate a new property.
        </p>

        {/* URL input */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.airbnb.com/rooms/12345678"
            className="flex-1 bg-[#1e1f28] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
          />
          <button
            onClick={handleFetch}
            disabled={!url || loading}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Fetch
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300 mb-4">
            {error}
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="rounded-xl bg-[#1e1f28] border border-white/5 p-4 space-y-3 fade-in-up">
            <div className="aspect-[16/9] rounded-lg overflow-hidden bg-[#0a0b0f]">
              <img src={preview.image_url} alt={preview.title} className="w-full h-full object-cover" />
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-white">{preview.title}</h4>
              <p className="text-sm text-white/40">{preview.location}</p>
              <p className="text-xs text-white/50">{preview.description}</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-white/60">{preview.bedrooms} bd</span>
              <span className="text-white/60">{preview.bathrooms} ba</span>
              <span className="text-white/60">{preview.max_guests} guests</span>
              <span className="text-emerald-400 font-semibold">${preview.base_rate}/night</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {preview.amenities.map((a) => (
                <span key={a} className="px-2 py-0.5 text-xs rounded-md bg-white/5 text-white/50 border border-white/5">
                  {a}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <Check className="w-3.5 h-3.5" /> Parsed from Airbnb listing #{preview.source_listing_id}
            </div>

            <button
              onClick={handleImport}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Import this listing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
