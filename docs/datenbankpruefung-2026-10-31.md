# Datenbank- und Zugriffsprüfung

Stand: 31. Oktober 2026. Geprüft wurden das bestehende gemeinsame Garten-/Abnehmen-Projekt und das separate Rezepteprojekt. Die gemeinsame Oberfläche legt keine zusätzliche Datenbank an.

## Bestandsqualität

| Prüfung | Ergebnis |
|---|---|
| Rezepte | 384 Datensätze; keine doppelten normalisierten Titel und keine vollständigen Datensatzdubletten. |
| Pflanzen | 638 Einträge; keine doppelten Kombinationen aus Familie, Name, Sorte und Katalogstatus; keine vollständigen Datensatzdubletten. |
| Pflichtinhalte | Keine leeren Rezepttitel, Zutaten/Zubereitungen oder Pflanzennamen gefunden. |
| Tagebuch | Keine mehrfachen Gewichts-/Maßeinträge pro Tag und Tagebuch, keine doppelten Foto-Pfade oder Zugangszuordnungen. |
| Plausibilität | Keine negativen Nährwerte; geprüfte Gewichte, Körpergrößen, Maße, Zyklus-/Trainingsdaten und Datumsangaben ohne auffällige Werte. Leere Tabellen begrenzen die Aussagekraft. |
| Beziehungen | Keine verwaisten Tagebuchkonten, Foto-Metadaten ohne Datei, Dateien ohne Foto-Metadaten oder fehlerhaften Familienzuordnungen der geprüften Gartenbeziehungen. |
| Schema | Alle geprüften öffentlichen Tabellen mit aktiviertem RLS; keine ungültigen Indizes oder unvalidierten Constraints. |
| Zutatenberechnung | Alle 120 dokumentierten Zutatenberechnungen stimmen mit gespeicherten Nährwerten und Zutatenlisten überein. Dies prüft die Rechnung, nicht die tatsächliche Zusammensetzung jedes verwendeten Lebensmittels. |

Bei **neun älteren Rezepten** überschreitet Zucker die Gesamtkohlenhydrate oder gesättigtes Fett das Gesamtfett. Aus einem Widerspruch lässt sich nicht ableiten, welcher der beiden Werte falsch ist. Die Originaldaten bleiben deshalb erhalten. Die App zeigt betroffene Wertepaare bis zur belegten Korrektur als unbekannt, kennzeichnet das Rezept und bietet den Filter **Nährwerte prüfen**. Der Editor und die Zutatenberechnung weisen solche Widersprüche zurück. Unbekannte Beilagen-Teilnährwerte bleiben ebenfalls unbekannt, statt als null Gramm in Summen einzugehen. Ohne verlässliche Quelle wurden keine Ersatzwerte eingetragen und keine Daten gelöscht.

## Zugriff und private Fotos

- Genau zwei aktive App-Freigaben führen zu einem gemeinsamen Tagebuch. Garten-/Rezeptmitgliedschaft allein reicht nicht.
- Die Foto-Buckets sind privat. Der Fortschrittsfoto-Bucket akzeptiert JPEG bis 1 MiB und verlangt die passende Tagebuchzuordnung.
- Restriktive Regeln sperren anonyme Zugriffe, fremde Fotoordner, gewöhnliche signierte Freigabe-/Uploadlinks sowie Kopier-/Verschiebeoperationen für Fortschrittsfotos.
- Browserrollen erhalten keine Berechtigung zum Auslesen des serverseitigen KI-Schlüssels. Es wurden keine Vault-Geheimnisse oder echten Fotos gelesen.
- Rezepte sind nur über den authentifizierten Backend-Gateway erreichbar. `anon` und `authenticated` haben weder `USAGE` auf dessen `public`-Schema noch Zugriff auf die stillgelegten Schlüssel-Tabellen. Das privilegierte Backend behält den notwendigen Schema-Zugriff.

Zwei SQL-Prüfungen wurden gegen das echte Garten-/Abnehmen-Projekt ausgeführt, jeweils mit vollständigem Rollback:

1. `photo-operations.sql`: Beide freigegebenen Konten können die Test-Metadaten lesen; Freigabelinks, signierte Uploads, Kopieren, anonyme Zugriffe und entzogene Freigaben werden blockiert. Andere Garten-Buckets bleiben funktionsfähig.
2. `shared-access.sql`: Gemeinsames Lesen/Anlegen/Bearbeiten/Löschen funktioniert; fehlende Tagebuchfreigabe, ungültige/abgelaufene Sitzungen, falsche Ordner und Selbstfreigaben werden abgewehrt. Der Schlüsseltest wurde ausschließlich als Prüfung der Ausführungsrechte durchgeführt; kein Schlüssel-RPC wurde aufgerufen.

Es wurden ausschließlich synthetische Testeinträge und temporäre Test-Sitzungen verwendet und zurückgerollt. Das ist keine Aussage, dass Projektadministratoren oder die beiden berechtigten Nutzer keine Kopien erstellen könnten. Privilegierte Backendzugriffe und bewusste Exporte bleiben technisch möglich; keine Ende-zu-Ende-Verschlüsselung.

## Betriebs- und Advisor-Hinweise

Die verfügbaren HTTP-Zugriffslogs des letzten Tages enthielten keine erfassten 5xx-Antworten. Ein zeitlich begrenzter Logausschnitt ist keine Zusicherung dauerhafter Fehlerfreiheit.

- **Passwortschutz:** Supabase meldet weiterhin, dass der Abgleich gegen bekannte kompromittierte Passwörter im Garten-/Auth-Projekt deaktiviert ist. Das ist eine sinnvolle zusätzliche Härtung der passwortbasierten Anmeldung, unabhängig von der auf Nutzerwunsch entfallenen Authenticator-Pflicht. Mit den verbundenen Werkzeugen steht keine passende Auth-Konfigurationsänderung zur Verfügung. [Supabase-Anleitung](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- **Verwaltete HTTP-Erweiterung:** Der Rezepte-Advisor meldet die alte `http`-Erweiterung im `public`-Schema. Sie ist laut Katalog nicht verschiebbar. Browserrollen haben bereits keinen Schema-Zugriff; diese Sperre wurde erneut bestätigt. Die Erweiterung wurde weder entfernt noch mit ungeprüften Abhängigkeiten verschoben. [Advisor-Hintergrund](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public).
- **Absichtlich geschlossene Tabellen:** RLS ohne Browser-Policy bei internen KI-/Rechte-/Variations-Tabellen und den Backend-Rezepttabellen ist beabsichtigt und kein Anlass, diese Tabellen für Browser freizugeben. [Advisor-Hintergrund](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- **Indizes:** Ein unindizierter Fremdschlüssel der kleinen internen KI-Einstellungstabelle und bisher ungenutzte Indizes sind Informationshinweise. Ohne nachgewiesenen Engpass wurden keine zusätzlichen Indizes angelegt oder vorhandene Schutz-/Beziehungsindizes entfernt. [Fremdschlüssel-Hinweis](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys).

Keine Schemaänderungen oder dauerhaften Eingriffe in reale Nutzerdaten waren für diese Prüfung erforderlich. Die neun Rezept-Widersprüche bleiben bis zur belegten Korrektur ausdrücklich offen.
