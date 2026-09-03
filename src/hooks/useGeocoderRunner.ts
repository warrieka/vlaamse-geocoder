import { useState, useRef, useCallback } from 'react';
import {
  AddressRow,
  CrsId,
  GeocoderId,
  GeocodeStats,
  ColumnMapping,
  GeocodeResult,
} from '../types';
import {
  geocodeFlemishGeolocation,
  geocodeBasisregisters,
  geocodeNominatim,
  GeocodeAddressParams,
} from '../services/geocoder';

export function useGeocoderRunner() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stats, setStats] = useState<GeocodeStats>({
    total: 0,
    completed: 0,
    matched: 0,
    partial: 0,
    notFound: 0,
    errors: 0,
    manual: 0,
    elapsedMs: 0,
  });

  const stopRef = useRef(false);
  const pauseRef = useRef(false);

  const performGeocode = async (
    row: AddressRow,
    geocoderId: GeocoderId,
    targetCrs: CrsId,
    mapping: ColumnMapping
  ): Promise<GeocodeResult> => {
    const params: GeocodeAddressParams = {
      street: mapping.street ? row.data[mapping.street] : undefined,
      housenumber: mapping.housenumber ? row.data[mapping.housenumber] : undefined,
      postalCode: mapping.postalCode ? row.data[mapping.postalCode] : undefined,
      municipality: mapping.municipality ? row.data[mapping.municipality] : undefined,
    };

    // If none of the specific fields are mapped, construct fallback from all data
    if (!params.street && !params.housenumber && !params.municipality) {
      params.fullAddress = Object.values(row.data).filter(Boolean).join(' ');
    }

    if (geocoderId === 'basisregisters') {
      return geocodeBasisregisters(params, targetCrs);
    } else if (geocoderId === 'nominatim') {
      return geocodeNominatim(params, targetCrs);
    } else {
      return geocodeFlemishGeolocation(params, targetCrs);
    }
  };

  const runBatch = useCallback(
    async (
      targetRows: AddressRow[],
      allRows: AddressRow[],
      geocoderId: GeocoderId,
      targetCrs: CrsId,
      mapping: ColumnMapping,
      onUpdateRow: (rowId: string, result: GeocodeResult) => void
    ) => {
      if (targetRows.length === 0) return;

      setIsProcessing(true);
      setIsPaused(false);
      stopRef.current = false;
      pauseRef.current = false;

      let completed = 0;
      let matched = 0;
      let partial = 0;
      let notFound = 0;
      let errors = 0;
      let manual = 0;

      // Count existing status
      targetRows.forEach((r) => {
        if (r.result?.status === 'manual') manual++;
      });

      setStats({
        total: targetRows.length,
        completed: 0,
        matched: 0,
        partial: 0,
        notFound: 0,
        errors: 0,
        manual,
        elapsedMs: 0,
      });

      const delayMs = geocoderId === 'nominatim' ? 1050 : 120; // 1s for OSM policy

      for (let i = 0; i < targetRows.length; i++) {
        if (stopRef.current) break;

        while (pauseRef.current) {
          await new Promise((res) => setTimeout(res, 200));
          if (stopRef.current) break;
        }

        if (stopRef.current) break;

        const row = targetRows[i];

        try {
          const result = await performGeocode(row, geocoderId, targetCrs, mapping);
          onUpdateRow(row.id, result);

          completed++;
          if (result.status === 'exact') matched++;
          else if (result.status === 'partial') partial++;
          else if (result.status === 'manual') manual++;
          else if (result.status === 'not_found') notFound++;
          else errors++;

          setStats((prev) => ({
            ...prev,
            completed,
            matched,
            partial,
            notFound,
            errors,
            manual,
          }));
        } catch (err) {
          console.error(`Error geocoding row ${row.id}:`, err);
          errors++;
          completed++;
          setStats((prev) => ({ ...prev, completed, errors }));
        }

        if (i < targetRows.length - 1 && !stopRef.current) {
          await new Promise((res) => setTimeout(res, delayMs));
        }
      }

      setIsProcessing(false);
      setIsPaused(false);
    },
    []
  );

  const pauseResume = () => {
    if (!isProcessing) return;
    if (isPaused) {
      pauseRef.current = false;
      setIsPaused(false);
    } else {
      pauseRef.current = true;
      setIsPaused(true);
    }
  };

  const stop = () => {
    stopRef.current = true;
    pauseRef.current = false;
    setIsProcessing(false);
    setIsPaused(false);
  };

  return {
    isProcessing,
    isPaused,
    stats,
    runBatch,
    performGeocode,
    pauseResume,
    stop,
    setStats,
  };
}
