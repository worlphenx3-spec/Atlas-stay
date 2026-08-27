import { useState, useEffect } from 'react';
import { MapPin, LayoutDashboard, Loader2, Home, ExternalLink, Globe, Zap } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import GuestView from '@/views/GuestView';
import HostDashboard from '@/views/HostDashboard';
import SitePreview from '@/views/SitePreview';
import AuthModal from '@/components/AuthModal';
import Footer from '@/components/Footer';

type Route = 'guest' | 'host' | 'preview';

function getRouteFromHash(): Route {
  const hash = window.location.hash.replace('#/', '');
  if (hash === 'host') return 'host';
  if (hash.startsWith('preview/')) return 'preview';
  return 'guest';
}

function getPreviewIdFromHash(): string | null {
  const hash = window.location.hash.replace('#/', '');
  if (hash.startsWith('preview/')) return hash.replace('preview/', '');
  return null;
}

export default function App() {
  const { user, role, loading, signIn, signUp } = useAuth();
  const [route, setRoute] = useState<Route>(getRouteFromHash());
  const [authModal, setAuthModal] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(getPreviewIdFromHash());

  useEffect(() => {
    const onHashChange = () => {
      setRoute(getRouteFromHash());
      setPreviewId(getPreviewIdFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function navigate(r: Route) {
    if (r === 'guest') {
      window.location.hash = '';
    } else if (r === 'host') {
      window.location.hash = '#/host';
    }
    setRoute(r);
  }

  function navigateToPreview(siteId: string) {
    window.location.hash = `#/preview/${siteId}`;
    setPreviewId(siteId);
    setRoute('preview');
  }

  // Preview route — accessible to anyone, shows the generated site
  if (route === 'preview' && previewId) {
    return <SitePreview siteId={previewId} onBack={() => navigate('host')} />;
  }

  // Host route — unified operations hub (auth-gated)
  if (route === 'host') {
    if (loading) return <FullScreenLoader />;
    if (user && (role === 'host' || role === 'staff')) {
      return (
        <div className="min-h-screen bg-[#0a0b0f] flex flex-col">
          <div className="flex-1">
            <TopNav route={route} navigate={navigate} />
            <HostDashboard onPreviewSite={navigateToPreview} />
          </div>
          <Footer />
        </div>
      );
    }
    // Not authenticated — show login with 1-click demo bypass
    return (
      <>
        <LoginScreen
          onLogin={() => setAuthModal(true)}
          onDemoLogin={async () => {
            try {
              await signIn('host@atlasos.demo', 'demo1234');
            } catch {
              // If demo user doesn't exist yet, sign up then sign in
              try {
                await signUp('host@atlasos.demo', 'demo1234');
              } catch {
                /* ignore — modal will show error */
              }
            }
          }}
        />
        {authModal && <AuthModal mode="host" onClose={() => setAuthModal(null)} />}
      </>
    );
  }

  // Guest route (default, public)
  return (
    <div className="min-h-screen bg-[#0a0b0f] flex flex-col">
      <TopNav route={route} navigate={navigate} />
      <div className="flex-1">
        <GuestView />
      </div>
      <Footer />
    </div>
  );
}

function TopNav({ route, navigate }: { route: Route; navigate: (r: Route) => void }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-[#0a0b0f]/80 backdrop-blur-lg border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <button onClick={() => navigate('guest')} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-lg text-white">Atlas Stay</span>
        </button>

        <div className="flex gap-1 bg-[#14151c] border border-white/5 rounded-xl p-1">
          <button
            onClick={() => navigate('guest')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              route === 'guest' ? 'bg-emerald-500 text-white' : 'text-white/50 hover:text-white'
            }`}
          >
            <Home className="w-3.5 h-3.5" /> Explore
          </button>
          <button
            onClick={() => navigate('host')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              route === 'host' ? 'bg-emerald-500 text-white' : 'text-white/50 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> Host Hub
          </button>
        </div>

        <a
          href="https://sxmstays.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" /> SXM Stays Marketplace
        </a>
      </div>
    </nav>
  );
}

function LoginScreen({ onLogin, onDemoLogin }: { onLogin: () => void; onDemoLogin: () => Promise<void> }) {
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  async function handleDemo() {
    setDemoLoading(true);
    setDemoError(null);
    try {
      await onDemoLogin();
    } catch (err) {
      setDemoError((err as Error).message);
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1b26] via-[#0a0b0f] to-[#0a0b0f]" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl" />
      <div className="relative max-w-sm w-full text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <span className="font-display text-2xl text-white">Host Operations Hub</span>
        </div>
        <p className="text-white/50 mb-6">
          Sign in to manage your websites, properties, housekeeping, and financials — all in one workspace.
        </p>

        {/* 1-click demo bypass */}
        <button
          onClick={handleDemo}
          disabled={demoLoading}
          className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mb-3"
        >
          {demoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {demoLoading ? 'Signing in...' : '1-Click Demo Login'}
        </button>

        <button
          onClick={onLogin}
          className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-medium transition-colors border border-white/10 mb-4"
        >
          Sign in with different account
        </button>

        {demoError && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">
            {demoError}
          </div>
        )}

        <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-left">
          <p className="text-xs text-white/40 mb-1">Demo credentials (auto-filled):</p>
          <p className="text-xs text-white/60 font-mono">host@atlasos.demo / demo1234</p>
        </div>
        <button
          onClick={() => { window.location.hash = ''; window.location.reload(); }}
          className="mt-4 text-sm text-white/30 hover:text-white/60 transition-colors"
        >
          ← Back to public site
        </button>
      </div>
    </div>
  );
}

function FullScreenLoader() {
  return (
    <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
    </div>
  );
}
