import { CrsId, GeocodeResult, MatchStatus } from '../types';
import { fromWgs84, transformCoords } from './projections';

export interface GeocodeAddressParams {
  street?: string;
  housenumber?: string;
  postalCode?: string;
  municipality?: string;
  fullAddress?: string;
}

/**
 * Modern Flemish Geolocation API v4 (Digitaal Vlaanderen)
 * High-performance, open, official Flemish government API
 */
export async function geocodeFlemishGeolocation(
  params: GeocodeAddressParams,
  targetCrs: CrsId
): Promise<GeocodeResult> {
  const parts = [
    params.street,
    params.housenumber,
    params.postalCode,
    params.municipality,
  ].filter(Boolean);

  const query = params.fullAddress || parts.join(' ');
  if (!query.trim()) {
    return {
      status: 'error',
      statusLabel: 'Leeg adres',
      x: null,
      y: null,
    };
  }

  const endpoint = `https://geo.api.vlaanderen.be/geolocation/v4/Location?q=${encodeURIComponent(
    query
  )}`;

  try {
    const res = await fetch(endpoint);
    if (!res.ok) {
      throw new Error(`Flemish Geolocation API returned HTTP ${res.status}`);
    }
    const data = await res.json();

    if (!data.LocationResult || data.LocationResult.length === 0) {
      return {
        status: 'not_found',
        statusLabel: 'Adres niet gevonden',
        x: null,
        y: null,
      };
    }

    const first = data.LocationResult[0];
    const loc = first.Location;

    const lat = loc.Lat_WGS84;
    const lon = loc.Lon_WGS84;
    const x_l72 = loc.X_Lambert72;
    const y_l72 = loc.Y_Lambert72;
    const x_l2008 = loc.X_Lambert2008;
    const y_l2008 = loc.Y_Lambert2008;

    // Calculate requested target CRS coordinates
    let targetX: number;
    let targetY: number;

    if (targetCrs === 'EPSG:31370') {
      targetX = x_l72;
      targetY = y_l72;
    } else if (targetCrs === 'EPSG:3812') {
      targetX = x_l2008;
      targetY = y_l2008;
    } else if (targetCrs === 'EPSG:4326') {
      targetX = lon;
      targetY = lat;
    } else {
      const transformed = fromWgs84(lon, lat, targetCrs);
      targetX = transformed[0];
      targetY = transformed[1];
    }

    const isExact =
      first.LocationType?.includes('huisnummer') ||
      first.LocationType?.includes('gebouweenheid');

    const status: MatchStatus = isExact ? 'exact' : 'partial';
    const statusLabel = isExact
      ? 'Exact (Huisnummer)'
      : `Benaderend (${first.LocationType || 'Straatniveau'})`;

    let sourceUri = "";  
    if (isExact) {
       sourceUri = `https://api.basisregisters.vlaanderen.be/v2/adressen/${first.ID}`;
    }
    else {
       sourceUri = `https://api.basisregisters.vlaanderen.be/v2/straatnamen/${first.ID}`;
    }

    return {
      status,
      statusLabel,
      x: targetX,
      y: targetY,
      lat,
      lon,
      x_lambert72: x_l72,
      y_lambert72: y_l72,
      x_lambert2008: x_l2008,
      y_lambert2008: y_l2008,
      matchedAddress: first.FormattedAddress,
      matchType: first.LocationType,
      id: first.ID,
      sourceUrl: sourceUri,
      details: first,
    };
  } catch (err: any) {
    console.error('Flemish Geolocation API error:', err);
    return {
      status: 'error',
      statusLabel: err?.message || 'Netwerkfout',
      x: null,
      y: null,
    };
  }
}

/**
 * Digitaal Vlaanderen Basisregisters v2 Adresmatch
 * Official base registry of Flemish addresses
 */
