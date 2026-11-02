# Garten-App: erneute Fehlerprüfung am 2. November 2026

Prüfstand vor Änderungen: `d11f6ed` (veröffentlichte Icons). Änderungen in diesem Bericht liegen zur Zusammenführung und Veröffentlichung durch den Hauptagenten bereit. Keine Produktionsdatensätze, privaten Fotos oder echten KI-Anfragen wurden für diese Prüfung verwendet.

## Bestätigte Fehler und Korrekturen

### Laufende Speicherung ließ sich über X oder Escape aus dem Fenster verdrängen

**Befund:** Das Formular sperrte seine eigenen Eingaben während des Speicherns. Der außerhalb des Formulars liegende Schließen-Knopf und Escape konnten das Fenster trotzdem schließen. Ein reproduzierbarer Browsertest hielt den Foto-Upload an, klickte X und stellte fest: `dialog.open === false`, obwohl die Formularaktion noch lief.

**Korrektur:** X und Escape halten das Fenster während einer laufenden Formularaktion offen und zeigen einen kurzen Hinweis. Nach Fehler oder Abschluss ist es wieder normal bedienbar. Reguläre erfolgreiche Abläufe können ihr Fenster weiterhin selbst schließen. Eine durch Abmeldung erzwungene Bereinigung bleibt möglich.

### Erntefoto-Upload prüfte die Sitzung vor dem anschließenden INSERT nicht erneut

**Befund:** Zwischen dem Beginn eines Foto-Uploads und dem Speichern des Ernteeintrags konnte sich die Sitzung beziehungsweise der aktive Dialog ändern. Die erneute Prüfung fehlte an dieser asynchronen Grenze.

**Korrektur:** Nach Bildvorbereitung und nach Upload werden Sitzung/Familienbezug sowie der noch geöffnete zugehörige Dialog geprüft. Bei einer Änderung erfolgt kein weiterer Ernteeintrag. Ein bereits hochgeladenes Bild wird bestmöglich wieder entfernt. Ein fehlgeschlagener Löschversuch, etwa bei bereits abgelaufener Anmeldung, kann technisch nicht durch den Browser garantiert werden; dies ist kein Nachweis eines vollständig ausgeführten Storage-Rollbacks.

**Regression:** Synthetisches Foto auswählen, Upload gezielt anhalten, X und Escape versuchen, anschließend abmelden und Upload fortsetzen. Es entsteht kein verspätetes INSERT; die Bereinigung wird angefordert. Vor dem Fix scheiterte derselbe Ablauf bereits an der Prüfung des offen gebliebenen Dialogs.

### Alte KI-Schlüsselverwaltung führte an der zentralen Passwortabfrage vorbei

Dieser Befund wurde mit dem unabhängigen Datenbankagenten abgestimmt. In der Gartenoberfläche gab es noch direkte Aufrufe von `rg_set_ai_provider_key` zum Speichern und Entfernen von Schlüsseln mit der normalen Sitzung.

**Korrektur an der Gartenoberfläche:** Die Schlüsselfelder und beide direkten Setter-Aufrufe wurden entfernt. Ein Button öffnet `/abnehmen/zuhause/?manage=ai#home` in einem separaten Tab mit `noopener noreferrer`. Dort erfolgt die zusätzliche Passwortbestätigung. Providerstatus, persönlicher Anbieter, Verbindungstest und Familienstandard bleiben verfügbar. Die serverseitige Absicherung und die zentrale Verwaltung werden getrennt durch die dafür zuständigen Agenten geprüft; dieser Gartenbericht beansprucht dafür keinen eigenen Datenbanknachweis.

## Tatsächlich erneut ausgeführte Prüfungen

Das dauerhafte Skript liegt im gemeinsamen Repository unter `abnehmen/test/browser/garden-audit.mjs`. Es lädt die echte Gartenoberfläche, Styles und ausgelieferten JavaScript-Funktionen; nur die Initialisierung/Backendzugriffe werden durch synthetische Daten ersetzt. Es ist deshalb ein Funktions- und Layouttest, kein Beleg für eine echte Produktionsanmeldung.

Chromium und WebKit bestanden jeweils alle zehn Prüfgruppen:

1. Übersicht, Pflanzen, Beete, Gartenleben und Einstellungen bei 320×700, 390×844, 844×390 und 1280×800: keine horizontale Überschreitung des Dokuments oder Bodys, keine ungefangenen Appfehler.
2. Ernteeintrag mit deutschem Dezimalkomma `1,5`: gespeichert wird die Zahl `1.5`, das gewählte Datum bleibt erhalten, optionale Zuordnungen bleiben leer.
3. Fehlgeschlagene Speicherung: Eingaben bleiben erhalten, der Speichern-Knopf wird wieder freigegeben, Wiederholung speichert erfolgreich.
4. Pflanzensuche nach Sorte, keine Treffer, Suche leeren: passende Kataloggruppe erscheint wieder.
5. Kalender am Beginn der Sommerzeit: `28.03.2027, 02:30` in Europe/Berlin wird als nicht existierende Uhrzeit abgewiesen; kein Speichervorgang.
6. Neues Beet: `2,5 m × 1,2 m` werden als `250 × 120 cm` gespeichert. Ein Versionskonflikt beim Bearbeiten lässt den Entwurf stehen und überschreibt den neueren Datensatz nicht.
7. Persönliche Aufgabe: ausgewähltes Datum speichern und anschließend als erledigt markieren.
8. Gültiger Kalendertermin: speichern und echte ICS-Datei herunterladen; Dateiinhalt enthält Datum, Titel, VCALENDAR und CLASS:PRIVATE.
9. KI-Schlüsselverwaltung: zentraler Link und Schutzattribute vorhanden; kein altes Schlüssel-Eingabefeld mehr; Familienstandard weiterhin wählbar.
10. Laufender Upload, Schließen/Escape und Abmeldung: oben beschriebener Regressionstest.

Zusätzlich bestanden Syntaxprüfungen von `app.js` und `sw.js` sowie die vorhandene Katalog-Prüfsuite (`node --test tests/*.test.mjs`). Geprüft wurden darüber hinaus im Code die Versionsfilter bei Änderungen/Löschungen, Suchnormalisierung, Kalenderdatumsvalidierung, JPEG-Verkleinerung und der ausschließlich auf öffentliche Dateien begrenzte Service Worker.

## Dateien und Veröffentlichung

Geändert: `app.js`, Versionskennung in `index.html`, öffentlicher Shell-Cache in `sw.js`, passende Bedienhinweise in `read.txt` und `read.html`. Für das große bestehende Bundle wurde kein flächiger Neuaufbau oder Umbenennen von Funktionen vorgenommen. Die Anpassungen sind gezielt auf die bestätigten Abläufe begrenzt.

Die Browserhilfsdatei protokollierte in einem WebKit-Durchlauf einen internen Blob-Download irrtümlich als fehlenden lokalen Pfad. Der Download selbst lieferte die korrekten überprüften ICS-Bytes; dies war ein Testadapter-Artefakt und kein fehlendes veröffentlichtes Asset. Der gemeinsame Adapter wird entsprechend angepasst.

## Grenzen der Prüfung

- Firefox startete in dieser neu aufgebauten Laufzeit nicht: Headless-Start lief in einen Timeout, mit schreibgeschütztem Cache-/Sandbox-Hinweis. Die Garten-App wurde in diesem Versuch nicht erreicht. Daraus wird weder ein Firefox-Appfehler noch ein bestandener aktueller Firefox-Test abgeleitet.
- Es wurden keine vollständigen Betriebssysteme oder physischen iPhones/Android-Geräte getestet. Chromium/WebKit und die genannten Größen decken deren Browserdarstellung näherungsweise ab.
- Echte Einladungs-/Passwortmails, reale Kontoentfernung, echte KI-Kosten, Freigaben an Dritte und reale Kalenderanbieter wurden nicht ausgelöst.
- Die produktiven RLS-/Storage-/Sitzungsprüfungen gehören zum unabhängigen Sicherheitsbericht. Eine vollständige Sicherungswiederherstellung sowie die gemeinsamen Module für Dörrautomat, Saatgut und Zuhause gehören zu den jeweiligen gemeinsamen Tests; dieser Bericht behauptet diese nicht erneut vollständig bedient zu haben.
- Die Aussage ist: Die beschriebenen Prüfungen bestanden, die bestätigten Fehler wurden gezielt korrigiert. Sie ist keine Garantie, dass jede denkbare Kombination oder externe Dienststörung ausgeschlossen ist.

## Abschließender Firefox-Nachtrag der Hauptprüfung

Nach Behebung des Testumgebungsproblems wurde der hier beschriebene private Browserflow mit Playwright 1.64.1 / Firefox 157 erneut vollständig ausgeführt und bestand. Pro Browserstart wurde ein eigenes temporäres XDG-Verzeichnis verwendet. Die früheren Startabbrüche waren keine Appfehler. Dieser Nachtrag bezieht sich auf den Tagebuch-, Garten- beziehungsweise Rezeptcontroller-Flow; ein vollständiger physischer Gerätetest bleibt ausgeschlossen.
