import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, Download, RefreshCw, TrendingUp, TrendingDown, DollarSign, FileText, CheckCircle2 } from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { LedgerEntry, LedgerCategory, LedgerType, Property, FinanceSyncResult } from '@/lib/types';
import { formatCurrency, formatCurrencyPrecise, formatDateShort, exportToCSV, convertCurrency } from '@/lib/utils';

const CATEGORIES: { value: LedgerCategory; label: string; type: LedgerType }[] = [
  { value: 'RENT_INCOME', label: 'Rental Income', type: 'INCOME' },
  { value: 'CLEANING_INCOME', label: 'Cleaning Income', type: 'INCOME' },
  { value: 'TAX_COLLECTED', label: 'Tax Collected', type: 'INCOME' },
  { value: 'RENT_EXPENSE', label: 'Fixed Rent/Mortgage', type: 'EXPENSE' },
  { value: 'CLEANING_EXPENSE', label: 'Cleaning Fees', type: 'EXPENSE' },
  { value: 'UTILITIES', label: 'Utilities', type: 'EXPENSE' },
  { value: 'MAINTENANCE', label: 'Maintenance', type: 'EXPENSE' },
  { value: 'AMENITIES', label: 'Amenities', type: 'EXPENSE' },
  { value: 'PLATFORM_FEES', label: 'Platform Fees', type: 'EXPENSE' },
  { value: 'OTHER', label: 'Other', type: 'EXPENSE' },
];

