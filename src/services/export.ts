import Papa from 'papaparse';
import { AddressRow, CrsId } from '../types';

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
