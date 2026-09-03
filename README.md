[Vlaamse Geocoder](https://warrieka.github.io/vlaamse-geocoder/)
========================

A modern, browser‑based tool to **batch‑geocode CSV files of Flemish addresses** and convert the results to any Belgian CRS. Everything runs locally in your browser — the CSV never leaves your machine, only the individual geocoding requests go out to the chosen provider.

![Demo app](img/demo.gif)

## What you can do

- **Import a CSV** of Flemish addresses (up to 10 MB, 5 000 rows, 50 columns) and map the columns to *straat*, *huisnummer*, *postcode* and *gemeente*.
- **Geocode all rows, selected rows, or a single row** with a real progress bar, pause/resume and stop controls.
- **Pick the geocoder** (see [Geocoders](#geocoders)) per run — no restart required.
- **Pick the target CRS** (see [Coordinate systems](#coordinate-systems)) — results are re‑projected on the fly and the export columns match your choice.
- **Inspect visually** on an interactive Leaflet map, with a different colour per match status.
- **Fix what the APIs miss** by opening the *pinpoint* map for any row and clicking the exact location.
- **Edit cells inline**, delete rows, and re‑run geocoding without re‑importing.
- **Export the results** as:
  - **CSV** — `;` delimited (standard European Excel), with all Lambert 72, Lambert 2008, WGS84, status, matched address, match type, score and the *source* URL alongside the original columns.
  - **GeoJSON** — a `FeatureCollection` of points (WGS84) with the same rich properties.
- **State is persisted** in `localStorage` (debounced), so you can close the tab and pick up where you left off.

## Geocoders

| ID | Provider | Endpoint | Notes |
| -- | -------- | -------- | ----- |
| `geoloc` (default) | **Digitaal Vlaanderen — Geolocation API v4** | `https://geo.api.vlaanderen.be/geolocation/v4/Location` | Official, fast, returns Lambert 72 + Lambert 2008 + WGS84 in one call. Distinguishes *huisnummer* (exact) from *straatniveau* (partial). |
| `basisregisters` | **Digitaal Vlaanderen — Basisregisters v2 `adresmatch`** | `https://api.basisregisters.vlaanderen.be/v2/adresmatch` | The official Flemish address register; returns a match score (≥ 90 → exact). |
| `nominatim` | **OpenStreetMap Nominatim** | `https://nominatim.openstreetmap.org/search` | Open‑source fallback, restricted to `countrycodes=be`. **Rate‑limited to 1 request/second** — use for small batches. |

The app also uses the Digitaal Vlaanderen *reverse geocode* endpoint (with Nominatim as fallback) when you pinpoint a location manually, to try to fill in a human‑readable address.

## Coordinate systems

Pick a target CRS in the toolbar — every row's `x`/`y` is recomputed via [proj4](https://proj4js.github.io/proj4js/):

| CRS | Name | Unit |
| --- | ---- | ---- |
| `EPSG:31370` | **Belgian Lambert 1972** (default) | metre |
| `EPSG:3812`  | Belgian Lambert 2008 | metre |
| `EPSG:4326`  | WGS 84 | degree |
| `EPSG:3857`  | Web Mercator | metre |

Every export **always** contains all of: target CRS, Lambert 72, Lambert 2008 and WGS84 — so switching the dropdown only changes which pair is shown as `x`/`y` in the UI/table.

## Match statuses

| Status | Meaning |
| ------ | ------- |
| `exact` | House‑number‑level match (Geoloc `huisnummer` / Basisregisters score ≥ 90 / OSM building). |
| `partial` | Street‑level or lower‑precision match — worth a visual check on the map. |
| `manual` | You placed the pin yourself. |
| `not_found` | The provider returned no result. |
| `error` | Network/API error (or empty address). |

The stats bar and the table badges keep these counts updated in real time.

## Project structure

```
src/
├─ App.tsx                       # state, persistence, top‑level wiring
├─ types.ts                      # shared types (GeocoderId, CrsId, GeocodeResult, …)
├─ config.ts                     # limits (maxRows / maxColumns / maxFileSizeMB)
├─ components/
│  ├─ Header/                    # app header + active view switcher
│  ├─ Upload/FileImporter        # CSV import + column mapping
│  ├─ Toolbar/GeocoderToolbar    # geocoder/CRS picker, batch controls, export, stats
│  ├─ Map/ModernMap              # Leaflet visualisation of results
│  ├─ Table/DataTable            # row list, inline edit, search, select
│  └─ Modal/PinpointModal        # click‑to‑pinpoint for a single row
├─ hooks/useGeocoderRunner.ts    # batch runner with pause/resume, progress, stats
└─ services/
   ├─ geocoder.ts                # 3 geocoder clients + reverse geocode helper
   ├─ projections.ts             # CRS definitions + proj4 wrappers
   └─ export.ts                  # CSV / GeoJSON export
```

## Tech stack

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS 4** (via `@tailwindcss/vite`)
- **Leaflet** — interactive map (no Google Maps key required)
- **proj4** — CRS projections (Lambert 72 / 2008 / WGS84 / Web Mercator)
- **PapaParse** — robust CSV parsing & unparse
- **lucide‑react** — icons
- No backend. All geocoding calls are made directly from the browser to the public Digitaal Vlaanderen / OSM endpoints.

## Run locally

Prerequisites: Node.js (≥ 18) — https://nodejs.org/

```bash
npm install

# development server (Vite on http://localhost:3000)
npm run dev
```

### Lint / type‑check

```bash
npm run lint          # runs tsc --noEmit
```

### Production build

```bash
npm run build         # outputs to dist/
npm run preview       # build + serve locally
```

## CSV format

The importer is forgiving about header names — after upload you just *map* the existing columns to:

- **straat** (street name)
- **huisnummer** (house number, including letters/building number where applicable)
- **postcode** (5‑digit Flemish postal code)
- **gemeente** (municipality)

Any of the four fields can be left unmapped if your CSV doesn't carry them; the providers still get a best‑effort query from the remaining fields.

## Configuration

`src/config.ts` exposes defaults you can override at runtime by setting `window.APP_CONFIG`:

```ts
interface AppConfig {
  maxFileSizeMB: number; // default 10
  maxRows: number;       // default 5 000
  maxColumns: number;    // default 50
}
```

## Limitations & notes

- **Nominatim** is rate‑limited to **1 request/second** per their usage policy — the batch runner honours the delay, but expect long runtimes for several thousand rows. Prefer `geoloc` or `basisregisters` for large files.
- The app is **client‑only**. There is no server, no API key management and no per‑account quota — you are bound by the public rate limits of each provider.
- State persistence is **per‑browser, per‑origin** (`localStorage`). Clearing browser data or using a different browser starts you fresh.
- Coordinates are stored in **WGS84 internally**; Lambert 72 / 2008 pairs are derived through `proj4` and match the official definitions to the metre.

## License

See `LICENSE` (if present). Third‑party data sources are the open **Digitaal Vlaanderen** APIs and **OpenStreetMap** ODbL data.
