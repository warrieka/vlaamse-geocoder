/**
 * Configuratiebestand voor Vlaamse Geocoder (public/config.js)
 * 
 * U kunt deze limieten hier op elk moment naar wens aanpassen.
 * Wijzigingen zijn direct van kracht na het herladen van de pagina.
 */
window.APP_CONFIG = {
  // version of the app
  version: "2.1",
  // Maximale bestandsgrootte van het CSV-bestand in Megabytes (MB)
  maxFileSizeMB: 5,
  // Maximaal toegestaan aantal rijen (records) in het CSV-bestand (exclusief koptekst)
  // Beveiligt tegen browservertragingen of crashes bij bestanden met meer dan 5.000 rijen
  maxRows: 2000,
  // Maximaal aantal kolommen in het CSV-bestand
  maxColumns: 50,
};
