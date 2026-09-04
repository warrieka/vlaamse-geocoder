import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { AddressRow, CrsId } from '../../types';
import { transformCoords, formatCoordinates } from '../../services/projections';
import { reverseGeocode, geocodeFlemishGeolocation } from '../../services/geocoder';
import { MapPin, Home, Search, ZoomIn, ZoomOut, Check, Loader2, XCircle } from 'lucide-react';
import { AddressSearchInput } from './AddressSearchInput';

interface ModernMapProps {
  rows: AddressRow[];
  activeRowId?: string | null;
  targetCrs: CrsId;
  pinpointMode?: boolean;
  pinpointCoords?: [number, number] | null; // [lat, lon]
  onPinpointChange?: (coords: [number, number], addressGuess?: string) => void;
  onSelectRow?: (rowId: string) => void;
  height?: string;
}

type BasemapType = 'grb' | 'osm' | 'aerial';

const getTileConfig = (type: BasemapType) => {
  switch (type) {
    case 'grb':
      return {
        url: 'https://geo.api.vlaanderen.be/GRB/wmts/1.0.0/grb_bsk/default/GoogleMapsVL/{z}/{y}/{x}.png',
        attribution: '&copy; <a href="https://www.vlaanderen.be/digitaal-vlaanderen" target="_blank" rel="noopener">Digitaal Vlaanderen</a>',
        maxZoom: 20,
      };
    case 'aerial':
      return {
        url: 'https://geo.api.vlaanderen.be/OMWRGBMRVL/wmts/1.0.0/omwrgbmrvl/default/GoogleMapsVL/{z}/{y}/{x}.png',
        attribution: '&copy; <a href="https://www.vlaanderen.be/digitaal-vlaanderen" target="_blank" rel="noopener">Digitaal Vlaanderen</a>',
        maxZoom: 20,
      };
    case 'osm':
    default:
      return {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
        maxZoom: 19,
      };
  }
};

