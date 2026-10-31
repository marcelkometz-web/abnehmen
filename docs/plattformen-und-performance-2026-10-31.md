# Gemeinsame Oberfläche, Bildschirmgrößen und Performance

Stand: 31.10.2026. Die gemeinsame Oberfläche liegt unter `/abnehmen/zuhause/` auf derselben Origin wie die drei bestehenden Apps.

## Eine gemeinsame App

Eine feste Navigation wechselt zwischen Zuhause, Garten, Rezepten und Ramonas Weg. Die drei Bereiche werden innerhalb der gemeinsamen Oberfläche angezeigt. Besuchte Bereiche bleiben im Arbeitsspeicher, damit Eingaben beim Bereichswechsel erhalten bleiben. Der Hub selbst liest keine Kontodaten, Auth-Tokens, privaten Fotos oder Gesundheitswerte.

Die eingebetteten Bereiche sind ausschließlich unter dieser obersten Startseite derselben Origin zugelassen. Origin, Elternfenster, Startseitenpfad und Shell-Marker werden geprüft. Fremde Seiten, andere Pfade und verschachtelte Frames bleiben ausgeschlossen. Die bestehenden Supabase-Sitzungsprüfungen, Kontofreigaben und privaten Foto-Regeln wurden nicht geändert.

## Konkrete Optimierungen

- **Weniger Bilddaten:** Die elf vorhandenen Übungsbilder benötigen als große WebP-Fassungen zusammen 856.826 Byte statt 23.776.976 Byte für die PNG-Quellen. Das sind 96,4 Prozent weniger übertragene Bilddaten beim Vergleich aller großen Fassungen. Zusätzliche 360- und 720-Pixel-Varianten werden anhand der Bildschirmgröße gewählt. Die Darstellung verwendet verzögertes Laden und asynchrone Bilddekodierung. Bestehende PNG-Dateien bleiben für ältere bereits geladene App-Versionen erreichbar.
- **Private Galerie bei Bedarf:** Fortschrittsfotos werden erst beim Öffnen der Galerie heruntergeladen. Die reguläre Check-in-Ansicht lädt sie nicht vorsorglich.
- **Weniger Hintergrundlast:** Regelmäßige Datenabfragen und unnötige Anzeigeaktualisierungen pausieren in nicht sichtbaren Bereichen. Beim Zurückwechseln wird der Datenstand wieder abgeglichen. Sitzungs- und Abmeldeereignisse bleiben aktiv.
- **Eingaben erhalten:** Sitzungsereignisse anderer Bereiche verbrauchen einen pausierten Entwurf nicht mehr. Wiederholte Hintergrundereignisse erhalten ihn. Laufende Check-ins werden vor einem angeforderten Bereichswechsel abgeschlossen. Bei Unterbrechung bleiben Eingaben im Arbeitsspeicher; erneutes Speichern unterliegt weiterhin der serverseitigen Prüfung auf veraltete Datenstände.
- **Handybedienung:** Touch-Eingaben verwenden mindestens 16 Pixel Schriftgröße, um unerwünschtes Eingabe-Zoomen unter iOS zu vermeiden. Bedienelemente erhalten auf Touch-Geräten eine Mindesthöhe von 44 Pixeln. Die gemeinsame Oberfläche berücksichtigt sichere Bildschirmränder und passt ihre Höhe an den sichtbaren Viewport an. Bei eingeblendeter Tastatur wird Platz für den aktiven Bereich freigegeben.
- **Fehlerkorrektur in Rezepte:** Ein fehlendes Ziel für den Synchronisationsstatus verursachte bei einer Hintergrundaktualisierung eine JavaScript-Ausnahme. Der Status ist jetzt korrekt zugeordnet.
- **Bewegung:** Die Systemeinstellung für reduzierte Animationen wird berücksichtigt.

Es wurden keine neuen KI-Übungsbilder erzeugt, keine echten privaten Fotos zur Prüfung verwendet und keine Anbieter-Schlüssel ausgelesen.

## Durchgeführte Prüfungen

