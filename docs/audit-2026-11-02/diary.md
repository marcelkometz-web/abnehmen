# Prüfung Ramonas Weg – 2. November 2026

Geprüft wurden die tatsächlich gebauten Dateien aus `abnehmen`, mit unabhängigen Prüfungen der gemeinsamen Oberfläche und Datenbank durch weitere Agenten. Die folgenden Schreibtests verwendeten ausschließlich künstliche Konten, Messwerte und Dateien sowie abgefangene Backend-Antworten. Es wurden keine echten privaten Fotos geladen, keine echten KI-Anfragen ausgelöst und keine Nutzerangaben verändert.

## Gefundene und behobene Fehler

1. **Check-in-Entwurf beim erneuten Auswählen desselben Tages gelöscht.** Der bisherige Kalender setzte das Formular einschließlich Gewicht, Notiz und Dateiauswahl zurück, obwohl der ausgewählte Tag unverändert blieb. Die Warnung galt nur für einen anderen Tag. Derselbe Tag bewahrt jetzt den Entwurf; ausdrückliches Neuladen und erfolgreicher Speichervorgang dürfen weiterhin den gespeicherten Stand einsetzen. Der ursprüngliche veröffentlichte Bundle-Stand wurde mit demselben Browserfall erneut getestet: `83,5` wurde leer und die Assertion schlug nachweislich fehl. Mit der Änderung bleiben auch die ausgewählte synthetische Fotodatei und die Notiz erhalten.
2. **Doppelte ganze Trainingseinheiten nach verlorener Speicherbestätigung.** Eine erneut gesendete Einheit bekam zuvor eine neue Datenbank-ID. Jetzt bleibt die Vorgangs-ID bis zur bestätigten Speicherung erhalten. Ein bereits gespeicherter identischer Datensatz wird bestätigt, statt ein zweites Mal angelegt zu werden. Nachträglich veränderte Angaben dürfen einen schon gespeicherten Datensatz weder überschreiben noch klonen; die Meldung erklärt den Konflikt und den gezielten Korrekturweg. Unterschiedliche bewusst erfasste Einheiten am gleichen Tag bleiben möglich. Die ID wird beim privaten Pausieren nur im kontogebundenen Arbeitsspeicher-Entwurf gehalten und beim Abmelden verworfen.
3. **Während einer laufenden Anfrage weitergeschriebene Angaben verloren.** KI-Chat, Trainingsformular, Profil, Körpergröße, Zyklus und Chatimport konnten eine inzwischen bearbeitete Eingabe nach der Antwort zurücksetzen. Ein bestätigter älterer Stand darf jetzt nur die unverändert eingereichten Formularwerte zurücksetzen. Neuere Eingaben bleiben erhalten; Training/Zyklus zeigen zusätzlich an, dass diese noch nicht gespeichert sind. Bei Profil/Körpergröße verhindert der erhaltene Entwurfsstatus, dass die anschließende Datenaktualisierung neu eingegebene Werte überschreibt.
4. **KI-Sendebutton nach Appwechsel während einer Anfrage dauerhaft deaktiviert.** Beim Leeren privater Inhalte wurde der Zustand zurückgesetzt, der zuvor deaktivierte Button aber nicht wieder freigegeben. Er wird jetzt beim Leeren zurückgesetzt. Eine verspätete Antwort einer vorherigen Sitzung darf den Entwurf der nächsten Sitzung nicht löschen oder deren Fehlermeldung überschreiben.
5. **Ungültiger Monat konnte englischen technischen Datumsfehler auslösen.** Zum Beispiel `2026-13-01` führte vor der eigentlichen Eingabeprüfung zu `Invalid time value`. Solche Werte bekommen jetzt die reguläre deutsche Fehlermeldung. Schaltjahre und gültige rückwirkende Daten bleiben zulässig.
6. **Unvollständiger Datenschutzhinweis beim KI-Anbieter.** Der Dialog nannte nur OpenAI, obwohl auch Gemini gewählt werden kann. Er nennt jetzt den tatsächlich auswählbaren Anbieterweg und ausdrücklich, dass keine Fotos oder Foto-Links übertragen werden.
7. **Alte direkte OpenAI-Schlüsselverwaltung entfernt.** In Abstimmung mit dem Datenbank-Sicherheitsagenten entfallen das alte beschreibbare Schlüsselfeld und dessen Setter-/Entfernen-Handler. Die App verweist auf die zentrale Verwaltung mit erneuter Passwortbestätigung und Familienverwaltungsrecht. Die eigentliche serverseitige Härtung wird im getrennten Sicherheitsbericht belegt.

