# Ramonas Fortschritt 🌸

<img src="assets/icons/app-icon-192.png" width="80" height="80" alt="Ramonas Fortschritt">

Privates gemeinsames Tagebuch für Ramona und Marcel. Die App nutzt das vorhandene Garten-Supabase-Projekt; ein drittes Projekt und Supabase Pro sind für diese Einrichtung nicht erforderlich. Speicher, Datenbank und Kontingente werden mit Garten geteilt.

## Funktionen

- Ein gemeinsamer Wochen-Check-in direkt nach dem Anmelden: Datum, Gewicht, Körpergröße, alle fünf Körpermaße, bis zu drei Fotoansichten und Notiz. Ein Speichern übernimmt die Daten gemeinsam; leere Messfelder erhalten bestehende Werte. Keine Eingabe-Reiter. Bearbeitung und Löschen bleiben verfügbar.
- Sieben eigene Menüseiten für Check-in, Auswertung, Kalender/Einträge, Galerie, Training, Essen und Profil/Zyklus. Kalender mit Monatswahl und direktem Datumssprung. Vergangene Tage und mehrere Fotos je Tag lassen sich nachtragen.
- Private Fotogalerie mit Tagesgruppen, „Neueste zuerst“ / „Älteste zuerst“, Filter für den ausgewählten Tag, Bildvergrößerung und seitenweisem Nachladen aller Fotos. Die Sortierung folgt dem Aufnahmedatum. Private Fortschrittsfotos; Verarbeitung im Browser als JPEG bis 1600 Pixel und maximal 1 MiB, ohne EXIF-/Standortmetadaten. Downloads verwenden die aktuelle Anmeldung, keine öffentlichen Foto-URLs.
- Feste Gewichts-/BMI-Anzeige beim Scrollen und beim Wechsel der Bereiche. Die bestätigte Körpergröße beim ersten Check-in oder im Profil eintragen. Maßgeblich ist das Datum des jüngsten Gewichts bis heute, auch bei später hochgeladenen Nachträgen.
- Laufende Auswertung aller Messwerte: Verlauf, Veränderung seit Beginn, Durchschnitt der letzten sieben Tage und Maßveränderungen. Eigene Änderungen aktualisieren sofort; während die App geöffnet ist, wird alle 15 Sekunden abgeglichen.
- ChatGPT-Begleiter mit gemeinsamem App-Chat, einer knappen KI-Merkliste und einem festen Tipps-Fenster. Geänderte Daten lösen bei eingerichtetem Schlüssel einen neuen Tipp aus; unveränderte Kontexte werden serverseitig zwischengespeichert.
- Teilen mit einzeln ausgewählten Werten, optionalem Foto und verbindlicher Bildvorschau. Export als JPG im Format 9:16, 4:5 oder 1:1. Das Geräte-Teilen-Menü oder ein Download ermöglichen die anschließende Veröffentlichung in Instagram/TikTok. Keine automatische Veröffentlichung.
- Täglich zwei Rezeptvorschläge aus der bestehenden Rezepte-App, mit Rezeptlinks in einem eigenen Tab.

- Drei Designs: Rose Bloom, Lavendeltraum und Cherry Night. Die Designauswahl und eine anonyme Aufmunterungs-Sequenznummer werden lokal gemerkt; keine Gesundheitswerte.
- Mobile Eingaben ohne seitliches Verrutschen; geöffnete Dialoge sperren das Scrollen der Seite darunter.

- Serverbestätigter Speicherzeitpunkt direkt über dem Check-in-Speicherknopf und Schutz gegen veraltete gleichzeitige Eingaben.
- Trainingsplan mit Laufband, Körpergewicht und verschiedenen Widerstandsbändern, Übungen mit vorhandenen KI-Demonstrationen und Trainingstagebuch.
- Freiwilliges Zyklustagebuch, längere Verlaufseinordnung und abwechslungsreiche Aufmunterungen.
- Klare Chat-Messwerte, abgeschlossene Trainings und Periodenbeginne werden mit Datum und eindeutiger Zuordnung kontrolliert übernommen; Unsicherheiten werden erfragt.

Die vollständige Prüfung und bekannte Grenzen stehen im [Prüfbericht](docs/pruefung-2026-10-27.md).

## Anmeldung und Datenschutz

Die beiden bestehenden Garten-Konten wurden ausdrücklich demselben Tagebuch zugeordnet. Andere Konten erhalten keinen Zugang, auch nicht durch Garten-/Rezept-Mitgliedschaft. Es gibt keine Selbstregistrierung oder öffentlich vergebbaren Freigaben in dieser App.

