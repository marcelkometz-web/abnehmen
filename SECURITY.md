# Zugriffsschutz und geprüfter Stand

- Genau zwei administrativ zugeordnete Konten teilen ein Tagebuch. Garten-/Rezept-Rollen allein verleihen keine Abnehmen-Berechtigung.
- Alle App-Datentabellen erzwingen RLS. Die Freigabeliste ist vom Browser nur für das eigene Konto lesbar und nicht änderbar.
- Datenzugriff erfordert eine gültige, nicht abgelaufene Auth-Sitzung, ein freigegebenes Garten-Konto, eine aktive App-Zuordnung, `aal2` und einen weiterhin bestätigten TOTP-Faktor.
- Der Fotobucket ist privat. Authentifizierte Downloads und Uploads sind auf den zugeordneten Tagebuchordner begrenzt. Es werden keine öffentlich zugänglichen Bildlinks erzeugt.
- Neue Uploads erhalten zufällige Dateinamen. Original-Metadaten werden nicht übernommen. Beim Teilen wird ausschließlich die sichtbare, ausdrücklich zusammengestellte Vorschau exportiert.
- API-Schlüssel werden in Supabase Vault verschlüsselt. Die neue Lesefunktion für den Schlüssel ist ausschließlich für `service_role` freigegeben und prüft die Serverrolle zusätzlich. Öffentliche RPCs liefern niemals den Schlüssel zurück.
- Die KI-Edge-Function prüft Konto und Datenbankfreigabe vor jedem Anbieteraufruf und nochmals vor einer Speicherung/Antwort. Schlüssel, Rohantworten des Anbieters und Gesundheitsdaten werden nicht protokolliert.
- Die privaten Tabellen `ab_private.ai_settings` und `ab_private.ai_usage` haben RLS ohne Browser-Policies: Das ist beabsichtigtes Default-Deny. Der Supabase-Advisor meldet diesen geschlossenen Zustand als Information. Zugriff erfolgt ausschließlich durch die eng begrenzten privaten Serverfunktionen.

Die Rollback-Tests unter `supabase/tests/` wurden gegen das geteilte Projekt ausgeführt. Browserabläufe wurden mit Testkonten und Testdaten geprüft; reale Benutzerpasswörter und Fotos wurden dafür nicht benötigt. Der echte OpenAI-Aufruf ist erst nach Hinterlegen eines Schlüssels prüfbar.

## Bereits bestehende projektweite Meldung

Supabase meldet im geteilten Garten-Projekt **Leaked Password Protection Disabled**. Das ist eine bereits vor dieser Einrichtung vorhandene globale Auth-Einstellung. Sie wurde nicht für die anderen Apps verändert. Anleitung: [Password strength and leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Abnehmen verlangt zusätzlich zum Passwort einen bestätigten Authenticator.

Projektadministratoren und serverseitige Service-Schlüssel sind privilegiert. Gewollt exportierte Bilder verlassen den Zugriffsschutz dieser App. Weder dieser Stand noch die Tests sind eine Zusage absoluter Sicherheit oder Ende-zu-Ende-Verschlüsselung.
