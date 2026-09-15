import React, { useEffect, useRef, useState } from 'react';
import { getAppConfig } from '../../config';
import geolocIcon from '../../assets/Adres.svg';
import gitIcon from '../../assets/github.svg';
import { Layers, Lightbulb, Download, ChevronDown } from 'lucide-react';

export type AppView = 'geocoder' | 'addressSearch' | 'advisor';

interface HeaderProps {
  activeView: AppView;
  onChangeView: (view: AppView) => void;
  rowCount: number;
  matchedCount: number;
}

let config = getAppConfig()

const VIEW_META: Record<AppView, { icon: React.ReactNode; label: string; title: string }> = {
  geocoder: {
    icon: <Layers className="w-3.5 h-3.5 text-indigo-600" />,
    label: 'Geocoder',
    title: 'Addressen geocoderen uit CSV',
  },
  addressSearch: {
    icon: <Download className="w-3.5 h-3.5 text-indigo-600" />,
    label: 'Adressenregister',
    title: 'Addressen donwloaden uit Adressenregister',
  },
  advisor: {
    icon: <Lightbulb className="w-3.5 h-3.5 text-amber-600" />,
    label: 'Info',
    title: 'Meer info en Help',
  },
};

const VIEW_ORDER: AppView[] = ['geocoder', 'addressSearch', 'advisor'];

function ViewTabButton({
  view,
  activeView,
  onChangeView,
  rowCount,
  matchedCount,
  onSelect,
}: {
  view: AppView;
  activeView: AppView;
  onChangeView: (view: AppView) => void;
  rowCount: number;
  matchedCount: number;
  onSelect?: (view: AppView) => void;
}) {
  const { icon, label, title } = VIEW_META[view];
  const isActive = activeView === view;
  return (
    <button
      onClick={() => {
        onChangeView(view);
        onSelect?.(view);
      }}
      aria-pressed={isActive}
      aria-current={isActive ? 'page' : undefined}
      title={title}
      className={`w-full flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
        isActive
          ? 'bg-white text-slate-900 shadow-xs font-semibold'
          : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {icon}
      <span>{label}</span>
      {view === 'geocoder' && rowCount > 0 && (
        <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
          {matchedCount}/{rowCount}
        </span>
      )}
    </button>
  );
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onChangeView,
  rowCount,
  matchedCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [mobileMenuOpen]);

  const activeMeta = VIEW_META[activeView];

  const handleSelectMobile = (view: AppView) => {
    onChangeView(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 relative flex items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div>
            <img src={geolocIcon} alt="Header Icon" width={32} height={32} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Vlaamse Adres-Geocoder
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                {config.version}
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
               Geocodering &bull; Download Adressen uit Adresseenregister
            </p>
          </div>
        </div>

        {/* View Switcher Navigation Tabs (desktop) */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
          {VIEW_ORDER.map((view) => (
            <ViewTabButton
              key={view}
              view={view}
              activeView={activeView}
              onChangeView={onChangeView}
              rowCount={rowCount}
              matchedCount={matchedCount}
            />
          ))}
        </div>

        {/* Mobile Menu */}
        <div ref={mobileMenuRef} className="sm:hidden">
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-expanded={mobileMenuOpen}
            aria-haspopup="menu"
            title="Menu"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
          >
            {activeMeta.icon}
            <span className="max-w-28 truncate">{activeMeta.label}</span>
            {activeView === 'geocoder' && rowCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                {matchedCount}/{rowCount}
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                mobileMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {mobileMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-lg p-1 flex flex-col gap-1"
            >
              {VIEW_ORDER.map((view) => (
                <ViewTabButton
                  key={view}
                  view={view}
                  activeView={activeView}
                  onChangeView={handleSelectMobile}
                  rowCount={rowCount}
                  matchedCount={matchedCount}
                />
              ))}
            </div>
          )}
        </div>

        {/* External Link & Team Reference */}
        <div className="hidden lg:flex items-center gap-3 text-xs text-slate-500">
          <a
            href="https://github.com/warrieka/vlaamse-geocoder"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            title="Bekijk de broncode op GitHub"
          >
            <img src={gitIcon} alt="Github" width={22} height={22} />
          </a>
        </div>
      </div>
    </header>
  );
};
