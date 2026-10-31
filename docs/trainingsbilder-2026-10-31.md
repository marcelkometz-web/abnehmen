# Tube-Trainingsbilder

Alle zehn Tube-Übungen besitzen ein Bildpaar mit Ausgangsposition und Bewegungsphase. Sechs Illustrationen wurden bereitgestellt; vier weitere wurden auf ausdrücklichen Wunsch erzeugt und gegen die vorhandenen Übungsschritte visuell geprüft. Die Prüfung bestätigt die erkennbare Bewegungsrichtung, nicht die tatsächliche Belastbarkeit einer Befestigung oder die individuelle Übungstechnik.

| Übung | Bildquelle | Sichtbare Zuordnung |
|---|---|---|
| Kniebeuge mit Tube-Griffen | Bereitgestelltes Bild 1 | Aufrechter Stand und kontrollierte Kniebeuge. |
| Hüftbeuge mit Tube-Griffen | Bereitgestelltes Bild 2 | Hüftbeuge mit nahe an den Beinen geführten Griffen. |
| Vorgebeugtes Rudern mit Tubes | Bereitgestelltes Bild 3 | Griffe zu den unteren Rippen; die Textanleitung erläutert die kontrollierte Ellenbogenführung. |
| Brustpresse mit Griffen | Bereitgestelltes Bild 4 | Griffbewegung vom Körper weg gegen den rückwärtigen Zug. |
| Bizepsbeugen mit Tube-Griffen | Bereitgestelltes Bild 5 | Unterarmbeugung bei ruhigem Stand. |
| Seitliches Schulterheben mit Tubes | Bereitgestelltes Bild 6 | Etwas nach vorn versetzte Variante entsprechend der bestehenden Anleitung. |
| Trizeps-Kickbacks mit Griffen | Neue KI-Demonstration | Oberarme/Ellenbogen weitgehend unverändert, Bewegung überwiegend durch Strecken der Unterarme. |
| Pallof-Presse gegen Drehung | Neue KI-Demonstration | Seitlicher Bandzug, nach vorn geführte Hände und ruhig ausgerichteter Rumpf. |
| Gesäß-Kickback mit Manschette | Neue KI-Demonstration | Blick zum vorderen tiefen Anker; das weitgehend gestreckte Bein bewegt sich davon weg. |
| Seitliches Beinheben mit Manschette | Neue KI-Demonstration | Äußeres Bein bewegt sich seitlich vom Anker weg; der Oberkörper bleibt aufrecht. |

Die drei ursprünglich gelieferten Darstellungen für Trizeps, Pallof und Kickback wurden wegen abweichender Armbewegung bzw. Zugrichtung nicht als Anleitungsbilder übernommen. Für das fehlende seitliche Beinheben wurde eine vierte Illustration ergänzt. Die fertigen neuen Bildpaare sind in Alttext und sichtbarer Bildunterschrift als KI-Demonstration gekennzeichnet. Sie wurden mit dem Bildwerkzeug erzeugt; die App löst dadurch keine automatischen Bildanfragen aus und keine serverseitig hinterlegten API-Schlüssel wurden ausgelesen.

## Darstellung und Dateien

- Beide Bewegungshälften und der vollständige Bildinhalt bleiben erhalten. In der Detailansicht werden Bilder zunächst eingepasst; „Bild vergrößern“ und „Bild einpassen“ wechseln die Darstellung im selben Fenster.
- Die sechs bereitgestellten Hochformate liegen als WebP in 360 und 714 Pixel Breite vor; die Originalgröße beträgt 714×1280 Pixel. Zusammen benötigen die großen Fassungen 350.366 Byte gegenüber 919.747 Byte für die gelieferten JPEGs; die kleinen Fassungen benötigen 130.960 Byte.
- Die vier neuen Querformate wurden mit 1536×1024 Pixeln erzeugt. Die App verwendet WebP in 360×240, 720×480 und 1200×800 Pixeln. Zusammen benötigen die großen Fassungen 293.746 Byte gegenüber 8.052.886 Byte für die PNG-Quellen. Kleine Fassungen benötigen 51.464 Byte, mittlere 140.240 Byte.
- Eingebettete EXIF-/XMP-/IPTC-Metadaten der Quelldateien werden nicht übernommen. Browser wählen die passende Größe; Vorschaubilder verwenden Lazy Loading und asynchrone Dekodierung. Eine Hochskalierung findet nicht statt.
- Die Dateien sind öffentliche allgemeine Trainingsillustrationen. Private Fortschrittsfotos liegen weiterhin ausschließlich in der geschützten Galerie; ihre Datenbank-/Storage-Regeln wurden nicht geändert.

## Prüfung

Die Zuordnung, das Dekodieren sämtlicher zehn Bildpaare, vollständige Anleitungen, KI-Kennzeichnung, Vergrößern/Einpassen und die Darstellung bei 320×740, 390×844, 844×390 sowie 1280×900 wurden in Chromium und WebKit geprüft. Vorhandene Mini-/Flachbandbilder bleiben verfügbar. Zusätzlich bestehen die Node-Tests der App. Echte Geräteprüfungen aller Betriebssysteme sind damit nicht zugesichert.

Die bei der vorherigen Bildprüfung korrigierte feste Menüleiste bleibt in kurzen Querformat-Ansichten kompakt. Passende Scroll-Abstände halten Übungsknöpfe erreichbar. Für die tatsächliche Montage gelten die Herstelleranleitung, eine geeignete verriegelte Tür und ein freier Bandverlauf; ein gerendertes Bild bestätigt diese Bedingungen nicht.
