import Papa from 'papaparse';
import { AddressRow, CrsId } from '../types';
import { AddressRecord } from './addresses';
import { transformCoords } from './projections';

export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportRowsToCsv(rows: AddressRow[], targetCrs: CrsId, originalFilename?: string) {
  const data = rows.map((row) => {
    const res = row.result;
    return {
      x: res?.x !== null && res?.x !== undefined ? res.x : '',
      y: res?.y !== null && res?.y !== undefined ? res.y : '',
      target_crs: targetCrs,
      x_lambert72: res?.x_lambert72 ?? '',
      y_lambert72: res?.y_lambert72 ?? '',
      x_lambert2008: res?.x_lambert2008 ?? '',
      y_lambert2008: res?.y_lambert2008 ?? '',
      lat_wgs84: res?.lat ?? '',
      lon_wgs84: res?.lon ?? '',
      geocode_status: res?.status ?? 'niet_verwerkt',
      matched_address: res?.matchedAddress ?? '',
      match_type: res?.matchType ?? '',
      score: res?.score ?? '',
      source_url: res?.sourceUrl ?? '',
      ...row.data,
    };
  });

  const csvString = Papa.unparse(data, {
    quotes: true,
    delimiter: ';', // Standard European Excel delimiter
  });

  const baseName = originalFilename ? originalFilename.replace(/\.csv$/i, '') : 'geocoded_addresses';
  downloadFile(`${baseName}_geocoded.csv`, csvString, 'text/csv;charset=utf-8;');
}

export function exportRowsToGeoJson(rows: AddressRow[], targetCrs: CrsId, originalFilename?: string) {
  const validRows = rows.filter((r) => r.result?.lat && r.result?.lon);

  const features = validRows.map((r) => {
    const res = r.result!;
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [res.lon, res.lat], // GeoJSON is [lon, lat]
      },
      properties: {
        id: r.id,
        matched_address: res.matchedAddress,
        status: res.status,
        status_label: res.statusLabel,
        x_target_crs: res.x,
        y_target_crs: res.y,
        target_crs: targetCrs,
        x_lambert72: res.x_lambert72,
        y_lambert72: res.y_lambert72,
        x_lambert2008: res.x_lambert2008,
        y_lambert2008: res.y_lambert2008,
        score: res.score,
        source_url: res.sourceUrl,
        ...r.data,
      },
    };
  });

  const geoJson = {
    type: 'FeatureCollection',
    name: 'Vlaamse_Geocodering_Export',
    crs: {
      type: 'name',
      properties: {
        name: 'urn:ogc:def:crs:OGC:1.3:CRS84',
      },
    },
    features,
  };

  const baseName = originalFilename ? originalFilename.replace(/\.csv$/i, '') : 'geocoded_addresses';
  downloadFile(
    `${baseName}_geocoded.geojson`,
    JSON.stringify(geoJson, null, 2),
    'application/geo+json;charset=utf-8;'
  );
}

/**
 * Export Adressenregister-search results (drawn polygon) to CSV.
 * Coordinates are emitted in the original OGC WGS84 plus Lambert 2008 (ETRS89)
 * when coordinates are available.
 */
export function exportAddressCsvItems(records: AddressRecord[]) {
  const data = records.map((r) => {
    const hasCoord = r.lon != null && r.lat != null;
    const [x72, y72] = hasCoord
      ? transformCoords([r.lon as number, r.lat as number], 'EPSG:4326', 'EPSG:31370')
      : [null, null];
    return {
      vollig_adres: r.address,
      straatnaam: r.street,
      huisnummer: r.housenr,
      busnummer: r.bus,
      postcode: r.postcode,
      gemeente: r.municipality,
      adres_status: r.status,
      positie_specificatie: r.positionSpec,
      officieel_toegekend: r.official ? 'Ja' : 'Nee',
      lon_wgs84: r.lon ?? '',
      lat_wgs84: r.lat ?? '',
      x_lambert72: x72 ?? '',
      y_lambert72: y72 ?? '',
      bron_url: r.detailUrl,
    };
  });
  const csv = Papa.unparse(data, { quotes: true, delimiter: ';' });
  downloadFile(
    `adressen_polygoon_${new Date().toISOString().slice(0, 10)}.csv`,
    csv,
    'text/csv;charset=utf-8;'
  );
}

/**
 * Export Adressenregister-search results to GeoJSON (WGS84).
 */
export function exportAddressGeoJsonItems(records: AddressRecord[]) {
  const features = records
    .filter((r) => r.lat != null && r.lon != null)
    .map((r) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [r.lon as number, r.lat as number],
      },
      properties: {
        id: r.id,
        vollig_adres: r.address,
        straatnaam: r.street,
        huisnummer: r.housenr,
        busnummer: r.bus,
        postcode: r.postcode,
        gemeente: r.municipality,
        adres_status: r.status,
        positie_specificatie: r.positionSpec,
        officieel_toegekend: r.official,
        bron_url: r.detailUrl,
      },
    }));

  const geoJson = {
    type: 'FeatureCollection',
    name: 'Adressenregister_Polygon_Export',
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
    features,
  };
  downloadFile(
    `adressen_polygoon_${new Date().toISOString().slice(0, 10)}.geojson`,
    JSON.stringify(geoJson, null, 2),
    'application/geo+json;charset=utf-8;'
  );
}
