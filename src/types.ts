export type GeocoderId = 'geoloc' | 'basisregisters' | 'nominatim';

export type CrsId = 'EPSG:31370' | 'EPSG:3812' | 'EPSG:4326' | 'EPSG:3857';

export interface CrsInfo {
  id: CrsId;
  name: string;
  shortName: string;
  description: string;
  unit: string;
  proj4def: string;
}

export interface GeocoderOption {
  id: GeocoderId;
  name: string;
  provider: string;
  description: string;
  speed: string;
  coverage: string;
  isAvailable: boolean;
}

export type MatchStatus = 'idle' | 'exact' | 'partial' | 'manual' | 'not_found' | 'error';

export interface GeocodeResult {
  status: MatchStatus;
  statusLabel: string;
  x: number | null;
  y: number | null;
  x_lambert72?: number;
  y_lambert72?: number;
  x_lambert2008?: number;
  y_lambert2008?: number;
  lat?: number;
  lon?: number;
  matchedAddress?: string;
  matchType?: string;
  score?: number;
  id?: string | number;
  sourceUrl?: string;
  details?: Record<string, any>;
}

export interface AddressRow {
  id: string;
  selected: boolean;
  data: Record<string, string>;
  result?: GeocodeResult;
}

export interface ColumnMapping {
  street: string;
  housenumber: string;
  postalCode: string;
  municipality: string;
}

export interface GeocodeStats {
  total: number;
  completed: number;
  matched: number;
  partial: number;
  notFound: number;
  errors: number;
  manual: number;
  elapsedMs: number;
}
