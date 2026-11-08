Vlaamse Geocoder
=================

De **Vlaamse Geocoder** is een eenvoudige webtoepassing waarmee je snel een groot aantal Vlaamse adressen kunt omzetten naar geografische coördinaten. Je kunt een CSV- of Excel (xlsx)-bestand met adressen inladen, de adressen automatisch laten opzoeken en het resultaat bekijken op een kaart of exporteren voor gebruik in bijvoorbeeld **Excel, GIS, ArcGIS Pro of QGIS**.

Daarnaast kun je met de tab **Adressenregister** officiële adressen downloaden: teken een gebied op de kaart en de toepassing haalt alle adressen binnen dat gebied op uit het Vlaamse Adressenregister.

De verwerking gebeurt **rechtstreeks in je webbrowser** — je bestand verlaat je computer niet. De toepassing werkt ook op telefoon en tablet.

![Demo app](img/demo.gif)

## Wat kan je ermee?

### Adressen geocoderen

* Een CSV- of Excel (xlsx)-bestand met adressen inladen (max. 5 MB, 5.000 rijen, 50 kolommen).
* Aangeven welke kolommen de **straat, het huisnummer, de postcode en de gemeente** bevatten.
* Meerdere duizenden adressen in één keer laten geocoderen — of alleen de geselecteerde rijen of één enkele rij.
* De voortgang van de verwerking volgen, pauzeren of stoppen.
* Resultaten bekijken op een interactieve kaart.
* Adressen die niet automatisch correct gevonden worden, handmatig op de kaart aanduiden.
* Adresgegevens rechtstreeks in de tabel aanpassen, rijen verwijderen en opnieuw laten zoeken.
* De geocoder en het doel-coördinatensysteem per run kiezen, zonder opnieuw te hoeven starten.
* De resultaten exporteren als **CSV**, **Excel (xlsx)** of **GeoJSON**.

### Adressen downloaden uit het Adressenregister

* Een gebied tekenen op de kaart (polygoon).
* Alle officiële adressen binnen dat gebied opvragen uit het Vlaamse Adressenregister (max. 20.000 adressen).
* De adressen bekijken in een tabel én als markers op de kaart.
* Het resultaat exporteren als **CSV**, **Excel (xlsx)** of **GeoJSON** — met de link naar het officiële adresdossier.

## Adressen downloaden uit het Adressenregister

Met de tab **Adressenregister** download je alle officiële adressen binnen een getekend gebied. Handig wanneer je bijvoorbeeld een complete adreslijst nodig hebt voor een straat, wijk of buurt.

**Zo werkt het:**

1. **Teken het gebied** — klik op de kaart om de hoekpunten van de polygoon te plaatsen (minimaal 3 punten). Je kunt ook een adres of plaats via het zoekveld op de kaart opzoeken om snel op de juiste plek te komen.
2. **Sluit de polygoon** — de toepassing controleert automatisch de oppervlakte en of de polygoon zichzelf kruist. De maximale oppervlakte is **100 ha**.
3. **Zoek** — de toepassing vraagt de adressen binnen het getekende gebied op bij het Vlaamse Adressenregister (maximaal **20.000 adressen** per zoekopdracht).
4. **Controleer en exporteer** — de adressen worden getoond in een tabel en als markers op de kaart. Selecteer een adres om het te markeren. Exporteer daarna als CSV, Excel (xlsx) of GeoJSON.

Elk adres bevat onder andere de straatnaam, het huis- en eventueel busnummer, de postcode, de gemeente, de adresstatus, coördinaten (WGS84 en Belgisch Lambert 72) en een link naar het officiële adresdossier.

Je tekening en je resultaten worden **bewaard in je browser**, zodat je kunt terugkomen waar je gebleven was.

## Hoe nauwkeurig is het resultaat?

De toepassing maakt gebruik van de officiële diensten van **Digitaal Vlaanderen** en, als fallback, **OpenStreetMap**. Je kunt per run kiezen welke geocoder gebruikt wordt, zonder de toepassing te hoeven herstarten:

* **Digitaal Vlaanderen — Basisregisters (standaard)** — het officiële Vlaamse adressenregister, met een matchscore (score ≥ 90 = exact).
* **Digitaal Vlaanderen — Geolocation API v4** — de officiële geolocatiedienst, met onderscheid tussen huisnummerniveau en straatniveau.
* **OpenStreetMap Nominatim** — de open-source fallback. Beperkt tot **1 verzoek per seconde**, dus geschikt voor kleinere bestanden.

Elk resultaat krijgt een status:

* **Exact** – het adres is op huisnummerniveau gevonden.
* **Gedeeltelijk** – alleen bijvoorbeeld de straat kon worden gevonden. Controleer dit bij voorkeur op de kaart.
* **Handmatig** – de locatie werd door de gebruiker zelf aangeduid.
* **Niet gevonden** – er werd geen geschikt resultaat gevonden.
* **Fout** – er was bijvoorbeeld een probleem met de invoer of de verbinding.

