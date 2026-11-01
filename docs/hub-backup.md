# 🔐 Eine gemeinsame Sicherung für alle drei Apps

Die gemeinsame Startseite bietet eine zentrale Sicherungsansicht. Garten, Rezepte und Ramonas Weg sind zunächst ausgewählt. Der Benutzer kann den Umfang vor dem Export ausdrücklich ändern. Die ausgewählten Daten werden gemeinsam in eine einzige `.zuhause-backup`-Datei verschlüsselt. Die vorhandenen einzelnen Sicherungsfunktionen bleiben verfügbar.

## Gesicherter Inhalt

| Bereich | Inhalt |
| --- | --- |
| 🌱 Garten | Lesbare Pflanzen-/Sortendaten, Beete und Lagepositionen, Beetzuweisungen, Sortennotizen, Termine, eigene private Aufgaben, Familienforum mit Antworten und Erntetagebuch |
| 📷 Gartenbilder | Tatsächliche private Dateien der referenzierten Pflanzen-, Beet- und Erntefotos sowie des eigenen Gartenprofilfotos |
| 🥗 Rezepte | Vollständige bearbeitbare Rezeptfelder einschließlich unbekannter Nährwerte, Einkauf-/Familiennotizen und tatsächliche referenzierte Rezeptbilder |
| ♡ Geräteauswahl | Rezeptfavoriten des aktuellen Browsers; bei einer Wiederherstellung werden die bestätigten Rezeptkennungen zugeordnet und vorhandene Favoriten ergänzt |
| 💜 Ramonas Weg | Gewichte, Körpermaße, bestätigte Größe, Ziele und Profilangaben, Training, Übungsprotokolle, Zyklus und Wochenplan, private Fortschrittsfotos sowie verschlüsselte KI-Texte als Referenz |
| 📖 Referenz | Garteneinstellungen und ursprüngliche Autorenanzeigen/Zeitangaben des Gartenlebens, soweit der aktuelle Benutzer sie lesen darf |

Andere Benutzer behalten ihre privaten Aufgaben; diese werden nicht über deren Zugriffsrechte hinweg gesichert. Konto-/Familienmitgliedschaften, Anmeldepasswörter und Sitzungen, Freigabelisten, private API-Schlüssel, Dienstkonfiguration, öffentliche Profilfreigaben und serverinterne Verwaltungsprotokolle sind kein Bestandteil dieser persönlichen App-Datensicherung. Sie ist kein vollständiges Supabase-Systemabbild.

## Zugriff und Verschlüsselung

Nur das oberste, eindeutig gekennzeichnete gemeinsame App-Fenster darf die Funktion öffnen. Fremde Einbettungen und beliebige App-Pfade erhalten keine zentrale Schnittstelle. Die gemeinsame Garden-Anmeldung wird übernommen, ohne einen zweiten Client mit eigener Sitzungsverwaltung oder einer zweiten Refresh-Schleife anzulegen.

Das aktuelle Konto wird über den Auth-Server bestätigt. Zusätzlich gelten die aktive Sitzung, die explizite Freigabe für Ramonas gemeinsames Tagebuch, aktuelle Familienmitgliedschaft und App-Freigaben. Die bestehende Zehn-Minuten-Regel, Abmeldemarkierung und Passwort-Wiederherstellungssperre werden beachtet. Beim Schließen, Verlassen der sichtbaren App, Abmelden oder festgestellten Zugriffsentzug werden Passwörter, entschlüsselte Vorschau und offene Verbindungen verworfen. Während einer offenen ruhenden Vorschau wird die Serverfreigabe regelmäßig erneut geprüft.

Die Datei verwendet den gemeinsamen geprüften AES-256-GCM/PBKDF2-SHA256-Umschlag. Ein zufälliger Salt und IV gehören zu jeder neuen Datei. Das eigene Sicherungspasswort mit 12 bis 256 Zeichen wird ausschließlich im Browser benutzt. Daten und Bilddateien werden nicht in den lokalen Dauer- oder Offline-Speicher kopiert und nicht an einen fremden Exportdienst geschickt. Der Download enthält verschlüsselte Bytes. WebKit bekommt Blob, Objekt-URL und Link aus dem freigegebenen obersten App-Fenster; ein fremdes Elternfenster wird nie verwendet.

