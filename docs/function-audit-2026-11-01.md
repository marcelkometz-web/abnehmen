# 🔎 Funktionsprüfung der drei Apps und der gemeinsamen Oberfläche

Stand: 1. November 2026. Dies ist das unabhängige Funktionsinventar eines zusätzlichen Prüflaufs. Es ergänzt die getrennten Prüfungen der neuen Wochenplanung, Sicherung/Wiederherstellung, Wochenauswertung, Trainingsentwicklung, Rezeptwerkzeuge, Ernteverknüpfung und Navigation. Ein nachgewiesener Test eines Bereichs ist keine Zusicherung, dass jede mögliche Kombination aller Eingaben, Geräte und externer Dienste fehlerfrei ist.

## Prüfweise und Kennzeichnung

Alle Browser-Schreibtests verwenden ausschließlich künstliche Konten und simulierte Antworten. Die tatsächlich gebauten App-Dateien werden geladen. Netzwerkanfragen werden vollständig abgefangen; es werden keine echten E-Mails versendet, Schlüssel gelesen, privaten Fotos abgerufen, Konten verändert oder sozialen Beiträge veröffentlicht. Service Worker sind im unabhängigen Prüflauf gesperrt, damit sie die Netzwerksimulation nicht umgehen können. Erfolgreiche Schreibtests prüfen zusätzlich den erzeugten Backend-Aufruf und den simulierten Datenstand.

- **B**: in diesem unabhängigen Browserlauf mit simuliertem Backend geprüft.
- **R**: anhand der tatsächlichen Implementierung geprüft; kein zusätzlicher erfolgreicher Schreibtest behauptet.
- **P**: bereits durch einen getrennten Prüflauf abgedeckt; dessen Befund ist separat zu lesen.
- **X**: externe Wirkung, Anbieterzugang oder echte Geräteprüfung bleibt ausdrücklich außerhalb der Simulation.
- **Offen**: wird im laufenden zusätzlichen Prüflauf noch ergänzt.

## 🌿 Garten

