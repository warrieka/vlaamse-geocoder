import React from 'react';
import { getAppConfig } from '@/src/config'; '../../config';
import geolocIcon from '../../assets/Adres.svg';
import gitIcon from '../../assets/github.svg';

interface HeaderProps {
  activeView: 'geocoder' | 'advisor';
  onChangeView: (view: 'geocoder' | 'advisor') => void;
  rowCount: number;
  matchedCount: number;
}

let config = getAppConfig()

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onChangeView,
  rowCount,
  matchedCount,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div>
            <img src={geolocIcon} alt="Header Icon" width={32} height={32} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Vlaamse Adres-Geocoder
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                {config.version}
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
               Geocodering & Lambert 72 / 2008 Transformatie &bull; based on Digitaal Vlaanderen API
            </p>
          </div>
        </div>

        {/* View Switcher Navigation Tabs */}
        {/*  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
          <button
            onClick={() => onChangeView('geocoder')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeView === 'geocoder'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Geocoder & Kaart</span>
            {rowCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                {matchedCount}/{rowCount}
              </span>
            )}
          </button>
        </div> */}

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
