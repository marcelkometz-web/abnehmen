# Erneute Sicherheits- und Datenbankprüfung am 28.10.2026

In den geprüften Zugriffspfaden wurde kein unberechtigter Zugriff auf das private Tagebuch gefunden. Die Datenbanktests für Speichern, Ändern, Löschen, Datumszuordnung und konkurrierende Änderungen bestanden. Eine zusätzliche Sperre gegen weitergebbare Speicher-Links und direkte Kopien privater Fortschrittsfotos ist aktiv.

## Geprüfter Live-Zustand

| Prüfung | Ergebnis |
|---|---|
| Tagebuchfreigabe | Genau zwei aktiv freigegebene Konten, ein gemeinsames Tagebuch. Andere Garten-/Rezepte-Konten erhalten dadurch keine Freigabe. |
| Datenbankregeln | Alle elf öffentlichen Abnehmen-Tabellen und beide privaten KI-Tabellen haben RLS aktiviert. Keine Abnehmen-Ansicht umgeht diese Regeln. Keine öffentliche SECURITY-DEFINER-Funktion im geprüften Projekt. |
| Sitzungen | Ungültige, widerrufene und abgelaufene Sitzungen bleiben ausgeschlossen. Die Freigabe stützt sich auf serverseitige Tabellen und aktuelle Auth-Sitzungen. |
| Fotospeicher | Privater Bucket, maximal 1 MiB pro JPEG, zufällige Dateinamen im zugeordneten Tagebuchordner. Anonyme und nicht freigegebene Konten sehen keine Einträge. |
| Datenkonsistenz | Zum Prüfzeitpunkt 0 private Fotodateien und 0 Fotoeinträge; keine verwaisten Dateien oder Einträge. |
| Anbieter-Schlüssel | Verschlüsselter Schlüsselverweis vorhanden. Browser und anonyme Clients dürfen weder Vault-Inhalte noch die serverseitige Lesefunktion auslesen. Der Schlüssel wurde für die Prüfung nicht entschlüsselt oder als echte Anbieteranfrage benutzt. |
| Laufende Anwendung | Die ausgelieferten Dateien index.html, app.js und layout.css entsprachen dem geprüften Quellstand. Erneuter Build erfolgreich. |
| Abhängigkeiten | npm audit für Produktionsabhängigkeiten: 0 gemeldete Sicherheitslücken. |
| Öffentlicher Code | In 109 Text-Blobs der Git-Historie keine Treffer bei der Suche nach typischen privaten Anbieter-Schlüsseln, privaten Schlüsseldateien und service_role-JWTs. Diese Mustersuche ersetzt keine Garantie für beliebige Geheimnisformate. |

## Zusätzliche Absicherung der Fotos

Private Dateien lassen sich bei Supabase grundsätzlich auch über zeitlich signierte Links freigeben. Ein solcher Link könnte nach Weitergabe bis zum Ablauf ohne erneute Anmeldung verwendet werden. Die App selbst verwendet authentifizierte Downloads und lokale Blob-Adressen.

Die neue restriktive Policy `ab_photos_no_bearer_links` verhindert für reguläre Clients das Erstellen einzelner oder mehrerer signierter Foto-Links, signierter Upload-Links und signierter Bildtransformationen. Außerdem sperrt sie direkte Kopier-/Verschiebeoperationen aus diesem Bucket. Die Regel gilt zusätzlich zur Kontofreigabe und zum privaten Bucket.

Die Policy wurde zuerst innerhalb einer vollständig zurückgerollten Transaktion geprüft, dann als Migration angewendet und erneut getestet. Die Prüfungen bestätigen:

- Authentifizierte Lese-, Upload- und Löschvorgänge behalten die benötigten Rechte für die beiden freigegebenen Konten.
- Signier- und Kopieroperationen erhalten keine Dateieinträge; signierte Uploads werden abgewiesen.
- Garten-Buckets behalten ihre bisherigen Berechtigungen.
- Nicht freigegebene und anonyme Konten erhalten keinen Fotozugriff.
- Das bewusst ausgewählte Teilen als exportierte JPG-Vorschau bleibt verfügbar.

Nachweis: `supabase/tests/photo-operations.sql` und Migration `20261028090043_abnehmen_no_photo_bearer_links.sql`.

## Funktions- und Zugriffstests

Erneut ausgeführt: alle neun Node-Testdateien sowie die PostgreSQL-Tests `shared-access.sql`, `wellbeing.sql`, `password-checkin.sql` und `photo-operations.sql`.

Diese prüfen unter anderem gemeinsame Nutzung durch die zwei Konten, gesperrte Konten, anonyme Zugriffe, fremde Fotoordner, verhinderte Selbstfreigabe, serverseitige Speicherzeitpunkte, zurückgewiesene veraltete Änderungen, atomare Check-ins, erhaltene Notizen und Maße, wiederholte Trainingseinträge und erhaltene Periodenenddaten. Alle Transaktions-Testdaten wurden zurückgerollt; die abschließende Prüfung fand keine hinterlassenen Testeinträge.

Neun zusätzliche HTTP-Prüfungen ohne Anmeldung lieferten keine privaten Daten: authentifizierter und öffentlicher Dateipfad, Bildtransformation, Dateiliste, Signier-Endpunkte, Foto-Datenbank, Tagebuch-RPC und KI-Endpunkt. Die Dateiliste war leer; Datenbank und KI verweigerten den Aufruf. Die Dateipfade verwendeten erfundene Dateinamen. Der Zugriff auf vorhandene Einträge wurde zusätzlich mit den oben genannten Transaktions-Testdaten auf Datenbankebene geprüft.

In den ausgewerteten Abnehmen-Datenbank-/Foto-HTTP-Logs der vorherigen 24 Stunden wurden keine 5xx-Antworten gefunden. Das ist eine begrenzte Zustandsprüfung und keine vollständige historische Einbruchsanalyse.

## Offene Punkte und technische Grenzen

- **Prüfung geleakter Passwörter:** Supabase meldet weiterhin `Leaked Password Protection Disabled`. Das ist eine projektweite Auth-Einstellung des gemeinsam genutzten Projekts. Sie wurde bei dieser Prüfung nicht verändert. [Supabase-Hinweise](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Die zwei INFO-Meldungen über fehlende Policies auf den privaten KI-Tabellen beschreiben hier den absichtlich gesperrten Browserzugriff.
- Da noch keine echten Fortschrittsfotos gespeichert sind, wurde kein echtes privates Foto hochgeladen oder heruntergeladen. Die Datenbank-/Berechtigungsprüfung verwendete ausschließlich vorübergehende Dateimetadaten. Ein echter iPhone-Upload und eine tatsächliche OpenAI-Antwort waren nicht Teil dieser erneuten Prüfung.
- Berechtigte Personen können angezeigte Bilder herunterladen, bewusst teilen oder Bildschirmaufnahmen anfertigen. Projektadministratoren und serverseitige Service-Schlüssel behalten technisch privilegierten Zugriff. Eine absolute Zugriffsgarantie oder Ende-zu-Ende-Verschlüsselung bietet diese Architektur nicht.
- Die gemeinsame Browseranmeldung verbindet die Vertrauensgrenze von Garten, Rezepte und Abnehmen. Die Sicherheit aller drei Anwendungen und der Kontozugänge bleibt relevant.

Quellen: [Storage-Zugriffsschutz](https://supabase.com/docs/guides/storage/security/access-control), [private Downloads und signierte Links](https://supabase.com/docs/guides/storage/serving/downloads), [operationabhängige Storage-Regeln](https://supabase.com/docs/guides/storage/schema/helper-functions).
