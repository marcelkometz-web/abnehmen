# Sicherheits- und Datenbankprüfung · 2. November 2026

Geprüft wurden die produktiven Supabase-Projekte für Garten/Anmeldung/Tagebuch und Rezepte. Die folgenden Aussagen stammen aus neuen Abfragen dieser Prüfung. Keine echten API-Schlüssel, Tokens, privaten Foto-URLs oder Fotodateien wurden gelesen. Produktionsdaten, Benutzer, Mitgliedschaften und Anmeldesitzungen wurden nicht verändert.

## Ergebnis und ein bestätigter Befund

Die geprüften Zugriffsgrenzen für fremde/abgemeldete Konten funktionieren. Ein zusätzlicher Passwortschutz für **Schlüsseländerungen** war jedoch nur im neuen zentralen RPC durchgesetzt. Ältere Schlüssel-Setter ließen den berechtigten Familienbesitzer auch mit einer länger bestehenden Sitzung bis zur Schlüsselprüfung gelangen. Das gibt fremden Konten keinen Zugriff, schwächt aber den zusätzlich gewünschten Passwortschutz bei einer bereits übernommenen Besitzer-Sitzung.

Reproduktion: eine vorhandene Besitzer-Sitzung wurde ausschließlich innerhalb einer zurückgerollten SQL-Prüfung mit einem einen Tag alten Passwort-AMR und einem absichtlich ungültigen Schlüssel verwendet. `rg_set_ai_provider_key` erreichte die Formatprüfung (`22023`), `rg_hub_set_ai_key` wies dieselbe alte Bestätigung ab (`42501`). Es wurde dabei kein Schlüssel gespeichert oder entfernt.

Die Korrektur ist produktiv angewendet und geprüft:

- Migration `supabase/migrations/20261102022315_enforce_recent_password_on_ai_credentials.sql` im Abnehmen-Repository und derselbe Eintrag im produktiven Migrationsverlauf.
- Gemeinsamer serverseitiger Guard am tiefsten Änderungsweg für Gemini, OpenAI und den bisherigen Tagebuchzugang: aktive Sitzung, freigegebener tatsächlicher Familienbesitzer, signierte Passwortbestätigung höchstens fünf Minuten alt.
- Statusabfragen und Anbieterpräferenzen behalten ihre bisherigen Rechte.
- Zentraler geschützter Entfernen-Aufruf mit `p_key: null`; bei OpenAI wird der bisherige Tagebuchschlüssel in derselben Transaktion mit entfernt.
- Keine Erweiterung der Mitgliederfreigabe: beide derzeitigen Gartenkonten mit Besitzerrolle sind bereits Tagebuch-freigegeben; Schlüsselverwaltung prüft zusätzlich wie bisher `rg_families.owner_id`.

**Produktiv bestätigt durch Root:** Nach der erfolgreichen vollständig zurückgerollten Preview führte Root die identische Migration über einen regulär freigegebenen `apply_migration`-Aufruf aus. Produktionsversion: `20261102022315`. Danach bestand `ai-credential-step-up.sql` auch gegen den tatsächlich aktualisierten Datenbankstand vollständig und wurde zurückgerollt. Der erneute Security-Advisor meldet nur die bereits bekannten Hinweise. Ein anfänglicher Kontingentfehler bei der automatischen Prüfung des Unteragenten wurde damit über die reguläre Freigabeprüfung aufgelöst; kein ungeprüfter Umgehungsweg wurde verwendet. Keine Schlüsselwerte, Mitgliedschaften oder Auth-Einstellungen wurden verändert.

## Neu geprüfte Schutzmaßnahmen

| Prüfung | Neues Ergebnis |
| --- | --- |
| Öffentliche Tabellen | Garten: 27/27, Rezepte: 9/9 mit aktivierter RLS |
| Öffentliche Views | Keine in beiden Projekten; dadurch kein übersehener View-Bypass in diesem Schema |
| Tagebuchfreigabe | Genau zwei aktivierte Konten, ein gemeinsames Tagebuch, keine verwaiste Benutzerreferenz |
| Fotobuckets | Alle fünf privat; Tagebuch nur JPEG, maximal 1 MiB |
| Tagebuchfoto-Richtlinien | Benutzerordner wird gegen aktuelles freigegebenes Tagebuch geprüft; zusätzliche restriktive Regeln für anonymen Zugriff und signierte Links/Kopieren/Verschieben vorhanden |
| Sessionbindung | Die SQL-Prüfung verlangt eine vorhandene `auth.sessions`-Sitzung zum Benutzer und ein gültiges `not_after` |
| Datenbank-Definerfunktionen | Alle geprüften app-eigenen Definerfunktionen mit festem `search_path`; keine Autorisierung über veränderbares `user_metadata` |
| API-Key-Lesen | Schlüssel lesende RPCs für `anon` und `authenticated` gesperrt; echte Werte nicht abgerufen |
| Freigabeliste ändern | Browserrolle hat keine INSERT/UPDATE/DELETE-Rechte auf `ab_access` |
| Rezeptspeicher | Direkter Tabellenzugriff auf Rezepte/Notizen und direkten Backup-RPC aus Browserrollen gesperrt; Zugriff erfolgt über geprüftes Backend |
| Recipe-HTTP-Extension | Direkter Zugriff aus beiden Browserrollen scheitert an fehlender `public`-Schema-USAGE; kein externer HTTP-Aufruf ausgeführt |
| Statische Schlüsselprüfung | 238 versionierte Textdateien über drei Repositories: keine verdächtigen Service-Role-JWTs oder realistisch geformten geheimen API-Key-Literale gefunden. Musterprüfung ist keine vollständige Geheimniserkennung. |

