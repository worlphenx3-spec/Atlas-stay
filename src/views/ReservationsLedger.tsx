import { useState, useEffect } from 'react';
import { Loader2, Calendar, Mail, Users } from 'lucide-react';
import { apiGet, apiPatch } from '@/lib/supabase';
import type { Reservation, ReservationStatus } from '@/lib/types';
import { formatCurrency, formatDateShort } from '@/lib/utils';

const STATUS_COLORS: Record<ReservationStatus, { bg: string; text: string; label: string }> = {
  PENDING: { bg: 'bg-amber-500/15', text: 'text-amber-300', label: 'Pending' },
  CONFIRMED: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', label: 'Confirmed' },
  CHECKED_IN: { bg: 'bg-sky-500/15', text: 'text-sky-300', label: 'Checked In' },
  CHECKED_OUT: { bg: 'bg-white/10', text: 'text-white/60', label: 'Checked Out' },
  CANCELLED: { bg: 'bg-red-500/15', text: 'text-red-300', label: 'Cancelled' },
};

const STATUS_ORDER: ReservationStatus[] = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'];

export default function ReservationsLedger() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReservationStatus | 'ALL'>('ALL');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    apiGet<Reservation[]>('/reservations')
      .then(setReservations)
      .finally(() => setLoading(false));
  }

  function updateStatus(id: string, status: ReservationStatus) {
    setUpdating(id);
    apiPatch<Reservation>(`/reservations/${id}/status`, { status })
      .then(() => load())
      .catch((err) => alert(err.message))
      .finally(() => setUpdating(null));
  }

  const filtered = filter === 'ALL' ? reservations : reservations.filter((r) => r.status === filter);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        <FilterTab active={filter === 'ALL'} onClick={() => setFilter('ALL')} label="All" count={reservations.length} />
        {STATUS_ORDER.map((s) => {
          const count = reservations.filter((r) => r.status === s).length;
          if (count === 0) return null;
          return (
            <FilterTab
              key={s}
              active={filter === s}
              onClick={() => setFilter(s)}
              label={STATUS_COLORS[s].label}
              count={count}
              colorClass={STATUS_COLORS[s].text}
            />
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 rounded-2xl bg-[#14151c] border border-white/5">
          <Calendar className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No reservations yet.</p>
          <p className="text-sm text-white/30 mt-1">Bookings made by guests will appear here.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#14151c] border border-white/5 overflow-hidden">
          {/* Table header — hidden on mobile */}
          <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wide border-b border-white/5">
            <div className="col-span-3">Property & Guest</div>
            <div className="col-span-2">Dates</div>
            <div className="col-span-1 text-center">Nights</div>
            <div className="col-span-2 text-right">Total</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {filtered.map((r) => {
            const sc = STATUS_COLORS[r.status];
            return (
              <div key={r.id} className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                {/* Property + guest */}
                <div className="col-span-3 flex items-center gap-3">
                  {r.property?.image_url && (
                    <img src={r.property.image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{r.property?.title || 'Property'}</p>
                    <p className="text-xs text-white/40 truncate">{r.guest_name}</p>
                    <p className="text-xs text-white/30 truncate flex items-center gap-1"><Mail className="w-3 h-3" />{r.guest_email}</p>
                  </div>
                </div>

                {/* Dates */}
                <div className="col-span-2 flex items-center">
                  <div>
                    <p className="text-sm text-white">{formatDateShort(r.check_in)} → {formatDateShort(r.check_out)}</p>
                    <p className="text-xs text-white/30 flex items-center gap-1"><Users className="w-3 h-3" />{r.guests} guests</p>
                  </div>
                </div>

                {/* Nights */}
                <div className="col-span-1 flex items-center justify-start lg:justify-center">
                  <span className="text-sm text-white/60">{r.nights}</span>
                </div>

                {/* Total */}
                <div className="col-span-2 flex items-center lg:justify-end">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{formatCurrency(r.grand_total)}</p>
                    <p className="text-xs text-white/30">{formatCurrency(r.base_total)} + {formatCurrency(r.cleaning_fee)} + tax</p>
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-2 flex items-center">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${sc.bg} ${sc.text}`}>
                    {sc.label}
                  </span>
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center gap-1.5 lg:justify-end flex-wrap">
                  {updating === r.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white/40" />
                  ) : r.status !== 'CANCELLED' ? (
                    <select
                      value={r.status}
                      onChange={(e) => updateStatus(r.id, e.target.value as ReservationStatus)}
                      className="bg-[#1e1f28] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                    >
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>{STATUS_COLORS[s].label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-white/30">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterTab({ active, onClick, label, count, colorClass }: {
  active: boolean; onClick: () => void; label: string; count: number; colorClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors flex items-center gap-2 ${
        active
          ? 'bg-white/10 border-white/20 text-white'
          : 'bg-[#14151c] border-white/5 text-white/50 hover:text-white'
      }`}
    >
      {label}
      <span className={`text-xs ${colorClass || 'text-white/30'}`}>{count}</span>
    </button>
  );
}
