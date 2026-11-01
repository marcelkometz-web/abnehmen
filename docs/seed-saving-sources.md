# 🌱 Eigenes Saatgut gewinnen

Der Garten-Bereich enthält 14 kompakte Kultur-Anleitungen. Kategorien und einzelne Anleitungen sind zunächst zugeklappt. Eine Suche öffnet passende Ergebnisse. In eindeutig zugeordneten Pflanzen-Details erscheint zusätzlich eine geschlossene Saatgut-Ergänzung.

Die neue Menüschaltfläche heißt **Eigenes Saatgut**. Sie nutzt auf kleinen Bildschirmen dieselbe waagerecht verschiebbare Menüleiste wie Wochenplan und Dörrautomat. Das eigene Dialogfenster sperrt den Hintergrund und stellt beim Schließen den Fokus wieder her.

## 📚 Quellen und Abgrenzung

Alle folgenden Primärquellen wurden am **1. November 2026** im Web geöffnet und in den relevanten Abschnitten gelesen. Texte und Auswahl sind eine eigene knappe deutsche Aufbereitung; Bilder oder längere Originalpassagen wurden nicht übernommen.

| Anleitung / Thema | Geprüfte Fachquelle |
| --- | --- |
| Tomate, Nassgewinnung | [ARCHE NOAH](https://www.arche-noah.at/aktiv-werden/saatgut-selber-gewinnen/saatgutgewinnung-fuer-einsteiger/) |
| Paprika/Chili, Erbse, Gartenbohne | [University of Minnesota](https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/saving-vegetable-seeds), [Utah State University](https://extension.usu.edu/yardandgarden/research/collecting-and-storing-seeds-from-your-garden) |
| Kopf- und Pflücksalat | [Bundeszentrum für Landwirtschaft](https://www.landwirtschaft.de/garten/selbst-anbauen/obst-und-gemuese/samen-und-ableger-ernten-gemuese-und-obst-selbst-vermehren) |
| Gurke | [Seed Savers Exchange](https://seedsavers.org/grow-cucumber/) |
| Kürbis/Zucchini und sichere Einordnung von Bitterstoffen | [Bundeszentrum für Ernährung](https://www.bzfe.de/presse/pressemeldungen-archiv/bittere-kuerbisse-und-zucchini-nicht-essen), [Utah State University](https://extension.usu.edu/yardandgarden/research/collecting-and-storing-seeds-from-your-garden) |
| Möhre | [Seed Savers Exchange](https://seedsavers.org/grow-carrots/) |
| Rote Bete/Mangold | [Seed Savers Exchange](https://seedsavers.org/grow-beet/) |
| Küchenzwiebel | [RHS-Schulgarten](https://www.rhs.org.uk/education-learning/school-gardening/resources/planet-friendly/tips-on-saving-your-own-seeds) |
| Kopfkohl und verwandte Formen | [Seed Savers Exchange](https://seedsavers.org/grow-cabbage/) |
| Radieschen/Rettich | [Seed Savers Connect](https://www.seedsavers.org.au/2026/01/13/radish/) |
| Apfel-/Birnenkerne und Sortenerhaltung | [University of Maine](https://extension.umaine.edu/fruit/growing-fruit-trees-in-maine/rootstocks-and-dwarf-fruit-trees/) |
| Erdbeere/Ausläufer | [RHS](https://www.rhs.org.uk/fruit/strawberries/grow-your-own) |
| Sammlung, trockene Lagerung und fehlende Keim-Garantien | [RHS](https://www.rhs.org.uk/propagation/seed-collecting-storing) |

## 🔎 Was die App ausdrücklich nicht errät

- Eine Kultur-Anleitung bestätigt nicht, dass die konkrete gespeicherte Sorte samenfest ist. Selbst ohne F1 im Namen bleibt diese Angabe ungeprüft. Ein vorhandener F1-/Hybrid-Hinweis wird sichtbar eingeordnet.
- Samenfestigkeit, Bestäubung und Sortenreinheit sind unterschiedliche Fragen. Für Arten mit Fremdbestäubung werden keine allgemein passenden Isolationsabstände behauptet.
- Zweijährige Kulturen benötigen eine weitere Saison; konkrete Überwinterung hängt vom Standort und der Kultur ab. Ausländische Quellen liefern hier die Kulturprinzipien, keine automatisch übernommene Monatsplanung.
- Unbekannte, mehrdeutige oder nur ähnlich benannte Pflanzen erhalten keine Anleitung einer anderen Kultur. Die Zuordnung liest ausschließlich die Überschrift des Pflanzen-Dialogs, keine persönlichen Notizen.
- Saatgut wird von Lebensmitteln zum Dörren getrennt. Die Übersicht empfiehlt Lufttrocknung im Schatten und gibt das Lebensmittelprogramm des Arendo nicht als geprüftes Saatgutverfahren aus.
- Bei Obst wird zwischen Samenexperiment und sortenerhaltender Vermehrung unterschieden. Feste Keimquoten, Erträge und Haltbarkeiten werden nicht zugesagt.

## 🔐 Technik und Integration

Dateien: `zuhause/seed-saving-catalog.mjs`, `seed-saving.js`, `seed-saving.css`. Keine Datenbanktabellen, Netzwerkaufrufe oder Browser-Speicher für Garten- oder Kontodaten. Quellen werden erst durch einen ausdrücklich angeklickten externen Link geöffnet. Fremde Einbettungen und andere App-Pfade werden abgewiesen.

In der Garten-HTML nach der vorhandenen Shell-Brücke ergänzen:

```html
<link rel="stylesheet" href="/abnehmen/zuhause/seed-saving.css?v=20261101">
<script type="module" src="/abnehmen/zuhause/seed-saving.js?v=20261101"></script>
```

API: `window.unserZuhauseSeeds.open({query:'Tomate'})` / `.close()`. Alternativ öffnet eine Schaltfläche mit `data-open-seeds` die Übersicht. Das Menü und die passenden Pflanzen-Ergänzungen werden ohne Änderung des Garten-Bundles eingehängt.

## ✅ Prüfungen

`node --test test/seed-saving.test.mjs` prüft acht fachliche Fälle: Quellen/Umfang, F1 und ungeprüfte Samenfestigkeit, vorsichtige Pflanzenzuordnung, Suche/Whitelist, zweijährige Kulturen, Kürbis-Risiken, Obst-Vermehrungsarten und unbekannte Kennungen. Browser-Prüfungen werden mit vollständig simulierten Seiten und ohne echte Konto- oder Pflanzendaten ausgeführt.
