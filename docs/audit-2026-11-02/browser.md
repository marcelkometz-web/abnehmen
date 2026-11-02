# Unabhängige Browserprüfung · 2. November 2026

Geprüft wurden die tatsächlichen lokalen Dateien von Zuhause, Garten, Rezepte und Ramonas Weg. Alle Anwendungs-API-Anfragen wurden im Browser abgefangen. Konten und Sitzungen waren hier anonym; private Schreib-/Sitzungsregressionen wurden getrennt durch die App-Prüfer getestet. Es wurden keine privaten Fotos, Anbieter-Schlüssel oder echten KI-Antworten abgerufen.

## Ergebnis

- Chromium: **20 von 20** Kombinationen erfolgreich (4 Oberflächen × 5 Größen).
- Firefox 157: **20 von 20** Kombinationen erfolgreich.
- WebKit 26: **20 von 20** Kombinationen erfolgreich. Damit sind **60 Kombinationen** in drei Browser-Engines bestanden.
- Größen: **320×740, 390×844, 430×932, 844×390, 1280×900**.
- Zusätzliche tatsächliche Trefferflächenprüfung in Chromium bei 390×844: **12 Social-Media-Schaltflächen und 11 Hilfe-/Impressum-Schaltflächen** per Probe-Klick erreichbar, ohne externe Navigation.
- **13 öffentliche Live-HTML-Seiten antworteten mit HTTP 200**. Hierunter die vier App-Einstiege sowie Hilfe, Impressum und Eier-Timer. Das ist ein Erreichbarkeitsnachweis vor der Veröffentlichung der neuen Korrekturen, kein Nachweis über den später veröffentlichten Stand.
- **390 statische href-/src-Verweise in 13 HTML-Dateien** untersucht: kein fehlendes internes Ziel. Dynamische Routen werden im Browser geprüft; diese Zahl ist keine Aussage, dass 390 verschiedene Funktionen getestet wurden.

## Tatsächlich geprüfte Abläufe

Auf jeder der fünf Größen: sichtbare Bilder werden geladen; Dokument und Body haben keinen horizontalen Überlauf; keine echten window.error- oder unhandledrejection-Ereignisse und keine CSP-Verletzung beim Einstieg; drei Einzelapps zeigen ihre Anmeldemaske und die bestätigten Instagram-, TikTok- und YouTube-Ziele mit neuem Fenster, noopener und noreferrer.

Im Zuhause auf jeder Größe: vier Designs auswählen; allgemeine Hilfe und Garten-/Rezept-/Tagebuch-/Impressumthemen laden; Installationsanleitung öffnen/schließen; alle drei Apps innerhalb des Rahmens aufrufen; zurück zur gemeinsamen Startseite; schwebendes Zurück/Vorwärts; Verlauf öffnen; Wochenplan, KI-Verwaltung und Gesamtsicherung ohne Anmeldung öffnen und geschützten Zustand prüfen; Fenster mit Escape schließen. Bei jedem App-Rahmen wurden tatsächliche Body-Breite und echte Skriptfehler separat geprüft.

Die separat abgelegten Skripte der anderen Agenten vertiefen echte App-Oberflächen mit künstlicher Anmeldung und synthetischen Speicherantworten. Deren Ergebnisse sind in ihren jeweiligen Berichten abgegrenzt.

## Einordnung der Fehlversuche

- Die erste Hilfe-Assertion suchte h1/h2; die vorhandene Hilfe verwendet h3. Der sichtbare Inhalt war korrekt. Der Testselektor wurde berichtigt, kein App-Fehler.
- Die erste anonyme Garten-/Rezeptfixture verweigerte auch die öffentliche Capabilities-Anfrage. Dadurch erschien korrekt die Einrichtungs-/Fehleransicht. Die Fixture liefert jetzt eine synthetische öffentliche Capabilities-Antwort, keine zusätzliche Produktionsfreigabe.
- Eine feste Pause von 800 ms war unter parallel laufendem WebKit zu kurz für den nachgelagerten Social-Media-MutationObserver. Die Prüfung wartet jetzt auf die tatsächlich eingehängten Links. Frühere Screenshots mit diesem fehlgeschlagenen Test sind kein belegter App-Befund.
- Der ältere Firefox 146 aus Playwright 1.58.2 hing vor Erreichen der App in der eingeschränkten Testumgebung. Mit Playwright 1.64.1/Firefox 157 und eigenem XDG-Verzeichnis pro Start bestanden alle 20 öffentlichen Kombinationen. Dies erforderte keine Änderung an den Apps.
- WebKit-Systembibliotheken wurden ausschließlich in einem temporären Testverzeichnis bereitgestellt. Die CSP der Apps wurde nicht abgeschwächt.
- Dekorative, aria-hidden Hintergrundblüten können geometrisch über den sichtbaren Bereich hinausragen. Sie vergrößern den Body nicht und verdecken in den geprüften Ansichten keine Eingaben; solche Dekoration wurde nicht fälschlich als überlaufendes Textfeld bewertet.

## Dauerhafte Nachweise und Grenzen

Die wiederverwendbare Testumgebung liegt in `abnehmen/test/browser/`: browser-helper.mjs, public-check.mjs, public-controls.mjs, package.json, Sperrdatei und README. Der Workspacepfad ist konfigurierbar. Alle tatsächlichen App-Dateien werden lokal geladen; unbekannte externe Anfragen werden abgefangen. Firefoxläufe erhalten getrennte temporäre Konfigurationsverzeichnisse.

Diese Prüfung beweist Browser- und Größenkombinationen, keine vollständige physische Zertifizierung jedes iPhone, Android-Geräts, Windows-PCs oder Macs. Betriebssysteminstallation, echte Mailzustellung, Kamera, reale Social-Media-Veröffentlichung, Anbieterabrechnung und jede denkbare Eingabekombination bleiben außerhalb dieses Nachweises. Service Worker waren in den simulierten Browserflüssen deaktiviert; sie wurden hier nicht als vollständiger Offline-Update-Test ausgegeben.