Die Anmeldung erfolgt auf ausdrücklichen Wunsch mit E-Mail und Passwort, ohne zusätzliche Authenticator-Abfrage. Die serverseitige Freigabeliste bleibt auf die beiden bestehenden Konten beschränkt. Bereits im gemeinsamen Supabase-Konto hinterlegte Authenticator-Faktoren werden dadurch nicht gelöscht oder für andere Apps verändert.

Die Regeln werden serverseitig über RLS, eine administrativ verwaltete Freigabeliste und aktuelle Auth-Sitzungen durchgesetzt. Das gilt für Tabellen, KI-Verlauf und Fotos. Ein Link gewährt keinen Datenzugriff. Die App legt keine Daten- oder Foto-Offlinekopie an. Die gemeinsame Anmeldung für Garten, Rezepte und Abnehmen wird im lokalen Browserspeicher dieses Geräts verwaltet. Nach zehn Minuten ohne Bedienung in diesen Apps endet sie; Abmelden gilt für alle drei Apps. Private Fotos und App-Inhalte werden dafür nicht lokal gespeichert. Beim Verlassen des Tabs wird die private Ansicht geleert und beim Zurückkehren neu geprüft. Ungespeicherte Formulardaten bleiben dafür ausschließlich im Arbeitsspeicher und werden nur für dieselbe Person mit erneut bestätigtem Zugriff wiederhergestellt.

Projektadministratoren mit Datenbank-/Service-Zugriff bleiben technisch privilegiert. Die Daten sind nicht Ende-zu-Ende verschlüsselt. Programmcode und öffentliche Publishable-Keys dürfen öffentlich sein; reale Messdaten, Fotos, Tokens, private Backups und Anbieter-Schlüssel gehören niemals ins Repository.

## 🔐 Gemeinsame KI-Zugänge einrichten

1. In einer App mit einem freigegebenen Konto anmelden und **Zuhause → KI-Zugänge verwalten** öffnen.
2. Mit dem aktuellen App-Passwort erneut entsperren. Diese separate Sitzung bleibt nur im Arbeitsspeicher, gilt höchstens vier Minuten und wird beim Schließen beendet.
3. Die Familienverwaltung hinterlegt den OpenAI- und/oder Gemini-API-Schlüssel einmalig. Die Schlüssel liegen verschlüsselt in Supabase Vault; der Browser erhält danach nur den Einrichtungsstatus. Keine Schlüssel in Chat, GitHub oder Sicherungsdateien kopieren.
4. Jede freigegebene Person wählt ihren Anbieter für alle drei Apps. Garten und Rezepte behalten ihre vorhandene Modellwahl; Ramonas Begleiter verwendet `gpt-6-luna` beziehungsweise `gemini-3.1-flash-lite`. Pro Anfrage wird nur ein Anbieter aufgerufen, ohne automatischen kostenpflichtigen Wechsel bei einem Fehler.

Ein bisheriger separater OpenAI-Zugang bleibt im Tagebuch nutzbar, solange kein eingerichteter gemeinsamer Anbieter ausgewählt ist. Einen gemeinsamen Schlüssel entfernt man nicht über die alte lokale Tagebuchverwaltung. Die zentrale Einrichtung ersetzt nur den ausdrücklich eingegebenen Anbieterschlüssel; vorhandene Schlüsselwerte werden niemals gelesen oder exportiert.

