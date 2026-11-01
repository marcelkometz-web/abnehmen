# Korrektur der mobilen Tagebuch-Fußleiste

Die Neon- und Social-Schaltflächen hatten die bisher kompakte, feste Tagebuch-Fußleiste vergrößert. Mit angemeldetem Konto und sichtbarem KI-Tipp konnte sie dadurch fast den gesamten eingebetteten Bildschirm belegen. Auf schmalen Geräten wurden Beschriftungen senkrecht umgebrochen und Social-Schaltflächen rechts abgeschnitten. Die frühere Prüfung einzelner anklickbarer Links hatte den fehlenden Platz für die eigentlichen Eingaben nicht erfasst.

Hilfe, Impressum und Profile stehen jetzt am Ende des scrollbaren Inhalts in einem eigenen einspaltigen Bereich. Nur die kompakte KI-Anzeige bleibt unter dem Inhalt. Die mobilen Begrenzungen auf 46 bzw. 52 Prozent sind entfernt. Menü, unmittelbare Check-in-Eingaben und bestehende Zugriffsregeln bleiben erhalten.

Ein unabhängiger Prüflauf hat den Fehler zunächst mit synthetischen Messwerten und einem langen gespeicherten KI-Tipp reproduziert: Bei 390 × 844 Pixeln blieben im eingebetteten Hauptbereich nur 51 Pixel Höhe. Nach der Korrektur sind es 482 Pixel. Die Körperbreite wird zusätzlich zur Dokumentbreite kontrolliert, weil die bisherige Überlaufbegrenzung den Fehler bei einer reinen Dokumentprüfung verdeckt hatte.

Chromium und WebKit bestehen 320 × 740, 390 × 844, 430 × 932 und 844 × 390 Pixel in der gemeinsamen Oberfläche. Datum, Gewicht, Größe, Speichern sowie Hilfe-/Profil-Links sind erreichbar. Bildschirmfotos wurden oben und am Ende des Inhalts geprüft. Ein zusätzlich verkleinerter sichtbarer Bereich prüft den Eingabefokus; App-Wechsel, Entwurfswiederherstellung und Leeren privater Inhalte beim Abmelden bestehen ebenfalls. Die 23 vorhandenen Logik-Testdateien bestehen. Es wurden keine echten Konten, Fotos oder Messwerte für die Browserprüfung verwendet.