| Bereich | Aktionen und Fehlerpfade im Inventar | Nachweis / Stand |
|---|---|---|
| Anmeldung | Anmeldung, gemeinsamer Sitzungsstatus, Abmelden, Kontosperre, Wartungsmodus | R; gemeinsame Auth-Tests P |
| Passwort vergessen | Formular, E-Mail-Anforderung, Rückführungsadresse, Abbrechen | Offen; echte E-Mail-Zustellung X |
| Übersicht | Katalog-/Beet-/Notizstände, saisonale Einstiege, Aufgaben, tägliche Rezeptideen | B für Laden und Navigation; Rezept-/Erntebasis P |
| Wetter | bewusste Standortwahl, Ausweichort, ausgeschaltete Anzeige, nicht erreichbarer Dienst | R; simulierter Ausfall sichtbar B; echte Ortung/Wetterdaten X |
| Saison / Geräteoptionen | Jahreszeit, Haptik, Installation, persönliche Darstellung | R; Installationsbestätigung und tatsächliche Haptik X |
| Pflanzenkatalog | Laden, Gruppierung nach Kultur und Sorte, Kategorien, Suche, Filter, Favoriten | B für Gruppen-/Sortenöffnung; weitere Filter Offen |
| Eigene Pflanze anlegen | manuelle Eingabe, Pflichtfelder, Familienzuordnung, Speichern | B; POST mit erwarteter Familienkennung bestätigt |
| Eigene Pflanze ändern | Sortennamen ändern, Versionsprüfung, Bestätigung | B; PATCH enthält die ursprüngliche Version |
| Eigene Pflanze löschen | Bestätigung, gezieltes Löschen, Umgang mit Zuweisungen/Foto | R; zusätzlicher Löschtest Offen |
| Gemeinsamer Sortenkatalog | gemeinsamer Referenzeintrag, Kopie/Änderung im eigenen Garten, Quellen | R; 200 neue belegte Identitäten separat geprüft |
| Pflanzendetails | Anbau, Pflege, Lebensdauer, Schnitt, Fruchtfolge, Nachbarn, Datenquellen | R; Detailfenster und Unterbereiche B |
| Sortennotiz | Entwurf, automatisches Speichern, Fehlererhalt, Verlassen mit Entwurf | R; Entwurfs-/Navigationsschutz P |
| Saatguttütchen scannen | Dateityp/-größe, Einwilligung, lokale Verkleinerung, KI-Fehler, geprüftes Speichern | R; echter KI-/Kameraabruf X |
| Pflanzen-KI | Modellwahl, bewusste Anfrage, automatische Ergänzung, Fehler und manuelle Fortsetzung | R; zusätzlicher Ausfalltest Offen |
| Teilen / Bestellen | bewusste Auswahl, private Hinweise, Kopier-/Systemteilen-Fallback, externe Bestellseite | R; Veröffentlichung/Bestellung X |
| Beetliste | Laden, Gartenjahr, Fläche, Hinweise bei fehlenden Abständen | B für Liste/Fläche; Historienauswahl Offen |
| Beet anlegen | Name, Beschreibung, Meter in Zentimeter, optionale Position | B; 2 × 1 m wurden als 200 × 100 cm gespeichert |
| Beet ändern | Beschreibung, Versionsschutz, optionale Maße und Position | B |
| Beet löschen | Bestätigung, Zuweisungen/Fotos, Erhalt des Pflanzenkatalogs | R; zusätzlicher Löschtest Offen |
| Pflanze zuweisen | Kategorie → Kultur → Sorte, Beet, Menge, Jahr, Status | B; zwei Pflanzen mit richtiger Zuordnung gespeichert |
| Pflanzstatus ändern | geplant/gesät/gepflanzt/geerntet, Versionsschutz, Zurücksetzen bei Fehler | B für „gepflanzt“ und Backend-Zustand; Fehlerpfad R |
| Zuweisung entfernen | Bestätigung, gezielte Löschung im gewählten Jahr | R; zusätzlicher Löschtest Offen |
| 2D-Lageplan | Abmessungen, Beetpositionen, Zeichnen, Elemente, unbekannte Ausrichtung | R; zusätzliche Fenster-/Layoutprüfung Offen |
| Plan aus Video/Fotos | Einwilligung, lokale Standbilder, sichtbarer ungeprüfter Entwurf, Übernahme | R; echte Medien-/KI-Verarbeitung X |
| Persönliche Aufgaben | Erstellen, eigener Bereich, Fälligkeit, Status, Filter, Bearbeiten, Löschen | B für Erstellen/Anzeigen/Erledigen; weitere Aktionen Offen |
| Familienforum | Thema, Kategorie, Beitrag, Antworten, Bearbeiten, Sperren, Löschen, Rechte | Offen; Codepfade R |
| Erntetagebuch | Datum, Menge/Einheit, Sorte/Beet, Bewertung, Geschmack, optionales Foto, Ändern/Löschen | Offen; Codepfade R |
| Gartennotizen | Erstellen, Ändern, Löschen, optionale Pflanzenverknüpfung, bewusstes Teilen | Offen; Codepfade R |
| Gartentermine | manuelles Datum, Sorte/Beet, Ganztag/Uhrzeit, Erinnerung, Ändern/Löschen | Offen; Codepfade R |
| Kalenderdatei / Abo | ICS-Ausgabe, privater widerrufbarer Link, Einrichten/Widerrufen | R; tatsächlicher Abruf durch Apple/Google X |
| Persönliches Profil | Name, Ort, Bild, private Voreinstellung, ausdrückliche Veröffentlichung | R; tatsächliche Veröffentlichung bleibt X |
| Familie / Mitglieder | Rollen, Einladen/Hinzufügen/Entfernen, Berechtigungsgrenzen | R; kein Eingriff in reale Mitgliedschaften |
| Admin / KI-Zugänge | gesonderte Freigabe, Kontosperren, Modelle, Schlüssel nicht auslesbar | R; Sicherheits-/RLS-Prüfungen P; keine echten Schlüsseländerungen |
| Sicherungen | Garten, eigene Aufgaben, Forum/Ernte, Vorschau und additive Wiederherstellung | P; verschlüsselte Datei-/Dialogtests separat |
| Eigenes Konto löschen | Passwort- und Folgenbestätigung, letzter Familiennutzer, Teilerfolgshinweise | R; echte Kontolöschung bewusst nicht ausgeführt X |
| Gemeinsamer Wochenplan | Zugang, Essen/Training/Wiegen, Einkaufen, Konflikte, Wiederholung | P |
| Dörrautomat | eigener Menüpunkt und eigener Funktionsbereich | Offen; eigener Fach-/Sicherheitstest separat |
| Hilfe / Impressum | erreichbare Dokumente, korrekte bestätigte Telefonnummer, kein Hintergrundscrollen | P; zusätzliche Dialogprüfung Offen |

