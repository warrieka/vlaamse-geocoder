[Vlaamse Geocoder](https://warrieka.github.io/vlaamse-geocoder/)
========================

A modern, browser‑based tool with two modes: **batch‑geocode CSV or Excel (xlsx) files of Flemish addresses** and **download official addresses from the Flemish address register by drawing a polygon on the map**. Results can be converted to any Belgian CRS and exported as CSV, xlsx or GeoJSON. Everything runs locally in your browser — the file never leaves your machine, only the individual API requests go out to the chosen provider.

![Demo app](img/demo.gif)

## What you can do

**Geocoder (CSV/xlsx → coordinates)**

- **Import a CSV or Excel (xlsx) file** of Flemish addresses (max 5 MB, 5 000 rows, 50 columns — see [Configuration](#configuration)) and map the columns to *straat*, *huisnummer*, *postcode* and *gemeente*. For xlsx the first worksheet is read; delimiter/encoding options apply to CSV only.
- **Geocode all rows, selected rows, or a single row** with a real progress bar, pause/resume and stop controls.
- **Pick the geocoder** (see [Geocoders](#geocoders)) per run — no restart required.
- **Pick the target CRS** (see [Coordinate systems](#coordinate-systems)) — results are re‑projected on the fly and the export columns match your choice.
- **Inspect visually** on an interactive Leaflet map, with a different colour per match status and an on‑map address search field.
- **Fix what the APIs miss** by opening the *pinpoint* map for any row and clicking the exact location (the app then attempts a reverse geocode to fill in a human‑readable address).
- **Edit cells inline**, delete rows, and re‑run geocoding without re‑importing.
- **Export the results** as **CSV** (`;` delimited — standard European Excel), **Excel (xlsx)** or **GeoJSON**. Every export keeps the original columns alongside the target CRS, Lambert 72, Lambert 2008, WGS84, status, matched address, match type, score and the *source* URL.
- **State is persisted** in `localStorage` (debounced), so you can close the tab and pick up where you left off.

**Adressenregister (polygon → address download)**

- **Draw a polygon** on a Leaflet map (minimum 3 points, vertices draggable, self‑intersection detection) and close it to start the search.
- **Fetch all official addresses** inside the polygon from the Digitaal Vlaanderen *Adressenregister* OGC Feature API (up to 20 000 records — see [Configuration](#configuration)).
- **Review** the results in a table and as clustered markers on the map (`leaflet.markercluster`).
- **Export** as **CSV**, **Excel (xlsx)** or **GeoJSON** (WGS84 + Lambert 72 coordinates, with a link to each official address dossier).
- The drawn polygon and the results are **persisted** in `localStorage`, so a page refresh loses nothing.

## Views & routing

The app has three views, switchable from the header (or the mobile menu) and addressable via a shareable hash route:

| View | Hash | Purpose |
| ---- | ---- | ------- |
| **Geocoder** | `#/geocoder` | Batch‑geocode an imported CSV/xlsx file |
| **Adressenregister** | `#/adressenregister` | Draw a polygon and download the official addresses inside it |
| **Info** | `#/info` | In‑app help — renders the Dutch `README.nl.md` as markdown |

Hash routing (`src/hooks/useHashRoute.ts`) gives back/forward‑button support and shareable deep links.

## Geocoders

| ID | Provider | Endpoint | Notes |
| -- | -------- | -------- | ----- |
| `basisregisters` (default) | **Digitaal Vlaanderen — Basisregisters v2 `adresmatch`** | `https://api.basisregisters.vlaanderen.be/v2/adresmatch` | The official Flemish address register; returns a match score (≥ 90 → exact). |
| `geoloc` | **Digitaal Vlaanderen — Geolocation API v4** | `https://geo.api.vlaanderen.be/geolocation/v4/Location` | Official geolocation service, returns Lambert 72 + Lambert 2008 + WGS84 in one call. Distinguishes *huisnummer* (exact) from *straatniveau* (partial). |
| `nominatim` | **OpenStreetMap Nominatim** | `https://nominatim.openstreetmap.org/search` | Open‑source fallback, restricted to `countrycodes=be`. **Rate‑limited to 1 request/second** — the batch runner enforces a 1050 ms inter‑request delay, so use for small batches. |

The app also uses the Digitaal Vlaanderen *reverse geocode* endpoint (with Nominatim as fallback) when you pinpoint a location manually, to try to fill in a human‑readable address.

## Address register (polygon query)

The *Adressenregister* view (`src/components/AddressSearch/`) queries the official address register with a drawn polygon:

- **Endpoint:** `https://geo.api.vlaanderen.be/Adressenregister/ogc/features/v1/collections/Adres/items` (OGC API — Features, paged at 250 records per page).
- **Geometry validation:** the polygon needs ≥ 3 points, must not self‑intersect, and its area (computed in Belgian Lambert 2008) is capped at `maxPolygonAreaM2` (deployed: 10 000 000 m² = 100 ha).
- **Result cap:** at most `maxAddressResults` (deployed: 20 000) records are returned; the UI flags truncation.
- **Rendering:** results appear as clustered markers and in a table; selecting a row highlights the corresponding marker.
- **Persistence:** polygon + results are stored in `localStorage` (300 ms debounce) under `flanders_address_search_state_v1` and cleared on *reset*.
- **Export fields:** street, house number, bus number, postcode, municipality, address status, position specification, `officieel_toegekend` (Ja/Nee), WGS84 + Lambert 72 coordinates and `bron_url` (the official address dossier).

## Coordinate systems

Pick a target CRS in the toolbar — every row's `x`/`y` is recomputed via [proj4](https://proj4js.github.io/proj4js/):

| CRS | Name | Unit |
| --- | ---- | ---- |
| `EPSG:3812`  | **Belgian Lambert 2008** (default) | metre |
| `EPSG:31370` | Belgian Lambert 1972 | metre |
| `EPSG:4326`  | WGS 84 | degree |
| `EPSG:3857`  | Web Mercator | metre |

Every geocode export **always** contains all of: target CRS, Lambert 72, Lambert 2008 and WGS84 — so switching the dropdown only changes which pair is shown as `x`/`y` in the UI/table.

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
├─ App.tsx                        # state, persistence, view wiring (hash routing)
├─ types.ts                       # shared types (GeocoderId, CrsId, GeocodeResult, …)
├─ config.ts                      # limits (maxFileSizeMB / maxRows / maxColumns / maxPolygonAreaM2 / maxAddressResults)
├─ components/
│  ├─ Header/                     # app header + view switcher (Geocoder / Adressenregister / Info)
│  ├─ Upload/FileImporter        # CSV + xlsx import + column mapping
│  ├─ Toolbar/GeocoderToolbar    # geocoder/CRS picker, batch controls, export, stats
│  ├─ Map/ModernMap              # Leaflet visualisation of geocoding results
│  ├─ Map/AddressSearchInput     # on-map address search (geocoder view)
│  ├─ Table/DataTable            # row list, inline edit, search, select, delete
│  ├─ Modal/PinpointModal        # click-to-pinpoint for a single row
│  ├─ AddressSearch/             # Adressenregister view
│  │  ├─ AddressSearchView       # state, persistence, search + export wiring
│  │  ├─ DrawMap                 # Leaflet polygon drawing + clustered result markers
│  │  ├─ AddressTable            # result table with row selection
│  │  └─ Toolbar                 # area/limit info, search, export menu
│  └─ Advisor/AdvisorPanel       # Info tab — renders README.nl.md via `marked`
├─ hooks/
│  ├─ useGeocoderRunner.ts       # batch runner: pause/resume/stop, progress, stats, rate delays
│  └─ useHashRoute.ts            # hash-based routing (#/geocoder, #/adressenregister, #/info)
└─ services/
   ├─ geocoder.ts                # 3 geocoder clients + reverse geocode helper
   ├─ projections.ts             # CRS definitions + proj4 wrappers
   ├─ addresses.ts               # Adressenregister OGC Feature API client (polygon query, paging)
   ├─ polygon.ts                 # polygon area (Lambert 2008) + self-intersection checks
   ├─ fileparse.ts               # xlsx worksheet parsing (SheetJS)
   └─ export.ts                  # CSV / XLSX / GeoJSON export (geocoder + address-register results)
```

## Tech stack

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS 4** (via `@tailwindcss/vite`)
- **Leaflet** — interactive map (no Google Maps key required)
- **leaflet.markercluster** — clustered markers for large address-register result sets
- **proj4** — CRS projections (Lambert 72 / 2008 / WGS84 / Web Mercator)
- **PapaParse** — robust CSV parsing & unparse
- **SheetJS (`xlsx`)** — Excel import (first worksheet) and xlsx export
- **marked** — markdown rendering for the in-app Info tab
- **lucide‑react** — icons
- No backend. All geocoding and address-register calls are made directly from the browser to the public Digitaal Vlaanderen / OSM endpoints.

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

### Deploy to Cloudflare Pages (manual)

The build uses a relative base (`base: './'` in `vite.config.ts`), so the same `dist/` folder works on any host — at the domain root (Cloudflare Pages, custom domain) or in a subpath (GitHub Pages reserve at `https://warrieka.github.io/vlaamse-geocoder/`).

```bash
# one-time setup
npx wrangler login                              # browser login
npx wrangler pages project create vlaamse-geocoder   # only if the project does not exist yet

# deploy (or use the npm script below)
npm run deploy:cf
# = npm run build && npx wrangler pages deploy dist
```

- `wrangler.toml.example` in the repo root is a starting point for an optional `wrangler.toml` (project name); the deploy works without it.
- After the first deploy you get a `*.pages.dev` URL. Add your own (sub)domain under *Workers & Pages → project → Custom domains*, then point the DNS record at the shown target from your registrar. Cloudflare issues the TLS certificate automatically.
- No Cloudflare deploy is wired into the CI: GitHub Actions still deploys to GitHub Pages only, and Cloudflare deploys are always run manually.

## Import format

The importer is forgiving about header names — after upload you just *map* the existing columns to:

- **straat** (street name)
- **huisnummer** (house number, including letters/building number where applicable)
- **postcode** (5‑digit Flemish postal code)
- **gemeente** (municipality)

Any of the four fields can be left unmapped if your file doesn't carry them; the providers still get a best‑effort query from the remaining fields.

## Configuration

`src/config.ts` exposes defaults you can override at runtime by setting `window.APP_CONFIG`. The deployed app ships `public/config.js` with its own values (which win over the defaults):

```ts
interface AppConfig {
  version?: string;         // shown as a badge in the header (e.g. "2.2")
  maxFileSizeMB: number;    // default 10 (deployed: 5)
  maxRows: number;          // default 5 000
  maxColumns: number;       // default 50
  maxPolygonAreaM2: number; // default 1 000 000 (deployed: 10 000 000 = 100 ha)
  maxAddressResults: number;// default 5 000 (deployed: 20 000)
}
```

Current deployed values (`public/config.js`):

```js
window.APP_CONFIG = {
  version: "2.2",
  maxFileSizeMB: 5,
  maxRows: 5000,
  maxColumns: 50,
  maxPolygonAreaM2: 10000000, // 100 ha
  maxAddressResults: 20000,
};
```

Changes take effect on the next page load.

## Limitations & notes

- **Nominatim** is rate‑limited to **1 request/second** per their usage policy — the batch runner honours the delay, but expect long runtimes for several thousand rows. Prefer `basisregisters` or `geoloc` for large files.
- The app is **client‑only**. There is no server, no API key management and no per‑account quota — you are bound by the public rate limits of each provider.
- State persistence is **per‑browser, per‑origin** (`localStorage`): one store for the geocoder view (`flanders_geocoder_state_v2`) and one for the address‑search view (`flanders_address_search_state_v1`). Clearing browser data or using a different browser starts you fresh.
- Address‑register polygons are limited to `maxPolygonAreaM2` (deployed: 100 ha) and results to `maxAddressResults` (deployed: 20 000) — raise them in `public/config.js` if your deployment allows.
- Coordinates are stored in **WGS84 internally**; Lambert 72 / 2008 pairs are derived through `proj4` and match the official definitions to the metre.

## License

See `LICENSE` (if present). Third‑party data sources are the open **Digitaal Vlaanderen** APIs and **OpenStreetMap** ODbL data.
