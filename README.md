# Vlaamse Geocodeer tool

This allow you to geocode a csv-file with FLemish adresses using different geocoders including:

- The Geolocation API from digitaal Vlaanderen: <https://geo.api.vlaanderen.be/geolocation/>
- OSM Nominatim: <https://nominatim.org/>
- Vlaamse adressenregister: <https://www.vlaanderen.be/digitaal-vlaanderen/onze-oplossingen/gebouwen-en-adressenregister#informatie-voor-gebruikers>
- Or you can pinpoint the address manually on a the map.

## Run Locally

**Prerequisites:**  Node.js  
<https://nodejs.org/>

1. Install dependencies:
   `npm install`
2. Run the app development server:
   `npm run dev`
3. Run for production:
   `npm run build && npm run preview`
