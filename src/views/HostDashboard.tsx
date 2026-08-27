import { useState } from 'react';
import { Globe, Building2, Sparkles, DollarSign, Settings, LogOut, MapPin, Server, Calendar } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import PropertyManagement from '@/views/PropertyManagement';
import ReservationsLedger from '@/views/ReservationsLedger';
import CleaningTracker from '@/views/CleaningTracker';
import LedgerView from '@/views/LedgerView';
import OrgSettings from '@/views/OrgSettings';

type Tab = 'websites' | 'properties' | 'turnover' | 'ledger' | 'settings';

const TABS: { id: Tab; label: string; icon: typeof Globe; shortLabel: string }[] = [
  { id: 'websites', label: 'My Websites & Domains', icon: Globe, shortLabel: 'Websites' },
  { id: 'properties', label: 'Properties & Rates', icon: Building2, shortLabel: 'Properties' },
  { id: 'turnover', label: 'Turnover & Housekeeping', icon: Sparkles, shortLabel: 'Turnover' },
  { id: 'ledger', label: 'Financial Ledger', icon: DollarSign, shortLabel: 'Ledger' },
  { id: 'settings', label: 'Settings', icon: Settings, shortLabel: 'Settings' },
];

interface HostDashboardProps {
  onPreviewSite: (siteId: string) => void;
}

export default function HostDashboard({ onPreviewSite }: HostDashboardProps) {
  const { user, org, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('websites');

  return (
    <div className="min-h-screen bg-[#0a0b0f] flex flex-col">
      <div className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl text-white">Host Operations Hub</h1>
              <p className="text-xs text-white/40">
                {org?.business_name || 'Atlas Stay'}
                {user && <span className="ml-2">· {user.email}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 mb-6 border-b border-white/5 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? 'border-emerald-500 text-white'
                    : 'border-transparent text-white/40 hover:text-white/70'
                }`}
              >
                <Icon className="w-4 h-4" /> {t.shortLabel}
              </button>
            );
          })}
        </div>

        <div className="fade-in-up" key={tab}>
          {tab === 'websites' && <WebsiteManager onPreviewSite={onPreviewSite} onGoToProperties={() => setTab('properties')} />}
          {tab === 'properties' && <PropertyManagement onPreviewSite={onPreviewSite} />}
          {tab === 'turnover' && <CleaningTracker />}
          {tab === 'ledger' && <LedgerView />}
          {tab === 'settings' && <OrgSettings />}
        </div>
      </div>
    </div>
  );
}

function WebsiteManager({ onPreviewSite, onGoToProperties }: { onPreviewSite: (id: string) => void; onGoToProperties: () => void }) {
  return <PropertyManagement onPreviewSite={onPreviewSite} websiteMode initialView="websites" />;
}
