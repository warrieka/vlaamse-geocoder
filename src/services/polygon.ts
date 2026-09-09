import proj4 from 'proj4';


/**
 * WGS84 coordinate pair as used by OGC / Leaflet: [lon, lat]
 */
export type LngLat = [number, number];

// Register the Lambert 2008 definition (matches projections.ts) so we can
// work in metres independently of the app's projection setup.
const EPSG3812 =
  '+proj=lcc +lat_1=49.83333333333334 +lat_2=51.16666666666666 +lat_0=50.797815 ' +
  '+lon_0=4.359215833333333 +x_0=649328 +y_0=665262 +ellps=GRS80 ' +
  '+towgs84=0,0,0,0,0,0,0 +units=m +no_defs';

const toLambert2008 = proj4(
  '+proj=longlat +datum=WGS84 +no_defs',
  EPSG3812
);

/**
 * Computes the planar area of a (possibly open) polygon in square metres.
 * The ring is projected to EPSG:3812 (metres) and the Shoelace formula is
 * applied. Works whether or not the first point is repeated as the closing
 * edge.
 */
export function computeAreaM2(points: LngLat[]): number {
  if (points.length < 3) return 0;

  const projected = points.map((p) => toLambert2008.forward([p[0], p[1]]));

  let area = 0;
  for (let i = 0; i < projected.length; i++) {
    const j = (i + 1) % projected.length;
    area += projected[i][0] * projected[j][1];
    area -= projected[j][0] * projected[i][1];
  }
  return Math.abs(area / 2);
}

/** Direction of turn: positive = CCW, negative = CW, 0 = collinear. */
function cross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

/** Whether segments P1-P2 and P3-P4 properly intersect (share an interior point). */
function segmentsIntersect(
  p1: number[], p2: number[], p3: number[], p4: number[]
): boolean {
  const d1 = cross(p3[0], p3[1], p4[0], p4[1], p1[0], p1[1]);
  const d2 = cross(p3[0], p3[1], p4[0], p4[1], p2[0], p2[1]);
  const d3 = cross(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);
  const d4 = cross(p1[0], p1[1], p2[0], p2[1], p4[0], p4[1]);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  // Collinear touch on a segment body (collinear endpoints are shared vertices,
  // so ignored by the adjacency check in isSelfIntersecting).
  if (d1 === 0 && pointOnSegment(p1, p3, p4)) return true;
  if (d2 === 0 && pointOnSegment(p2, p3, p4)) return true;
  if (d3 === 0 && pointOnSegment(p3, p1, p2)) return true;
  if (d4 === 0 && pointOnSegment(p4, p1, p2)) return true;
  return false;
}

function pointOnSegment(p: number[], a: number[], b: number[]): boolean {
  return (
    Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0]) &&
    Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1])
  );
}

/**
 * True if the ring crosses itself (a "bowtie"). Adjacent edges that share a
 * vertex are exempt; the closing edge touching the first/last vertex is exempt.
 */
export function isSelfIntersecting(points: LngLat[]): boolean {
  const n = points.length;
  if (n < 4) return false;

  const isClosed =
    points[0][0] === points[n - 1][0] && points[0][1] === points[n - 1][1];
  const ring: number[][] = isClosed
    ? points.slice(0, -1)
    : points.map((p) => [p[0], p[1]]);
  const m = ring.length;
  if (m < 3) return false;

  for (let i = 0; i < m; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % m];
    for (let j = i + 1; j < m; j++) {
      // skip the same edge, the next edge (adjacent), and the closing adjacency
      if (j === i || j === (i + 1) % m) continue;
      if (i === 0 && j === m - 1) continue;
      const c = ring[j];
      const d = ring[(j + 1) % m];
      if (segmentsIntersect(a, b, c, d)) return true;
    }
  }
  return false;
}

/** Human friendly area: small areas in m², larger areas in hectares. */
export function formatArea(m2: number): string {
  if (!m2) return '0 m²';
  if (m2 < 10000) {
    return new Intl.NumberFormat('nl-BE').format(Math.round(m2)) + ' m²';
  }
  const km2 = m2 / 1000000;
  return (
    new Intl.NumberFormat('nl-BE', { maximumFractionDigits: 3 }).format(km2) + ' km²'
  );
}