export async function geocodeBasisregisters(
  params: GeocodeAddressParams,
  targetCrs: CrsId
): Promise<GeocodeResult> {
  const urlParams = new URLSearchParams();
  if (params.street) urlParams.set('straatnaam', params.street);
  if (params.housenumber) urlParams.set('huisnummer', params.housenumber);
  if (params.postalCode) urlParams.set('postcode', params.postalCode);
  if (params.municipality) urlParams.set('gemeentenaam', params.municipality);

  const endpoint = `https://api.basisregisters.vlaanderen.be/v2/adresmatch?${urlParams.toString()}`;

  try {
    const res = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Basisregisters API error ${res.status}`);
    }

    const data = await res.json();
    if (!data.adresMatches || data.adresMatches.length === 0) {
      return {
        status: 'not_found',
        statusLabel: 'Niet gevonden in Adressenregister',
        x: null,
        y: null,
      };
    }

    const match = data.adresMatches[0];
    const pos = match.adresPositie;

    if (!pos || !pos.geometrie) {
      return {
        status: 'partial',
        statusLabel: 'Adres gematcht zonder positie',
        x: null,
        y: null,
        matchedAddress: match.volledigAdres?.geografischeNaam?.spelling,
      };
    }

    // GML Point coordinate parsing from Lambert 72
    let x_l72 = 0;
    let y_l72 = 0;

    if (pos.geometrie.gml) {
      const matchPos = pos.geometrie.gml.match(/<gml:pos>([0-9.]+)\s+([0-9.]+)<\/gml:pos>/);
      if (matchPos) {
        x_l72 = parseFloat(matchPos[1]);
        y_l72 = parseFloat(matchPos[2]);
      }
    } else if (pos.geometrie.point?.coordinates) {
      x_l72 = pos.geometrie.point.coordinates[0];
      y_l72 = pos.geometrie.point.coordinates[1];
    }

    // Convert Lambert 72 to WGS84
    const [lon, lat] = transformCoords([x_l72, y_l72], 'EPSG:31370', 'EPSG:4326');
    const [x_l2008, y_l2008] = transformCoords([x_l72, y_l72], 'EPSG:31370', 'EPSG:3812');

    let targetX = x_l72;
    let targetY = y_l72;

    if (targetCrs === 'EPSG:3812') {
      targetX = x_l2008;
      targetY = y_l2008;
    } else if (targetCrs === 'EPSG:4326') {
      targetX = lon;
      targetY = lat;
    } else if (targetCrs === 'EPSG:3857') {
      const [mx, my] = transformCoords([lon, lat], 'EPSG:4326', 'EPSG:3857');
      targetX = mx;
      targetY = my;
    }

    const score = match.score ? Math.round(match.score) : undefined;
    const isExact = match.score >= 90;

    return {
      status: isExact ? 'exact' : 'partial',
      statusLabel: isExact
        ? `Officieel Toegekend (${score}%)`
        : `Match score: ${score || 0}%`,
      x: targetX,
      y: targetY,
      lat,
      lon,
      x_lambert72: x_l72,
      y_lambert72: y_l72,
      x_lambert2008: x_l2008,
      y_lambert2008: y_l2008,
      matchedAddress: match.volledigAdres?.geografischeNaam?.spelling,
      matchType: pos.positieSpecificatie || match.adresStatus,
      score,
      sourceUrl: match.detail,
      details: match,
    };
  } catch (err: any) {
    console.error('Basisregisters error:', err);
    return {
      status: 'error',
      statusLabel: err?.message || 'API fout',
      x: null,
      y: null,
    };
  }
}

/**
 * OpenStreetMap Nominatim Geocoder
 * Global open source geocoder with Belgium filter
 */
export async function geocodeNominatim(
  params: GeocodeAddressParams,
  targetCrs: CrsId
): Promise<GeocodeResult> {
  const parts = [
    params.street,
    params.housenumber,
    params.postalCode,
    params.municipality,
  ].filter(Boolean);

  const query = params.fullAddress || parts.join(' ');
  if (!query.trim()) {
    return {
      status: 'error',
      statusLabel: 'Leeg adres',
      x: null,
      y: null,
    };
  }

  const endpoint = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    query
  )}&countrycodes=be&format=json&limit=1&addressdetails=1`;

  try {
    const res = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Nominatim rate limit bereikt (max 1 req/sec)');
      }
      throw new Error(`Nominatim HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data || data.length === 0) {
      return {
        status: 'not_found',
        statusLabel: 'Adres niet gevonden in OSM',
        x: null,
        y: null,
      };
    }

    const item = data[0];
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);

    const [x_l72, y_l72] = transformCoords([lon, lat], 'EPSG:4326', 'EPSG:31370');
    const [x_l2008, y_l2008] = transformCoords([lon, lat], 'EPSG:4326', 'EPSG:3812');

    let targetX = lon;
    let targetY = lat;

    if (targetCrs === 'EPSG:31370') {
      targetX = x_l72;
      targetY = y_l72;
    } else if (targetCrs === 'EPSG:3812') {
      targetX = x_l2008;
      targetY = y_l2008;
    } else if (targetCrs === 'EPSG:3857') {
      const [mx, my] = transformCoords([lon, lat], 'EPSG:4326', 'EPSG:3857');
      targetX = mx;
      targetY = my;
    }

    const isBuilding =
      item.type === 'house' ||
      item.type === 'building' ||
      item.class === 'place' ||
      item.addresstype === 'house' ||
      item.addresstype === 'building';

    return {
      status: isBuilding ? 'exact' : 'partial',
      statusLabel: isBuilding ? 'OSM Gebouw' : `OSM ${item.type || 'Punt'}`,
      x: targetX,
      y: targetY,
      lat, lon,
      x_lambert72: x_l72,
      y_lambert72: y_l72,
      x_lambert2008: x_l2008,
      y_lambert2008: y_l2008,
      matchedAddress: item.display_name,
      matchType: item.type,
      sourceUrl: `https://www.openstreetmap.org/${item.osm_type}/${item.osm_id}`,
      details: item,
    };
  } catch (err: any) {
    console.error('Nominatim error:', err);
    return {
      status: 'error',
      statusLabel: err?.message || 'Nominatim fout',
      x: null,
      y: null,
    };
  }
}

/**
 * Reverse geocodes WGS84 coordinates to a human-readable Flemish address
 */
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<{ address: string; source: string } | null> {
  // First try Flemish Geolocation API by coordinate
  try {
    const [x72, y72] = transformCoords([lon, lat], 'EPSG:4326', 'EPSG:31370');
    const endpoint = `https://geo.api.vlaanderen.be/geolocation/v4/Location?c=1&xy=${x72},${y72}`;
    const res = await fetch(endpoint);
    if (res.ok) {
      const data = await res.json();
      if (data.LocationResult && data.LocationResult.length > 0) {
        return {
          address: data.LocationResult[0].FormattedAddress,
          source: 'Digitaal Vlaanderen',
        };
      }
    }
  } catch {
    // Fall back to Nominatim
  }

  try {
    const endpoint = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&countrycodes=be`;
    const res = await fetch(endpoint);
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        return {
          address: data.display_name,
          source: 'OpenStreetMap',
        };
      }
    }
  } catch {
    // ignore
  }

  return null;
}
