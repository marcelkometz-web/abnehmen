# Verschlüsselte Sicherungen für Garten und Rezepte

`zuhause/backup-envelope.js` wird nach der vorhandenen Shell-Bridge als klassisches Skript geladen. Es lädt die geprüften AES-GCM-/PBKDF2-Helfer aus `src/backup.mjs` erst bei Bedarf. Diese beiden Dateien müssen vor der Integration in Garten und Rezepte gemeinsam veröffentlicht sein.

- Export: `await window.privateBackup.download(appBackup, 'Meine_Sicherung.json')`.
- Import: `const value = await window.privateBackup.read(file)`, anschließend zwingend den bisherigen App-Importvalidator und die bestehende Vorschau/Bestätigung ausführen.
- Dateiauswahl: `.json,.private-backup,application/json,application/octet-stream`.
- Bei Abmelden oder Kontowechsel zusätzlich `window.privateBackup?.clear()` aufrufen. Ein laufender Vorgang wird damit verworfen; keine Datei wird danach heruntergeladen und kein entschlüsselter Rückgabewert ausgeliefert.

Die neue Datei ist binär und endet auf `.private-backup`. Sie ist kein Klartext-JSON. Inhalt und Authentizität werden mit AES-256-GCM geschützt; der Schlüssel wird aus einem separaten, zweimal eingegebenen Passwort mit PBKDF2-SHA256 und 310.000 Iterationen abgeleitet. Jede Datei verwendet ein neues zufälliges Salt und eine neue IV. Ohne das Sicherungspasswort kann die App die Sicherung nicht wiederherstellen. Das Passwort wird von der App weder gespeichert noch versendet. Es werden keine Anmeldedaten oder API-Schlüssel zum Backup ergänzt.

Der Helfer begrenzt Klartext-JSON auf 20 MiB, die binäre Datei auf 20 MiB plus 1 KiB Umschlag. Alte Klartext-JSON-Dateien bleiben importierbar; sie werden genauso wie entschlüsselte Dateien durch die bestehenden App-Validatoren geprüft. Verschlüsselung ersetzt keine fachliche Validierung oder Zugriffsprüfung. Die Garten-/Rezept-Sicherungen enthalten weiterhin nur die Daten, die die jeweilige App bisher exportiert; Fotos sind nicht automatisch eingeschlossen. Ramonas vollständige Tagebuch- und Fotowiederherstellung ist ein eigener Ablauf.

Das Passwortfenster verwendet einen nativen modalen Dialog, sperrt den Seitenhintergrund und leert seine Eingabefelder beim Schließen. Beim Wechsel in den Hintergrund, beim Ausblenden eines Hub-App-Fensters oder beim Verlassen der Seite wird ein laufender Vorgang abgebrochen. Die eingeblendeten Dialogtexte enthalten keine Daten aus der Sicherung.
