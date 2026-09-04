import React, { useState, useEffect } from 'react';
import {
  AddressRow,
  ColumnMapping,
  CrsId,
  GeocoderId,
  GeocodeResult,
} from './types';
import { Header } from './components/Header/Header';
import { FileImporter } from './components/Upload/FileImporter';
import { GeocoderToolbar } from './components/Toolbar/GeocoderToolbar';
import { ModernMap } from './components/Map/ModernMap';
import { DataTable } from './components/Table/DataTable';
import { PinpointModal } from './components/Modal/PinpointModal';
import { useGeocoderRunner } from './hooks/useGeocoderRunner';
import { exportRowsToCsv, exportRowsToGeoJson } from './services/export';
import { fromWgs84 } from './services/projections';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface PersistedState {
  rows: AddressRow[];
  columns: string[];
  columnMapping: ColumnMapping;
  currentFilename: string;
  selectedGeocoder: GeocoderId;
  selectedCrs: CrsId;
  lastSavedAt?: string;
}

const STORAGE_KEY = 'flanders_geocoder_state_v2';

const loadSavedState = (): PersistedState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.rows)) {
      return parsed;
    }
  } catch (err) {
    console.warn('Fout bij uitlezen van LocalStorage:', err);
  }
  return null;
};

export default function App() {
  const [savedInitial] = useState(() => loadSavedState());

  const [activeView, setActiveView] = useState<'geocoder' | 'advisor'>('geocoder');
  const [rows, setRows] = useState<AddressRow[]>(() => savedInitial?.rows ?? []);
  const [columns, setColumns] = useState<string[]>(() => savedInitial?.columns ?? [
  ]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>(() => savedInitial?.columnMapping ?? {
    street: '',
    housenumber: '',
    postalCode: '',
    municipality: '',
  });
  const [currentFilename, setCurrentFilename] = useState<string>(
    () => savedInitial?.currentFilename ?? ''
  );
  const [selectedGeocoder, setSelectedGeocoder] = useState<GeocoderId>(
    () => savedInitial?.selectedGeocoder ?? 'geoloc'
  );
  const [selectedCrs, setSelectedCrs] = useState<CrsId>(
    () => savedInitial?.selectedCrs ?? 'EPSG:3812'
  ); // Lambert 2008 (Belgium) default
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [pinpointRow, setPinpointRow] = useState<AddressRow | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  const {
    isProcessing,
    isPaused,
    stats,
    runBatch,
    performGeocode,
    pauseResume,
    stop,
    setStats,
  } = useGeocoderRunner();

  // Persist state in localStorage with 300ms debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (rows.length === 0 && !currentFilename) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }
        const stateToSave: PersistedState = {
          rows,
          columns,
          columnMapping,
          currentFilename,
          selectedGeocoder,
          selectedCrs,
          lastSavedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      } catch (err) {
        console.warn('Opslaan in LocalStorage mislukt:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [rows, columns, columnMapping, currentFilename, selectedGeocoder, selectedCrs]);

  // Keep stats in sync when rows change manually
  useEffect(() => {
    let matched = 0;
    let partial = 0;
    let notFound = 0;
    let errors = 0;
    let manual = 0;

    rows.forEach((r) => {
      if (r.result?.status === 'exact') matched++;
      else if (r.result?.status === 'partial') partial++;
      else if (r.result?.status === 'manual') manual++;
      else if (r.result?.status === 'not_found') notFound++;
      else if (r.result?.status === 'error') errors++;
    });

    setStats((prev) => ({
      ...prev,
      total: rows.length,
      matched,
      partial,
      notFound,
      errors,
      manual,
    }));
  }, [rows]);

  // Handle Load New File
  const handleLoadData = (
    newRows: AddressRow[],
    newColumns: string[],
    newMapping: ColumnMapping,
    filename: string
  ) => {
    setRows(newRows);
    setColumns(newColumns);
    setColumnMapping(newMapping);
    setCurrentFilename(filename);
    setActiveRowId(null);
  };

  // Row update callback
  const handleUpdateRowResult = (rowId: string, result: GeocodeResult) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, result } : r))
    );
  };

  // Geocode All
  const handleGeocodeAll = () => {
    runBatch(
      rows,
      rows,
      selectedGeocoder,
      selectedCrs,
      columnMapping,
      handleUpdateRowResult
    );
  };

  // Geocode Selected Rows
  const handleGeocodeSelected = () => {
    const selectedRows = rows.filter((r) => r.selected);
    runBatch(
      selectedRows,
      rows,
      selectedGeocoder,
      selectedCrs,
      columnMapping,
      handleUpdateRowResult
    );
  };

  // Geocode Single Row
  const handleGeocodeSingleRow = async (rowId: string) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    try {
      const res = await performGeocode(row, selectedGeocoder, selectedCrs, columnMapping);
      handleUpdateRowResult(rowId, res);
    } catch (err) {
      console.error(err);
    }
  };

  // Table Row selection
  const handleToggleRowSelect = (rowId: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected })));
  };

  // Inline edit
  const handleUpdateRowData = (rowId: string, field: string, value: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId ? { ...r, data: { ...r.data, [field]: value } } : r
      )
    );
  };

  const handleDeleteRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
    if (activeRowId === rowId) setActiveRowId(null);
  };

  // Pinpoint modal save
  const handleSavePinpoint = (
    rowId: string,
    lat: number,
    lon: number,
    matchedAddress?: string
  ) => {
    const [targetX, targetY] = fromWgs84(lon, lat, selectedCrs);
    const [l72X, l72Y] = fromWgs84(lon, lat, 'EPSG:31370');
    const [l2008X, l2008Y] = fromWgs84(lon, lat, 'EPSG:3812');

    const result: GeocodeResult = {
      status: 'manual',
      statusLabel: 'Manueel geprikt',
      x: targetX,
      y: targetY,
      lat,
      lon,
      x_lambert72: l72X,
      y_lambert72: l72Y,
      x_lambert2008: l2008X,
      y_lambert2008: l2008Y,
      matchedAddress: matchedAddress || 'Manueel geprikte locatie',
      matchType: 'manual_pin',
    };

    handleUpdateRowResult(rowId, result);
    setActiveRowId(rowId);
  };

  // Recalculate target CRS coordinates when user switches CRS dropdown
  const handleChangeCrs = (newCrs: CrsId) => {
    setSelectedCrs(newCrs);
    setRows((prev) =>
      prev.map((row) => {
        if (!row.result || !row.result.lat || !row.result.lon) return row;
        const [targetX, targetY] = fromWgs84(row.result.lon, row.result.lat, newCrs);
        return {
          ...row,
          result: {
            ...row.result,
            x: targetX,
            y: targetY,
          },
        };
      })
    );
  };

  // Clear data & local storage
  const handleClear = () => {
    if (rows.length === 0 && !currentFilename) return;
    setShowClearConfirm(true);
  };

  const handleConfirmClear = () => {
    setRows([]);
    setColumns([]);
    setCurrentFilename('');
    setColumnMapping({ street: '', housenumber: '', postalCode: '', municipality: '' });
    setActiveRowId(null);
    setPinpointRow(null);
    setShowClearConfirm(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error(err);
    }
  };

  const matchedCount = rows.filter(
    (r) => r.result?.status === 'exact' || r.result?.status === 'manual'
  ).length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Application Header */}
      <Header
        activeView={activeView}
        onChangeView={setActiveView}
        rowCount={rows.length}
        matchedCount={matchedCount}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4">
          {/* Main Geocoder & Map Workspace */}
          <div className="flex flex-col gap-4">
            {/* File Importer and Sample loader */}
            <FileImporter
              onLoadData={handleLoadData}
              onClearData={handleClear}
              hasData={rows.length > 0 || !!currentFilename}
              columnMapping={columnMapping}
              onChangeMapping={setColumnMapping}
              columns={columns}
              currentFilename={currentFilename}
              isProcessing={isProcessing}
            />

            {/* Geocoder Controls & Progress Bar */}
            <GeocoderToolbar
              selectedGeocoder={selectedGeocoder}
              onChangeGeocoder={setSelectedGeocoder}
              selectedCrs={selectedCrs}
              onChangeCrs={handleChangeCrs}
              isProcessing={isProcessing}
              isPaused={isPaused}
              onGeocodeAll={handleGeocodeAll}
              onGeocodeSelected={handleGeocodeSelected}
              onPauseResume={pauseResume}
              onStop={stop}
              onExportCsv={() => exportRowsToCsv(rows, selectedCrs, currentFilename)}
              onExportGeoJson={() =>
                exportRowsToGeoJson(rows, selectedCrs, currentFilename)
              }
              onClear={handleClear}
              stats={stats}
              hasRows={rows.length > 0}
              selectedCount={rows.filter((r) => r.selected).length}
            />

            {/* Interactive Map Visualizer */}
            <ModernMap
              rows={rows}
              activeRowId={activeRowId}
              targetCrs={selectedCrs}
              onSelectRow={(id) => setActiveRowId(id)}
              height="380px"
            />

            {/* Data Table with Virtual Search, Badges & Inline Edits */}
            <DataTable
              rows={rows}
              columns={columns}
              targetCrs={selectedCrs}
              activeRowId={activeRowId}
              onSelectRow={(id) => setActiveRowId(id)}
              onToggleRowSelect={handleToggleRowSelect}
              onSelectAll={handleSelectAll}
              onOpenPinpoint={(id) => {
                const target = rows.find((r) => r.id === id);
                if (target) setPinpointRow(target);
              }}
              onGeocodeSingleRow={handleGeocodeSingleRow}
              onUpdateRowData={handleUpdateRowData}
              onDeleteRow={handleDeleteRow}
              isProcessing={isProcessing}
            />
          </div>
      </main>

      {/* Interactive Pinpoint Modal */}
      <PinpointModal
        isOpen={!!pinpointRow}
        row={pinpointRow}
        targetCrs={selectedCrs}
        onClose={() => setPinpointRow(null)}
        onSave={handleSavePinpoint}
      />

      {/* In-App Confirmation Modal for Clearing Data & CSV */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">
                    CSV & gegevens wissen?
                  </h3>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Weet u zeker dat u het actieve bestand{' '}
                  <span className="font-semibold text-slate-800">
                    {currentFilename ? `"${currentFilename}"` : 'met alle records'}
                  </span>{' '}
                  en alle geocodering-resultaten wilt wissen?
                </p>
                <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 mt-2">
                  <div className="flex items-center gap-1.5 font-medium text-slate-700">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span><b>Let op:</b> De ingeladen wordt permanent verwijderd.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ja, alles wissen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