Die Prüfung umfasste echte SQL-Rollenwechsel innerhalb von Rollback-Transaktionen, ohne Testbenutzer oder Sitzungen anzulegen:

1. Ein vorhandenes berechtigtes Konto sieht genau das gemeinsame Tagebuch, keinen fremden Bestand.
2. Schlüssel-Lese-RPC ist auch für dieses Konto gesperrt.
3. Eine bekannte freigegebene Benutzer-ID mit nicht vorhandener Sitzungs-ID bekommt keine Zeilen aus zwölf ausgewählten privaten Tabellen und keinen Zugriff auf private Objektmetadaten.
4. Ein nicht freigegebenes Konto mit erfundenen `user_metadata`-Adminangaben bekommt kein Tagebuch.
5. Anonymes Lesen privater Tagebuchzeilen und Foto-Metadaten wird verhindert.
6. Beide Browserrollen können im Rezeptprojekt weder Rezept-/Notizzeilen noch private Bildmetadaten, Server-Backup-RPC oder HTTP-Extension direkt lesen/aufrufen.

Der neue Test `supabase/tests/ai-credential-step-up.sql` lief zusammen mit der Migration in der zurückgerollten Preview und anschließend durch Root gegen den tatsächlich migrierten Produktionsstand erfolgreich. Er prüft fehlendes, leeres, falsch geformtes, abgelaufenes, zukünftiges und nicht passwortbasiertes AMR an den öffentlichen und internen Setzen-/Entfernen-Einstiegen. Ein aktuell bestätigter tatsächlicher Besitzer erreicht weiterhin die normale Formatprüfung. Abgelaufene Sitzungen, der andere freigegebene Benutzer ohne tatsächliche Familieninhaberschaft und anonyme Aufrufe werden abgewiesen. Status bleibt lesbar. Für diese Produktionsprüfung wurden nur absichtlich ungültige Schlüsselkandidaten benutzt; tatsächliches Speichern und Entfernen echter Schlüssel war ausdrücklich kein Testschritt.

## Datenintegrität

Alle folgenden Prüfungen lieferten **null problematische Treffer**:

- doppelte Wiegetage oder Maßtage je Tagebuch;
- doppelte normalisierte Katalognamen/Sorte je Familie;
- doppelte normalisierte Rezepttitel, leere Titel oder ungültige Revisionen;
- negative Nährwerte sowie nicht endliche Werte bei Energie/Protein/Kohlenhydraten/Fett;
- fehlende Dateimetadaten zu referenzierten Tagebuch-, Garten- oder Rezeptbildern;
- Tagebuch-Dateimetadaten ohne zugehörigen Tagebucheintrag;
- familienfremde Pflanzen-/Beetverweise in Pflanzungen, Aufgaben, Ereignissen oder Ernten;
- verwaiste wiederhergestellte Notizzuordnungen;
- nicht validierte Constraints in den geprüften App-Schemas.

Bestand: **838 Katalogpflanzen und 604 Rezepte**. Die Fotoabgleiche vergleichen nur Datenbank-/Storage-Metadaten. Sie prüfen keine Bilddateibytes auf Darstellbarkeit oder Beschädigung.

Zusatzprüfung Systemnotizen: zwei kanonische `SYSTEM…`-Autoren, kein gespeicherter Autor mit vorangestelltem Leerraum vor `SYSTEM`. Die unterschiedliche Normalisierung im Boot-Filter und in den Änderungsfiltern wurde an Root/Rezepte zur defensiven Angleichung gemeldet; derzeit kein entsprechend inkonsistenter Bestand.

## Protokollprüfung der vergangenen 24 Stunden

Die Prüfung erfasste nur technische Metadaten und aggregierte Ergebnisse. Keine IP-Adressen, Benutzerkennungen, E-Mails, URL-Parameter, Header, Schlüsselwerte oder Anfragetexte wurden gelesen. Einzelne Aktivitätszahlen werden in diesem öffentlichen Bericht nicht veröffentlicht.

