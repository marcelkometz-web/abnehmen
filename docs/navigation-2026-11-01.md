# Schwebende Navigation

Die gemeinsame Oberfläche und alle drei Einzel-Apps bieten Start, Zurück, Vorwärts und einen Seitenverlauf für gezielte Mehrfachsprünge. Der Verlauf zeichnet tatsächlich besuchte, erlaubte Menüseiten auf; er übernimmt nicht den allgemeinen Browserverlauf. Rezept-/Pflanzendetails und andere Dialoginhalte werden nicht als eigene Verlaufseinträge gespeichert.

## Bedienung

- Ein Pfeil wechselt jeweils eine besuchte Menüseite. Ohne entsprechendes Ziel ist er deaktiviert.
- „Verlauf“ zeigt feste App- und Seitennamen sowie die Zahl der Schritte zurück bzw. vor. Ein Eintrag springt direkt dorthin.
- Ein neuer Seitenaufruf nach einem Rücksprung entfernt den bisherigen Vorwärtszweig.
- „Start“ führt im Hub zu Unser Zuhause und in einer Einzel-App zur eigenen Übersicht bzw. zum Check-in.
- Der Hub behält die besuchten App-Fenster und ihre zulässigen Entwürfe im Arbeitsspeicher. Innerhalb des Tagebuchs bleiben die Formulare bei Menüwechseln montiert. Andere Apps blockieren einen Wechsel bei ungespeicherten Formularen bzw. sichern vorgesehene Sortennotizen vor dem Wechsel.
- Laufende Speicherungen sperren die Bedienung vorübergehend. Offene App-Dialoge und die Bildschirmtastatur blenden die Leiste aus. Nach dem Schließen kehrt sie zurück.

## Datenschutz und Grenzen

Der auf 80 Einträge begrenzte Verlauf bleibt ausschließlich im Arbeitsspeicher des geöffneten Dokuments. Gespeichert werden nur erlaubte App-/Seitenkennungen. Titel stammen aus einer festen Liste. Keine Formulardaten, Gewichte, Fotos, Rezept-/Pflanzentitel, Termine, Suchtexte, URLs, Kontoadressen oder Konto-IDs gelangen in diesen Verlauf. Es gibt dafür weder Local-/Session-Storage-Einträge noch Datenbankzugriffe. Authverlust bzw. Kontowechsel löscht den Verlauf; ein vollständiges Neuladen oder Schließen beginnt einen neuen Verlauf.

Der gemeinsame Rahmen akzeptiert Statusmeldungen ausschließlich von den tatsächlich eingebundenen, bekannten App-Fenstern derselben Origin. Kinder akzeptieren Befehle ausschließlich vom freigegebenen Elternfenster und nur für ihre eigenen erlaubten Seiten. Unbekannte Kennungen, fremde Absender und fremde Origins werden verworfen. Wartende Befehle haben Fristen; abgebrochene Befehle können einen noch laufenden Entwurfs-Flush nicht nachträglich in einen Seitenwechsel umsetzen. Die bestehenden Auth-/RLS-/Foto-Freigaben wurden nicht erweitert.

## Darstellung und Prüfungen

Die Leiste besitzt reservierten Platz. Auf schmalen Hub-Bildschirmen sitzt sie in einer eigenen Zeile oberhalb der App-Auswahl; auf breiten Bildschirmen liegen beide Gruppen nebeneinander. Einzel-Apps berücksichtigen ihre vorhandene untere Menüleiste. Aktualisieren-Knöpfe und Hinweise werden passend versetzt. Bildschirmränder und Bildschirmtastatur werden berücksichtigt.

Geprüft mit ausschließlich simulierten Konten und App-Daten:

- Chromium und WebKit: alle drei Einzel-Apps sowie gemeinsame Navigation, Zurück/Vorwärts, Startseite und gezielte Mehrfachsprünge.
- 320×740, 390×844, 844×390 und 1280×900: Bedienelemente bleiben erreichbar; keine horizontale Überbreite oder Überlagerung vorhandener App-Menüs.
- Gemeinsamer Verlauf über zurückgehaltene App-Fenster, neue Verzweigung nach Zurück, erhaltene Check-in-Eingaben, gesperrte ungespeicherte Formulare und zurückkehrende Bedienung nach Speichern.
- Dialog-/Tastaturbehandlung, Scroll-Sperre, Verlaufslöschung bei Abmelden und fehlende Persistenz von Navigationsdaten.
- Unit- und Adapterprüfungen für Begrenzung, Deduplizierung, Branch-Abbruch, Snapshot-Kopien, zulässige Kennungen, Absenderprüfung, abgebrochene verzögerte Befehle, Entwurfs-Flush-Fehler und Authwechsel.

Die Tests betreffen Browser-Engines und Viewport-/Touch-Konfigurationen. Echte Geräteprüfungen jeder Betriebssystemversion sind damit nicht zugesichert.
