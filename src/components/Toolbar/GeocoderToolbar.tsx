import React, { useState } from 'react';
import { CrsId, GeocoderId, GeocodeStats } from '../../types';
import { CRS_DEFINITIONS } from '../../services/projections';
import {
  Play,
  CheckSquare,
  Pause,
  Square,
  Download,
  Trash2,
  FileSpreadsheet,
  FileJson,
  ChevronDown,
  Loader2,
} from 'lucide-react';

interface GeocoderToolbarProps {
  selectedGeocoder: GeocoderId;
  onChangeGeocoder: (id: GeocoderId) => void;
  selectedCrs: CrsId;
  onChangeCrs: (crs: CrsId) => void;
  isProcessing: boolean;
  isPaused: boolean;
  onGeocodeAll: () => void;
  onGeocodeSelected: () => void;
  onPauseResume: () => void;
  onStop: () => void;
  onExportCsv: () => void;
  onExportGeoJson: () => void;
  onClear: () => void;
  stats: GeocodeStats;
  hasRows: boolean;
  selectedCount: number;
}

export const GeocoderToolbar: React.FC<GeocoderToolbarProps> = ({
  selectedGeocoder,
  onChangeGeocoder,
  selectedCrs,
  onChangeCrs,
  isProcessing,
  isPaused,
  onGeocodeAll,
  onGeocodeSelected,
  onPauseResume,
  onStop,
  onExportCsv,
  onExportGeoJson,
  onClear,
  stats,
  hasRows,
  selectedCount,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);

  const percent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
      {/* Top Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Geocoder API Selector & CRS Selector */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Geocoder Service Selector */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="geocoder-select" className="font-semibold text-slate-700">
              Geocoder API:
            </label>
            <select
              id="geocoder-select"
              value={selectedGeocoder}
              onChange={(e) => onChangeGeocoder(e.target.value as GeocoderId)}
              disabled={isProcessing}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-slate-900 focus:outline-none"
            >
              <option value="geoloc">
                Digitaal Vlaanderen Geolocation v4 (Aanbevolen)
              </option>
              <option value="basisregisters">
                Basisregisters Vlaanderen v2 (via Adresmatch)
              </option>
              <option value="nominatim">OpenStreetMap Nominatim (beperkt tot België)</option>
            </select>
          </div>

          {/* Coordinate Reference System Selector */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="crs-select" className="font-semibold text-slate-700">
              Doelprojectie (CRS):
            </label>
            <select
              id="crs-select"
              value={selectedCrs}
              onChange={(e) => onChangeCrs(e.target.value as CrsId)}
              disabled={isProcessing}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-slate-900 focus:outline-none"
            >
              {Object.values(CRS_DEFINITIONS).map((crs) => (
                <option key={crs.id} value={crs.id}>
                  {crs.name} ({crs.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Geocode Buttons */}
          {!isProcessing ? (
            <>
              <button
                onClick={onGeocodeAll}
                disabled={!hasRows}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium px-3 py-1.5 rounded-lg shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Geocodeer alle rijen"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Alles Geocoderen
              </button>
              <button
                onClick={onGeocodeSelected}
                disabled={!hasRows || selectedCount === 0}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium px-3 py-1.5 rounded-lg border border-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Geocodeer enkel geselecteerde rijen"
              >
                <CheckSquare className="w-3.5 h-3.5 text-slate-600" />
                Selectie ({selectedCount})
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onPauseResume}
                className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium px-3 py-1.5 rounded-lg shadow-xs transition-colors"
              >
                {isPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> Hervatten
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" /> Pauzeren
                  </>
                )}
              </button>
              <button
                onClick={onStop}
                className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium px-3 py-1.5 rounded-lg shadow-xs transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" /> Stoppen
              </button>
            </div>
          )}

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={!hasRows}
              className="flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-700 font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-xs transition-colors disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              Exporteren
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showExportMenu && (
              <div
                className="absolute right-0 mt-1 w-44 bg-white rounded-lg border border-slate-200 shadow-lg py-1 z-30"
                onClick={() => setShowExportMenu(false)}
              >
                <button
                  onClick={onExportCsv}
                  className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Download als CSV
                </button>
                <button
                  onClick={onExportGeoJson}
                  className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <FileJson className="w-3.5 h-3.5 text-indigo-600" />
                  Download als GeoJSON (QGIS)
                </button>
              </div>
            )}
          </div>

          {/* Clear Button */}
          <button
            onClick={onClear}
            disabled={!hasRows || isProcessing}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30"
            title="Tabel en geocodeerresultaten leegmaken"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar & Processing Stats (Visible when processing or completed) */}
      {(isProcessing || stats.completed > 0) && (
        <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
              <span className="font-medium">
                {isProcessing
                  ? isPaused
                    ? 'Gepauzeerd...'
                    : 'Bezig met geocoderen...'
                  : 'Geocodering voltooid'}
              </span>
              <span className="text-slate-400 font-mono">
                {stats.completed} / {stats.total} ({percent}%)
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-emerald-700 font-medium">
                ✓ {stats.matched} exact
              </span>
              <span className="text-amber-700 font-medium">
                ~ {stats.partial} benaderend
              </span>
              {stats.manual > 0 && (
                <span className="text-indigo-700 font-medium">
                  📍 {stats.manual} manueel
                </span>
              )}
              <span className="text-rose-600 font-medium">
                ✗ {stats.notFound + stats.errors} niet gevonden
              </span>
            </div>
          </div>

          {/* Bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{
                width: `${stats.total > 0 ? (stats.matched / stats.total) * 100 : 0}%`,
              }}
            />
            <div
              className="bg-amber-400 h-full transition-all duration-300"
              style={{
                width: `${stats.total > 0 ? (stats.partial / stats.total) * 100 : 0}%`,
              }}
            />
            <div
              className="bg-indigo-500 h-full transition-all duration-300"
              style={{
                width: `${stats.total > 0 ? (stats.manual / stats.total) * 100 : 0}%`,
              }}
            />
            <div
              className="bg-rose-400 h-full transition-all duration-300"
              style={{
                width: `${
                  stats.total > 0
                    ? ((stats.notFound + stats.errors) / stats.total) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