## Nachweise

- Gesamter Node-Testlauf nach den Änderungen: **165 einzelne Assertions erfolgreich**, keine fehlgeschlagen oder übersprungen. Dieser Lauf enthält auch die zeitgleich ergänzten Tests der gemeinsamen Oberfläche. Neue spezifische Tests: `test/training-save.test.mjs`, `test/form-state.test.mjs`, ergänzte Datumsfälle in `test/domain.test.mjs`.
- Build über `npm run build` erfolgreich.
- **Chromium und WebKit:** authentifizierte Original-App mit simuliertem Backend, je zehn private Bereiche bei **320×740, 390×844, 844×390 und 1280×900**. Check-in, Auswertung, Wochenbericht, Kalender, Galerie, Training, Übungsprotokoll, Essen, Profil und Sicherung über das echte Menü erreichbar; kein horizontaler Body-Überlauf, nutzbare Inhaltshöhe, keine unbehandelten Fehler oder fehlenden App-Dateien.
- Kalender: gleicher Tag und „Diesen Check-in bearbeiten“ bewahren Gewicht, Notiz und ausgewählte Fotodatei; abgebrochener Wechsel zu einem anderen Tag bewahrt den Entwurf.
- KI: während einer Antwort neu getippte Nachricht bleibt erhalten; App-Pause und Rückkehr während einer Anfrage bewahren den kontogebundenen Entwurf und reaktivieren den Sendebutton.
- Training: simulierter serverseitiger Erfolg mit verlorener HTTP-Antwort; Retry und zwischenzeitlich veränderte Minuten bleiben bei **genau einem Datensatz mit 30 Minuten**. Identischer Retry bestätigt anschließend den Eintrag und setzt das Formular zurück.
- Profil/Zyklus: Antwort gezielt verzögert, Formular inzwischen geändert; eingereichter Datensatz ist gespeichert, neuere Eingabe bleibt im Formular stehen.
- Abmelden: Check-in-Werte, Trainingshistorie und Chatentwurf aus dem DOM entfernt.
- Dauerhafter Browserflow: `test/browser/diary-flow.mjs`, zusammen mit dem gemeinsamen `browser-helper.mjs`. Ergebnisse: `/workspace/reports/diary-browser-chromium-2026-11-02.json` und entsprechender WebKit-Bericht. Screenshot zur Sichtprüfung vorhanden.

## Grenzen

- **Firefox konnte in dieser Laufzeit nicht starten:** Timeout beim Browserstart mit Sandbox-/Cache-Verzeichnisproblemen. Deshalb wird für diesen erneuten Lauf kein erfolgreicher Firefox-Test behauptet. Das ist kein nachgewiesener Fehler der App.
- Keine vollständige physische Prüfung jedes iPhone-/Android-/Windows-/Mac-Geräts oder jeder Betriebssystemversion. WebKit ist eine Browser-Engine-Prüfung, kein identischer Ersatz für jedes reale Safari/iOS-Gerät.
- Echte Passwort-E-Mails, Anbieterabrechnung/KI-Ausgaben, native Foto-/Teilen-/Installationsdialoge und reale Wiederherstellungen wurden in diesem Teilprüflauf nicht ausgeführt. Bestehende isolierte Domain-/Backend-Tests wurden erneut ausgeführt; Live-Datenbankrechte und Sicherung prüfen die anderen Agenten gesondert.
- Die Browsermatrix prüft die Erreichbarkeit und Geometrie der zehn Bereiche; sie behauptet nicht, jede Funktion in jeder Kombination vollständig ausgeführt zu haben. Die oben aufgeführten Interaktionen sind die tatsächlich erneut ausgeführten Fälle.
- Kein Commit oder Push durch diesen Prüfer. Veröffentlichung und Live-Abgleich übernimmt der Hauptagent.

## Abschließender Firefox-Nachtrag der Hauptprüfung

Nach Behebung des Testumgebungsproblems wurde der hier beschriebene private Browserflow mit Playwright 1.64.1 / Firefox 157 erneut vollständig ausgeführt und bestand. Pro Browserstart wurde ein eigenes temporäres XDG-Verzeichnis verwendet. Die früheren Startabbrüche waren keine Appfehler. Dieser Nachtrag bezieht sich auf den Tagebuch-, Garten- beziehungsweise Rezeptcontroller-Flow; ein vollständiger physischer Gerätetest bleibt ausgeschlossen.
