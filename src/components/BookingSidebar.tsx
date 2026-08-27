import { useState, useEffect } from 'react';
import { Calendar as CalIcon, Users, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import Calendar from '@/components/Calendar';
import { apiGetPublic, apiPostPublic } from '@/lib/supabase';
import type { Property, BookedRange, BookingResult } from '@/lib/types';
import { formatCurrency, nightsBetween, calcPricing, formatDate } from '@/lib/utils';

interface BookingSidebarProps {
  property: Property;
  onClose: () => void;
  onBooked?: (email: string) => void;
}

export default function BookingSidebar({ property, onClose, onBooked }: BookingSidebarProps) {
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [guests, setGuests] = useState(1);
  const [bookedRanges, setBookedRanges] = useState<BookedRange[]>([]);
  const [loadingRanges, setLoadingRanges] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoadingRanges(true);
    apiGetPublic<{ bookedRanges: BookedRange[] }>(`/properties/${property.id}/availability`)
      .then((data) => {
        if (!cancelled) {
          setBookedRanges(data.bookedRanges || []);
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoadingRanges(false));
    return () => { cancelled = true; };
  }, [property.id]);

  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const pricing = nights > 0
    ? calcPricing(property.base_rate, property.cleaning_fee, property.occupancy_tax_rate, nights)
    : null;

  function handleReserve() {
    if (!checkIn || !checkOut || !guestName || !guestEmail) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    apiPostPublic<BookingResult>(`/properties/${property.id}/book`, {
      guest_name: guestName,
      guest_email: guestEmail,
      check_in: checkIn,
      check_out: checkOut,
      guests,
    })
      .then((data) => {
        setResult(data);
        onBooked?.(guestEmail);
      })
      .catch((err) => setError(err.message))
      .finally(() => setSubmitting(false));
  }

  function reset() {
    setCheckIn(null);
    setCheckOut(null);
    setResult(null);
    setError(null);
    setGuestName('');
    setGuestEmail('');
    setGuests(1);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#14151c] border-l border-white/10 h-full overflow-y-auto fade-in-up">
        <div className="sticky top-0 z-10 bg-[#14151c]/95 backdrop-blur-sm border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl text-white">Book your stay</h2>
            <p className="text-sm text-white/40">{property.title}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white/60 transition-colors">
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>

        {result ? (
          <div className="p-6">
            <div className="flex flex-col items-center text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-1">Booking confirmed!</h3>
              <p className="text-sm text-white/50 mb-6">Your reservation is locked in. Exact location is now unlocked.</p>

              <div className="w-full rounded-xl bg-[#1e1f28] border border-white/5 p-4 space-y-2 text-sm">
                <Row label="Guest" value={guestName} />
                <Row label="Dates" value={`${formatDate(checkIn!)} — ${formatDate(checkOut!)}`} />
                <Row label="Nights" value={String(result.nights)} />
                <Row label="Base" value={formatCurrency(result.base_total)} />
                <Row label="Cleaning fee" value={formatCurrency(result.cleaning_fee)} />
                <Row label="Occupancy tax" value={formatCurrency(result.tax_total)} />
                <div className="border-t border-white/10 pt-2 mt-2">
                  <Row label="Total" value={formatCurrency(result.grand_total)} bold />
                </div>
              </div>

              <button
                onClick={reset}
                className="mt-6 px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-colors"
              >
                Book another stay
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Guest info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide">Guest Details</h3>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Full name</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full bg-[#1e1f28] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Email</label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full bg-[#1e1f28] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Guests</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setGuests(Math.max(1, guests - 1))}
                    className="w-9 h-9 rounded-lg bg-[#1e1f28] border border-white/10 text-white hover:bg-white/5 transition-colors flex items-center justify-center"
                  >
                    –
                  </button>
                  <span className="flex-1 text-center text-white text-sm flex items-center justify-center gap-1.5">
                    <Users className="w-4 h-4 text-white/40" /> {guests} {guests === 1 ? 'guest' : 'guests'}
                  </span>
                  <button
                    onClick={() => setGuests(Math.min(property.max_guests, guests + 1))}
                    className="w-9 h-9 rounded-lg bg-[#1e1f28] border border-white/10 text-white hover:bg-white/5 transition-colors flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-white/30 mt-1">Max {property.max_guests} guests</p>
              </div>
            </div>

            {/* Calendar */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide">Select Dates</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#1e1f28] border border-white/10 px-3 py-2.5">
                  <div className="text-xs text-white/40 flex items-center gap-1">
                    <CalIcon className="w-3 h-3" /> Check-in
                  </div>
                  <div className="text-sm text-white font-medium mt-0.5">
                    {checkIn ? formatDate(checkIn) : 'Select date'}
                  </div>
                </div>
                <div className="rounded-xl bg-[#1e1f28] border border-white/10 px-3 py-2.5">
                  <div className="text-xs text-white/40 flex items-center gap-1">
                    <CalIcon className="w-3 h-3" /> Check-out
                  </div>
                  <div className="text-sm text-white font-medium mt-0.5">
                    {checkOut ? formatDate(checkOut) : 'Select date'}
                  </div>
                </div>
              </div>

              {loadingRanges ? (
                <div className="h-64 rounded-xl skeleton" />
              ) : (
                <div className="rounded-xl bg-[#1e1f28] border border-white/5 p-4">
                  <Calendar
                    checkIn={checkIn}
                    checkOut={checkOut}
                    bookedRanges={bookedRanges}
                    onChange={(ci, co) => { setCheckIn(ci); setCheckOut(co); }}
                  />
                </div>
              )}
            </div>

            {/* Cost breakdown */}
            {pricing && nights > 0 && (
              <div className="rounded-xl bg-[#1e1f28] border border-white/5 p-4 space-y-2 text-sm fade-in-up">
                <Row
                  label={`${formatCurrency(property.base_rate)} × ${nights} night${nights > 1 ? 's' : ''}`}
                  value={formatCurrency(pricing.baseTotal)}
                />
                <Row label="Cleaning fee" value={formatCurrency(pricing.cleaningFee)} />
                <Row label={`Occupancy tax (${(property.occupancy_tax_rate * 100).toFixed(0)}%)`} value={formatCurrency(pricing.taxTotal)} />
                <div className="border-t border-white/10 pt-2 mt-2">
                  <Row label="Total" value={formatCurrency(pricing.grandTotal)} bold />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleReserve}
              disabled={!checkIn || !checkOut || !guestName || !guestEmail || submitting}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/10 disabled:text-white/30 text-white font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Reserving...
                </>
              ) : (
                'Reserve now'
              )}
            </button>
            <p className="text-xs text-white/30 text-center">You won't be charged yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={bold ? 'text-white font-semibold' : 'text-white/50'}>{label}</span>
      <span className={bold ? 'text-white font-semibold' : 'text-white/80'}>{value}</span>
    </div>
  );
}
