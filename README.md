# Ramonas Fortschritt

Privates gemeinsames Tagebuch für Ramona und Marcel. Die App nutzt das vorhandene Garten-Supabase-Projekt; ein drittes Projekt und Supabase Pro sind für diese Einrichtung nicht erforderlich. Speicher, Datenbank und Kontingente werden mit Garten geteilt.

## Funktionen

- Ein gemeinsamer Wochen-Check-in direkt nach dem Anmelden: Datum, Gewicht, Körpergröße, alle fünf Körpermaße, bis zu drei Fotoansichten und Notiz. Ein Speichern übernimmt die Daten gemeinsam; leere Messfelder erhalten bestehende Werte. Keine Eingabe-Reiter. Bearbeitung und Löschen bleiben verfügbar.
- Kalender direkt unter der laufenden Auswertung, mit Monatswahl und direktem Datumssprung. Vergangene Tage und mehrere Fotos je Tag lassen sich nachtragen.
- Private Fortschrittsfotos; Verarbeitung im Browser als JPEG bis 1600 Pixel und maximal 1 MiB, ohne EXIF-/Standortmetadaten. Downloads verwenden die aktuelle Anmeldung, keine öffentlichen Foto-URLs.
- Feste Gewichts-/BMI-Anzeige beim Scrollen und beim Wechsel der Bereiche. Körpergröße einmal in der Übersicht eintragen. Maßgeblich ist das Datum des jüngsten Gewichts bis heute, auch bei später hochgeladenen Nachträgen.
- Laufende Auswertung aller Messwerte: Verlauf, Veränderung seit Beginn, Durchschnitt der letzten sieben Tage und Maßveränderungen. Eigene Änderungen aktualisieren sofort; während die App geöffnet ist, wird alle 15 Sekunden abgeglichen.
- ChatGPT-Begleiter mit gemeinsamem App-Chat, einer knappen KI-Merkliste und einem festen Tipps-Fenster. Geänderte Daten lösen bei eingerichtetem Schlüssel einen neuen Tipp aus; unveränderte Kontexte werden serverseitig zwischengespeichert.
- Teilen mit einzeln ausgewählten Werten, optionalem Foto und verbindlicher Bildvorschau. Export als JPG im Format 9:16, 4:5 oder 1:1. Das Geräte-Teilen-Menü oder ein Download ermöglichen die anschließende Veröffentlichung in Instagram/TikTok. Keine automatische Veröffentlichung.
- Täglich zwei Rezeptvorschläge aus der bestehenden Rezepte-App, mit Rezeptlinks in einem eigenen Tab.

- Drei Designs: Rose Bloom, Lavendeltraum und Cherry Night. Nur die Designauswahl wird lokal gemerkt.
- Mobile Eingaben ohne seitliches Verrutschen; geöffnete Dialoge sperren das Scrollen der Seite darunter.

## Anmeldung und Datenschutz

Die beiden bestehenden Garten-Konten wurden ausdrücklich demselben Tagebuch zugeordnet. Andere Konten erhalten keinen Zugang, auch nicht durch Garten-/Rezept-Mitgliedschaft. Es gibt keine Selbstregistrierung oder öffentlich vergebbaren Freigaben in dieser App.

Die Anmeldung erfolgt auf ausdrücklichen Wunsch mit E-Mail und Passwort, ohne zusätzliche Authenticator-Abfrage. Die serverseitige Freigabeliste bleibt auf die beiden bestehenden Konten beschränkt. Bereits im gemeinsamen Supabase-Konto hinterlegte Authenticator-Faktoren werden dadurch nicht gelöscht oder für andere Apps verändert.

Die Regeln werden serverseitig über RLS, eine administrativ verwaltete Freigabeliste und aktuelle Auth-Sitzungen durchgesetzt. Das gilt für Tabellen, KI-Verlauf und Fotos. Ein Link gewährt keinen Datenzugriff. Die App legt keine Daten- oder Foto-Offlinekopie an. Die gemeinsame Anmeldung für Garten, Rezepte und Abnehmen wird im lokalen Browserspeicher dieses Geräts verwaltet. Nach zehn Minuten ohne Bedienung in diesen Apps endet sie; Abmelden gilt für alle drei Apps. Private Fotos und App-Inhalte werden dafür nicht lokal gespeichert. Beim Verlassen des Tabs wird die private Ansicht geleert und beim Zurückkehren neu geprüft.

Projektadministratoren mit Datenbank-/Service-Zugriff bleiben technisch privilegiert. Die Daten sind nicht Ende-zu-Ende verschlüsselt. Programmcode und öffentliche Publishable-Keys dürfen öffentlich sein; reale Messdaten, Fotos, Tokens, private Backups und Anbieter-Schlüssel gehören niemals ins Repository.

## OpenAI einrichten

1. Mit einem der beiden freigegebenen Konten anmelden.
2. Den ChatGPT-Begleiter öffnen, dann **OpenAI-Schlüssel verwalten**.
3. Einen eigenen OpenAI-API-Schlüssel eingeben und verschlüsselt speichern. Keinen Schlüssel in Chat, Code oder GitHub einfügen.

