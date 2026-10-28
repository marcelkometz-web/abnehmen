# Zugriffsschutz und geprüfter Stand

- Genau zwei administrativ zugeordnete Konten teilen ein Tagebuch. Garten-/Rezept-Rollen allein verleihen keine Abnehmen-Berechtigung.
- Alle App-Datentabellen erzwingen RLS. Die Freigabeliste ist vom Browser nur für das eigene Konto lesbar und nicht änderbar.
- Datenzugriff erfordert eine gültige, nicht abgelaufene Auth-Sitzung, ein freigegebenes Garten-Konto, eine aktive App-Zuordnung. Die App verlangt auf ausdrücklichen Benutzerwunsch keinen zusätzlichen TOTP-Code. Vorhandene Auth-Faktoren anderer Apps bleiben unverändert.
- Der Fotobucket ist privat. Authentifizierte Downloads und Uploads sind auf den zugeordneten Tagebuchordner begrenzt. Es werden keine öffentlich zugänglichen Bildlinks erzeugt.
- Neue Uploads erhalten zufällige Dateinamen. Original-Metadaten werden nicht übernommen. Beim Teilen wird ausschließlich die sichtbare, ausdrücklich zusammengestellte Vorschau exportiert.
- API-Schlüssel werden in Supabase Vault verschlüsselt. Die neue Lesefunktion für den Schlüssel ist ausschließlich für `service_role` freigegeben und prüft die Serverrolle zusätzlich. Öffentliche RPCs liefern niemals den Schlüssel zurück.
- Die KI-Edge-Function prüft Konto und Datenbankfreigabe vor jedem Anbieteraufruf und nochmals vor einer Speicherung/Antwort. Schlüssel, Rohantworten des Anbieters und Gesundheitsdaten werden nicht protokolliert.
- Die privaten Tabellen `ab_private.ai_settings` und `ab_private.ai_usage` haben RLS ohne Browser-Policies: Das ist beabsichtigtes Default-Deny. Der Supabase-Advisor meldet diesen geschlossenen Zustand als Information. Zugriff erfolgt ausschließlich durch die eng begrenzten privaten Serverfunktionen.

Die Rollback-Tests unter `supabase/tests/` wurden gegen das geteilte Projekt ausgeführt. Browserabläufe wurden mit Testkonten und Testdaten geprüft; reale Benutzerpasswörter und Fotos wurden dafür nicht benötigt. Der echte OpenAI-Aufruf mit dem hinterlegten Benutzerschlüssel wurde nicht für Tests ausgelöst; der Schlüssel wurde nicht ausgelesen. Anbieterfehler wurden kontrolliert simuliert.

## Bereits bestehende projektweite Meldung

Supabase meldet im geteilten Garten-Projekt **Leaked Password Protection Disabled**. Das ist eine bereits vor dieser Einrichtung vorhandene globale Auth-Einstellung. Sie wurde nicht für die anderen Apps verändert. Anleitung: [Password strength and leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Projektadministratoren und serverseitige Service-Schlüssel sind privilegiert. Gewollt exportierte Bilder verlassen den Zugriffsschutz dieser App. Weder dieser Stand noch die Tests sind eine Zusage absoluter Sicherheit oder Ende-zu-Ende-Verschlüsselung.

## Gemeinsame Anmeldung

Nur die Supabase-Anmeldung wird zwischen den drei Apps auf derselben Browser-Origin geteilt. Die Abnehmen-Freigabeliste bleibt unverändert. Gemeinsame Abmeldung löscht auch alte Anmeldekopien dieses Tabs; ein Marker verhindert deren spätere erneute Übernahme. Die Zehn-Minuten-Frist basiert auf Bedienung in einer der Apps, nicht auf Hintergrundabfragen. Passwort-Reset verwendet PKCE, doppelte Passwort-Eingabe und Rückkehr in die Ausgangs-App. Ungültige Links geben keine Tagebuchdaten frei. Die Browserabläufe verwenden ausschließlich simulierte Konten; echte E-Mails und Passwortänderungen wurden durch diese Tests nicht ausgelöst.

## Automatische Einträge und Speicherstand

Neue Profil-, Trainings-, Zyklus- und Speicherstandtabellen verwenden dieselbe Tagebuchfreigabe. Browser können weder den serverseitigen Speicherzeitpunkt bzw. die Revision ändern noch die ausschließlich serverseitig zugelassene atomare KI-Speicherung aufrufen. Check-in und Chat-Messwerte prüfen den gelesenen Datenstand vor der Änderung. Klare Chat-Angaben werden über begrenzte Funktionen mit aktuellen Benutzerrechten gespeichert; Modelltext erhält keinen freien Datenbankzugriff. Entwürfe bei Tabwechsel bleiben nur im Arbeitsspeicher und werden nach Abmeldung, Zeitablauf oder Benutzerwechsel verworfen.

Der [Prüfbericht](docs/pruefung-2026-10-27.md) beschreibt die behobenen Fehler und verbleibenden Grenzen.

## Erneute Prüfung am 28.10.2026

Der [aktuelle Sicherheitsbericht](docs/sicherheitspruefung-2026-10-28.md) dokumentiert die erneuten Live-, Zugriffs- und Datenbanktests. Eine zusätzliche restriktive Storage-Policy sperrt für reguläre Clients signierte Foto-/Upload-Links und direkte Kopieroperationen aus dem privaten Fortschrittsfotobucket. Authentifizierte Downloads sowie das bewusst gewählte JPG-Teilen bleiben verfügbar. Die Operationstests unter `supabase/tests/photo-operations.sql` prüfen auch die unveränderten Rechte anderer Buckets.