## 🍲 Rezepte

| Bereich | Aktionen und Fehlerpfade im Inventar | Nachweis / Stand |
|---|---|---|
| Anmeldung / Passwort | gemeinsame Anmeldung, Rückführung nach Passwortwechsel, Abmelden | R; Auth-Tests P; zusätzliche Formularprüfung Offen |
| Rezeptübersicht | Laden, Suche, Kategorien, Sortierung, weitere Ergebnisse, leere Auswahl | R; zusätzliche unabhängige Filterprüfung Offen |
| Tagesideen | Auswahl aus vorhandenen Rezepten, Menüfrage, belegte Erntepassung | P |
| Favoriten | hinzufügen/entfernen, Favoritenansicht, Kontobezug | R; zusätzlicher Browserlauf Offen |
| Rezeptdetail | Zutaten, Zubereitung, Nährwerte, sichtbare unbekannte Angaben | P für neue Werkzeuge; Grundansicht R |
| Portionen / Varianten | Mengen, nachvollziehbare Austauschvorschläge, Reste, Vorkochen | P |
| Beilagen | passende Auswahl, Nährwert-/Mengenbasis, keine erfundenen Vorräte | P |
| Einkaufsliste | Zutaten übernehmen, Mengen, Erledigt, Bearbeiten/Entfernen, freier Eintrag | R; zusätzlicher CRUD-Lauf Offen |
| Rezept anlegen | Titel, Kategorien, Zutaten, Zubereitung, Pflichtfelder und Rechte | R; zusätzlicher Schreibtest Offen |
| Rezept ändern / löschen | Revision, Berechtigung, Bestätigung, Fehlererhalt | R; zusätzlicher Schreibtest Offen |
| Zutaten-Nährwertberechnung | reale Mengen, Packungsangaben/Referenzen, unbekannte Werte, Rundung | P und Domain-Tests |
| Rezept-KI | Modellwahl, Text-/Fotoeingabe, Einwilligung, Fehler, keine eigenmächtige Veröffentlichung | R; zusätzlicher Fehler-/Rechtetest Offen |
| Küchen-Assistent | Anfrage, Gespräch, Löschen, abgesicherte Schlüsselverwaltung | R; echte kostenpflichtige Anfrage X |
| Zyklus & Ernährung | freiwillige Angaben, lokaler Hinweis, Löschen, keine verfälschte BMI-Berechnung | R |
| Vorlesen | Start/Stopp, Verhalten bei Seitenwechsel | R; tatsächliche Stimmen-/Audioausgabe X |
| Eier-Timer | Auswahl, Start, Stoppen und erneuter Start | R; zusätzliche Dialogprüfung Offen |
| Familienforum | bestehender Familienbereich, Rollen, Antworten und Moderation | R; keine realen Beiträge verändert |
| Rezepte / Notizen sichern | Verschlüsselung, Passwortdialog, geprüfte Wiederherstellung und Rechte | P |
| Profil / Konto / Design | getrennte Fenster, Zugriffsschutz, Seitenwechsel | R; zusätzliche Fenster-/Layoutprüfung Offen |
| Gemeinsamer Wochenplan | ausgewählte Portionen übernehmen, Einkauf erzeugen, Konfliktschutz | P |
| Dörrautomat | Menü und zugehöriger Bereich | Offen; eigener Fach-/Sicherheitstest separat |
| Hilfe / Impressum | lesbare Dokumente, korrekte Kontaktdaten, neue Fenster | P |

