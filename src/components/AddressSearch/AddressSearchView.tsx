import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LngLat, computeAreaM2, formatArea, isSelfIntersecting } from '../../services/polygon';
import { getAppConfig } from '../../config';
import {
  AddressRecord,
  fetchAddressesInPolygon,
} from '../../services/addresses';
import { exportAddressCsvItems, exportAddressGeoJsonItems } from '../../services/export';
import { DrawMap } from './DrawMap';
import { AddressTable } from './AddressTable';
import { Toolbar } from './Toolbar';
import { Download, Ruler } from 'lucide-react';

const MAX_AREA_M2 = getAppConfig().maxPolygonAreaM2;
const MAX_ADDRESS_RESULTS = getAppConfig().maxAddressResults;

const STORAGE_KEY = 'flanders_address_search_state_v1';

interface AddressSearchPersisted {
  points: LngLat[];
  closed: boolean;
  records: AddressRecord[];
  truncated: boolean;
  activeId: string | null;
  lastSavedAt?: string;
}

const loadAddressSearchState = (): AddressSearchPersisted | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.points) && Array.isArray(parsed.records)) {
      return parsed;
    }
  } catch (err) {
    console.warn('Fout bij uitlezen van LocalStorage (address search):', err);
  }
  return null;
};

export const AddressSearchView: React.FC = () => {
  const [savedInitial] = useState(() => loadAddressSearchState());
  const [points, setPoints] = useState<LngLat[]>(() => savedInitial?.points ?? []);
  const [closed, setClosed] = useState<boolean>(() => savedInitial?.closed ?? false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<AddressRecord[]>(() => savedInitial?.records ?? []);
  const [truncated, setTruncated] = useState<boolean>(() => savedInitial?.truncated ?? false);
  const [activeId, setActiveId] = useState<string | null>(() => savedInitial?.activeId ?? null);
  const abortRef = useRef<AbortController | null>(null);

  // Persist state in localStorage with 300ms debounce (same pattern as the geocoder)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (points.length === 0 && records.length === 0) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }
        const stateToSave: AddressSearchPersisted = {
          points,
          closed,
          records,
          truncated,
          activeId,
          lastSavedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      } catch (err) {
        console.warn('Opslaan in LocalStorage (address search) mislukt:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [points, closed, records, truncated, activeId]);

  const areaM2 = useMemo(() => computeAreaM2(points), [points]);
  const selfIntersecting = useMemo(
    () => points.length >= 4 && isSelfIntersecting(points),
    [points]
  );
  const tooLarge = closed && areaM2 > MAX_AREA_M2;
  const invalidShape = closed && selfIntersecting;
  const canSearch = closed && points.length >= 3 && !tooLarge && !invalidShape;

  const searchDisabledReason =
    points.length < 3
      ? 'Teken minimaal 3 punten om een polygoon te maken'
      : selfIntersecting
        ? 'De polygoon kruist zichzelf. Sleep de hoekpunten zodanig dat het een simpel veelhoek wordt'
        : tooLarge
          ? `Te grote oppervlakte: ${formatArea(areaM2)} (max ${formatArea(MAX_AREA_M2)})`
          : closed
            ? null
            : 'Sluit eerst de polygoon';

  const handleAddPoint = (lngLat: LngLat) => {
    setClosed(false);
    setPoints((prev) => [...prev, lngLat]);
  };

  const handleSearch = async (searchPoints: LngLat[] = points) => {
    // Defend against a stray non-array arg (e.g. a leaked click event).
    if (!Array.isArray(searchPoints)) {
      searchPoints = points;
    }
    if (
      searchPoints.length < 3 ||
      computeAreaM2(searchPoints) > MAX_AREA_M2 ||
      (searchPoints.length >= 4 && isSelfIntersecting(searchPoints))
    ) {
      return;
    }
    setSearching(true);
    setError(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await fetchAddressesInPolygon(searchPoints, {
        signal: controller.signal,
        maxRecords: MAX_ADDRESS_RESULTS,
        pageSize: 250,
      });
      setRecords(result.records);
      setTruncated(result.truncated);
      setActiveId(null);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message || 'Onbekende fout bij zoekopdracht');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleClose = async () => {
    setClosed(true);
    // If the polygon is valid, search immediately so the "Sluit polygoon en zoek"
    // button does exactly what it promises.
    if (points.length >= 3 && computeAreaM2(points) <= MAX_AREA_M2) {
      await handleSearch(points);
    }
  };

  const handleUndo = () => {
    setPoints((prev) => prev.slice(0, -1));
    setActiveId(null);
  };

  const handleMoveVertex = (index: number, lngLat: LngLat) => {
    setPoints((prev) => prev.map((p, i) => (i === index ? lngLat : p)));
  };

  const handleClear = () => {
    if (abortRef.current) abortRef.current.abort();
    setPoints([]);
    setClosed(false);
    setRecords([]);
    setTruncated(false);
    setError(null);
    setActiveId(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Heading */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Adressenregister &mdash; zoeken binnen polygoon
          </h2>
          <p className="text-xs text-slate-500">
            Teken een gebied en haal de officiële adressen uit het Vlaamse Adressenregister. (maximaal: {MAX_ADDRESS_RESULTS} records) 
          </p>
        </div>
      </div>

      <Toolbar
        searching={searching}
        canSearch={canSearch}
        area={areaM2} invalid={invalidShape}
        searchDisabledReason={searchDisabledReason}
        onSearch={handleSearch}
        onClear={handleClear}
        hasResults={records.length > 0}
        truncated={truncated}
        onExportCsv={() => exportAddressCsvItems(records)}
        onExportGeoJson={() => exportAddressGeoJsonItems(records)}
        error={error} 
      />

      <DrawMap
        points={points}
        closed={closed}
        onAddPoint={handleAddPoint}
        onClose={handleClose}
        onCancel={handleClear}
        onUndo={handleUndo}
        onMoveVertex={handleMoveVertex}
        locked={records.length > 0}
        height="420px"
        results={records}
        activeId={activeId}
      />

        <AddressTable records={records} activeId={activeId} onSelect={setActiveId} />
    </div>
  );
};
