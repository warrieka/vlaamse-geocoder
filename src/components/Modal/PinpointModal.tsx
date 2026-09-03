import React, { useState, useEffect } from 'react';
import { AddressRow, CrsId } from '../../types';
import { ModernMap } from '../Map/ModernMap';
import { formatCoordinates, fromWgs84, toWgs84 } from '../../services/projections';
import { reverseGeocode } from '../../services/geocoder';
import {
  X,
  MapPin,
  Check,
  Search,
  Compass,
  Building,
  RotateCcw,
} from 'lucide-react';

interface PinpointModalProps {
  isOpen: boolean;
  row: AddressRow | null;
  targetCrs: CrsId;
  onClose: () => void;
  onSave: (rowId: string, lat: number, lon: number, matchedAddress?: string) => void;
}

export const PinpointModal: React.FC<PinpointModalProps> = ({
  isOpen,
  row,
  targetCrs,
  onClose,
  onSave,
}) => {
  if (!isOpen || !row) return null;

  // Initial coords from row or Antwerp default
  const defaultLat = 51.2213;
  const defaultLon = 4.4051;

  const initialLat = row.result?.lat || defaultLat;
  const initialLon = row.result?.lon || defaultLon;

  const [currentCoords, setCurrentCoords] = useState<[number, number]>([
    initialLat,
    initialLon,
  ]);
  const [addressGuess, setAddressGuess] = useState<string | undefined>(
    row.result?.matchedAddress
  );

  useEffect(() => {
    if (row.result?.lat && row.result?.lon) {
      setCurrentCoords([row.result.lat, row.result.lon]);
      setAddressGuess(row.result.matchedAddress);
    } else {
      setCurrentCoords([defaultLat, defaultLon]);
    }
  }, [row]);

  const [lat, lon] = currentCoords;
  const [targetX, targetY] = fromWgs84(lon, lat, targetCrs);
  const [l72X, l72Y] = fromWgs84(lon, lat, 'EPSG:31370');
  const [l2008X, l2008Y] = fromWgs84(lon, lat, 'EPSG:3812');

  const handlePinpointChange = (
    coords: [number, number],
    guess?: string
  ) => {
    setCurrentCoords(coords);
    if (guess) setAddressGuess(guess);
  };

  const handleConfirm = () => {
    onSave(row.id, lat, lon, addressGuess);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Manueel Prikken op de Kaart
              </h3>
              <p className="text-xs text-slate-500">
                Verplaats de marker of klik op de kaart om de exacte locatie te verfijnen
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex flex-col gap-3 overflow-y-auto">
          {/* Active Row Info Banner */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div>
              <span className="text-slate-500">Oorspronkelijke CSV-invoer: </span>
              <strong className="text-slate-800">
                {row.data.straat || ''} {row.data.huisnummer || ''},{' '}
                {row.data.postcode || ''} {row.data.gemeente || ''}
              </strong>
            </div>
            {addressGuess && (
              <div className="text-indigo-700 font-medium">
                📍 Reverse lookup: {addressGuess}
              </div>
            )}
          </div>

          {/* Interactive Map */}
          <div className="w-full">
            <ModernMap
              rows={[row]}
              activeRowId={row.id}
              targetCrs={targetCrs}
              pinpointMode={true}
              pinpointCoords={currentCoords}
              onPinpointChange={handlePinpointChange}
              height="400px"
            />
          </div>

          {/* Coordinate Readout Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-slate-400 font-medium text-[11px]">WGS 84 (GPS)</div>
              <div className="font-mono font-semibold text-slate-800 text-[11px] truncate">
                {lat.toFixed(6)}, {lon.toFixed(6)}
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-slate-400 font-medium text-[11px]">Lambert 1972</div>
              <div className="font-mono font-semibold text-slate-800 text-[11px] truncate">
                {l72X.toFixed(2)}, {l72Y.toFixed(2)} m
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-slate-400 font-medium text-[11px]">Lambert 2008</div>
              <div className="font-mono font-semibold text-slate-800 text-[11px] truncate">
                {l2008X.toFixed(2)}, {l2008Y.toFixed(2)} m
              </div>
            </div>

            <div className="p-2.5 bg-indigo-50/70 rounded-lg border border-indigo-100">
              <div className="text-indigo-600 font-medium text-[11px]">
                Gekozen CRS ({targetCrs})
              </div>
              <div className="font-mono font-bold text-indigo-900 text-[11px] truncate">
                {formatCoordinates(targetX, targetY, targetCrs)}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 text-xs">
          <button
            onClick={onClose}
            className="px-3.5 py-2 font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-4 py-2 font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm transition-colors"
          >
            <Check className="w-4 h-4" />
            Positie Opslaan in Tabel
          </button>
        </div>
      </div>
    </div>
  );
};