| Prüfung | Ergebnis |
|---|---|
| Chromium: 320×740, 390×844, 768×1024, 1024×768, 1440×900, 1920×1080 und 844×390 | Alle vier Bereiche ohne horizontale Überbreite und ohne JavaScript-Laufzeitfehler. |
| WebKit 27.2: dieselben Größen | Alle vier Bereiche ohne horizontale Überbreite und ohne JavaScript-Laufzeitfehler. |
| Mobile Touch-Konfiguration mit iPhone-/Android-Kennung | Eingabeschrift, Größen und gemeinsame Navigation geprüft. |
| Simulierte Tastaturverkleinerung | Gemeinsame Navigation gibt Platz frei, der Bereich verwendet den verfügbaren Viewport, Eingabewert bleibt erhalten. |
| Hintergrundwechsel | Inaktive Bereiche führen die geplanten Datenabfragen nicht aus. Rückkehr stellt den Entwurf wieder her. |
| Laufender Check-in | Bereichswechsel wartet auf die Speicherung. Wiederholte Hintergrundereignisse verwerfen keine Entwürfe. |
| Galerie und Übungen | Galerie lädt erst bei Aufruf; optimierte Übungsbilder werden mit passenden Größen geladen und dekodiert. |
| Anmeldung | Gemeinsame Anmeldung und Abmeldung zwischen den Bereichen mit ausschließlich simulierten Konten geprüft. |
| Einbettung | Fremde/nested Eltern und ein anderer Pfad derselben Origin bleiben gesperrt. |
| Node-Tests | Tests der Abnehmen-App, der Rezepte-App und der gemeinsamen Frame-Regeln bestanden. |
| Hilfe und Impressum | Alle fünf Hilfethemen bei 320×740, 390×844, 844×390 und 1280×900 in Chromium und WebKit geprüft. Kein Überlauf; Schließen und aus dem Tagebuch geöffnetes Impressum erhalten den Check-in-Entwurf. |
| Rezept-Datenqualität | Filter, Kennzeichnung, unbekannte widersprüchliche Wertepaare und die blockierte Editor-Speicherung mit simulierten Rezepten geprüft. Originalwerte bleiben unverändert. |
| Gestaltete Hilfen | Grün/Küche/Rosé, vorhandene App-Symbole, Suche, leere Suche und gezielte Themenwahl ohne Wechsel des App-Bereichs bei 320, 390 und 768 Pixeln in Chromium und WebKit geprüft. |
| Tube-Set | Zehn neue Übungen mit drei Schritten, Zubehör und leichterer Variante bei 320, 390 und 768 Pixeln in beiden Engines geprüft. Wochenplan-Umschaltung und die vorhandenen Mini-/Flachbandbilder funktionieren; fehlende neue Bilder werden nicht angefragt. |

Die [Datenbankprüfung](datenbankpruefung-2026-10-31.md) enthält die getrennten Live-Bestands- und Zugriffstests. Alle öffentlichen Hilfetexte sind als HTML und Text erreichbar; das bestätigte Impressum ist in allen Bereichen identisch.

## Einordnung der Systemunterstützung

Die Umsetzung richtet sich an aktuelle Safari-/WebKit-, Chrome-/Chromium- und Edge-Browser auf iPhone/iPad, Android, Windows, macOS und ChromeOS. Google wurde als Chrome bzw. ChromeOS berücksichtigt. Die Oberfläche verwendet Webstandards und Funktionsprüfungen statt einer Freigabe nur für bestimmte Versionsnummern.

Die Prüfungen liefen mit Browser-Engines und verschiedenen Bildschirm-/Touch-Konfigurationen unter Linux. Eine iPhone- oder Android-Kennung ist kein Test auf einem echten Gerät. Echte Hardwaretests mit iOS 27, Android 16, Windows, macOS und ChromeOS wurden hier nicht durchgeführt. Firefox konnte in dieser Laufzeit nicht gestartet werden und erhält daher keinen als bestanden ausgewiesenen Browserlauf. Native Kamera-, Teilen- und Installationsdialoge hängen weiterhin von Browser, Betriebssystem und Geräteberechtigungen ab.

Die Größenersparnis ist anhand der tatsächlichen Dateien gemessen. Eine bestimmte Startzeit, Bildrate oder Akkulaufzeit auf jedem Gerät wird daraus nicht behauptet.
