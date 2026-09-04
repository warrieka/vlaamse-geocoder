Vlaamse Geocoder
===================

De **Vlaamse Geocoder** is een eenvoudige webtoepassing waarmee je snel een groot aantal Vlaamse adressen kunt omzetten naar geografische coördinaten.

Je kunt een CSV-bestand met adressen inladen, de adressen automatisch laten opzoeken en het resultaat vervolgens bekijken op een kaart of exporteren voor gebruik in bijvoorbeeld **Excel, GIS, ArcGIS Pro of QGIS**.

![Demo app](img/demo.gif)

## Wat kan je ermee?

* Een CSV-bestand met adressen inladen.
* Aangeven welke kolommen de **straat, het huisnummer, de postcode en de gemeente** bevatten.
* Meerdere duizenden adressen in één keer laten geocoderen.
* De voortgang van de verwerking volgen, pauzeren of stoppen.
* Resultaten bekijken op een interactieve kaart.
* Adressen die niet automatisch correct gevonden worden, handmatig op de kaart aanduiden.
* Adresgegevens rechtstreeks in de tabel aanpassen en opnieuw laten zoeken.
* De resultaten exporteren als **CSV** of **GeoJSON**.

## Hoe nauwkeurig is het resultaat?

De toepassing maakt gebruik van de officiële **Geolocation API van Digitaal Vlaanderen** en het Vlaamse adressenregister. Deze diensten zijn gebaseerd op het officiële gebouwen- en adressenregister van Vlaanderen.

Elk resultaat krijgt een status:

* **Exact** – het adres is op huisnummerniveau gevonden.
* **Gedeeltelijk** – alleen bijvoorbeeld de straat kon worden gevonden. Controleer dit bij voorkeur op de kaart.
* **Handmatig** – de locatie werd door de gebruiker zelf aangeduid.
* **Niet gevonden** – er werd geen geschikt resultaat gevonden.
* **Fout** – er was bijvoorbeeld een probleem met de invoer of de verbinding.

## Coördinaten

De resultaten kunnen gebruikt worden in verschillende Belgische en internationale coördinatensystemen:

* **Belgisch Lambert 72 (EPSG:31370)** – standaard voor veel Vlaamse GIS-toepassingen.
* **Belgisch Lambert 2008 (EPSG:3812)**.
* **WGS84 (EPSG:4326)** – bijvoorbeeld voor GPS en webtoepassingen.
* **Web Mercator (EPSG:3857)** – veel gebruikt voor online kaarten.

Bij de export worden de verschillende coördinaten beschikbaar gemaakt, zodat het resultaat eenvoudig verder verwerkt kan worden.

## Hoe gebruik je de toepassing?

### 1. Laad je CSV-bestand

Upload een CSV-bestand met de adressen die je wilt opzoeken.

Een adres bestaat bij voorkeur uit:

**Straat | Huisnummer | Postcode | Gemeente**

De exacte namen van de kolommen zijn niet belangrijk. Je kunt na het inladen zelf aangeven welke kolom welke informatie bevat.

### 2. Controleer de adressen

Controleer of de juiste kolommen gekoppeld zijn aan straat, huisnummer, postcode en gemeente.

Niet alle velden zijn verplicht. Wanneer bijvoorbeeld de gemeente ontbreekt, probeert de geocoder alsnog een zo goed mogelijke overeenkomst te vinden.

### 3. Start de geocodering

Start de verwerking. De toepassing zoekt de adressen automatisch op en toont de voortgang.

Je kunt de verwerking indien nodig **pauzeren, hervatten of stoppen**.

### 4. Controleer de resultaten

De gevonden adressen worden op een kaart weergegeven. Zo kun je snel controleren of de locaties logisch zijn.

Resultaten met een gedeeltelijke overeenkomst verdienen extra aandacht.

### 5. Corrigeer indien nodig

Wanneer een adres niet correct gevonden wordt, kun je:

* de adresgegevens aanpassen;
* het adres opnieuw laten zoeken;
* of de locatie **handmatig op de kaart aanduiden**.

### 6. Exporteer

Wanneer de resultaten gecontroleerd zijn, kun je ze exporteren als:

* **CSV** – geschikt voor Excel en verdere gegevensverwerking;
* **GeoJSON** – geschikt voor GIS-toepassingen zoals QGIS en ArcGIS Pro.

De oorspronkelijke gegevens blijven daarbij behouden, aangevuld met de gevonden locatie, matchstatus en adresinformatie.

## Privacy

De verwerking gebeurt **rechtstreeks in de webbrowser**. Het volledige CSV-bestand wordt dus niet naar een centrale server van de toepassing geüpload.

Alleen de afzonderlijke adresopzoekingen worden doorgestuurd naar de gekozen geocoder, zoals Digitaal Vlaanderen of OpenStreetMap.

Er is voor deze toepassing geen account of API-sleutel nodig.

## Voor wie?

De Vlaamse Geocoder is vooral handig wanneer je:

* een lijst met adressen geografisch wilt lokaliseren;
* een Excel- of CSV-bestand van coördinaten wilt voorzien;
* adressen wilt voorbereiden voor gebruik in GIS;
* grote hoeveelheden adressen wilt controleren;
* bestaande adresgegevens wilt koppelen aan geografische locaties.

**Kort gezegd:** upload je adressen, laat ze automatisch geocoderen, controleer eventuele twijfelgevallen op de kaart en exporteer daarna de geografische resultaten.

[Open de Vlaamse Geocoder](https://warrieka.github.io/vlaamse-geocoder/)
