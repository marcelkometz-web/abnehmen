# 🔐 Persönliche Sicherung und Wiederherstellung

Die neue Sicherungsseite erstellt eine passwortverschlüsselte Datei direkt im Browser. Die Datei wird ausschließlich auf ausdrücklichen Knopfdruck zum Download übergeben. Es gibt keinen E-Mail-Versand, keine öffentliche Foto-Adresse und keinen Export zu einem fremden Dienst.

## Inhalt

- Gewichtstage und Körpermaße einschließlich Notizen
- Bestätigte Körpergröße und freiwillige Profil-/Zielangaben einschließlich Zielstart
- Trainingseinheiten und einzelne Übungsprotokolle
- Freiwillige Zykluseinträge
- Gemeinsamer Wochenplan einschließlich ausgewählter Rezeptzutaten
- Private Fortschrittsfotos als tatsächliche JPEG-Dateien, nicht als ablaufende Links
- KI-Chat und Tipps als verschlüsselte Lesereferenz

API-Schlüssel, Supabase-Zugriffsschlüssel, Passwörter, Anmeldesitzungen und serverinterne Konfiguration werden nicht exportiert. KI-Texte werden bei einer Wiederherstellung nicht als bestätigte Gesundheitsangaben oder als vertrauenswürdiges Modellgedächtnis importiert. Sie bleiben in der verschlüsselten Sicherungsdatei erhalten.

## Verschlüsselung

AES-256-GCM verschlüsselt den gesamten JSON-Inhalt einschließlich Fotos und authentifiziert den Versions-/Algorithmuskopf. PBKDF2-SHA256 mit 310.000 Durchläufen und einem zufälligen 16-Byte-Salt leitet den Schlüssel aus dem eigenen Sicherungspasswort ab. Jede Datei erhält einen neuen zufälligen 12-Byte-IV. Der Schlüssel ist nicht exportierbar. Das Passwort wird weder gespeichert noch an die Datenbank oder einen Server übertragen.

Das Sicherungspasswort besitzt 12 bis 256 Zeichen und ist unabhängig vom Anmeldepasswort. Es kann nicht zurückgesetzt werden. Datei und Passwort sollen getrennt aufbewahrt werden. Die App kann die Übergabe an den Browser bestätigen; ob der Browser den Download tatsächlich auf dem Gerät speichert, muss der Nutzer prüfen.

## Wiederherstellung

1. Sicherungsdatei auswählen und lokal mit ihrem Passwort entschlüsseln.
2. Aktuelles Konto, explizite Tagebuchfreigabe und Speicherrevision serverseitig prüfen.
3. Vorschau zeigt neue und übersprungene Einträge je Datentyp sowie den Datumsbereich. Bis hier gibt es keine Schreibzugriffe.
4. Erst die ausdrückliche Bestätigung übernimmt neue Einträge in das aktuell freigegebene Tagebuch. Konto- und Zeilenkennungen aus der Datei werden nicht übernommen.
5. Neue Fotos erhalten neue zufällige Kennungen im privaten Ordner des aktuellen Tagebuchs. Danach schreibt ein einzelner SQL-Aufruf sämtliche Metadaten atomar und unter der bestehenden RLS.

Vorhandene Gewichts-, Mess- und Zyklustage werden vollständig erhalten und übersprungen; die Wiederherstellung mischt keine einzelnen Felder eines vorhandenen Tages. Das gilt ebenso für ein vorhandenes Übungsprotokoll derselben Übung am selben Tag. Vorhandene Körpergröße und Profilangaben werden nicht verändert. Gleiche Trainingseinheiten und Planeinträge werden nach ihrer Anzahl verglichen, damit zwei tatsächlich dokumentierte gleiche Einheiten nicht zu einer zusammenfallen. Fotos werden anhand von Datum, Ansicht, Notiz und SHA-256-Inhaltsprüfsumme verglichen.

Zwischen Vorschau und Bestätigung geänderte Daten führen zum Abbruch und erfordern eine neue Vorschau. Die SQL-Transaktion übernimmt entweder alle vorgesehenen Metadaten oder keine. Beim Fehlschlag werden ausschließlich neu angelegte, weiterhin unreferenzierte Fotoobjekte bereinigt. Wenn eine Netzwerkantwort verloren geht, wird vor einer Bereinigung geprüft, ob die neuen Fotometadaten bereits gespeichert wurden. Bei unklarer Lage werden keine möglicherweise benötigten Fotos gelöscht; die App fordert eine erneute Prüfung an. Ein solcher unklarer Upload kann einen privaten, nicht öffentlichen Speicherrest hinterlassen, dessen Bereinigung separat erfolgen muss.

## Grenzen

Die Browser-Sicherung besitzt feste Speichergrenzen: 64 MiB pro verschlüsselter Datei, 40 MiB tatsächliche JPEG-Daten, 300 Fotos, 20.000 strukturierte Tagebucheinträge und höchstens 20.000 KI-Nachrichten. Bei Überschreitung wird der komplette Export abgebrochen, statt unbemerkt Daten wegzulassen. Die Originaldaten bleiben unverändert. Die App erzeugt keine unverschlüsselte Zwischendatei; die Verarbeitung benötigt jedoch Arbeitsspeicher im angemeldeten Browser.

Dies ist eine zusätzliche persönliche Datenkopie, kein vollständiges Supabase-Serverabbild. Sie ersetzt weder die serverseitige Sicherung noch die Wiederherstellung von Auth-Konten, RLS-Regeln, Edge Functions, Rezept-/Garten-Datenbanken oder dem serverseitigen API-Schlüssel. Die bestehenden Garten-/Rezept-Sicherungen können den gemeinsamen JSON-Verschlüsselungshelfer verwenden, benötigen aber weiterhin ihre eigene Importprüfung.

## Prüfungen

`node --test test/backup.test.mjs` prüft echte WebCrypto-Ver- und Entschlüsselung, Passwortfehler, manipulierte/abgeschnittene Dateien, neue Salts/IVs, Fotoprüfsummen, Größen-/Formatgrenzen, das Entfernen fremder Kennungen, additive Vorschauen, erhaltene Mehrfacheinträge, private Uploadziele, Bereinigung nach Upload-/SQL-Fehlern, verlorene Bestätigungen und gesperrte veraltete/inaktive Vorgänge.

`supabase/tests/backup-restore.sql` ist ein vollständig zurückgerollter Datenbanktest für die tatsächlichen Spaltenrechte und RLS. Er prüft alle Datentypen einschließlich Profil/Zielstart, Wochenplan, Übungsprotokoll und privater Foto-Metadaten, unveränderte vorhandene Werte, stale-write-Abweisung, atomaren Rücklauf bei einer ungültigen Zeile sowie beide freigegebenen Konten, ein deaktiviertes Konto und anonymen Zugriff. Für den Test werden keine tatsächlichen Fotos heruntergeladen und keine echten Passwörter verwendet.

Die SQL-Implementierung liegt in `docs/backup-restore-schema.sql` und wird nach den beiden neuen Plan-/Übungs-Tabellen eingesetzt. Der Wrapper arbeitet als `SECURITY INVOKER`, prüft die aktuelle Tagebuchzuordnung, sperrt die Revision und unterliegt den bestehenden Tabellen-/Storage-Regeln. Er erweitert keine Tagebuchfreigabe und erzeugt keine signierten Foto-Links.