Der Abnehm-Begleiter übermittelt Messwert-Verläufe, berechnete Auswertungen, freiwillige Profil-/Zyklusangaben, absolvierte Trainings, jüngere Notizen und den relevanten App-Chat. **Keine Fortschrittsfotos, Foto-URLs, Kontoadressen oder Auth-IDs gehen an diesen Begleiter.** Andere ChatGPT-Unterhaltungen sind nicht verbunden. Der Anbieter verarbeitet die übermittelten Daten nach seinen API-Bedingungen; OpenAI `store:false` bedeutet keine allgemeine Null-Aufbewahrung. [Gemini-Nutzungsbedingungen](https://ai.google.dev/gemini-api/terms) unterscheiden Dienst-/Regionenbedingungen und beschreiben die Datenverarbeitung. Die App kann den Vertrag oder die Abrechnung eines API-Projekts nicht selbst prüfen.

API-Nutzung wird unabhängig vom ChatGPT-Abo abgerechnet. Die Tagebuchgrenzen bleiben fünf Anfragen pro Minute und hundert pro Tag; zusätzlich beim Anbieter Kosten und Budget kontrollieren. BMI, grundlegende Auswertungen und bestätigte Dateneingaben funktionieren auch ohne KI.

## Entwicklung

```sh
npm ci --ignore-scripts
npm test
npm run build
npm start
```

`npm start` öffnet einen lokalen Server auf `http://127.0.0.1:4173`. Der fertige Build liegt als `app.js` neben `index.html` und kann statisch ausgeliefert werden. `config.json` enthält ausschließlich öffentliche Projektinformationen. Keine Drittanbieter-Skripte, Fonts oder Besucheranalyse werden im Browser nachgeladen.

Die SQL-Dateien unter `supabase/migrations/` dokumentieren ausschließlich additive Änderungen für Abnehmen. Sie wurden mit der Supabase-CLI benannt und über MCP am Garten-Projekt angewendet. Die einmalige Zuordnung der beiden realen Konten erfolgte separat und wird nicht mit privaten Identitäten eingecheckt. Von diesem separaten Repository aus **kein ungeprüftes `supabase db push`** auf das geteilte Projekt ausführen: dessen bereits bestehende Garten-Migrationshistorie muss berücksichtigt werden. Bestehende Kontofreigaben bleiben unverändert. Neue Planung, Übungsprotokolle, Sicherungsfunktionen und zentrale KI-Verwaltung sind separat dokumentiert; neue Schlüssel werden ausschließlich auf eine ausdrückliche Nutzereingabe hin gesetzt.

Unter `supabase/tests/` liegen echte PostgreSQL-Zugriffstests mit vollständigem Rollback. Sie prüfen gemeinsame Nutzung, gesperrte App-Freigaben, anonyme Zugriffe, ungültige/abgelaufene Sitzungen, fremde Fotoordner, Selbstfreigaben, API-Schlüsselrechte und Anfragegrenzen. Testbilder und Messwerte werden nicht dauerhaft angelegt.

Die Node-Tests prüfen Datums-/BMI-Berechnung, Kalender, ausschließlich ausgewählte Exportdaten, Upload-Bereinigung, tägliche Rezeptauswahl und den geschützten KI-Handler. OpenAI-Aufrufe werden in diesen Tests simuliert; ein echter API-Aufruf wird erst nach Hinterlegen eines Schlüssels möglich.

## Verbundene Apps

Garten verwendet einen kleinen Zusatzbaustein `daily-recipes.js`; Rezepte bietet den Tab **Heute**, eine vorbereitete Anfrage für ein ausgewogenes Abnehm-Menü und Rezept-Links mit `?recipe=ID`. Die neue, ausschließlich lesende Funktion `recipes-daily` liefert nur die beiden Vorschläge, keine Einkaufsliste und keinen vollständigen Rezeptdatenbestand. Er verwendet unverändert die bestehenden Familien-, Konten- und Sitzungsprüfungen.

## Gemeinsame Anmeldung und Passwort vergessen

Alle drei Apps verwenden dasselbe Supabase-Konto und denselben Anmeldespeicher auf dieser Browser-Origin. Neue Tabs können die Anmeldung übernehmen. Die Bedienung in jeder der drei Apps hält die gemeinsame Zehn-Minuten-Frist aktiv; automatischer Datenabgleich und Token-Erneuerung tun das nicht. Einmalige Übernahme bestehender Tab-Anmeldungen; ein Abmelden verhindert die erneute Übernahme älterer Tab-Kopien. Die Abnehmen-Freigabeliste und die serverseitigen Zugriffskontrollen bleiben davon unabhängig.

„Passwort vergessen?“ fordert auf Benutzeraktion einen Supabase-Link an. Der PKCE-Link führt in dieselbe App zurück. Ein neues Passwort muss zweimal übereinstimmend mit mindestens zwölf Zeichen eingegeben werden. Danach werden die Kontositzungen abgemeldet und die Anmeldung in der ursprünglichen App angezeigt. Recovery-Zustand übersteht ein Neuladen; ein abgelaufener oder in einem anderen Browser geöffneter Link führt zur erneuten Link-Anforderung. Rückkehrziele sind fest auf die drei App-Pfade begrenzt.

Quelle des gemeinsamen Moduls ist `src/shared-auth.mjs`; Rezepte hält dieselbe Quellkopie, Garten lädt das daraus gebaute `shared-auth.js`. Keine Anbieter-Schlüssel werden übernommen oder verändert.

Die Navigation verbindet Garten und Rezepte mit dem Tagebuch; in Unser Zuhause bleibt der Wechsel im gemeinsamen App-Fenster. Die Fotos werden nur mit einer gültigen Tagebuchberechtigung heruntergeladen. Gewicht-/Maß-Aktualisierungen schließen einen geöffneten Fotobetrachter nicht.

## App-Symbol und Home-Bildschirm

Das Beere-/Roségold-Symbol mit R-Monogramm ist als Browser-Favicon, Apple-Touch-Icon und Android-App-Icon eingebunden. Das Manifest verwendet ausschließlich lokale Symbole und den App-Pfad; ein Offline-Cache für private Inhalte wird dadurch nicht angelegt.

Auf dem iPhone die App in Safari öffnen und über **Teilen → Zum Home-Bildschirm** hinzufügen. Bereits gespeicherte ältere Symbole gegebenenfalls vom Home-Bildschirm entfernen und die App neu hinzufügen.

## Gemeinsame App und Geräteanpassung

[Unser Zuhause öffnen](https://marcelkometz-web.github.io/abnehmen/zuhause/): Garten, Rezepte und Ramonas Fortschritt in einer gemeinsamen Oberfläche mit fester Navigation. Besuchte Bereiche bleiben für offene Eingaben erhalten. Die bestehenden Kontofreigaben gelten weiter. Der [Plattform- und Performancebericht](docs/plattformen-und-performance-2026-10-31.md) beschreibt die getesteten Bildschirmgrößen, WebKit-/Chromium-Prüfungen und die deutlich kleineren Übungsbilder.

## Bedienhilfe und Impressum

Die öffentliche [Bedienhilfe](read.html), ihre [Textfassung](read.txt) und das gemeinsame [Impressum mit Datenschutzhinweisen](impressum.html) sind ohne Anmeldung erreichbar. Das Fragezeichen in Unser Zuhause öffnet allgemeine Hilfe, alle drei App-Hilfen und das Impressum direkt in einem Dialog mit gesperrtem Hintergrund. Öffnen und Schließen der Hilfe erhalten bestehende App-Eingaben. Die Dokumente verwenden ausschließlich bestätigte Betreiberangaben.

Die erneute [Datenbank- und Zugriffsprüfung](docs/datenbankpruefung-2026-10-31.md) dokumentiert Bestandsqualität, Rollback-Tests und verbleibende Hinweise.

## Tube-Training und Bildvorlagen

Zehn zusätzliche Übungen für lange Tubes mit Griffen, Türanker und Knöchelmanschetten sind in `src/tube-training.mjs` von Mini-/Flachbändern getrennt. Der Filter startet mit dem Tube-Set; die Wochenplan-Auswahl wechselt die Übungsreferenzen ohne neue Datenbankwerte. Trainingseinträge bleiben vom bestehenden Typ `bands`. Es werden keine Widerstandsgewichte oder Gerätespezifikationen aus Marketingangaben abgeleitet.

[Zehn Bildvorlagen](docs/tube-bildvorlagen.txt) geben je Übung Zubehör, Kamerablick, zwei Bewegungspositionen und eindeutige Dateinamen vor. Alle zehn Tube-Übungen haben passende Bildpaare: sechs bereitgestellte Illustrationen und vier ergänzend erzeugte KI-Demonstrationen. Hochformat und beide Bewegungshälften bleiben vollständig sichtbar. Passende WebP-Größen vermeiden unnötig große Downloads; eingebettete Quelldatei-Metadaten werden nicht übernommen. Die Bilder sind einpassbar und im selben Fenster vergrößerbar. Es werden keine neuen Bilder durch die App automatisch erzeugt. [Bildzuordnung und Prüfungen](docs/trainingsbilder-2026-10-31.md).

## Schwebende Navigation

Start, Zurück, Vorwärts und ein auswählbarer Verlauf sind in der gemeinsamen Oberfläche und allen drei Einzel-Apps verfügbar. Die gemeinsame Oberfläche verbindet die bekannten Menüseiten über validierte Frame-Nachrichten; die Einzel-Apps steuern ihre eigenen erlaubten Seiten. Ein neuer Weg nach einem Rücksprung entfernt den bisherigen Vorwärtszweig. Der begrenzte Verlauf bleibt ausschließlich im Arbeitsspeicher und enthält nur feste App-/Seitenkennungen; Authverlust löscht ihn. Offene Dialoge, laufende Speicherungen und ungespeicherte Formulare werden berücksichtigt. Die Leiste erhält reservierten Platz statt Inhalte zu überdecken.

### 📅 Zusammen planen, sicher begleiten

Gemeinsamer privater Wochenplan mit Einkaufsliste, nachvollziehbare Erntevorschläge und verschlüsselte Sicherungen ergänzen die Apps. Ramonas Weg bietet eigene Seiten für Wochenbericht und Übungsprotokoll. Garten und Rezepte erhalten den aufklappbaren Dörrautomaten mit belegten Richtwerten für den Arendo 306526. Umfang, Grenzen und Bedienung stehen in der jeweiligen Bedienhilfe.