export default function LedgerView() {
  const { org } = useAuth();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<'USD' | 'XCG'>('USD');
  const [showAdd, setShowAdd] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<FinanceSyncResult | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');

  useEffect(() => {
    Promise.all([
      apiGet<LedgerEntry[]>('/ledger'),
      apiGet<Property[]>('/host/properties').catch(() => apiGet<Property[]>('/properties')),
    ])
      .then(([e, p]) => { setEntries(e); setProperties(p); })
      .finally(() => setLoading(false));
  }, []);

  const totRate = org?.tot_tax_rate || 0.12;
  const orgCurrency = org?.currency || 'USD';
  const displayCurrency = currency;

  const filtered = filterType === 'ALL' ? entries : entries.filter((e) => e.type === filterType);

  const totalIncome = entries.filter((e) => e.type === 'INCOME').reduce((s, e) => s + Number(e.amount), 0);
  const totalExpense = entries.filter((e) => e.type === 'EXPENSE').reduce((s, e) => s + Number(e.amount), 0);
  const netIncome = totalIncome - totalExpense;
  const projectedTot = totalIncome * totRate;

  function convertDisplay(amount: number): number {
    return convertCurrency(amount, 'USD', displayCurrency);
  }

  function fmt(n: number): string {
    return displayCurrency === 'XCG' ? formatCurrencyPrecise(n, 'XCG') : formatCurrency(n, 'USD');
  }

  function handleExport() {
    const rows = filtered.map((e) => ({
      Date: formatDateShort(e.entry_date),
      Type: e.type,
      Category: CATEGORIES.find((c) => c.value === e.category)?.label || e.category,
      Property: e.property?.title || '',
      Description: e.description,
      Amount: e.amount,
      Currency: e.currency,
      Synced: e.synced ? 'Yes' : 'No',
    }));
    exportToCSV(`atlas-stay-ledger-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    apiPost<FinanceSyncResult>('/finance/sync', {})
      .then((data) => {
        setSyncResult(data);
        // Refresh entries
        apiGet<LedgerEntry[]>('/ledger').then(setEntries);
      })
      .catch((err) => alert(err.message))
      .finally(() => setSyncing(false));
  }

  function deleteEntry(id: string) {
    apiDelete(`/ledger/${id}`)
      .then(() => setEntries((prev) => prev.filter((e) => e.id !== id)))
      .catch((err) => alert(err.message));
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Gross Revenue" value={fmt(convertDisplay(totalIncome))} icon={TrendingUp} color="text-emerald-400" />
        <SummaryCard label="Total Expenses" value={fmt(convertDisplay(totalExpense))} icon={TrendingDown} color="text-red-400" />
        <SummaryCard label="Net Income" value={fmt(convertDisplay(netIncome))} icon={DollarSign} color={netIncome >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        <SummaryCard
          label={`Projected TOT (${(totRate * 100).toFixed(1)}%)`}
          value={fmt(convertDisplay(projectedTot))}
          icon={FileText}
          color="text-amber-400"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Currency toggle */}
          <div className="flex gap-1 bg-[#14151c] border border-white/10 rounded-xl p-1">
            {(['USD', 'XCG'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  currency === c ? 'bg-emerald-500 text-white' : 'text-white/50 hover:text-white'
                }`}
              >
                {c === 'USD' ? '$ USD' : 'XCG'}
              </button>
            ))}
          </div>
          {/* Type filter */}
          <div className="flex gap-1 bg-[#14151c] border border-white/10 rounded-xl p-1">
            {(['ALL', 'INCOME', 'EXPENSE'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterType === t ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'
                }`}
              >
                {t === 'ALL' ? 'All' : t === 'INCOME' ? 'Income' : 'Expenses'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-colors border border-white/10"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync to Atlas Accounting
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Entry
          </button>
        </div>
      </div>

      {/* Sync result */}
      {syncResult && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 flex items-start gap-3 fade-in-up">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-emerald-300">{syncResult.message}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 text-xs">
              <span className="text-white/50">Revenue: <span className="text-white">{fmt(convertDisplay(syncResult.summary.gross_revenue))}</span></span>
              <span className="text-white/50">Expenses: <span className="text-white">{fmt(convertDisplay(syncResult.summary.total_expenses))}</span></span>
              <span className="text-white/50">Net: <span className="text-white">{fmt(convertDisplay(syncResult.summary.net_income))}</span></span>
              <span className="text-white/50">TOT: <span className="text-white">{fmt(convertDisplay(syncResult.summary.projected_tot))}</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Ledger table */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 rounded-2xl bg-[#14151c] border border-white/5">
          <FileText className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No ledger entries yet.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#14151c] border border-white/5 overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wide border-b border-white/5">
            <div className="col-span-2">Date</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-3">Description</div>
            <div className="col-span-2">Property</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {filtered.map((e) => {
            const cat = CATEGORIES.find((c) => c.value === e.category);
            return (
              <div key={e.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                <div className="md:col-span-2 text-sm text-white/60">{formatDateShort(e.entry_date)}</div>
                <div className="md:col-span-2">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                    e.type === 'INCOME' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'
                  }`}>
                    {cat?.label || e.category}
                  </span>
                </div>
                <div className="md:col-span-3 text-sm text-white/70">{e.description || '—'}</div>
                <div className="md:col-span-2 text-sm text-white/40">{e.property?.title || '—'}</div>
                <div className={`md:col-span-2 md:text-right text-sm font-semibold ${e.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {e.type === 'INCOME' ? '+' : '−'} {fmt(convertDisplay(Number(e.amount)))}
                  {e.synced && <CheckCircle2 className="w-3 h-3 inline-block ml-1 text-emerald-400/50" />}
                </div>
                <div className="md:col-span-1 md:text-right">
                  <button
                    onClick={() => deleteEntry(e.id)}
                    className="p-1.5 rounded-lg bg-red-500/5 hover:bg-red-500/15 text-red-400/60 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <AddEntryModal
          properties={properties}
          defaultCurrency={orgCurrency}
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            apiGet<LedgerEntry[]>('/ledger').then(setEntries);
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: {
  label: string; value: string; icon: typeof TrendingUp; color: string;
}) {
  return (
    <div className="rounded-2xl bg-[#14151c] border border-white/5 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-white/40">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function AddEntryModal({ properties, defaultCurrency, onClose, onCreated }: {
  properties: Property[];
  defaultCurrency: 'USD' | 'XCG';
  onClose: () => void;
  onCreated: () => void;
}) {
  const [type, setType] = useState<LedgerType>('INCOME');
  const [category, setCategory] = useState<LedgerCategory>('RENT_INCOME');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [entryCurrency, setEntryCurrency] = useState<'USD' | 'XCG'>(defaultCurrency);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const availableCategories = CATEGORIES.filter((c) => c.type === type);

  function save() {
    if (!amount || !category) return;
    setSaving(true);
    apiPost<LedgerEntry>('/ledger', {
      type, category, amount: Number(amount), currency: entryCurrency,
      description, property_id: propertyId || null, entry_date: entryDate,
    })
      .then(onCreated)
      .catch((err) => alert(err.message))
      .finally(() => setSaving(false));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#14151c] border border-white/10 rounded-2xl p-6 fade-in-up max-h-[90vh] overflow-y-auto">
        <h3 className="font-display text-xl text-white mb-4">Add Ledger Entry</h3>
        <div className="space-y-3">
          {/* Type toggle */}
          <div>
            <label className="text-xs text-white/40 mb-1 block">Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => { setType('INCOME'); setCategory('RENT_INCOME'); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  type === 'INCOME' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-[#1e1f28] border-white/10 text-white/40'
                }`}
              >Income</button>
              <button
                onClick={() => { setType('EXPENSE'); setCategory('RENT_EXPENSE'); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  type === 'EXPENSE' ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-[#1e1f28] border-white/10 text-white/40'
                }`}
              >Expense</button>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-white/40 mb-1 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as LedgerCategory)}
              className="w-full bg-[#1e1f28] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              {availableCategories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Property */}
          <div>
            <label className="text-xs text-white/40 mb-1 block">Property (optional)</label>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full bg-[#1e1f28] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">— None —</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>

          {/* Amount + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#1e1f28] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Currency</label>
              <select
                value={entryCurrency}
                onChange={(e) => setEntryCurrency(e.target.value as 'USD' | 'XCG')}
                className="w-full bg-[#1e1f28] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="USD">USD ($)</option>
                <option value="XCG">XCG (Caribbean Guilder)</option>
              </select>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-xs text-white/40 mb-1 block">Date</label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full bg-[#1e1f28] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-white/40 mb-1 block">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes"
              className="w-full bg-[#1e1f28] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={save} disabled={saving || !amount} className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Add Entry
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}