## 💜 Ramonas Weg

| Bereich | Aktionen und Fehlerpfade im Inventar | Nachweis / Stand |
|---|---|---|
| Geschützter Zugang | ausschließlich zwei Freigaben, Login, Abmelden, inaktive/entzogene Sitzung | P: Auth-/RLS-Tests; keine Freigaben erweitert |
| Passwort vergessen | E-Mail-Anforderung, passende Rückführung, Abbrechen, gültiges neues Passwort | R und Domain-Tests; zusätzlicher UI-Aufruf Offen |
| Gemeinsamer Check-in | Datum, Gewicht, bestätigte Größe, Maße, Notiz, mehrere Fotos, letzter Speicherstand | P |
| Rückwirkender Tag | Kalender-/Datumssprung, tatsächliches Beobachtungsdatum, spätere Uploadzeit | R und Domain-Tests; zusätzliche Datumsnavigation Offen |
| Automatische Berechnung | BMI aus Gewicht/Größe, echte Einträge, keine angenommene Körpergröße | P und Domain-Tests |
| Fortschritt / Wochenbericht | mehrere Wochen, ausgewiesene Datenbasis, dünne Daten, Zykluskontext | P |
| Kalender | Monat wechseln, direktes Datum, Heute, Marker nach Eintragsart | R; zusätzlicher UI-Lauf Offen |
| Galerie | Datumsreihenfolge, Tagesfilter, Nachladen, Privatabruf, Vergrößern | P für Upload/Backup; zusätzliche Reihenfolge-/Öffnungsprüfung Offen |
| Foto löschen | Bestätigung, privater Speicher und Metadaten, saubere Fehlerbehandlung | R und frühere Fototests; reale Fotos nicht angefasst |
| Teilen | explizite Daten-/Fotoauswahl, Vorschau, Änderung verwirft alte Vorschau, Download/Systemteilen | R; zusätzlicher Vorschau-/Abbruchtest Offen; tatsächliches Posten X |
| Training | Laufband, Körpergewicht, Band-/Tube-Set, Übungen und sichere Bildzuordnung | P und Domain-Tests |
| Trainingsprotokoll | echtes Datum, Einheit, Minuten, Anstrengung, Band, Notiz, Löschen | R; zusätzlicher Browserlauf Offen |
| Übungsfortschritt | Bandidentität, Wiederholungen, Technik/Symptome, vorsichtige Entwicklung, Wiederholschutz | P; unabhängiger isolierter UI-Test zusätzlich erfolgreich |
| Profil / Ziele | bestätigte Größe, Geburtsjahr, aktive Stufe, Zielstart und Wünsche, unbekannte Angaben | R und Domain-Tests; zusätzlicher Browserlauf Offen |
| Zyklus | freiwilliger Beginn/Ende/Befinden, keine erfundenen Phasen oder BMI-Korrektur | R und Domain-Tests; zusätzlicher Browserlauf Offen |
| Motivation | Gewichtsveränderung, stagnierender/rückläufiger Verlauf, schnelle Abnahme nicht belohnen | P und Domain-Tests |
| KI-Begleiter | begründete Vorschläge, Datenbasis, unbekannte Angaben, bestätigte Datenübernahme | P; keine echten privaten Chats an KI gesendet |
| Chat-Import | ausdrücklich eingefügter Text und Datum, keine stillen Zugriffe auf andere ChatGPT-Chats | R |
| Sozialprofile | bestätigte eigene Links, Plattformprüfung, kein Erraten fremder Konten | P und Domain-Tests |
| Verschlüsselte Sicherung | Daten/Fotos, Passwort, Integritätsprüfung, additive Wiederherstellung, Konflikte | P und zusätzliche Mock-UI-Tests |
| Inaktive App / Kontoänderung | private DOM-Inhalte leeren, zulässigen Entwurf nur für dasselbe Konto wiederherstellen | P; zusätzlicher isolierter Übungstest bestätigt keine späte Anzeige nach Logout |
| Erscheinungsbild | drei Designs, mobile Lesbarkeit, zugängliche Bedienelemente | P; erweiterte Menü-/Viewport-Prüfung Offen |
| Gemeinsamer Wochenplan | bestätigte geplante Mahlzeiten/Training/Wiegen | P |
| Hilfe / Impressum | Kontakt, verständliche Hinweise, eigene Dokumentfenster | P |

