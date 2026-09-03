import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { ColumnMapping, AddressRow } from '../../types';
import { getAppConfig } from '../../config';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  ChevronDown,
  Trash2,
  SlidersHorizontal,
  X,
  ShieldAlert,
} from 'lucide-react';

export type DelimiterType = 'auto' | ';' | ',' | '\t' | '|' | ' ' | 'custom';

interface FileImporterProps {
  onLoadData: (rows: AddressRow[], columns: string[], mapping: ColumnMapping, filename: string) => void;
  onClearData: () => void;
  hasData: boolean;
  columnMapping: ColumnMapping;
  onChangeMapping: (mapping: ColumnMapping) => void;
  columns: string[];
  currentFilename?: string;
  isProcessing: boolean;
}

export const FileImporter: React.FC<FileImporterProps> = ({
  onLoadData,
  onClearData,
  hasData,
  columnMapping,
  onChangeMapping,
  columns,
  currentFilename,
  isProcessing,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [encoding, setEncoding] = useState<'UTF-8' | 'ISO-8859-1'>('UTF-8');
  const [delimiterMode, setDelimiterMode] = useState<DelimiterType>('auto');
  const [customDelimiter, setCustomDelimiter] = useState<string>('');
  const [showMappingDrawer, setShowMappingDrawer] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const config = getAppConfig();

  useEffect(() => {
    if (hasData) {
      console.log(
        '[LocalStorage actief] Uw data en geocodeerresultaten worden automatisch lokaal bewaard in LocalStorage van uw browser.'
      );
    }
  }, [hasData]);

  // Detect column mapping automatically from headers
  const autoDetectMapping = (headers: string[]): ColumnMapping => {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    let street = '';
    let housenumber = '';
    let postalCode = '';
    let municipality = '';

    headers.forEach((h) => {
      const n = normalize(h);
      if (!street && (n.includes('straat') || n.includes('street') || n === 'adres' || n === 'address' || n.includes('thoroughfare'))) {
        street = h;
      } else if (!housenumber && (n.includes('huisnr') || n.includes('huisnummer') || n.includes('nr') || n.includes('hnr') || n === 'no')) {
        housenumber = h;
      } else if (!postalCode && (n.includes('postcode') || n.includes('pc') || n.includes('zip') || n.includes('postal'))) {
        postalCode = h;
      } else if (!municipality && (n.includes('gemeente') || n.includes('stad') || n.includes('city') || n.includes('municipality') || n.includes('district') || n.includes('woonplaats'))) {
        municipality = h;
      }
    });

    return { street, housenumber, postalCode, municipality };
  };

  const getEffectiveDelimiter = (): string => {
    if (delimiterMode === 'custom') return customDelimiter;
    if (delimiterMode === 'auto') return '';
    return delimiterMode;
  };

  const parseFile = (file: File) => {
    setErrorMessage(null);
    const config = getAppConfig();

    // 1. Max file size check
    const maxBytes = config.maxFileSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      const actualMB = (file.size / (1024 * 1024)).toFixed(1);
      setErrorMessage(
        `Het bestand is te groot (${actualMB} MB). Het maximum is ${config.maxFileSizeMB} MB.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const delim = getEffectiveDelimiter();

    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      encoding: encoding,
      ...(delim ? { delimiter: delim } : {}),
      complete: (results) => {
        if (fileInputRef.current) fileInputRef.current.value = '';

        if (!results.data || results.data.length === 0) {
          setErrorMessage('Het gekozen CSV-bestand is leeg of kon niet worden gelezen.');
          return;
        }

        const rawRows = results.data as Record<string, any>[];
        const fields = results.meta.fields || (rawRows[0] ? Object.keys(rawRows[0]) : []);

        // 2. Max columns check
        if (fields.length > config.maxColumns) {
          setErrorMessage(
            `Het CSV-bestand bevat ${fields.length} kolommen. Het maximum toegestane aantal is ${config.maxColumns} kolommen.`
          );
          return;
        }

        // 3. Max rows check (prevents browser lockups on 5000+ rows)
        if (rawRows.length > config.maxRows) {
          setErrorMessage(
            `Het CSV-bestand bevat ${rawRows.length.toLocaleString('nl-BE')} rijen. De maximale limiet is ingesteld op ${config.maxRows.toLocaleString('nl-BE')} rijen om browser crashes en overbelasting te voorkomen.`
          );
          return;
        }

        const mapped = autoDetectMapping(fields);

        const parsedRows: AddressRow[] = rawRows.map((r, i) => ({
          id: `row-${i + 1}`,
          selected: false,
          data: Object.fromEntries(
            Object.entries(r).map(([k, v]) => [k, v !== undefined && v !== null ? String(v) : ''])
          ),
        }));

        onLoadData(parsedRows, fields, mapped, file.name);
      },
      error: (err) => {
        if (fileInputRef.current) fileInputRef.current.value = '';
        console.error('CSV parse error:', err);
        setErrorMessage(`Fout bij het lezen van het CSV-bestand: ${err.message}`);
      },
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseFile(e.target.files[0]);
    }
  };

  return (
    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Upload, Clear & Sample Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,text/csv,application/vnd.ms-excel"
            className="hidden"
            onChange={handleFileChange}
            disabled={isProcessing}
          />

          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium px-3 py-1.5 rounded-lg shadow-xs transition-colors disabled:opacity-40"
            title="Kies een CSV bestand van uw computer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-white" />
            <span>CSV Importeren</span>
          </button>

          {/* Clear Button (Right next to Import Button) */}
          <button
            type="button"
            onClick={onClearData}
            disabled={!hasData || isProcessing}
            className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 font-medium px-3 py-1.5 rounded-lg border border-rose-200 shadow-2xs transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Geladen CSV en alle data verwijderen (wist ook uit browseropslag)"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>CSV & Data Wissen</span>
          </button>

          {/* Separator / Delimiter Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 text-slate-600">
            <SlidersHorizontal className="w-3 h-3 text-slate-500" />
            <span className="font-medium text-slate-700">Scheidingsteken:</span>
            <select
              value={delimiterMode}
              onChange={(e) => setDelimiterMode(e.target.value as DelimiterType)}
              disabled={isProcessing}
              className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
              title="Kies of specificeer het scheidingsteken van uw CSV-bestand"
            >
              <option value="auto">Automatisch detecteren</option>
              <option value=";">Puntkomma (;)</option>
              <option value=",">Komma (,)</option>
              <option value="&#9;">Tab (\t)</option>
              <option value="|">Pipe (|)</option>
              {/* <option value=" ">Spatie ( )</option> */}
              <option value="custom">Aangepast...</option>
            </select>

            {delimiterMode === 'custom' && (
              <input
                type="text"
                value={customDelimiter}
                onChange={(e) => setCustomDelimiter(e.target.value)}
                placeholder="bv. ^"
                maxLength={4}
                className="w-14 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-center font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                title="Voer uw eigen scheidingsteken in (bv. ^, ~, :)"
                autoFocus
              />
            )}
          </div>

          {/* Encoding selector */}
          <div className="flex items-center gap-1 text-slate-500">
            <span>Codering:</span>
            <select
              value={encoding}
              onChange={(e) => setEncoding(e.target.value as any)}
              disabled={isProcessing}
              className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-xs text-slate-700"
            >
              <option value="UTF-8">UTF-8</option>
              <option value="ISO-8859-1">ISO-8859-1 (Excel / ANSI)</option>
            </select>
          </div>
        </div>

        {/* Current File indicator & Column Mapping trigger */}
        <div className="flex items-center gap-2">
          {currentFilename && (
            <span className="flex items-center gap-1 text-slate-600 font-medium bg-slate-50 px-2 py-1 rounded border border-slate-200">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              {currentFilename}
            </span>
          )}

          {currentFilename && (
            <button
              onClick={() => setShowMappingDrawer(!showMappingDrawer)}
              className="flex items-center gap-1 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded font-medium transition-colors"
            >
              Kolomkoppeling
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${showMappingDrawer ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Parse Error Banner */}
      {errorMessage && (
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 p-0.5 rounded hover:bg-rose-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Drag and Drop Zone (Visible when no data loaded) */}
      {!hasData && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-indigo-500 bg-indigo-50/50'
              : 'border-slate-200 hover:border-slate-300 bg-slate-50/30'
          }`}
        >
          <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-800 mb-0.5">
            Sleep een CSV-bestand hiernaartoe, of klik om te bladeren
          </p>
          <p className="text-[11px] text-slate-500">
            Scheidingsteken:{' '}
            <strong className="text-slate-700 font-medium">
              {delimiterMode === 'auto'
                ? 'Automatisch detecteren'
                : delimiterMode === 'custom'
                ? `Aangepast: "${customDelimiter || '(leeg)'}"`
                : delimiterMode === '\t'
                ? 'Tab (\\t)'
                : delimiterMode === ' '
                ? 'Spatie ( )'
                : delimiterMode}
            </strong>{' '}
            &bull; Codering: {encoding} &bull; Kolommen worden automatisch herkend
          </p>
          <div className="mt-2.5 inline-flex flex-wrap items-center justify-center gap-1.5 text-[10.5px] text-slate-500 bg-white/80 border border-slate-200 px-2.5 py-1 rounded-md shadow-2xs">
            <span className="font-semibold text-slate-700">Limieten:</span>
            <span>max. {config.maxRows.toLocaleString('nl-BE')} rijen</span>
            <span>&bull;</span>
            <span>max. {config.maxColumns} kolommen</span>
            <span>&bull;</span>
            <span>max. {config.maxFileSizeMB} MB</span>
            <span className="text-slate-400 font-mono text-[10px] ml-1"></span>
          </div>
        </div>
      )}

      {/* Column Mapping Selectors (Shown when toggled or first loaded) */}
      {currentFilename && showMappingDrawer && (
        <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200 text-xs flex flex-col gap-2">
          <div className="font-semibold text-slate-800 flex items-center justify-between">
            <span>Koppel de adreskolommen uit uw CSV:</span>
            <span className="text-[11px] text-slate-500 font-normal">
              Automatisch gedetecteerd op basis van kolomnamen
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className="block text-slate-600 mb-1 font-medium">Straatnaam:</label>
              <select
                value={columnMapping.street}
                onChange={(e) =>
                  onChangeMapping({ ...columnMapping, street: e.target.value })
                }
                disabled={isProcessing}
                className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-800"
              >
                <option value="">&lt;Geen&gt;</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-medium">Huisnummer:</label>
              <select
                value={columnMapping.housenumber}
                onChange={(e) =>
                  onChangeMapping({ ...columnMapping, housenumber: e.target.value })
                }
                disabled={isProcessing}
                className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-800"
              >
                <option value="">&lt;Geen&gt;</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-medium">Postcode:</label>
              <select
                value={columnMapping.postalCode}
                onChange={(e) =>
                  onChangeMapping({ ...columnMapping, postalCode: e.target.value })
                }
                disabled={isProcessing}
                className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-800"
              >
                <option value="">&lt;Geen&gt;</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-medium">Gemeente / Stad:</label>
              <select
                value={columnMapping.municipality}
                onChange={(e) =>
                  onChangeMapping({ ...columnMapping, municipality: e.target.value })
                }
                disabled={isProcessing}
                className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-800"
              >
                <option value="">&lt;Geen&gt;</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
