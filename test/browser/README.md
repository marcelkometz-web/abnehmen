# Browserprüfungen der Familien-Apps

Diese Prüfungen laden die echten lokalen HTML-, CSS- und JavaScript-Dateien. Alle Netzwerkzugriffe auf Anwendungsdaten werden abgefangen. Konten, Gewichte, Fotos und Schlüssel in den Tests sind künstlich; es werden keine Produktionsdaten verändert, Nachrichten versendet oder kostenpflichtigen KI-Anfragen ausgeführt. Service Worker sind für diese Tests deaktiviert.

Die Verzeichnisse `abnehmen`, `garten` und `rezepte` müssen nebeneinander liegen. Alternativ zeigt `APP_AUDIT_WORKSPACE` auf ihren gemeinsamen übergeordneten Ordner.

## Einrichten

Im Ordner `abnehmen/test/browser`:

```sh
npm ci
npx playwright install --with-deps chromium firefox webkit
```

Playwright ist auf **1.64.1** festgelegt. Auf einem eigenen Computer muss die Installation der Systembibliotheken gegebenenfalls durch die Systemverwaltung erfolgen. Die Prüfung selbst braucht keine echten Zugangsdaten.

## Ausführen

```sh
npm run test:public
npm run test:public-controls
npm run test:diary
npm run test:garden
npm run test:recipes
npm run test:hub-ai
npm run test:hub-lazy
AUDIT_ENGINE=webkit npm run test:public
AUDIT_ENGINE=firefox npm run test:public
```

`AUDIT_ENGINE` gilt auch für die übrigen Browser-Skripte. Mit `AUDIT_REPORT_DIR` kann ein Ausgabeordner für die unterstützten JSON-Berichte und Screenshots gesetzt werden. Manche gezielten Regressionstests protokollieren direkt auf der Konsole.

Ein bereits installiertes Chromium kann über `APP_AUDIT_CHROMIUM_PATH` ausgewählt werden. `PLAYWRIGHT_BROWSERS_PATH` und gegebenenfalls `LD_LIBRARY_PATH` bleiben normale Playwright-/Linux-Einstellungen. Jeder Firefoxlauf erhält ein eigenes temporäres XDG-Konfigurationsverzeichnis, damit parallele Prüfungen nicht dieselbe Browserkonfiguration bearbeiten. Die Browser-Prozess-Sandboxflags betreffen ausschließlich diesen isolierten Prüflauf, keine veröffentlichte App.

## Was geprüft wird

- `public-check.mjs`: alle vier Oberflächen mit 320, 390, 430, 844 und 1280 Pixeln Breite; Bilder, fehlende Assets, horizontale Überläufe, echte JavaScriptfehler, CSP, Anmeldemaske, bestätigte Social-Media-Ziele sowie Hub-Designs, Hilfethemen, Installationshilfe, App-Wechsel, Verlauf und gesperrte Privatfunktionen.
- `public-controls.mjs`: tatsächliche Trefferflächen der Social-Media- und hervorgehobenen Hilfe-/Impressum-Schaltflächen; nur Probe-Klicks, keine Veröffentlichung und keine externe Navigation.
- `diary-flow.mjs`: synthetisch angemeldetes Tagebuch, Kalender-/Eingabeerhalt, späte KI-Antworten, Trainingsspeicherwiederholung, Abmelden und responsive Seiten.
- `garden-audit.mjs`: Gartenansichten, Formular- und Versionsfehler, ICS-Download, Erntefoto-/Sitzungsrennen und mobile Darstellung.
- `recipe-regression.mjs` und `recipe-egg-regression.mjs`: Rezeptkarten und private Bilder, Portionsänderungen, Einkauf, Seitenwechsel, späte Antworten sowie Eier-Timer ohne fehlende Schriftdatei.
- `hub-ai-session-browser.mjs` und `hub-ai-management-browser.mjs`: zentrale KI-Zugänge, Sitzungsbindung, Dialogwechsel und verspätete Antworten.
- `hub-lazy-regression.mjs`: verzögertes Laden der gemeinsamen Sicherung: nach Appwechsel oder neu geöffnetem Dialog kein unerwartetes Fenster; normaler Start bleibt möglich.

Native Betriebssystemdialoge, E-Mail-Zustellung, echte Kameraaufnahmen, externe soziale Veröffentlichungen, reale Anbieterantworten und physische Geräte sind damit nicht vollständig geprüft. Erfolgreiche Browserläufe sind keine Garantie für Fehlerfreiheit unter allen denkbaren Bedingungen.