## 🏡 Gemeinsame Oberfläche und Darstellung

| Bereich | Aktionen und Fehlerpfade im Inventar | Nachweis / Stand |
|---|---|---|
| App-Wechsel | drei bekannte Apps im Rahmen, gemeinsame Startseite, zurückgehaltene Fenster | P |
| Schwebende Navigation | Start, Zurück, Vorwärts, gezielte Verlaufssprünge, Grenzen/Verzweigungen | P in Chromium/WebKit und anonym auf der Live-Seite |
| Verlaufsschutz | nur erlaubte Seiten, keine privaten Inhalte/URLs, Reset beim Abmelden | P: Absender-/Origin-/Route-Tests und Browserprüfungen |
| Dialoge | Fokus, Schließen, Hintergrundscrollen, gleichzeitige Dialoge | P; zusätzliche neue Menüprüfung Offen |
| Tastatur / Safe Areas | Bedienelemente bei Texteingabe, kleine Ansichten und Querformat | P; erweiterte Menüprüfung Offen |
| 320 / 390 / 844 / 1280 Pixel | Hauptmenüs mit zusätzlichen Einträgen, lesbare Schaltflächen, keine Überdeckung | Offen für den erweiterten unabhängigen Lauf |
| Installieren / PWA | Manifest, Icons, Installationshilfe, öffentliche Programmdateien | R; tatsächliche OS-Installation/Updates X |
| Externe Plattformen | Apple-/Google-Kalender, Betriebssystem-Teilen, Instagram/TikTok, E-Mail | X: ohne echten Anbieteraufruf keine erfolgreiche externe Wirkung behauptet |

## Befunde im zusätzlichen Lauf

1. **Sitzungshinweis im alten Garten-Kontofenster war irreführend:** Dort stand, dass die Sitzung mit dem Schließen des Tabs ende. Die gemeinsame Anmeldung verwendet tatsächlich lokalen Sitzungsspeicher und eine Inaktivitätsgrenze von zehn Minuten. Der Befund wurde der Hauptimplementierung zur Korrektur gemeldet. Eine Sicherheitswirkung des Tab-Schließens darf nicht zugesichert werden.

## Technische Nachweise dieses unabhängigen Laufs

- Aktuelle lokale, gebaute App-Dateien; keine nachgebauten Dummy-Oberflächen.
- Simulationsgrundlage: `/tmp/full-function-audit/fixture.mjs`, Service Worker gesperrt.
- Gartenaktionen und beobachtete Backend-Aufrufe: `/tmp/full-function-audit/garden-flow.mjs` (der zusätzliche Lauf wird schrittweise vervollständigt).
- Isolierter Übungsfortschritt: `/tmp/hub-browser/training-progress-ui-check.mjs`, einschließlich verlorener Antwort nach erfolgreichem Speichern, identischer Wiederholungs-ID und fehlender später Privatanzeige nach Logout.
- Sortenkatalog: 200 belegte Sorten, 100 Obst/100 Gemüse; Datensatzprüfung und unabhängiger Abgleich mit dem tatsächlich geladenen RHS-PDF erfolgreich. Ein Produktionsimport wird hier nicht ohne dessen gesonderte Ausführung behauptet.

Noch als „Offen“ markierte Felder sind ausdrücklich keine bestandenen Tests. Sie werden erst nach tatsächlichem Nachweis auf „B“ gesetzt; externe Grenzen bleiben auch danach bestehen.
