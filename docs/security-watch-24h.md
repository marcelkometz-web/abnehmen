# 🔎 Zeitlich begrenzte Prüfung der Zugriffsprotokolle

Die GitHub Action **Private access check (24 hours)** ist vorbereitet und zunächst **inaktiv**. Sie sendet erst Anfragen, wenn beide unten genannten Einstellungen vorhanden sind. Ein grüner inaktiver Job bedeutet nicht, dass eine Überwachung läuft.

## Einmalig für 24 Stunden starten

1. In Supabase einen eigenen [Personal Access Token](https://supabase.com/docs/guides/platform/personal-access-tokens) erzeugen: nur für die beiden bestehenden Projekte `wwybkswpyoyowciumxda` und `kzxzhpebugvzyqfjqedx`, ausschließlich **Logs: Read / `analytics:read`**. Kein Organisations-Vollzugriff, kein Datenbank-Schreibrecht und kein `service_role`-Schlüssel. Eine möglichst kurze Ablaufzeit wählen. Falls sich diese Einschränkungen nicht wählen lassen, die Einrichtung prüfen, statt weitergehende Rechte zu vergeben.
2. Im GitHub-Repository **abnehmen → Settings → Secrets and variables → Actions → Secrets** ein Repository-Secret mit dem Namen **`SUPABASE_MONITOR_TOKEN`** anlegen. Den Token ausschließlich dort einfügen; niemals in den Chat, Quellcode oder eine Variable schreiben.
3. Unter **Variables** eine Repository-Variable **`SECURITY_WATCH_STARTED_AT`** anlegen. Wert: der tatsächliche aktuelle UTC-Startzeitpunkt, exakt `JJJJ-MM-TTTHH:MM:SSZ`, beispielsweise aus `new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')` in der Browserkonsole. Keinen zukünftigen Zeitpunkt eintragen.
4. Unter **Actions → Private access check (24 hours) → Run workflow** einmal starten und prüfen, ob **check_completed** oder **manual_review_needed** erscheint. **not_configured**, **waiting** oder ein fehlgeschlagener Lauf bestätigen keine funktionierende Überwachung.

Der Zeitplan versucht alle zehn Minuten einen Lauf. GitHub kann geplante Jobs verzögern oder auslassen; deshalb umfasst jede Abfrage erneut den gesamten Zeitraum seit Start. Ab Start + 24 Stunden werden nur noch bis zu eine Stunde lang Abschlussabfragen für denselben abgeschlossenen Zeitraum zugelassen. **Ab Start + 25 Stunden erfolgen keine API-Anfragen mehr.** Zum sofortigen Stoppen die Startvariable oder das Secret entfernen beziehungsweise den Workflow deaktivieren. Nach Abschluss den speziellen Token in Supabase widerrufen und das GitHub-Secret entfernen.

## Was geprüft wird

Die Abfrage liest ausschließlich vorhandene API-/Edge-Function-Protokolle der beiden erlaubten Projekte. Betrachtet werden Fehlerstatus, Aufrufe von Schlüssel-Verwaltungsendpunkten sowie direkte Pfade zu bekannten Secret-/Credential-/Vault-Bereichen. Die bekannten Namen werden als vollständige Pfad- oder Schemanamensbestandteile ohne Unterscheidung der Groß-/Kleinschreibung erkannt, beispielsweise `secrets`, `decrypted_secrets`, `rg_ai_credentials`, `rg_openai_credentials`, `ai_settings` und `vault`. Jeder so erkannte Aufruf löst eine manuelle Prüfung aus, sowohl bei erfolgreichem als auch bei abgewiesenem HTTP-Status. Die Pfade selbst werden nicht ausgegeben.

Bekannte normale 401-Antworten sind kein Beweis für einen Angriff. Schlüsselverwaltung einschließlich legitimer Statusabfragen, wiederholte abgewiesene Anmeldungen und Serverfehler können eine manuelle Prüfung auslösen; auch eigene erlaubte Aktionen können diese Hinweise verursachen.

**manual_review_needed** bedeutet: Die originalen Protokolle im privaten Supabase-Dashboard kontrollieren. **monitor_unavailable** bedeutet: Die Prüfung ist ausgefallen, etwa wegen Berechtigungen, Zeitüberschreitung, ausgeschöpftem Kontingent oder unerwarteter Antwort. Dieser Fall lässt den Job scheitern und darf nicht als unauffälliges Ergebnis gelten.

## Öffentlichkeit und Grenzen

In einem öffentlichen GitHub-Repository können die Workflow-Protokolle öffentlich sichtbar sein. Deshalb werden ausschließlich der bewusst konfigurierte Beobachtungszeitraum, die Anzahl geprüfter Projekte und ein allgemeiner Prüfstatus ausgegeben. Es gibt **keine Artefakt-Uploads**, keine IP-Adressen, Nutzerkennungen, Ereigniszeitpunkte, Request-Zahlen, Pfade, Fotos, Nachrichten, Rohantworten oder Tokens in der Ausgabe. Aggregierte Zählwerte werden nur während des Laufs im Arbeitsspeicher bewertet.

Es werden keine Konten gesperrt, keine Daten geändert, keine KI-Anfragen gestartet und keine externen Nachrichten verschickt. GitHubs eigene Benachrichtigungen richten sich nach deinen persönlichen GitHub-Einstellungen; diese Einrichtung sendet nicht automatisch WhatsApp- oder E-Mail-Meldungen.

Diese Prüfung erkennt keine hundertprozentige Fremdnutzung. Ein gültiges gestohlenes Konto, fehlende oder verspätete Protokolle, unbekannte oder anders codierte Endpunkte und ausgefallene GitHub-Jobs können unentdeckt bleiben. Bei generischen API-/Funktionsaufrufen ohne sensiblen Namen im protokollierten Pfad erkennt die Prüfung nicht, welche Daten intern angefordert wurden. Die Datenbank-Zugriffskontrollen sind weiterhin der eigentliche Schutz. Die Abschlussphase kann verspätete Protokolle erfassen, garantiert aber keine vollständige Protokollzustellung. Wiederholtes kumulatives Lesen kann Anbieterlimits beanspruchen; es wird kein kostenpflichtiger Tarif aktiviert.

Technik: Python-Standardbibliothek, verifiziertes HTTPS, feste Projektliste, 30 Sekunden Anfragezeitlimit, keine Weiterleitung des Tokens, maximal 24 Stunden je Abfrage. [Supabase-Logs-API](https://supabase.com/docs/reference/api/v1-get-project-logs).

Lokale Tests ohne Anbieterzugriff: `python3 -m unittest discover -s test -p 'security_watch_test.py'`.

## Prüfstand am 2. November 2026

Zehn isolierte Python-Tests bestanden: Zeitgrenzen, fehlende Konfiguration, HTTP-/Antwortfehler, Token-Redaktion, bekannte Secret-Pfade und allgemeine Prüfausgabe. Die finale Abfrage wurde regulär über die Supabase-Anbindung gegen beide echten Projektprotokolle erfolgreich ausgeführt. Die direkte Python-Anmeldung mit dem zukünftigen GitHub-Secret ist noch nicht möglich, solange dieser separate Zugang nicht hinterlegt wurde. Der erste konfigurierte Workflow-Lauf muss deshalb ausdrücklich überprüft werden.
