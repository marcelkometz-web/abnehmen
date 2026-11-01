# 🏡 Abschluss- und Prüfbericht für eure Apps

Stand: 1. November 2026. [Unser Zuhause öffnen](https://marcelkometz-web.github.io/abnehmen/zuhause/)

## 🔐 Einmal KI-Zugänge hinterlegen

In einer App anmelden, zu **Zuhause → KI-Zugänge verwalten** wechseln und mit dem aktuellen App-Passwort erneut entsperren. Die tatsächliche Familienverwaltung kann je einen OpenAI- und Gemini-Schlüssel verschlüsselt speichern. Jede der beiden freigeschalteten Personen kann ihren Anbieter für alle drei Apps selbst wählen. Ramonas Begleiter unterstützt jetzt ebenfalls beide Anbieter: OpenAI `gpt-6-luna` und Gemini `gemini-3.1-flash-lite`. Garten und Rezepte behalten ihre bestehende Modellwahl.

Der zusätzliche Zugang gilt höchstens vier Minuten, bleibt nur im Arbeitsspeicher und wird beim Schließen beendet. Schlüssel werden danach nicht zurückgeliefert und gehören weder in Chat/GitHub noch in Sicherungsdateien. Ein ausdrücklich ausgewählter, später entfernter gemeinsamer Anbieter reaktiviert keinen alten Schlüssel. Pro Anfrage wird nur ein Anbieter angesprochen. API-Abrechnung ist unabhängig vom ChatGPT-Abo.

Der gewählte Anbieter verarbeitet die benötigten App-Textdaten. Im Tagebuch können dazu Messwerte, Notizen, App-Chat und freiwillige Zyklusangaben gehören; private Fortschrittsfotos und deren URLs werden dem Begleiter nicht übermittelt. Das ist keine Ende-zu-Ende-Verschlüsselung gegenüber dem KI-Anbieter oder Supabase-Administratoren. Andere normale ChatGPT-Chats sind nicht verbunden. Vertrags-, Datenschutz- und Budgeteinstellungen des API-Projekts müssen zum gewünschten Betrieb passen.

## ✅ Umgesetzte Alltagshilfen

| Thema | Ergebnis |
|---|---|
| Gemeinsamer Wochenplan | Mahlzeiten, Training und optionale Wiegetermine; Zutaten als nachvollziehbare Einkaufsliste, ohne unbekannte Mengen zu erfinden. |
| Wochenbericht | Beobachtete Messwerte, Datenlücken und freiwilliger Zykluskontext; BMI ausschließlich aus bestätigter Größe und Gewicht. |
| Übungsentwicklung | Protokolle für echte Einheiten, Bandidentität, Wiederholungen, Technik und Beschwerden; vorsichtige Entwicklung nach vergleichbaren Einheiten. |
| Rezeptwerkzeuge | Portionen, Austauschideen, Vorkochen und Reste; Austausch macht nicht neu berechnete Nährwerte ausdrücklich ungültig. |
| Ernte und Essen | Ausdrücklich protokollierte Ernte führt zu passenden Gerichten; kein erfundener Vorrat, keine angenommene Reife. |
| Vorspeise/Dessert | Schmaler aufklappbarer Bereich mit passenden Rezepten aus der vorhandenen Sammlung. |
| Dörrautomat | Eigene Menüpunkte in Garten und Rezepte, aufklappbare Tabelle mit 30 Kulturen, Temperatur-/Zeitbereichen und Trockenproben. |
| Eigenes Saatgut | 14 belegte Anleitungen; Hinweise auf F1, Verkreuzung, zweijährige Kulturen und nicht sortenechte Obstnachkommen. |
| Sicherung pro App | Neue Downloads passwortverschlüsselt; Tagebuchsicherung enthält private Fotodateien. |
| Sicherung aller drei Apps | Eine verschlüsselte Datei mit ausgewählten Bereichen und Bilddateien; Vorschau, Bestätigung, additive Wiederherstellung und gezielte Wiederholung fehlgeschlagener Schritte. |
| Gemeinsame Oberfläche | Vier Designs, Start/Zurück/Vorwärts/Verlauf, getrennte Seiten, Dialoge mit gesperrtem Hintergrundscrollen. |
| KI-Datenbasis | Nachvollziehbare Quellen aus tatsächlichen App-Einträgen; unsichere Gesundheitsangaben werden nicht als Fakten übernommen. |

Euer Gerät ist anhand des Angebots und der Anleitung als **Arendo 306526** zugeordnet: 700 W, acht Etagen, 35–85 °C, maximal 24 Stunden je Timerlauf. Herstellerangaben und ergänzende Fachverfahren sind getrennt gekennzeichnet. Trockenheit wird geprüft; feste Zusatzstunden für „weich“ oder „extra trocken“ werden nicht erfunden. Saatgut wird nicht im Lebensmittel-Dörrprogramm erhitzt.

## 🌿🍲 Tatsächlicher Datenbestand

- Garten: **200 neue belegte Sorten**, je 100 Obst/Gemüse, jetzt **838 Katalogeinträge**. Identitäten stammen aus der RHS-Referenz. Unbestätigte Anbauabstände und lokale Kalenderdaten bleiben offen.
- Rezepte: **220 neue Gerichte**, jetzt **604 Rezepte**, darunter neue Frühstücke, Mittag-/Abendessen, Salate und Desserts. Von den neuen Gerichten erreichen 185 mindestens 25 g Protein und 132 höchstens 30 g Kohlenhydrate pro angegebener Portion.
- **20 zusätzliche neue Eintöpfe** sind in den 220 enthalten. Mit weiteren passenden neuen Gerichten und elf unverändert erhaltenen, ergänzend einsortierten bisherigen Rezepten zeigt die Kategorie **35 Eintöpfe**.
- Keine doppelten normalisierten Rezepttitel. Wiederholte Importprüfung erzeugt keine zusätzlichen Einträge. Die bisherigen Katalogzeilen und Rezeptinhalte wurden per Vergleichs-Hash erhalten; bei elf bisherigen Rezepten änderte sich ausdrücklich nur die Kategorie samt Version/Zeitstempel.
- Die neuen Nährwerte sind mengenbasierte Berechnungen mit dokumentierten BLS-/USDA-Referenzen. 1.760 berechnete Nährwertfelder wurden unabhängig nachgerechnet. Unbekannte Ballaststoffe bleiben bei 15 Gerichten unbekannt. Das sind keine Labor- oder konkreten Packungsanalysen; natürlicher Zucker wird nicht als „zuckerfrei“ umetikettiert.

## 🧪 Was tatsächlich geprüft wurde

**Automatisierte Logiktests:** 23 Testdateien im Tagebuch-/Zuhause-Projekt und zehn in Rezepte bestanden, zusätzlich die Katalogprüfung. Sie prüfen unter anderem Datum/BMI, ausdrückliche Chat-Einträge, unsichere Angaben, Portionen, unbekannte Werte, Training, Verschlüsselung, Anbieterauswahl und Fehlerpfade.

**Browser mit simulierten Backends:** Chromium und WebKit; vier Fenstergrößen (320 × 740, 390 × 844, 844 × 390, 1280 × 900). Geprüft wurden reale gebaute App-Oberflächen: gemeinsame Navigation, Wochenplan, Training, Galerie-Sortierung/Vergrößerung/Löschen, Kalender-Rückdatierung, Körpergröße/BMI, Zyklusvalidierung, nur ausgewählte Teilvorschau, Rezeptfilter/Favoriten/Einkaufsliste/Rezeptbearbeitung, Gartenpflanzen/Beete/Zuordnung/Aufgaben/Ernte/Forum/Notizen/Termine/Profil und zentrale KI-Zugänge. Schreibtests kontrollieren den erzeugten API-Aufruf und den simulierten Datenstand.

**Sicherung/Wiederherstellung:** Verschlüsselte Dateien mit echten synthetischen JPEG-Dateibytes exportiert, entschlüsselt und wiederhergestellt. Falsches Passwort und reine Vorschau schreiben nichts. Alle drei Wiederherstellungsstufen wurden mit einzeln provoziertem Fehler und mit verlorener Antwort nach erfolgreicher Speicherung geprüft. Fertige Schritte werden nicht doppelt eingespielt; referenzierte Fotos bleiben erhalten. Entzogene Anmeldung leert die private Vorschau.

**Echte Datenbanktests:** Transaktionen mit vollständigem Rollback für Planung/Training, Tagebuchsicherung, private Fotooperationen, Gartensicherung, additive Rezeptsicherung, Schema-Zugriffsgrenzen und zentrale KI-Verwaltung. Geprüft sind auch fremde/anonyme/gesperrte/abgelaufene Zugriffe, Versionskonflikte, falsche Wiederherstellungsidentität und Wiederholungen. Keine echten Messwerte, Kontorollen, Schlüssel oder Fotos blieben durch Tests verändert.

**Live:** GitHub Pages-Builds erfolgreich; 29 veröffentlichte Programm-/Hilfedateien per SHA-256 mit dem lokalen Ergebnis verglichen. Die gemeinsame Oberfläche und alle drei Einzelapps zeigen anonym die geschützte Anmeldung; zentrale KI und Sicherung bleiben ohne Anmeldung gesperrt. Drei aktualisierte Edge Functions sind aktiv: `abnehmen-ai`, `recipes-daily`, `recipes-api`.

## 🛠 Behobene Fehler und Sicherheitsgrenzen

- Download von verschlüsselten Dateien aus eingebetteten Apps unter WebKit korrigiert.
- Verspätete Upload-/Speicherantworten dürfen nach Abmeldung keine privaten Inhalte wieder anzeigen.
- Bei unklarer Speicherantwort werden Bilder nicht voreilig gelöscht, falls der Datenbankvorgang bereits erfolgreich war.
- Wiederherstellung ist an aktuelles Konto/Familie/Tagebuch gebunden und gegen veraltete Stände und doppelte Einspielung geschützt.
- App-Wechsel wartet laufende Speicherungen ab; geeignete ungespeicherte Entwürfe bleiben im Arbeitsspeicher.
- Überdeckungen/Überlauf in Menüs und beim Größenwechsel des Sicherungsfensters korrigiert. Passwortdialoge verwenden externe CSS-Dateien statt gesperrter Inline-Stile.
- Irreführende Aussage „Abmeldung beim Tab-Schließen“ korrigiert: Es gilt die gemeinsame Zehn-Minuten-Inaktivität und ausdrückliches Abmelden.
- Genau **zwei** Tagebuchfreigaben bleiben aktiv. Der Fortschrittsfoto-Bucket ist privat; Datenbank-/Speicherregeln wurden nicht zugunsten einfacherer Bedienung geöffnet.

**Verbleibende Anbieterhinweise:** Supabase meldet deaktivierten Schutz gegen bekannt kompromittierte Passwörter im Garten-Projekt; diese Zusatzfunktion erfordert den entsprechenden kostenpflichtigen Tarif. Es wurde kein Tarif gebucht. Das Rezeptprojekt meldet seine verwaltete `http`-Erweiterung im öffentlichen Schema; anonyme und normale App-Rollen haben dort keinen Schema-Zugriff, was separat geprüft wurde. RLS-Hinweise zu ausschließlich serverseitigen Tabellen ohne Browserrichtlinie sind beabsichtigte Zugriffssperren. Keine produktiven Abhängigkeiten mit bekanntem Auditfund in den geprüften npm-Projekten.

Ein isolierter automatisierter WebKit-Lauf meldet beim nativen Auswahlfeld eine CSP-Stilwarnung. Sie ist auf einer Minimaldatei ohne App-Skripte reproduzierbar und wurde nicht durch Aufweichen der Sicherheitsregeln verdeckt. Die Saatgutfunktionen bestehen ihre Assertions; Chromium besteht den gesamten isolierten Lauf einschließlich CSP-Prüfung.

## Grenzen, die wichtig bleiben

- Kein Test jedes realen iPhones, Android-Geräts oder jeder Windows-/Mac-Version. Browsermotor-/Layouttests ersetzen keine echte Geräteprüfung.
- Keine echten kostenpflichtigen KI-Anfragen, E-Mails, Social-Media-Posts, Bestellungen, Kontolöschungen oder Kalenderabos während der Prüfung ausgelöst. Externe Endwirkungen sind deshalb nicht als erfolgreich getestet ausgewiesen.
- Zentrale Sicherung: höchstens 64 MiB Datei und 40 MiB Bilddaten; fehlende/zu große Bilder brechen den Export ab. Zwei Datenbanken lassen sich nicht in einer einzigen gemeinsamen Transaktion wiederherstellen; Teilerfolge und Wiederholung bleiben sichtbar. Garteneinstellungen sind eine lesbare Referenz, keine ungeprüfte Überschreibung.
- Regelmäßige Bewegung, ausreichende Ernährung und Verlaufseinordnung unterstützen gesundes Abnehmen. Die App garantiert weder ein bestimmtes Tempo noch gezielten Fettverlust an einzelnen Körperstellen. Beschwerden und größere Ernährungs-/Trainingsänderungen brauchen bei Bedarf fachliche Einordnung.
- GitHub und Supabase bleiben die Plattformen. Eine Picnic-Integration wurde auf euren Wunsch nicht gebaut; ein Serverumzug wurde nicht vorgenommen. Weitere Übungsbilder wurden nicht generiert.

Das detaillierte [Funktionsinventar](function-audit-2026-11-01.md), die [Sicherungsbeschreibung](hub-backup.md) und die [Dörrquellen](dehydrator-sources.md) enthalten die jeweiligen Einzelnachweise und Einschränkungen.


## 🔗 Nachtrag: Links, Neon und bestätigte Profile

Der ergänzende [Link- und Teilbericht](links-und-teilen-2026-11-01.md) dokumentiert die drei unabhängigen Prüfläufe, die behobene WebKit-Teilbild-Speicherung, blockierende Textmeldungen, freien Platz unter der schwebenden Navigation, Neon-Akzente und die drei ausdrücklich bestätigten Social-Profile. Die zentrale Sicherung lädt ihr großes Modul erst bei Bedarf. Wikipedia ist kein veröffentlichter Teil der Apps; Ramona ist als Thema bestätigt; unabhängige Quellen fehlen bislang, und die aktuelle deutschsprachige Wikipedia erlaubt keinen KI-generierten Artikeltext.