Abgewiesene Authentifizierungs-/API-Anfragen und erfolgreiche Verwaltungsaufrufe waren sichtbar. Daraus lässt sich ohne weitere Zuordnung keine fremde Herkunft ableiten. Es gab in der abgefragten Auswahl keine HTTP-5xx-Fehler und keinen Nachweis eines erfolgreichen fremden Schlüsselabrufs. Fehlende Protokollhinweise beweisen keine vollständige Angriffsfreiheit. Datenbankfehler mit Verwaltungs-/Testmarkern wurden von Appfehlern unterschieden.

## Dauerhafte 24-Stunden-Überwachung

Es wurde durch diesen Agenten **kein dauerhaft laufender Monitor aktiviert**. Ein Chat-Agent ist kein verlässlicher Hintergrunddienst nach Ende des Chats. Im Gartenprojekt sind `pg_cron` und `pg_net` derzeit nicht installiert. Eine reine Datenbank-Abfrage der Auth-Audits würde zudem abgewiesene REST-/RPC-Keyzugriffe außerhalb der Datenbankausführung nicht vollständig erfassen.

Für einen zeitbegrenzten GitHub-Action-Monitor ist die aktuelle, dokumentierte Schnittstelle:

`GET https://api.supabase.com/v1/projects/{ref}/analytics/endpoints/logs`

Parameter: `sql`, `iso_timestamp_start`, `iso_timestamp_end`. ClickHouse-SQL; explizites Fenster maximal 24 Stunden, ohne Zeitangaben standardmäßig nur eine Minute. Der alte `logs.all`-Endpunkt wurde am 23. September 2026 entfernt. Benötigt wird ein auf diese Projekte beschränkter Management-PAT mit **Logs: Read** beziehungsweise OAuth-Scope `analytics:read`. Ein App-Publishable-Key oder Project-Service-Role-Key ersetzt diesen Managementzugang nicht. MCP-OAuth-Zugang darf nicht ausgelesen oder als Workflow-Geheimnis kopiert werden.

Root/Hub-Agent bereiten dafür einen zunächst inaktiven Workflow mit separatem GitHub-Secret und hartem Start-/Endzeitfenster vor. Ohne regulär hinterlegten Zugriff und aktiviertes Zeitfenster darf er nicht als laufende Überwachung bezeichnet werden. Ein geplanter Workflow kann sich verzögern; Logverfügbarkeit/-verzögerung und ein offenes Zeitfenster zwischen Ausführung und Logeingang bleiben zu berücksichtigen. Er erkennt auffällige technische Muster, keine garantierte Identität eines Angreifers, keinen bereits kompromittierten berechtigten Benutzer und keine Aktivitäten außerhalb der abgefragten Supabase-Logs.

## Verbleibende Hinweise

Die neuen Supabase-Advisors melden weiterhin dieselben bekannten Punkte:

- [Leaked Password Protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) ist im Auth-Projekt deaktiviert. Kein kostenpflichtiger Plan oder Auth-Schalter wurde geändert.
- [HTTP-Extension im öffentlichen Schema](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) im Rezeptprojekt. Die direkte Browser-Erreichbarkeit wurde zusätzlich tatsächlich geprüft und ist gesperrt.
- [RLS ohne Policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) auf serverinternen Tabellen ist hier die beabsichtigte Sperre, keine nachträglich zu öffnende Freigabe.
- Ein fehlender Fremdschlüsselindex auf der sehr kleinen internen AI-Settings-Tabelle und unbenutzte Indizes werden als Performance-Information gemeldet. Kein belegter aktueller Engpass; keine vorsorgliche Indexlöschung.

Geprüfte Supabase-Dokumentation: [Logs-API](https://supabase.com/docs/reference/api/v1-get-project-logs), [Personal Access Tokens](https://supabase.com/docs/guides/platform/personal-access-tokens), [Logs-Endpunktumstellung](https://supabase.com/changelog/48235-migration-of-supabase-management-api-logs-all-analytics-endpoint-to-logs-endpoint), [Changelog](https://supabase.com/changelog.md). Im aktuellen Changelog betrifft die angekündigte TLS-Verschärfung vom 10. November sehr alte TLS-Clients; die genannten modernen Browserplattformen sind nicht als betroffene Altclients identifiziert. Keine Infrastruktur-Upgrades wurden ohne Anlass vorgenommen.

Diese Prüfung ist keine Garantie, dass keinerlei weitere Sicherheitslücke existiert. Sie ersetzt weder unabhängigen Penetrationstest noch einen realen Foto-/Backup-Restoretest mit absichtlich angelegtem Testbestand. Supabase-Projektadministratoren bleiben technisch privilegiert; die Fotos sind nicht Ende-zu-Ende gegen den Betreiber verschlüsselt.