## Vorschau und Wiederherstellung

Die Datei wird zuerst lokal entschlüsselt, strukturell geprüft und anhand der SHA-256-Bildprüfsummen kontrolliert. Fehlende tatsächliche Bilddateien führen zum Abbruch; ein bloßer alter Dateipfad wird nicht als vollständiges Fotobackup ausgegeben.

Die zentrale Wiederherstellung ist an das Erstellerkonto, denselben Familiengarten und dasselbe private Tagebuch gebunden. Das verhindert, dass persönliche Aufgaben oder ein privates Tagebuch versehentlich in ein anderes Konto gelangen. Bestehende Verwaltungsrechte bleiben erforderlich: Ein freigegebenes Tagebuchkonto kann eine Datei erstellen, gemeinsame Garten-/Rezeptdaten werden weiterhin ausschließlich durch die Familienverwaltung wiederhergestellt.

Die Vorschau zeigt neue und erhaltene Datentypen. Bei Einkaufsnotizen kann sie zunächst eine Obergrenze anzeigen, weil die endgültige Wiedererkennung früherer Importe serverseitig erfolgt. Die tatsächlichen ergänzten Anzahlen erscheinen nach jedem erfolgreichen Schritt. Erst eine ausdrückliche Bestätigung beginnt die Schreibvorgänge.

Die Wiederherstellung ergänzt neue Daten, sie ersetzt und löscht keine vorhandenen App-Einträge. Pflanzen/Beete werden anhand bestehender natürlicher Kennungen zugeordnet; Aufgaben, Ernten und Forumeinträge erhalten stabile Herkunftszuordnungen. Original-Konto-IDs werden nicht als Schreibidentität verwendet. Vorhandene geschlossene Forumthemen werden weder geöffnet noch in Zeit-/Versionsangaben verändert. Fehlende Antworten darauf werden ausdrücklich übersprungen. Neue Themen können ihre archivierten Antworten erhalten und anschließend ihren archivierten geschlossenen Zustand bekommen. Neue Beiträge gehören dem tatsächlich angemeldeten Konto; die ursprünglichen Anzeigen bleiben Archivmaterial.

Ein fehlendes eigenes Gartenprofil wird ausschließlich privat neu angelegt. Ein bestehendes Profil, bestehende Garteneinstellungen, vorhandene Tagebucheinträge und vorhandene Rezepttitel werden erhalten. Garteneinstellungen sind bewusst eine lesbare Archivkopie; sie werden nicht automatisch über eine aktuelle Gartenplanung geschrieben. KI-Texte werden nicht als bestätigte Gesundheitsangaben oder Modellgedächtnis importiert.

Neue Rezeptkennungen werden aus der geprüften Serverantwort auf Rezeptfavoriten und neu importierte Wochenplan-Einträge übertragen. Neue Bilder erhalten neue private Speicherpfade. Rezeptbilder werden vorab registriert; eine Bereinigung darf ausschließlich eigene registrierte, noch nicht referenzierte Vorabdateien betreffen. Bei Gartenbildern werden nach bestätigtem Erfolg oder bekanntem Transaktionsfehler nur neue unreferenzierte Dateien entfernt. Bei unklarer Netzwerkantwort bleiben möglicherweise noch benötigte Dateien vorsichtshalber erhalten. Das kann eine spätere private Speicherbereinigung erforderlich machen, verhindert aber das Löschen von Bildern einer noch laufenden Transaktion.

## Teilfehler und Wiederholung

Die Apps nutzen zwei Datenbanken. Deshalb kann eine gemeinsame Wiederherstellung nicht eine einzige Datenbanktransaktion bilden. Garten, Rezepte und Tagebuch besitzen jeweils einen eigenen erkennbaren Ergebnisstand: erledigt, fehlgeschlagen oder ausstehend. Es gibt keine pauschale Erfolgsmeldung, solange ein ausgewählter Schritt fehlt.

