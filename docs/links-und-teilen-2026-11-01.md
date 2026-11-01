# 🔗 Links, Teilen, Neon-Hilfe und deine Kanäle

Stand: 1. November 2026. Drei getrennte Agenten haben Garten, Rezepte und Tagebuch/Zuhause geprüft; anschließend wurden die gemeinsamen Änderungen erneut geprüft.

## ✨ Sichtbar und direkt erreichbar

READ/Bedienhilfe trägt einen kräftigen Mint-Neon-Akzent, Impressum einen Pink-Neon-Akzent. Die Beschriftungen bleiben auf dunklem Grund kontrastreich. Es gibt keine blinkenden oder dauerhaft laufenden Animationen. Schaltflächen bleiben mindestens 44 Pixel hoch und vorhandene Fokusmarkierungen sichtbar. Versteckte Bedienelemente werden durch die Gestaltung nicht eingeblendet.

Die drei ausdrücklich bestätigten Profile erscheinen als Instagram-, TikTok- und YouTube-Schaltflächen in allen vier App-Oberflächen und den öffentlichen Hilfe-/Impressumsseiten:

- [Instagram · diegartenmutti86](https://www.instagram.com/diegartenmutti86/)
- [TikTok · gartenmutti86](https://www.tiktok.com/@gartenmutti86)
- [YouTube · diemutti86](https://youtube.com/@diemutti86)

Die Links öffnen neue Fenster mit `noopener`, `noreferrer` und `no-referrer`. Es werden keine Social-Media-Widgets, Schriften, Tracking-Pixel oder fremden Logos vom Anbieter geladen. Der übermittelte YouTube-Trackingparameter ist für den Kanal nicht nötig und wurde weggelassen. Die drei bestätigten URLs wurden außerdem in Ramonas vorhandenen Profilfeldern gespeichert; die übrigen Profilangaben blieben per Vergleichs-Hash unverändert.

## 🛠 Behobene Probleme

1. **Fehlermeldungen blockierten Fußleisten:** Textmeldungen in Garten und Rezepte konnten über READ/Impressum liegen und Klicks mehrere Sekunden abfangen. Reine Textmeldungen lassen Berührungen nun durch. Der Test klickt Hilfe, während die Fehlermeldung noch sichtbar ist.
2. **Bilddownload aus eingebetteter App unter WebKit:** Die Tagebuch-Teilkarte wurde alleinstehend heruntergeladen, eingebettet aber nicht zuverlässig. Blob, URL und Download-Element entstehen nun gemeinsam im bereits streng geprüften obersten Dokument. Nach verspäteter Verarbeitung prüfen wir erneut Zugriff, Konto, Vorschauversion und offenen Dialog.
3. **Schwebende Navigation über letzten Schaltflächen:** Die Fußleisten reservieren nun Platz für unteres App-Menü und schwebende Navigation. Scroll-Abstände berücksichtigen beide Reihen. READ/Impressum und die Profile wurden an neun Punkten je Schaltfläche auf Überdeckung geprüft.
4. **Unnötiges Startmodul:** Das ungefähr 280 KiB große unkomprimierte Sicherungs-/SDK-Bündel wird erst beim Öffnen der Sicherung geladen. Bei einem Ladefehler ist ein echter erneuter Versuch möglich; danach wird das geladene Modul wiederverwendet. Ein Wechsel in den Hintergrund öffnet später keinen unerwarteten Dialog.
5. **Veraltete KI-Beschreibung:** Öffentliche Hilfetexte und Impressen beschreiben jetzt OpenAI und Gemini im Tagebuch und die zentrale Einrichtung korrekt.

## 🧪 Geprüfte Wege

| Oberfläche | Nachgewiesene Bedienwege |
|---|---|
| Garten | Übersicht/Katalog/Pflanze/Beet teilen, native Auswahl und Abbrechen, WhatsApp-URL, Kopieren und Ausweichweg, Drucken, Pflanzendirektlink, Anbietersuche, tatsächliche ICS-Dateibytes, Kalenderlink/Kopieren, Rezeptvorschläge, öffentliches Profil, Plan/Dörren/Saatgut, Hilfe/Impressum und Kontaktlinks. |
| Rezepte | WhatsApp mit Titel, 1,5-facher Menge und Austauschzutaten; Tagesrezept in neuem Tab, Vorspeise/Dessert mit Schutz ungespeicherter Tipps, Kategorien, Menüs, Eier-Timer, Hilfe/Impressum, Gartenwechsel, BLS-/Ernährungsquellen und zulässige Chat-Quellenlinks. Unsichere `javascript:`-/unverschlüsselte Quellen werden nicht als Link angeboten. |
| Tagebuch | Auswahl einzelner Messwerte und ausdrücklich gewählter Fotos; tatsächliche JPEG-Dateidownloads alleinstehend/eingebettet; native Auswahl, Abbrechen, Fehler und Download-Ausweichweg; geschlossene/veraltete Vorschau löst keinen verspäteten Download aus. Alle zehn Menüseiten, Referenzlinks, Rezeptfenster und bestätigte Profilwege. |
| Zuhause | Start/Zurück/Vorwärts/Verlaufssprung, Verzweigungen, Erhalt passender Entwürfe, App-Wechsel, Hilfe-/Impressumsreiter, Suche/Inhaltsverzeichnis, fünf Textdownloads, Designs und Installationshilfe. |

Chromium und WebKit mit Touch-Einstellungen wurden verwendet. Die vier gemeinsamen Größen waren 320 × 740, 390 × 844, 844 × 390 und 1280 × 900. Rezept- und Dokumentszenarien liefen zusätzlich bei drei mobilen Größen in beiden Motoren, darunter 210 einzeln geöffnete Hilfethemen. Die neuen Neon-/Profil-Schaltflächen bestehen beide Motoren bei allen vier Größen, jeweils angemeldet und auf den unterschiedlichen Anmeldekarten, einschließlich Neun-Punkt-Treffertest, korrekter URL und unveränderter App-Seite.

Eine statische Prüfung erfasst 13 HTML-Dateien und 361 interne Verweise einschließlich Programm-/Bilddateien. Alle Dateiziele existieren. Acht zusätzliche Markierungen betreffen die vorgesehenen JavaScript-Routen `#home`, `#garten`, `#rezepte`, `#abnehmen`; sie sind absichtlich keine HTML-Element-IDs und wurden funktional geprüft.

Die 23 Testdateien im Tagebuch-/Zuhause-Projekt und die zehn Rezept-Testdateien bestehen. Das neue bedarfsgesteuerte Sicherungsmodul besteht Start-ohne-Bündel, provozierten Ladefehler, erneuten Versuch und Wiederverwendung. Die zentrale verschlüsselte Wiederherstellung besteht ihren vollständigen Chromium-Prüflauf weiterhin.

## Ehrliche Grenzen

WhatsApp- und Social-Media-Ziele wurden abgefangen und kontrolliert; es wurde keine Nachricht oder Veröffentlichung versendet. Die Tagebuch-Teilkarte verwendet das Betriebssystem-Teilen; welche Apps dort angeboten werden, bestimmt das Gerät. Echte Bestellungen, native Kalenderkonten und Telefon-/Mailprogramme wurden nicht bedient.

Statische Downloads wurden zusätzlich über einen echten HTTP-Testserver mit Dateibytes geprüft: Bei allein durch Playwright abgefangenen Hosts melden manche Chromium-Downloads künstlich „canceled“. WebKit und der echte HTTP-Test bestanden; veröffentlichte Textziele lieferten HTTP 200. Drei NHS-Referenzen lieferten HTTP 200. Ein WHO-Referenzziel meldete aus der Testumgebung HTTP 403; seine korrekte Verlinkung wurde geprüft, eine allgemeine Erreichbarkeit wird nicht behauptet. Die bestätigten Social-Profile können Login, Alters-/Regionalprüfung oder die native App verlangen.

Diese Prüfung reduziert konkrete Fehler, garantiert aber weder jedes Betriebssystem noch 100 % Fehlerfreiheit bei jedem externen Anbieter und Gerät.