Der Schlüssel liegt verschlüsselt in Supabase Vault. Browser können ihn speichern/ersetzen oder entfernen, aber niemals wieder auslesen. Die Edge Function `abnehmen-ai` ruft OpenAI mit einem ausschließlich serverseitig geladenen Schlüssel auf. Die bestehenden Garten-/Rezepte-KI-Schlüssel werden nicht übernommen oder geändert.

Aktuelles Modell: `gpt-6-luna`, Responses API, `store: false`. Übermittelt werden Messwert-Verläufe, Auswertungen, jüngere Notizen und der relevante App-Chat samt KI-Merkliste. **Keine Fotos, Foto-URLs, Kontoadressen oder Auth-IDs werden an OpenAI gesendet.** Andere ChatGPT-Unterhaltungen sind der App nicht automatisch bekannt. `store: false` ist keine Zusage einer allgemeinen Null-Aufbewahrung durch den Anbieter. Die API wird unabhängig von einem ChatGPT-Abo berechnet. Grenzen: fünf Anfragen pro Minute und hundert pro Tag für das gemeinsame Tagebuch; zusätzlich ein OpenAI-Projektbudget festlegen.

Chat und KI-Merkliste lassen sich gemeinsam löschen; das Entfernen des Schlüssels deaktiviert weitere API-Aufrufe. BMI und grundlegende Auswertungen funktionieren auch ohne KI.

## Entwicklung

```sh
npm ci --ignore-scripts
npm test
npm run build
npm start
```

`npm start` öffnet einen lokalen Server auf `http://127.0.0.1:4173`. Der fertige Build liegt als `app.js` neben `index.html` und kann statisch ausgeliefert werden. `config.json` enthält ausschließlich öffentliche Projektinformationen. Keine Drittanbieter-Skripte, Fonts oder Besucheranalyse werden im Browser nachgeladen.

Die SQL-Dateien unter `supabase/migrations/` dokumentieren ausschließlich additive Änderungen für Abnehmen. Sie wurden mit der Supabase-CLI benannt und über MCP am Garten-Projekt angewendet. Die einmalige Zuordnung der beiden realen Konten erfolgte separat und wird nicht mit privaten Identitäten eingecheckt. Von diesem separaten Repository aus **kein ungeprüftes `supabase db push`** auf das geteilte Projekt ausführen: dessen bereits bestehende Garten-Migrationshistorie muss berücksichtigt werden. Bestehende Garten-/Rezept-Tabellen, Konten und Schlüssel wurden nicht geändert.

Unter `supabase/tests/` liegen echte PostgreSQL-Zugriffstests mit vollständigem Rollback. Sie prüfen gemeinsame Nutzung, gesperrte App-Freigaben, anonyme Zugriffe, ungültige/abgelaufene Sitzungen, fremde Fotoordner, Selbstfreigaben, API-Schlüsselrechte und Anfragegrenzen. Testbilder und Messwerte werden nicht dauerhaft angelegt.

Die Node-Tests prüfen Datums-/BMI-Berechnung, Kalender, ausschließlich ausgewählte Exportdaten, Upload-Bereinigung, tägliche Rezeptauswahl und den geschützten KI-Handler. OpenAI-Aufrufe werden in diesen Tests simuliert; ein echter API-Aufruf wird erst nach Hinterlegen eines Schlüssels möglich.

## Verbundene Apps

Garten verwendet einen kleinen Zusatzbaustein `daily-recipes.js`; Rezepte bietet den Tab **Heute**, eine vorbereitete Anfrage für ein ausgewogenes Abnehm-Menü und Rezept-Links mit `?recipe=ID`. Die neue, ausschließlich lesende Funktion `recipes-daily` liefert nur die beiden Vorschläge, keine Einkaufsliste und keinen vollständigen Rezeptdatenbestand. Er verwendet unverändert die bestehenden Familien-, Konten- und Sitzungsprüfungen.

## Gemeinsame Anmeldung und Passwort vergessen

Alle drei Apps verwenden dasselbe Supabase-Konto und denselben Anmeldespeicher auf dieser Browser-Origin. Neue Tabs können die Anmeldung übernehmen. Die Bedienung in jeder der drei Apps hält die gemeinsame Zehn-Minuten-Frist aktiv; automatischer Datenabgleich und Token-Erneuerung tun das nicht. Einmalige Übernahme bestehender Tab-Anmeldungen; ein Abmelden verhindert die erneute Übernahme älterer Tab-Kopien. Die Abnehmen-Freigabeliste und die serverseitigen Zugriffskontrollen bleiben davon unabhängig.

„Passwort vergessen?“ fordert auf Benutzeraktion einen Supabase-Link an. Der PKCE-Link führt in dieselbe App zurück. Ein neues Passwort muss zweimal übereinstimmend mit mindestens zwölf Zeichen eingegeben werden. Danach werden die Kontositzungen abgemeldet und die Anmeldung in der ursprünglichen App angezeigt. Recovery-Zustand übersteht ein Neuladen; ein abgelaufener oder in einem anderen Browser geöffneter Link führt zur erneuten Link-Anforderung. Rückkehrziele sind fest auf die drei App-Pfade begrenzt.

Quelle des gemeinsamen Moduls ist `src/shared-auth.mjs`; Rezepte hält dieselbe Quellkopie, Garten lädt das daraus gebaute `shared-auth.js`. Keine Anbieter-Schlüssel werden übernommen oder verändert.