Die Rezeptwiederherstellung besitzt transaktionale Vorgangsbelege und stabile Notizherkunft. Gleiche wiederholte Vorgänge überschreiben nichts und erzeugen keine zweite Kopie. Das gilt auch für zwei tatsächlich verschiedene gleichlautende Einkaufsnotizen: deren ursprüngliche Kennungen bleiben unterscheidbar. Der Garten verwendet additive Zuordnungen und Herkunftskennungen, das Tagebuch seine vorhandene additive Wiederherstellung mit Revisionsprüfung.

Nach einem Teilfehler werden die noch ausstehenden Schritte mit dem aktuellen Datenbestand neu geprüft. Bereits erledigte Bereiche bleiben erhalten. Wenn Rezepte für Wochenplanverknüpfungen noch fehlen, wartet der Tagebuchschritt auf die zugehörige Rezeptzuordnung. Die exportierte Originaldatei bleibt für eine erneute Prüfung verfügbar.

## Feste Grenzen

- 64 MiB verschlüsselte Gesamtdatei, 40 MiB tatsächliche Bilddaten und höchstens 1.200 Bilder über alle ausgewählten Bereiche
- Je Garten-/Profilfoto 256 KiB JPEG, je Rezeptbild 1 MiB JPEG/PNG/WebP, je Fortschrittsfoto 1 MiB JPEG
- Maximal 9.999 Einträge je Gartenkollektion, 2.000 Gartentermine, 1.000 Rezepte und 10.000 Einkaufsnotizen; die zusätzlichen Grenzen der Tagebuchsicherung bleiben wirksam
- Garten-Metadaten maximal 20 MB je Wiederherstellung, Rezept-Metadaten maximal 8 MB je zentralem Wiederherstellungsvorgang
- Der gemeinsame Verschlüsselungshelfer begrenzt zusätzlich JSON-Tiefe und Komplexität

Jede Grenze besitzt einen sichtbaren Abbruch. Es werden keine Daten heimlich gekürzt oder als erfolgreiche Teilsicherung ausgegeben. Große Bildbestände benötigen entsprechend Browser-Arbeitsspeicher.

## Implementierung und Prüfungen

Die neuen Module liegen unter `zuhause/src/hub-backup*.mjs`; Root erzeugt daraus das ausgelieferte `zuhause/hub-backup.js`. Das öffentliche Modul enthält ausschließlich die vorhandenen Publishable-Schlüssel und keine Servergeheimnisse. Die neuen Garden-Funktionen sind in `docs/hub-backup-garden-schema.sql` beschrieben; sie arbeiten als `SECURITY INVOKER` unter den bestehenden Spaltenrechten und RLS. Vor dem Snapshotvergleich sperrt die Wiederherstellung die betroffenen Tabellen gegen konkurrierende Schreibvorgänge, ohne neue Tabellen-Schreibrechte zu vergeben.

`zuhause/test/hub-backup.test.mjs` prüft die echte gemeinsame Verschlüsselungsrunde einschließlich tatsächlicher Bildbytes, fehlende Dateien, manipulierte Formate/Prüfsummen, numerische Fehleingaben, Pfad-/Kennungs-/Referenzprüfungen, additive Zuordnung, geschlossene Themen, Mehrfacheinkaufsnotizen, lokale Anmelderegeln und einen abgebrochenen Bild-Upload mit anschließendem Wiederholen.

`supabase/tests/hub-backup-garden.sql` verwendet ausschließlich zurückgerollte synthetische Daten und Storage-Metadaten. Er prüft alle Gartenbereiche, neue private Fotozuordnungen, privates Profil, unveränderte bestehende geschlossene Themen, neue geschlossene Themen mit Antworten, Wiederholung, Revisionskonflikte, falsches Konto/falsche Familie und deaktivierten/anonymen Zugriff. Dabei wird kein tatsächliches Benutzerfoto heruntergeladen.