export const ModernMap: React.FC<ModernMapProps> = ({
  rows,
  activeRowId,
  targetCrs,
  pinpointMode = false,
  pinpointCoords,
  onPinpointChange,
  onSelectRow,
  height = '420px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const pinpointMarkerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [basemap, setBasemap] = useState<BasemapType>('grb');
  const [cursorCoords, setCursorCoords] = useState<{
    lat: number;
    lon: number;
    xlb: number;
    ylb: number;
  } | null>(null);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [reverseResult, setReverseResult] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    address: string;
    status: 'found' | 'not_found';
  } | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on Flanders / Antwerp
    const initialCenter: [number, number] = [51.2213, 4.4051];
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 12,
      zoomControl: false,
    });

    const config = getTileConfig(basemap);
    const tileLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    // Mouse movement coordinate inspector
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat;
      const lon = e.latlng.lng;
      const [xlb, ylb] = transformCoords([lon, lat], 'EPSG:4326', 'EPSG:3812');
      setCursorCoords({ lat, lon, xlb: xlb, ylb: ylb });
    });

    // Pinpoint click
    map.on('click', async (e: L.LeafletMouseEvent) => {
      if (!pinpointMode) return;
      const lat = e.latlng.lat;
      const lon = e.latlng.lng;

      if (pinpointMarkerRef.current) {
        pinpointMarkerRef.current.setLatLng([lat, lon]);
      } else {
        const pinIcon = L.divIcon({
          className: 'custom-pin-marker',
          html: `<div style="background-color: #6366f1; width: 22px; height: 22px; border-radius: 50%; 
          border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; 
          justify-content: center;"><div style="width: 6px; height: 6px; background-color: white; border-radius: 50%;">
          </div></div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        const marker = L.marker([lat, lon], {
          icon: pinIcon,
          draggable: true,
        }).addTo(map);

        marker.on('dragend', async () => {
          const pos = marker.getLatLng();
          handlePinChange(pos.lat, pos.lng);
        });

        pinpointMarkerRef.current = marker;
      }

      handlePinChange(lat, lon);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Basemap Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    const config = getTileConfig(basemap);
    const newTileLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newTileLayer;
  }, [basemap]);

  // Handle Pin change & reverse geocode
  const handlePinChange = async (lat: number, lon: number) => {
    setReverseLoading(true);
    try {
      const rev = await reverseGeocode(lat, lon);
      const addressGuess = rev?.address || undefined;
      setReverseResult(addressGuess || null);
      if (onPinpointChange) {
        onPinpointChange([lat, lon], addressGuess);
      }
    } catch {
      if (onPinpointChange) {
        onPinpointChange([lat, lon]);
      }
    } finally {
      setReverseLoading(false);
    }
  };

  // Sync pinpoint marker when coords change from props
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (pinpointCoords && pinpointCoords[0] && pinpointCoords[1]) {
      const [lat, lon] = pinpointCoords;
      if (pinpointMarkerRef.current) {
        pinpointMarkerRef.current.setLatLng([lat, lon]);
      } else {
        const pinIcon = L.divIcon({
          className: 'custom-pin-marker',
          html: `<div style="background-color: #6366f1; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><div style="width: 6px; height: 6px; background-color: white; border-radius: 50%;"></div></div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        const marker = L.marker([lat, lon], {
          icon: pinIcon,
          draggable: true,
        }).addTo(mapInstanceRef.current);

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          handlePinChange(pos.lat, pos.lng);
        });

        pinpointMarkerRef.current = marker;
      }
      mapInstanceRef.current.panTo([lat, lon], { animate: true });
    } else if (pinpointMarkerRef.current) {
      mapInstanceRef.current.removeLayer(pinpointMarkerRef.current);
      pinpointMarkerRef.current = null;
    }
  }, [pinpointCoords]);

  // Update Data Markers on Map
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    const bounds: L.LatLngBounds = L.latLngBounds([]);
    let hasPoints = false;

    rows.forEach((row) => {
      const res = row.result;
      if (!res || !res.lat || !res.lon || isNaN(res.lat) || isNaN(res.lon)) return;

      const latLng: [number, number] = [res.lat, res.lon];
      bounds.extend(latLng);
      hasPoints = true;

      // Select color based on match quality
      let color = '#10b981'; // emerald for exact
      if (res.status === 'manual') color = '#8b5cf6'; // purple for manual
      else if (res.status === 'partial') color = '#f59e0b'; // amber for partial
      else if (res.status === 'error' || res.status === 'not_found') color = '#ef4444';

      const isSelected = row.id === activeRowId;
      const size = isSelected ? 26 : 18;

      const markerHtml = `
        <div style="
          background-color: ${color};
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          border: ${isSelected ? '3px solid #1e293b' : '2px solid white'};
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s ease;
        ">
          <div style="width: 5px; height: 5px; background: white; border-radius: 50%;"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'data-marker-icon',
        html: markerHtml,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker(latLng, { icon: customIcon });

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; font-size: 13px; line-height: 1.4; min-width: 200px;">
          <div style="font-weight: 600; color: #0f172a; margin-bottom: 4px;">
            ${res.matchedAddress || `${row.data.straat || ''} ${row.data.huisnummer || ''}`}
          </div>
          <div style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 500; background: ${color}22; color: ${color}; margin-bottom: 6px;">
            ${res.statusLabel || res.status}
          </div>
          <div style="color: #475569; font-size: 11px; display: grid; gap: 2px;">
            <div><strong>WGS84:</strong> ${res.lat.toFixed(6)}, ${res.lon.toFixed(6)}</div>
            <div><strong>Lambert 72:</strong> ${res.x_lambert72?.toFixed(2) || '—'}, ${res.y_lambert72?.toFixed(2) || '—'}</div>
            <div><strong>Lambert 2008:</strong> ${res.x_lambert2008?.toFixed(2) || '—'}, ${res.y_lambert2008?.toFixed(2) || '—'}</div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        if (onSelectRow) onSelectRow(row.id);
      });

      markersLayerRef.current?.addLayer(marker);
    });

    // Auto-fit bounds if rows changed and not in pinpoint manual mode
    if (hasPoints && !pinpointMode && bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [rows, activeRowId, pinpointMode]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  // Geocode a chosen suggestion and fly the map to it
  const handleSearchSelect = async (fullAddress: string) => {
    const res = await geocodeFlemishGeolocation({ fullAddress }, targetCrs);
    if (res.lat != null && res.lon != null) {
      mapInstanceRef.current?.setView([res.lat, res.lon], 17);
      const searchPin = L.divIcon({
        className: 'custom-pin-marker',
        html: `<div style="background-color: #6366f1; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><div style="width: 6px; height: 6px; background-color: white; border-radius: 50%;"></div></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      if (searchMarkerRef.current) {
        searchMarkerRef.current.setLatLng([res.lat, res.lon]);
      } else {
        searchMarkerRef.current = L.marker([res.lat, res.lon], { icon: searchPin }).addTo(
          mapInstanceRef.current!
        );
      }
    }
  };
  const handleFitBounds = () => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const bounds: L.LatLngBounds = L.latLngBounds([]);
    let hasPoints = false;
    rows.forEach((r) => {
      if (r.result?.lat && r.result?.lon) {
        bounds.extend([r.result.lat, r.result.lon]);
        hasPoints = true;
      }
    });
    // Fallbacks: Antwerp (when points exist but out of range) → whole Flanders
    const antwerp: [number, number] = [51.2213, 4.4051];
    const flanders = L.latLngBounds([50.75, 2.95], [51.57, 5.25]);
    if (hasPoints && bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
    } else if (hasPoints) {
      mapInstanceRef.current.setView(antwerp, 12);
    } else {
      mapInstanceRef.current.fitBounds(flanders, { padding: [20, 20] });
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-slate-50" style={{ height }}> {/* cursor: pinpointMode ? 'crosshair' : 'default' */}
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Basemap Switcher & Controls (Top Right) */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 items-end">
        <div className="flex bg-white/95 backdrop-blur-sm p-1 rounded-lg border border-slate-200/80 shadow-md text-xs font-medium text-slate-800 gap-0.5">
          <button
            onClick={() => setBasemap('grb')}
            className={`px-2.5 py-1 rounded transition-colors ${
              basemap === 'grb'
                ? 'bg-slate-900 text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Grootschalig Referentiebestand Vlaanderen (Officiële GRB Basiskaart)"
          >
            GRB
          </button>
          <button
            onClick={() => setBasemap('osm')}
            className={`px-2.5 py-1 rounded transition-colors ${
              basemap === 'osm'
                ? 'bg-slate-900 text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="OpenStreetMap standaard"
          >
            OSM
          </button>
          <button
            onClick={() => setBasemap('aerial')}
            className={`px-2.5 py-1 rounded transition-colors ${
              basemap === 'aerial'
                ? 'bg-slate-900 text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Luchtfoto satelliet / orthofoto"
          >
            Luchtfoto
          </button>
        </div>

        {/* Zoom & Extent controls */}
        <div className="flex flex-col bg-white/95 backdrop-blur-sm rounded-lg border border-slate-200/80 shadow-md overflow-hidden text-slate-700">
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-slate-100 transition-colors border-b border-slate-100"
            title="Inzoomen"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-slate-100 transition-colors border-b border-slate-100"
            title="Uitzoomen"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleFitBounds}
            className="p-2 hover:bg-slate-100 transition-colors"
            title="Alle punten tonen"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Address Search (Top Left) */}
      <div className="absolute top-3 left-3 z-30">
        <AddressSearchInput onAddressSelect={handleSearchSelect} />
      </div>

      {/* Pinpoint Mode Banner (Top Center) */}
      {pinpointMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-indigo-600/95 backdrop-blur text-white px-3.5 py-1.5 rounded-full shadow-lg text-xs font-medium flex items-center gap-2 animate-pulse">
          <MapPin className="w-3.5 h-3.5" />
          <span>Klik op de kaart om het adres<br/> handmatig aan te duiden</span>
        </div>
      )}

      {/* Live Coordinate Status Bar (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-sm text-xs text-slate-700 flex items-center gap-3">
        {cursorCoords ? (
          <>
            <span className="font-mono text-slate-600">
              <strong className="text-slate-900">Lambert 2008:</strong> {cursorCoords.xlb.toFixed(1)}, {cursorCoords.ylb.toFixed(1)} m
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-mono text-slate-500">
              <strong className="text-slate-900">WGS84:</strong> {cursorCoords.lat.toFixed(5)}°, {cursorCoords.lon.toFixed(5)}°
            </span>
          </>
        ) : (
          <span className="text-slate-400">Beweeg cursor over kaart voor coördinaten</span>
        )}
        {reverseLoading && (
          <span className="flex items-center gap-1 text-indigo-600 font-medium ml-2">
            <Loader2 className="w-3 h-3 animate-spin" /> Adres ophalen...
          </span>
        )}
      </div>

      {/* Legend (Bottom Right) */}
      <div className="absolute bottom-3 right-3 z-20 bg-white/95 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-slate-200/80 shadow-sm text-[11px] text-slate-600 flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Exact
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Benaderend
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span> Manueel
        </span>
      </div>
    </div>
  );
};
