# Gemeinsame App-Symbole und ergänzende Browserprüfung

Garten, Rezepte und Zuhause verwenden jetzt dieselbe Beere-/Roségold-Familie wie Ramonas bestehendes R-Symbol. Garten hat eine Pflanze, Rezepte Teller/Besteck und Zuhause ein Haus mit Herz. Das bisherige R bleibt unverändert. Die Motive wurden als lokale SVG-Grafiken programmiert, ohne neue KI-Bilderzeugung.

Die Symbole sind in App-Auswahl, unterer Navigation, Installation, Hilfe, Favicon und Garten-/Rezept-Kopfbereich eingebunden. PNG-Dateien mit 192 und 512 Pixeln ergänzen die SVG-Symbole; Apple-Touch-Icons besitzen 180 Pixel, PNG-Favicons 32 Pixel. Die Android-/PWA-Symbole besitzen einen vollständig deckenden Hintergrund. Optimierte 512-Pixel-PNGs bleiben unter 55 KiB. Es werden keine externen Schriften oder Bilddienste geladen. Die Quellen stehen in `scripts/build-family-icons.py`; die Rasterdateien wurden aus den SVGs im Browser gerendert und anschließend komprimiert.

Chromium, WebKit und Firefox haben die neuen SVG-Kopfbereichssymbole und PNG-Manifestdateien vor und nach der Anmeldung erfolgreich dekodiert. Die Darstellungsprüfung umfasst 320, 390, 844 und 1280 Pixel Breite, einschließlich Querformat. Die drei gemeinsamen App-Karten und die untere Navigation laden ihre Bilder korrekt. Die mobilen Seitenleisten können absichtlich ausgeblendet sein; ihre Symbole sind deshalb nicht fälschlich als stets sichtbare Bedienelemente ausgewiesen.

Zusätzlich zu Chromium/WebKit wurde der korrigierte Tagebuchaufbau in Firefox bei 320/390/430/844/1280 Pixeln geprüft: alleinstehend, eingebettet, angemeldet, abgemeldet und mit langem gespeichertem KI-Tipp. Check-in-Eingaben, simulierte Speicherung, Seitenwechsel, Entwurfswiederherstellung, Tastatur-Viewport und Leeren privater Ansichten bestehen. Auch Garten, Rezepte und Zuhause bestehen ihre Menü-/Viewport-Prüfung in Firefox.

Eine Firefox-Automationsmeldung bei einem erwarteten, bereits abgefangenen Navigator-Lock-Konflikt wurde mit einem minimalen nativen Beispiel eingeordnet: Tatsächliche Browser-Fehler- und Promise-Rejection-Ereignisse bleiben leer; Anmeldung und Aktualisierung funktionieren. Die produktive Sitzungssperre wurde deshalb nicht abgeschwächt.

Diese Prüfungen decken die Browsertechniken hinter Safari, Chrome/Edge und Firefox ab. Sie sind keine echten Gerätetests sämtlicher iOS-, Android-, Windows-, macOS- oder ChromeOS-Versionen. Bereits installierte Home-Bildschirm-Symbole werden vom Betriebssystem verwaltet; dessen Aktualisierungszeitpunkt lässt sich durch die Website nicht garantieren.
