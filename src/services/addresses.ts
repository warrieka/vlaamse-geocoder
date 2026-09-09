import { LngLat } from './polygon';

/**
 * Properties as returned by the Adressenregister OGC Feature API.
 * Only the fields we actually display / export are listed.
 */
export interface AddressProperties {
  ObjectId: number;
  Id: string;
  Straatnaam?: string;
  Gemeentenaam?: string;
  PostinfoObjectId?: number;
  VolledigAdres?: string;
  Huisnummer?: string | null;
  Busnummer?: string | null;
  AdresStatus: string;
  PositieSpecificatie?: string;
  OfficieelToegekend?: boolean;
}

export interface AddressFeature {
  id: string;
  geometry?: { type: 'Point'; coordinates: [number, number] } | null;
  geometry_name?: string;
  properties: AddressProperties;
  bbox?: number[];
}

/** Flat, serialisable record used by the table, map and exports. */
export interface AddressRecord {
  id: string;
  address: string;
  street: string;
  housenr: string;
  bus: string;
  postcode: string;
  municipality: string;
  lat: number | null;
  lon: number | null;
  status: string;
  positionSpec: string;
  official: boolean;
  detailUrl: string;
}

export interface AddressQueryResult {
  records: AddressRecord[];
  truncated: boolean;
}

const OGC_BASE =
  'https://geo.api.vlaanderen.be/Adressenregister/ogc/features/v1/collections/Adres/items';

const POSTCODE_PAD = 4;

function toRecord(feature: AddressFeature): AddressRecord {
  const p = feature.properties;
  const coords = feature.geometry?.coordinates ?? null;
  const postcode = p.PostinfoObjectId != null
    ? String(p.PostinfoObjectId).padStart(POSTCODE_PAD, '0')
    : '';
  return {
    id: feature.id,
    address: p.VolledigAdres || '',
    street: p.Straatnaam || '',
    housenr: p.Huisnummer ? String(p.Huisnummer) : '',
    bus: p.Busnummer ? String(p.Busnummer) : '',
    postcode,
    municipality: p.Gemeentenaam || '',
    lat: coords ? coords[1] : null,
    lon: coords ? coords[0] : null,
    status: p.AdresStatus || '',
    positionSpec: p.PositieSpecificatie || '',
    official: !!p.OfficieelToegekend,
    detailUrl: p.Id || '',
  };
}

/**
 * Builds an OGC WKT polygon from an open list of [lon, lat] points.
 * If the ring is not closed it is closed automatically.
 */
export function buildWktPolygon(points: LngLat[]): string {
  if (points.length < 3) throw new Error('Een polygon heeft minimaal 3 punten nodig');
  const same = (a: LngLat, b: LngLat) => a[0] === b[0] && a[1] === b[1];
  // Collapse consecutive duplicate vertices (e.g. stray points from a
  // double-click) and drop a trailing vertex that already equals the start.
  const dedup: LngLat[] = [];
  for (const p of points) {
    if (dedup.length > 0 && same(dedup[dedup.length - 1], p)) continue;
    dedup.push(p);
  }
  while (dedup.length > 0 && same(dedup[dedup.length - 1], dedup[0])) {
    dedup.pop();
  }
  if (dedup.length < 3) throw new Error('Een polygon heeft minimaal 3 unieke punten nodig');
  const first = dedup[0];
  const last = dedup[dedup.length - 1];
  const ring = same(first, last) ? dedup : [...dedup, [first[0], first[1]] as LngLat];
  const coords = ring.map((p) => `${Number(p[0].toFixed(7))} ${Number(p[1].toFixed(7))}`);
  return `POLYGON((${coords.join(',')}))`;
}

/** The CQL2 text filter applied to the OGC API. */
export function buildCql2Filter(points: LngLat[]): string {
  return `s_within(AdresPositie,${buildWktPolygon(points)}) AND AdresStatus <> 'Gehistoreerd'`;
}

export interface FetchOptions {
  maxRecords?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

/**
 * Fetches all address records inside the given polygon.
 * Follows the OGC `next` link, capping the total at maxRecords.
 */
export async function fetchAddressesInPolygon(
  points: LngLat[],
  options: FetchOptions = {}
): Promise<AddressQueryResult> {
  const maxRecords = options.maxRecords ?? 5000;
  const pageSize = options.pageSize ?? 250;

  const filter = buildCql2Filter(points);

  const baseParams = new URLSearchParams();
  baseParams.set('f', 'json');
  baseParams.set('filter-lang', 'cql2-text');
  baseParams.set('filter', filter);
  baseParams.set('limit', String(pageSize));

  let url = `${OGC_BASE}?${baseParams.toString()}`;
  const features: AddressFeature[] = [];
  let truncated = false;

  while (url) {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: options.signal,
    });
    if (!res.ok) {
      throw new Error(`Adressenregister API antwoordde met HTTP ${res.status}`);
    }
    const data = await res.json();

    const batch: AddressFeature[] = Array.isArray(data.features) ? data.features : [];
    features.push(...batch);

    if (features.length >= maxRecords) {
      truncated = true;
      break;
    }

    const next = (data.links || []).find((link: { rel: string }) => link.rel === 'next');
    url = next ? next.href : null;
  }

  const trimmed = features.slice(0, maxRecords);
  return {
    records: trimmed.map(toRecord),
    truncated: truncated || features.length > maxRecords,
  };
}
