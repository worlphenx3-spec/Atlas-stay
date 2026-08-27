import { MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#0a0b0f] py-4 px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-1.5 text-sm text-white/30">
        <span>Powered by</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-emerald-500 flex items-center justify-center">
            <MapPin className="w-2.5 h-2.5 text-white" />
          </div>
          <span className="font-display text-white/50">Atlas Stay</span>
        </div>
      </div>
    </footer>
  );
}
