import React, { useState } from 'react';
import { getAppConfig } from '../../config';
import { formatArea } from '../../services/polygon';
import {
  Search,
  Eraser,
  FileSpreadsheet,
  FileJson,
  ChevronDown,
  Download,
  Loader2,
  TriangleAlert,
  Info,
} from 'lucide-react';

interface ToolbarProps {
  searching: boolean;
  canSearch: boolean;
  searchDisabledReason?: string | null;
  onSearch: () => void;
  onClear: () => void;
  hasResults: boolean;
  truncated: boolean;
  onExportCsv: () => void;
  onExportXlsx: () => void;
  onExportGeoJson: () => void;
  error?: string | null;
  area: number ;
  invalid: boolean;
}

const MAX_AREA_M2 = getAppConfig().maxPolygonAreaM2;
const MAX_ADDRESS_RESULTS = getAppConfig().maxAddressResults;

export const Toolbar: React.FC<ToolbarProps> = ({
  searching,
  canSearch,
  searchDisabledReason,
  onSearch,
  onClear,
  hasResults,
  truncated,
  onExportCsv,
  onExportXlsx,
  onExportGeoJson,
  error, 
  area, invalid
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);

  return (
    <div className="flex flex-col gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className={`flex items-center gap-2 text-xs bg-white px-3 py-2 rounded-lg border shadow-xs `}> {/*${invalidShape || tooLarge ? 'border-rose-200' : 'border-slate-200'}*/}
          <span className="font-semibold text-slate-700">Oppervlakte:</span>
          <span className={area > MAX_AREA_M2 ? 'text-rose-600 font-semibold' : 'text-slate-600'}>
            {formatArea(area)} (max: {formatArea(MAX_AREA_M2)})
          </span>
          {invalid && <span className="text-rose-500 font-semibold">&mdash; de polygoon kruist zichzelf</span>}
          {area > MAX_AREA_M2 && <span className="text-rose-500">&mdash; boven het maximum van {formatArea(MAX_AREA_M2)}</span>} 
        </div>
        
        <div className="flex items-center gap-2 text-slate-600">
          {truncated && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
              <Info className="w-3.5 h-3.5" />
              Max {MAX_ADDRESS_RESULTS.toLocaleString('nl-BE')} adressen getoond
            </span>
          )}
          {error && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium">
              <TriangleAlert className="w-3.5 h-3.5" />
              {error}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Main search button */}
          <button
            onClick={() => onSearch()}
            disabled={!canSearch || searching}
            title={searchDisabledReason || 'Zoek adressen binnen getekende polygoon'}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium px-3.5 py-1.5 rounded-lg shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {searching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            {searching ? 'Zoeken...' : 'Zoeken'}
          </button>

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={!hasResults}
              className="flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-700 font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              Exporteren
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showExportMenu && (
              <div
                className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg border border-slate-200 shadow-lg py-1 z-50"
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
                  onClick={onExportXlsx}
                  className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Download als Excel (xlsx)
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

          <button
            onClick={onClear}
            disabled={searching}
            title="Tekening en resultaten wissen"
            className="flex items-center gap-1.5 p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Eraser className="w-4 h-4" />
            Data en Tekening wissen.
          </button>
        </div>
      </div>
    </div>
  );
};
