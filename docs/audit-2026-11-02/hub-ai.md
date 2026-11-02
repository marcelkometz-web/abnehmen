# Prüfung der zentralen KI-Zugänge · 2. November 2026

## Ergebnis

Die gesonderte Passwortfreigabe in „Unser Zuhause“ ist nun an die konkrete Hauptsitzung gebunden. Verzögerte Antworten dürfen eine inzwischen geschlossene oder neu angemeldete Ansicht nicht weiterverwenden. Nicht übernommene temporäre Anmeldungen werden gezielt über `scope=local` abgemeldet; die normale Hauptanmeldung bleibt bestehen.

## Reproduzierte Fehler und Korrekturen

1. **Abmeldung während der Passwortprüfung:** Die Antwort konnte eine neue temporäre Sitzung enthalten. Das anschließende Lesen der inzwischen entfernten Hauptsitzung warf eine Ausnahme, bevor der vorgesehene Widerruf ausgeführt wurde. Der Widerruf erfolgt nun im `finally`-Pfad, sobald eine zurückgegebene Sitzung nicht übernommen wurde.
2. **Erneute Anmeldung desselben Kontos:** Bisher wurde ausschließlich die Nutzerkennung verglichen. Ein neuer Login desselben Nutzers konnte die vorherige Passwortfreigabe weiterverwenden. Die Freigabe wird nun mit Nutzerkennung und `session_id` verbunden. Ein Token-Refresh derselben Sitzung bleibt erlaubt.
3. **Verspätete Tagebuchprüfung:** Nach Schließen des Fensters konnte eine verzögerte Antwort weitere Mitgliedschaftsabfragen starten und den alten internen Nutzer setzen. Jeder Prüfschritt kontrolliert jetzt die noch aktive Ansicht und Hauptsitzung, bevor die nächste Anfrage beginnt.
4. **Unerwarteter Nutzer in der Loginantwort:** Die Antwort wurde zwar zurückgewiesen, ihre neue temporäre Sitzung aber nicht widerrufen. Auch dieser Pfad wird nun bereinigt.
5. **Schlüsseländerung unmittelbar nach Sitzungswechsel:** Ein Speicherereignis konnte vor dem nächsten Intervallcheck eine bereits veraltete Freigabe verwenden. Jede Schlüsseländerung und Anbieterwahl prüft die konkrete Hauptsitzung unmittelbar vor der Anfrage.

Dies waren Randfälle bei asynchronen Abläufen. In diesen Tests wurde kein Zugriff einer dritten Person auf private Daten nachgewiesen.

## Erhalt der Schlüsselverwaltung nach der Serverhärtung

- Für jeden Anbieter gibt es „Gemeinsamen Schlüssel entfernen“ mit ausdrücklicher Bestätigung.
- Entfernen verwendet ausschließlich `rg_hub_set_ai_key(p_provider, p_key: null)` mit frischer Passwortfreigabe. Für OpenAI nennt die Bestätigung auch das Entfernen des bisherigen Abnehm-Zugangs.
- Nicht verwaltende Familienmitglieder können keinen Schlüssel entfernen oder speichern; ihre Anbieterwahl bleibt erhalten.
- Nach einer Änderung wird der sichtbare Anbieterstatus erneut geladen. Ein entfernter Schlüssel wird nicht weiterhin als nutzbar angezeigt.
- `/abnehmen/zuhause/?manage=ai#home` öffnet nur das gesperrte Verwaltungsfenster. Der einmalige Parameter wird entfernt; der Link meldet niemanden an und verändert keinen Schlüssel.

## Nachweise

- `zuhause/test/hub-ai-session.test.mjs`: **11 Verhaltenstests bestanden**, ausgeführt gegen das tatsächliche Skript in einer VM mit kontrolliertem DOM und abgefangenen HTTP-Antworten.
- Die zunächst angelegten sieben Sitzungstests reproduzierten gegen die unveränderte Ausgangsdatei fünf Fehler. Die zwei bereits funktionierenden Fälle (Schließen während Login, gültige Tokenerneuerung) bleiben funktionsfähig.
- Gesamter aktueller Hub-Testordner: **45 Tests bestanden** bei `node --test --test-isolation=none zuhause/test/*.test.mjs`.
- Chromium und WebKit, echte lokale Hub-Dateien bei 390 × 844 Pixeln: Abmeldung während Login, neue Sitzung während Login, neue Sitzung unmittelbar vor dem Speichern und Tokenerneuerung erfolgreich geprüft.
- Chromium und WebKit: Verwaltungs-Direktlink, abbrechen einer Schlüsselentfernung, bestätigtes Entfernen mit `p_key: null`, anschließend aktualisierter „kein nutzbarer Zugang“-Status bestanden. Kein nativer Browserfehler oder unhandled rejection in diesen Läufen.
- Für das Repository abgelegte Browserskripte: `test/browser/hub-ai-session-browser.mjs` und `test/browser/hub-ai-management-browser.mjs` (lokal bereits vorhanden; Veröffentlichung erfolgt durch die Hauptprüfung). Die ausgeführten identischen Kopien liegen unter `/tmp/app-audit-20261102/`.

## Grenzen

Es wurden ausschließlich fiktive Konten, Passwörter, Schlüssel und Serverantworten eingesetzt. Dieser Teil der Prüfung hat keine echten Sitzungen oder Schlüssel verändert und keine kostenpflichtige KI-Anfrage ausgelöst. Die tatsächliche Datenbankberechtigung des gehärteten Setters wird vom separaten Sicherheitsprüfer kontrolliert.

Ein Logout-Netzwerkaufruf kann bei unterbrochener Verbindung fehlschlagen. Daher wird hier kein garantierter sofortiger serverseitiger Widerruf bei Netzverlust behauptet. Lokale Daten und Freigaben werden entfernt; die bestehende serverseitige Prüfung der aktuellen Sitzung und der zeitlich begrenzten Passwortbestätigung bleibt erforderlich. Supabase-JWTs sind ohne zusätzliche serverseitige Sitzungsprüfung bis zu ihrem Ablauf technisch gültig.

Verwendete aktuelle Anbieter-Dokumentation: [Sitzungen](https://supabase.com/docs/guides/auth/sessions), [Abmelden und Gültigkeitsbereich](https://supabase.com/docs/guides/auth/signout), [Changelog](https://supabase.com/changelog).
