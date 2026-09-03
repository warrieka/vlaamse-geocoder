import proj4 from 'proj4';
import { CrsId, CrsInfo } from '../types';

// Register standard projections for Belgium and web GIS
export const CRS_DEFINITIONS: Record<CrsId, CrsInfo> = {
  'EPSG:31370': {
    id: 'EPSG:31370',
    name: 'Belgian Lambert 1972',
    shortName: 'Lambert 72',
    description: 'Official legacy standard in Flanders and Geopunt / GRB data',
    unit: 'm (X, Y)',
    proj4def:
      '+proj=lcc +lat_1=51.16666723333333 +lat_2=49.8333339 +lat_0=90 +lon_0=4.367486666666666 +x_0=150000.013 +y_0=5400088.438 +ellps=intl +towgs84=-106.869,52.2978,-103.724,0.3366,-0.457,1.8422,-1.2747 +units=m +no_defs',
  },
  'EPSG:3812': {
    id: 'EPSG:3812',
    name: 'Belgian Lambert 2008',
    shortName: 'Lambert 2008',
    description: 'Modern NGI / IGN standard using ETRS89 ellipsoid',
    unit: 'm (X, Y)',
    proj4def:
      '+proj=lcc +lat_1=49.83333333333334 +lat_2=51.16666666666666 +lat_0=50.797815 +lon_0=4.359215833333333 +x_0=649328 +y_0=665262 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  },
  'EPSG:4326': {
    id: 'EPSG:4326',
    name: 'WGS 84 (GPS)',
    shortName: 'WGS 84',
    description: 'Global standard latitude & longitude (GPS, Google Maps, GeoJSON)',
    unit: 'degrees (Lat, Lon)',
    proj4def: '+proj=longlat +datum=WGS84 +no_defs',
  },
  'EPSG:3857': {
    id: 'EPSG:3857',
    name: 'Pseudo-Mercator (Web)',
    shortName: 'Web Mercator',
    description: 'Standard projected coordinate system for Web Map tiles (OSM, Leaflet)',
    unit: 'm (X, Y)',
    proj4def:
      '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs',
  },
};

// Initialize proj4 definitions
Object.values(CRS_DEFINITIONS).forEach((crs) => {
  proj4.defs(crs.id, crs.proj4def);
});

/**
 * Transform coordinates between any two registered CRSs
 * Coordinates are formatted as [x, y] or [lon, lat]
 */
export function transformCoords(
  coords: [number, number],
  fromCrs: CrsId | string,
  toCrs: CrsId | string
): [number, number] {
  if (fromCrs === toCrs) return coords;
  try {
    const result = proj4(fromCrs, toCrs, coords);
    return [result[0], result[1]];
  } catch (err) {
    console.error(`Error transforming from ${fromCrs} to ${toCrs}:`, err);
    return coords;
  }
}

/**
 * Converts WGS84 [lon, lat] to a target CRS
 */
export function fromWgs84(lon: number, lat: number, targetCrs: CrsId): [number, number] {
  return transformCoords([lon, lat], 'EPSG:4326', targetCrs);
}

/**
 * Converts any CRS [x, y] to WGS84 [lon, lat]
 */
export function toWgs84(x: number, y: number, sourceCrs: CrsId): [number, number] {
  return transformCoords([x, y], sourceCrs, 'EPSG:4326');
}

/**
 * Formats coordinates nicely based on target CRS
 */
export function formatCoordinates(x: number | null, y: number | null, crs: CrsId): string {
  if (x === null || y === null || isNaN(x) || isNaN(y) || (x === -1 && y === -1)) {
    return '—';
  }
  if (crs === 'EPSG:4326') {
    // In WGS84: usually Lon, Lat or Lat, Lon
    return `${x.toFixed(6)}, ${y.toFixed(6)}`;
  }
  return `${x.toFixed(2)}, ${y.toFixed(2)}`;
}
