import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { LngLat } from '../../services/polygon';
import { AddressRecord } from '../../services/addresses';
import { geocodeFlemishGeolocation } from '../../services/geocoder';
import { ZoomIn, ZoomOut, Home, X, Check, Undo2 } from 'lucide-react';
import { AddressSearchInput } from '../Map/AddressSearchInput';

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

interface DrawMapProps {
  points: LngLat[];
  closed: boolean;
  onAddPoint: (lngLat: LngLat) => void;
  onClose: () => void;
  onCancel: () => void;
  onUndo: () => void;
  onMoveVertex: (index: number, lngLat: LngLat) => void;
  locked?: boolean;
  height?: string;
  results?: AddressRecord[];
  activeId?: string | null;
}

export const DrawMap: React.FC<DrawMapProps> = ({
  points,
  closed,
  onAddPoint,
  onClose,
  onCancel,
  onUndo,
  onMoveVertex,
  locked = false,
  height = '420px',
  results = [],
  activeId = null,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);

  const drawGroupRef = useRef<L.LayerGroup | null>(null);
  const vertexMarkersRef = useRef<L.Marker[]>([]);

  const resultsGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);
  const resultsRef = useRef(results);
  resultsRef.current = results;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  const [basemap, setBasemap] = useState<BasemapType>('grb');
  const [cursor, setCursor] = useState<{ lat: number; lon: number } | null>(null);

  // Stale-safe refs so map event handlers always read latest state/props.
  const pointsRef = useRef(points);
  const closedRef = useRef(closed);
  pointsRef.current = points;
  closedRef.current = closed;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onAddPointRef = useRef(onAddPoint);
  onAddPointRef.current = onAddPoint;
  const onMoveVertexRef = useRef(onMoveVertex);
  onMoveVertexRef.current = onMoveVertex;
  const lockedRef = useRef(locked);
  lockedRef.current = locked;

  const toLatLngs = (pts: LngLat[]) => pts.map((p) => [p[1], p[0]] as [number, number]);

  // Initialise map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [51.2213, 4.4051],
      zoom: 12,
      zoomControl: false,
      doubleClickZoom: false,
    });

    const config = getTileConfig(basemap);
    tileRef.current = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    drawGroupRef.current = group;

    const resultsGroup = L.markerClusterGroup({
      chunkedLoading: true,
      showCoverageOnHover: false,
      maxClusterRadius: 45,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        const size = count < 10 ? 36 : count < 100 ? 44 : 52;
        return L.divIcon({
          html: `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:#3b82f6;border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.3);color:#ffffff;font-size:12px;font-weight:600;">${count}</div>`,
          className: 'result-cluster',
          iconSize: [size, size],
        });
      },
    }).addTo(map);
    resultsGroupRef.current = resultsGroup;

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setCursor({ lat: e.latlng.lat, lon: e.latlng.lng });
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (closedRef.current || lockedRef.current) return;
      onAddPointRef.current([e.latlng.lng, e.latlng.lat]);
    });

    map.on('dblclick', () => {
      if (closedRef.current || lockedRef.current) return;
      // Each click added a vertex immediately; a double-click's extra corners are
      // valid vertices, so we simply close (and re-search) with the current shape.
      if (pointsRef.current.length >= 3) {
        onCloseRef.current();
      }
    });

    const containerEl = map.getContainer();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && pointsRef.current.length >= 3) {
        onCloseRef.current();
      }
    };
    containerEl.addEventListener('keyup', handleKey);

    mapRef.current = map;

    return () => {
      containerEl.removeEventListener('keyup', handleKey);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Basemap swap.
  useEffect(() => {
    if (!mapRef.current || !tileRef.current) return;
    mapRef.current.removeLayer(tileRef.current);
    const config = getTileConfig(basemap);
    tileRef.current = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
    }).addTo(mapRef.current);
  }, [basemap]);

  // Draw found addresses as simple blue dots, clustered when dense.
  useEffect(() => {
    if (!mapRef.current || !resultsGroupRef.current) return;
    const resultsGroup = resultsGroupRef.current;
    resultsGroup.clearLayers();

    results
      .filter((r) => r.lat != null && r.lon != null)
      .forEach((r) => {
        const icon = L.divIcon({
          className: 'result-dot',
          html: `<div style="width:${activeIdRef.current === r.id ? 14 : 10}px;height:${activeIdRef.current === r.id ? 14 : 10}px;background:${
            activeIdRef.current === r.id ? '#1d4ed8' : '#3b82f6'
          };border:2px solid #ffffff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: activeIdRef.current === r.id ? [14, 14] : [10, 10],
          iconAnchor: activeIdRef.current === r.id ? [7, 7] : [5, 5],
        });
        L.marker([r.lat!, r.lon!], { icon, interactive: false }).addTo(resultsGroup);
      });
  }, [results, activeId]);

  // Redraw polygon based on current points.
  useEffect(() => {
    if (!mapRef.current || !drawGroupRef.current) return;
    const group = drawGroupRef.current;
    group.clearLayers();
    vertexMarkersRef.current = [];

    const latlngs = toLatLngs(points);

    if (points.length >= 3) {
      L.polygon(latlngs, {
        color: '#4f46e5',
        weight: 2,
        fillColor: '#6366f1',
        fillOpacity: closed ? 0.25 : 0.12,
        interactive: false,
      }).addTo(group);
    }

    if (points.length >= 2 && points.length < 3) {
      L.polyline(latlngs, {
        color: '#4f46e5',
        weight: 2,
        dashArray: '5 5',
        interactive: false,
      }).addTo(group);
    }

    // Vertex markers — draggable only when the polygon is closed.
    points.forEach((p, index) => {
      const isLast = index === 0 && points.length >= 3;
      const icon = L.divIcon({
        className: 'draw-vertex',
        html: `<div style="width:${closed ? 14 : 12}px;height:${closed ? 14 : 12}px;background:${
          isLast ? '#4338ca' : '#ffffff'
        };border:2px solid #4f46e5;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: closed ? [14, 14] : [12, 12],
        iconAnchor: [closed ? 7 : 6, closed ? 7 : 6],
      });
      const marker = L.marker([p[1], p[0]], {
        icon,
        draggable: closed && !locked,
        autoPan: true,
      }).addTo(group);

      if (closed) {
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onMoveVertexRef.current(index, [pos.lng, pos.lat]);
        });
      }

      vertexMarkersRef.current.push(marker);
    });
  }, [points, closed]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();

  const handleSearchSelect = async (fullAddress: string) => {
    const res = await geocodeFlemishGeolocation({ fullAddress }, 'EPSG:4326');
    if (res.lat != null && res.lon != null && mapRef.current) {
      mapRef.current.setView([res.lat, res.lon], 17);
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
          mapRef.current
        );
      }
    }
  };

  const handleFit = () => {
    if (!mapRef.current) return;
    if (points.length >= 2) {
      mapRef.current.fitBounds(L.latLngBounds(toLatLngs(points)), {
        padding: [60, 60],
        maxZoom: 18,
      });
    } else {
      mapRef.current.setView([51.2213, 4.4051], 12);
    }
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-slate-50"
      style={{ height }}
    >
      <div ref={containerRef} className="w-full h-full" />

      {/* Address search (top left) */}
      <div className="absolute top-3 left-3 z-30">
        <AddressSearchInput onAddressSelect={handleSearchSelect} />
      </div>

      {/* Basemap switcher */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 items-end">
        <div className="flex bg-white/95 backdrop-blur-sm p-1 rounded-lg border border-slate-200/80 shadow-md text-xs font-medium text-slate-800 gap-0.5">
          <button
            onClick={() => setBasemap('grb')}
            className={`px-2.5 py-1 rounded transition-colors ${
              basemap === 'grb' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="GRB basiskaart"
          >
            GRB
          </button>
          <button
            onClick={() => setBasemap('osm')}
            className={`px-2.5 py-1 rounded transition-colors ${
              basemap === 'osm' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="OpenStreetMap"
          >
            OSM
          </button>
          <button
            onClick={() => setBasemap('aerial')}
            className={`px-2.5 py-1 rounded transition-colors ${
              basemap === 'aerial' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Luchtfoto"
          >
            Luchtfoto
          </button>
        </div>

        {/* Zoom & controls */}
        <div className="flex flex-col bg-white/95 backdrop-blur-sm rounded-lg border border-slate-200/80 shadow-md overflow-hidden text-slate-700">
          <button onClick={handleZoomIn} className="p-2 hover:bg-slate-100 transition-colors border-b border-slate-100" title="Inzoomen">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={handleZoomOut} className="p-2 hover:bg-slate-100 transition-colors border-b border-slate-100" title="Uitzoomen">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={handleFit} className="p-2 hover:bg-slate-100 transition-colors border-b border-slate-100" title="Gepasteerd tonen">
            <Home className="w-4 h-4" />
          </button>
          <button
            onClick={onUndo}
            disabled={points.length === 0 || locked}
            className="p-2 hover:bg-slate-100 transition-colors border-b border-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Laatste punt annuleren"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onCancel}
            disabled={points.length === 0 || locked}
            className="p-2 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Tekening wissen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action hint (top center) */}
      {!closed && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-indigo-600/95 backdrop-blur text-white px-3.5 py-1.5 rounded-full shadow-lg text-xs font-medium flex items-center gap-2">
          <span>{points.length < 3 ? 'Klik op de kaart om een polygoon te tekenen' : 'Dubbelklik of druk op Enter om te sluiten'}</span>
        </div>
      )}

      {/* Confirm close (bottom center) — hidden once the polygon is closed */}
      {!closed && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={onClose}
            disabled={points.length < 3}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg shadow-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            Sluit polygoon en zoek
          </button>
        </div>
      )}

      {/* Cursor coordinate readout (bottom left) */}
      <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-sm text-xs text-slate-600 flex items-center gap-2">
        {cursor ? (
          <span className="font-mono">
            {cursor.lat.toFixed(5)}°, {cursor.lon.toFixed(5)}°
          </span>
        ) : (
          <span className="text-slate-400">Beweeg cursor over kaart</span>
        )}
        <span className="text-slate-300">|</span>
        <span className="text-slate-500">{points.length} punten</span>
      </div>
    </div>
  );
};
