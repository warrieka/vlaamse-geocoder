import React, { useState, useMemo, useEffect } from 'react';
import { AddressRow, CrsId } from '../../types';
import { formatCoordinates } from '../../services/projections';
import {
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  HelpCircle,
  Compass,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  Play,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface DataTableProps {
  rows: AddressRow[];
  columns: string[];
  targetCrs: CrsId;
  activeRowId: string | null;
  onSelectRow: (rowId: string) => void;
  onToggleRowSelect: (rowId: string) => void;
  onSelectAll: (selected: boolean) => void;
  onOpenPinpoint: (rowId: string) => void;
  onGeocodeSingleRow: (rowId: string) => void;
  onUpdateRowData: (rowId: string, field: string, value: string) => void;
  onDeleteRow?: (rowId: string) => void;
  isProcessing: boolean;
}

export const DataTable: React.FC<DataTableProps> = ({
  rows,
  columns,
  targetCrs,
  activeRowId,
  onSelectRow,
  onToggleRowSelect,
  onSelectAll,
  onOpenPinpoint,
  onGeocodeSingleRow,
  onUpdateRowData,
  onDeleteRow,
  isProcessing,
}) => {
  const PAGE_SIZE = 50;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'matched' | 'partial' | 'unmatched' | 'selected'>('all');
  const [editingCell, setEditingCell] = useState<{ rowId: string; col: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // Filter by selection / status
      if (statusFilter === 'selected' && !row.selected) return false;
      if (statusFilter === 'matched' && row.result?.status !== 'exact' && row.result?.status !== 'manual') return false;
      if (statusFilter === 'partial' && row.result?.status !== 'partial') return false;
      if (statusFilter === 'unmatched' && row.result?.status !== 'not_found' && row.result?.status !== 'error') return false;

      // Filter by text
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const matchInCols = Object.values(row.data).some((val) =>
        String(val || '').toLowerCase().includes(term)
      );
      const matchInResult =
        row.result?.matchedAddress?.toLowerCase().includes(term) ||
        row.result?.statusLabel?.toLowerCase().includes(term);

      return matchInCols || matchInResult;
    });
  }, [rows, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const updateSearchTerm = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const updateStatusFilter = (value: typeof statusFilter) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const allSelected = rows.length > 0 && rows.every((r) => r.selected);
  const someSelected = rows.some((r) => r.selected) && !allSelected;

  const renderStatusBadge = (row: AddressRow) => {
    const res = row.result;
    if (!res || res.status === 'idle') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
          <Clock className="w-3 h-3" /> Nog niet geocodeerd
        </span>
      );
    }
    if (res.status === 'exact') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          {res.statusLabel || 'Exact'}
        </span>
      );
    }
    if (res.status === 'manual') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
          <MapPin className="w-3 h-3 text-indigo-600" />
          Manueel geprikt
        </span>
      );
    }
    if (res.status === 'partial') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <HelpCircle className="w-3 h-3 text-amber-600" />
          {res.statusLabel || 'Benaderend'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
        <AlertCircle className="w-3 h-3 text-rose-600" />
        {res.statusLabel || 'Niet gevonden'}
      </span>
    );
  };

  return (
    <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Table Header & Search Filter */}
      <div className="p-3.5 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Zoek in tabel (straat, postcode, adres)..."
              value={searchTerm}
              onChange={(e) => updateSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-lg">
          <button
            onClick={() => updateStatusFilter('all')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Alle ({rows.length})
          </button>
          <button
            onClick={() => updateStatusFilter('matched')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              statusFilter === 'matched'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Gematcht ({rows.filter((r) => r.result?.status === 'exact' || r.result?.status === 'manual').length})
          </button>
          <button
            onClick={() => updateStatusFilter('partial')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              statusFilter === 'partial'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Benaderend ({rows.filter((r) => r.result?.status === 'partial').length})
          </button>
          <button
            onClick={() => updateStatusFilter('unmatched')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              statusFilter === 'unmatched'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Niet gevonden ({rows.filter((r) => r.result?.status === 'not_found' || r.result?.status === 'error').length})
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100/80 text-slate-700 sticky top-0 z-10 border-b border-slate-200 backdrop-blur-xs">
            <tr>
              <th className="py-2.5 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                  title="Alles selecteren / deselecteren"
                />
              </th>
              <th className="py-2.5 px-3 w-20 text-center font-medium">Acties</th>
              <th className="py-2.5 px-3 font-semibold text-slate-800">Status</th>
              <th className="py-2.5 px-3 font-semibold text-slate-800">
                Coördinaten ({targetCrs === 'EPSG:31370' ? 'Lambert 72' : targetCrs === 'EPSG:3812' ? 'Lambert 2008' : targetCrs})
              </th>
              <th className="py-2.5 px-3 font-semibold text-slate-800">Gematcht Adres</th>
              {columns.map((col) => (
                <th key={col} className="py-2.5 px-3 font-medium text-slate-600 capitalize">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 5} className="py-8 text-center text-slate-400">
                  Geen records gevonden die voldoen aan de huidige filter.
                </td>
              </tr>
            ) : (
              pagedRows.map((row, idx) => {
                const isActive = row.id === activeRowId;
                const hasResult = !!row.result && row.result.x !== null;

                return (
                  <tr
                    key={row.id}
                    onClick={() => onSelectRow(row.id)}
                    className={`cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-indigo-50/70 hover:bg-indigo-50'
                        : row.selected
                        ? 'bg-slate-50 hover:bg-slate-100/70'
                        : idx % 2 === 0
                        ? 'bg-white hover:bg-slate-50/80'
                        : 'bg-slate-50/30 hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Checkbox */}
                    <td
                      className="py-2 px-3 text-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleRowSelect(row.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() => {}}
                        className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onOpenPinpoint(row.id)}
                          title="Prik of inspecteer op kaart"
                          className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onGeocodeSingleRow(row.id)}
                          disabled={isProcessing}
                          title="Geocodeer enkel deze rij"
                          className="p-1 rounded text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-30"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteRow && (
                          <button
                            onClick={() => onDeleteRow(row.id)}
                            title="Rij verwijderen"
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-2 px-3 whitespace-nowrap">{renderStatusBadge(row)}</td>

                    {/* Coordinates */}
                    <td className="py-2 px-3 font-mono text-slate-700 whitespace-nowrap">
                      {hasResult ? (
                        <div className="flex items-center gap-1.5">
                          <span>{formatCoordinates(row.result?.x ?? null, row.result?.y ?? null, targetCrs)}</span>
                          {row.result?.sourceUrl && (
                            <a
                              href={row.result.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Bekijk in bronregister"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Matched Address */}
                    <td className="py-2 px-3 max-w-[200px] truncate text-slate-800" title={row.result?.matchedAddress || ''}>
                      {row.result?.matchedAddress || <span className="text-slate-300">—</span>}
                    </td>

                    {/* Original CSV Columns */}
                    {columns.map((col) => {
                      const isEditing = editingCell?.rowId === row.id && editingCell?.col === col;
                      return (
                        <td
                          key={col}
                          className="py-2 px-3 text-slate-600 max-w-[150px] truncate group relative"
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingCell({ rowId: row.id, col });
                          }}
                        >
                          {isEditing ? (
                            <input
                              type="text"
                              autoFocus
                              value={row.data[col] || ''}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => onUpdateRowData(row.id, col, e.target.value)}
                              onBlur={() => setEditingCell(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Escape') setEditingCell(null);
                              }}
                              className="w-full px-1.5 py-0.5 border border-indigo-500 rounded bg-white text-xs text-slate-900 focus:outline-none"
                            />
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="truncate">{row.data[col] || '—'}</span>
                              <Pencil className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="px-3.5 py-2.5 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
        <div>
          Toont <strong className="text-slate-700">{pagedRows.length}</strong> van{' '}
          <strong className="text-slate-700">{filteredRows.length}</strong> gefilterde rijen
          {filteredRows.length !== rows.length && (
            <span> van {rows.length} totaal</span>
          )}
          {rows.filter((r) => r.selected).length > 0 && (
            <span className="ml-2 text-indigo-600 font-medium">
              ({rows.filter((r) => r.selected).length} geselecteerd)
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-[11px]">Pagina {page} van {totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
              disabled={page === 1}
              className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
              title="Vorige pagina"
              aria-label="Vorige pagina"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
              disabled={page === totalPages}
              className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
              title="Volgende pagina"
              aria-label="Volgende pagina"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-slate-400 text-[11px]">Dubbelklik op een cel om te bewerken</div>
        </div>
      </div>
    </div>
  );
};
