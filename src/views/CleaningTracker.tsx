import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, UserPlus, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/supabase';
import type { CleaningTask, CleaningStaff, CleaningStatus, Property } from '@/lib/types';
import { formatDateShort } from '@/lib/utils';

const STATUS_CONFIG: Record<CleaningStatus, { bg: string; text: string; label: string; icon: typeof AlertCircle }> = {
  DIRTY: { bg: 'bg-red-500/15', text: 'text-red-300', label: 'Dirty', icon: AlertCircle },
  NEEDS_INSPECTION: { bg: 'bg-amber-500/15', text: 'text-amber-300', label: 'Needs Inspection', icon: Sparkles },
  CLEAN: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', label: 'Clean', icon: CheckCircle2 },
};

const STATUS_ORDER: CleaningStatus[] = ['DIRTY', 'NEEDS_INSPECTION', 'CLEAN'];

export default function CleaningTracker() {
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [staff, setStaff] = useState<CleaningStaff[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiGet<CleaningTask[]>('/cleaning/tasks'),
      apiGet<CleaningStaff[]>('/cleaning/staff'),
      apiGet<Property[]>('/properties'),
    ])
      .then(([t, s, p]) => { setTasks(t); setStaff(s); setProperties(p); })
      .finally(() => setLoading(false));
  }, []);

  function updateTask(id: string, updates: Partial<CleaningTask>) {
    setUpdating(id);
    apiPatch<CleaningTask>(`/cleaning/tasks/${id}`, updates)
      .then(() => {
        setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...updates } : t));
      })
      .catch((err) => alert(err.message))
      .finally(() => setUpdating(null));
  }

  function deleteTask(id: string) {
    apiDelete(`/cleaning/tasks/${id}`)
      .then(() => setTasks((prev) => prev.filter((t) => t.id !== id)))
      .catch((err) => alert(err.message));
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>;
  }

  const counts = {
    DIRTY: tasks.filter((t) => t.status === 'DIRTY').length,
    NEEDS_INSPECTION: tasks.filter((t) => t.status === 'NEEDS_INSPECTION').length,
    CLEAN: tasks.filter((t) => t.status === 'CLEAN').length,
  };

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {(Object.keys(STATUS_CONFIG) as CleaningStatus[]).map((s) => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          return (
            <div key={s} className={`rounded-2xl border p-4 ${cfg.bg} border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${cfg.text}`} />
                <span className={`text-sm font-medium ${cfg.text}`}>{cfg.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{counts[s]}</p>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/40">{staff.length} staff members</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddStaff(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Add Staff
          </button>
          <button
            onClick={() => setShowAddTask(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>
      </div>

      {/* Staff list */}
      {staff.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {staff.map((s) => (
            <div key={s.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#14151c] border border-white/5 text-sm">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-semibold text-emerald-300">
                {s.name.charAt(0)}
              </div>
              <span className="text-white/70">{s.name}</span>
              {s.phone && <span className="text-white/30 text-xs">· {s.phone}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Task cards */}
      {tasks.length === 0 ? (
        <div className="text-center py-20 rounded-2xl bg-[#14151c] border border-white/5">
          <Sparkles className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No cleaning tasks yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tasks.map((t) => {
            const cfg = STATUS_CONFIG[t.status];
            const Icon = cfg.icon;
            return (
              <div key={t.id} className="rounded-2xl bg-[#14151c] border border-white/5 overflow-hidden">
                {t.property?.image_url && (
                  <div className="aspect-[16/9] bg-[#1e1f28] overflow-hidden relative">
                    <img src={t.property.image_url} alt="" className="w-full h-full object-cover" />
                    <div className={`absolute bottom-3 left-3 px-2.5 py-1 rounded-md text-xs font-medium ${cfg.bg} ${cfg.text} flex items-center gap-1.5 backdrop-blur-sm`}>
                      <Icon className="w-3.5 h-3.5" /> {cfg.label}
                    </div>
                  </div>
                )}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-white text-sm">{t.property?.title || 'Property'}</h3>
                    {t.due_date && (
                      <p className="text-xs text-white/40 mt-0.5">Due: {formatDateShort(t.due_date)}</p>
                    )}
                  </div>

                  {t.notes && <p className="text-xs text-white/50 italic">"{t.notes}"</p>}

                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Assign to</label>
                      <select
                        value={t.staff_id || ''}
                        onChange={(e) => updateTask(t.id, { staff_id: e.target.value || null })}
                        className="w-full bg-[#1e1f28] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        <option value="">Unassigned</option>
                        {staff.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Status</label>
                      <div className="flex gap-1.5">
                        {STATUS_ORDER.map((s) => {
                          const sc = STATUS_CONFIG[s];
                          return (
                            <button
                              key={s}
                              onClick={() => updateTask(t.id, { status: s })}
                              disabled={updating === t.id}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                t.status === s
                                  ? `${sc.bg} ${sc.text} border-current`
                                  : 'bg-[#1e1f28] border-white/10 text-white/40 hover:text-white/70'
                              }`}
                            >
                              {sc.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteTask(t.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-500/5 hover:bg-red-500/15 text-red-400/60 text-xs transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove task
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddTask && (
        <AddTaskModal
          properties={properties}
          staff={staff}
          onClose={() => setShowAddTask(false)}
          onCreated={() => {
            setShowAddTask(false);
            apiGet<CleaningTask[]>('/cleaning/tasks').then(setTasks);
          }}
        />
      )}

      {showAddStaff && (
        <AddStaffModal
          onClose={() => setShowAddStaff(false)}
          onCreated={() => {
            setShowAddStaff(false);
            apiGet<CleaningStaff[]>('/cleaning/staff').then(setStaff);
          }}
        />
      )}
    </div>
  );
}

function AddTaskModal({ properties, staff, onClose, onCreated }: {
  properties: Property[];
  staff: CleaningStaff[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '');
  const [staffId, setStaffId] = useState('');
  const [status, setStatus] = useState<CleaningStatus>('DIRTY');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  function save() {
    if (!propertyId) return;
    setSaving(true);
    apiPost('/cleaning/tasks', {
      property_id: propertyId,
      staff_id: staffId || null,
      status,
      notes,
      due_date: dueDate || null,
    })
      .then(onCreated)
      .catch((err) => alert(err.message))
      .finally(() => setSaving(false));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#14151c] border border-white/10 rounded-2xl p-6 fade-in-up">
        <h3 className="font-display text-xl text-white mb-4">New Cleaning Task</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Property</label>
            <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="w-full bg-[#1e1f28] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
              {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Assign to</label>
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="w-full bg-[#1e1f28] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
              <option value="">Unassigned</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Status</label>
            <div className="flex gap-2">
              {STATUS_ORDER.map((s) => (
                <button key={s} onClick={() => setStatus(s)} className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  status === s ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].text} border-current` : 'bg-[#1e1f28] border-white/10 text-white/40'
                }`}>{STATUS_CONFIG[s].label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Due date (optional)</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-[#1e1f28] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full bg-[#1e1f28] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create Task
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function AddStaffModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  function save() {
    if (!name) return;
    setSaving(true);
    apiPost('/cleaning/staff', { name, phone })
      .then(onCreated)
      .catch((err) => alert(err.message))
      .finally(() => setSaving(false));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#14151c] border border-white/10 rounded-2xl p-6 fade-in-up">
        <h3 className="font-display text-xl text-white mb-4">Add Staff Member</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-[#1e1f28] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Phone (optional)</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-[#1e1f28] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Add
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}