## Coördinaten

Je kiest het **doel-coördinatensysteem** in de toolbar; de standaard is **Belgisch Lambert 2008 (EPSG:3812)**. Ondersteunde systemen:

* **Belgisch Lambert 2008 (EPSG:3812)** – standaard.
* **Belgisch Lambert 72 (EPSG:31370)** – gangbaar voor veel Vlaamse GIS-toepassingen.
* **WGS84 (EPSG:4326)** – bijvoorbeeld voor GPS en webtoepassingen.
* **Web Mercator (EPSG:3857)** – veel gebruikt voor online kaarten.

De export bevat altijd **Belgisch Lambert 72, Belgisch Lambert 2008 én WGS84** (naast het gekozen doel-systeem), zodat je het resultaat eenvoudig kunt verwerken voor elke toepassing.

## Hoe gebruik je de toepassing?

### 1. Laad je CSV- of Excel (xlsx)-bestand

Upload een CSV- of Excel (xlsx)-bestand met de adressen die je wilt opzoeken (max. 5 MB, 5.000 rijen, 50 kolommen). Voor Excel-bestanden wordt het eerste werkblad gelezen; scheidingsteken en codering gelden alleen voor CSV.

Een adres bestaat bij voorkeur uit:

**Straat | Huisnummer | Postcode | Gemeente**

De exacte namen van de kolommen zijn niet belangrijk. Je kunt na het inladen zelf aangeven welke kolom welke informatie bevat.

### 2. Controleer de adressen

Controleer of de juiste kolommen gekoppeld zijn aan straat, huisnummer, postcode en gemeente.

Niet alle velden zijn verplicht. Wanneer bijvoorbeeld de gemeente ontbreekt, probeert de geocoder alsnog een zo goed mogelijke overeenkomst te vinden.

### 3. Start de geocodering

Start de verwerking. De toepassing zoekt de adressen automatisch op en toont de voortgang.

Je kunt de verwerking indien nodig **pauzeren, hervatten of stoppen**. Heb je rijen geselecteerd, dan worden uitsluitend die rijen geocodeerd.

### 4. Controleer de resultaten

De gevonden adressen worden op een kaart weergegeven. Zo kun je snel controleren of de locaties logisch zijn.

Resultaten met een gedeeltelijke overeenkomst verdienen extra aandacht.

### 5. Corrigeer indien nodig

Wanneer een adres niet correct gevonden wordt, kun je:

* de adresgegevens aanpassen;
* het adres opnieuw laten zoeken;
* de rij verwijderen;
* of de locatie **handmatig op de kaart aanduiden**.

Wanneer je zelf een locatie aanduidt, probeert de toepassing bovendien het adres terug te vullen (reverse geocoding).

### 6. Exporteer

Wanneer de resultaten gecontroleerd zijn, kun je ze exporteren als:

* **CSV** – geschikt voor Excel en verdere gegevensverwerking (standaard `;`-scheiding);
* **Excel (xlsx)** – een native spreadsheet die je direct kunt openen;
* **GeoJSON** – geschikt voor GIS-toepassingen zoals QGIS en ArcGIS Pro.

De oorspronkelijke gegevens blijven daarbij behouden, aangevuld met de gevonden locatie, matchstatus en adresinformatie.

**Je werk wordt bewaard in je browser:** je kunt het tabblad sluiten en later op dezelfde plek verder (de opslag geldt per browser).

## Privacy

De verwerking gebeurt **rechtstreeks in de webbrowser**. Je volledige bestand verlaat je computer dus niet.

Alleen de afzonderlijke adresopzoekingen worden doorgestuurd naar de gekozen geocoder, zoals Digitaal Vlaanderen of OpenStreetMap. Ook zoekopdrachten in het Adressenregister gaan rechtstreeks vanuit je browser naar de openbare dienst van Digitaal Vlaanderen.

Er is voor deze toepassing geen account of API-sleutel nodig.

## Voor wie?

De Vlaamse Geocoder is vooral handig wanneer je:

* een lijst met adressen geografisch wilt lokaliseren;
* een Excel- of CSV-bestand van coördinaten wilt voorzien;
* adressen wilt voorbereiden voor gebruik in GIS;
* een complete adreslijst nodig hebt van een straat of wijk (Adressenregister);
* grote hoeveelheden adressen wilt controleren;
* bestaande adresgegevens wilt koppelen aan geografische locaties.

**Kort gezegd:** upload je adressen en laat ze automatisch geocoderen, download adressen uit het Adressenregister door een gebied te tekenen, controleer eventuele twijfelgevallen op de kaart en exporteer daarna de geografische resultaten.

[Open de Vlaamse Geocoder](https://warrieka.github.io/vlaamse-geocoder/)
