import React, { useMemo, useState } from 'react';
import { AddressRecord } from '../../services/addresses';
import { ExternalLink, Search, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

const PAGE_SIZE = 50;

interface AddressTableProps {
  records: AddressRecord[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export const AddressTable: React.FC<AddressTableProps> = ({ records, activeId, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    if (!searchTerm) return records;
    const term = searchTerm.toLowerCase();
    return records.filter((r) =>
      [r.address, r.street, r.housenr, r.bus, r.postcode, r.municipality, r.status]
        .some((v) => v.toLowerCase().includes(term))
    );
  }, [records, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const updateSearch = (v: string) => {
    setSearchTerm(v);
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header / search */}
      <div className="p-3.5 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative w-full max-w-md flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Zoek binnen resultaten (adres, straat, postcode, gemeente)..."
            value={searchTerm}
            onChange={(e) => updateSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>
        <span className="text-slate-500">
          <strong className="text-slate-700">{filtered.length}</strong>{' '}
          {filtered.length === 1 ? 'adres' : 'adressen'}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100/80 text-slate-700 sticky top-0 z-10 border-b border-slate-200 backdrop-blur-xs">
            <tr>
              <th className="py-2.5 px-3 font-semibold text-slate-800 w-10">#</th>
              <th className="py-2.5 px-3 font-semibold text-slate-800">Volledig adres</th>
              <th className="py-2.5 px-3 font-semibold text-slate-800">Straat</th>
              <th className="py-2.5 px-3 font-semibold text-slate-800">Huisnr</th>
              <th className="py-2.5 px-3 font-semibold text-slate-800">Bus</th>
              <th className="py-2.5 px-3 font-semibold text-slate-800">Postcode</th>
              <th className="py-2.5 px-3 font-semibold text-slate-800">Gemeente</th>
              <th className="py-2.5 px-3 font-semibold text-slate-800">Latitude</th>
              <th className="py-2.5 px-3 font-semibold text-slate-800">Longitude</th>
              <th className="py-2.5 px-3 font-semibold text-slate-800 w-24">Officieel</th>
              <th className="py-2.5 px-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-400">
                  {records.length === 0
                    ? 'Nog geen resultaten getoond. Teken een polygoon en klik op Zoeken.'
                    : 'Geen resultaten die voldoen aan de zoekopdracht.'}
                </td>
              </tr>
            ) : (
              paged.map((r, idx) => {
                const isActive = r.id === activeId;
                return (
                  <tr
                    key={r.id}
                    onClick={() => onSelect(r.id)}
                    className={`cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-indigo-50/70 hover:bg-indigo-50'
                        : idx % 2 === 0
                        ? 'bg-white hover:bg-slate-50/80'
                        : 'bg-slate-50/30 hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-2 px-3 text-slate-400">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="py-2 px-3 max-w-[260px] truncate text-slate-800 font-medium" title={r.address}>
                      {r.address || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-2 px-3 max-w-[180px] truncate text-slate-600" title={r.street}>
                      {r.street || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                      {r.housenr || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                      {r.bus || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600">{r.postcode || <span className="text-slate-300">—</span>}</td>
                    <td className="py-2 px-3 text-slate-600">
                      {r.municipality || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {r.lat != null ? r.lat.toFixed(6) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {r.lon != null ? r.lon.toFixed(6) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-2 px-3">
                      {r.official ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <MapPin className="w-3 h-3 text-emerald-600" /> Ja
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                          Nee
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                      {r.detailUrl ? (
                        <a
                          href={r.detailUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-indigo-600 hover:bg-indigo-50 transition-colors whitespace-nowrap"
                          title="Bekijk in Adressenregister"
                        >
                          <ExternalLink className="w-3 h-3" /> Detail
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / pagination */}
      <div className="px-3.5 py-2.5 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
        <div>
          Toont <strong className="text-slate-700">{paged.length}</strong> van{' '}
          <strong className="text-slate-700">{filtered.length}</strong> totaal
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px]">
            Pagina {page} van {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((v) => Math.max(1, v - 1))}
              disabled={page === 1}
              className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
              title="Vorige pagina"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((v) => Math.min(totalPages, v + 1))}
              disabled={page === totalPages}
              className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
              title="Volgende pagina"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
