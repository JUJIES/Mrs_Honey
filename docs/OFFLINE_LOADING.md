# Automatisches Vorladen und Offline-Wiedergabe

## Produktverhalten

- Keine Downloadansicht, kein zusätzlicher Schritt: Sprache → Set → Modus → Spiel bleibt bestehen.
- Beim Öffnen werden gemeinsame UI-/Feedback-Dateien vorbereitet. In der Modusauswahl wird die erste Aufgabe bereits festgelegt und das gewählte Set vorgeladen; `startGame` verwendet dieselbe Reihenfolge.
- Aktuelle Antwortbilder, Wort/Rückmeldung und nächste Aufgabe haben Vorrang. Höchstens ein Hintergrundtransfer läuft gleichzeitig; ein zweiter Platz bleibt für dringende Dateien. Ein Setwechsel verwirft nur wartende Downloads des vorherigen Sets, nicht vollständige Dateien.
- Erstaufruf und noch nicht geladene Inhalte benötigen Netz. Nur eine tatsächliche Verzögerung zeigt nach 600 ms „Einen Moment …“. Die bestehenden Bild-/Audiofehler bleiben sichtbar und wiederholbar, Bildrunden versuchen es außerdem automatisch erneut.
- Mit vollständig vorbereiteten Dateien funktionieren Hören, Lesen und Memory offline; beim Colours-Set wird auch der Wimmel-Bonus nachrangig vorbereitet. Die Sprechprüfung bleibt ein Online-Dienst; Aufnahmen werden nicht für spätere Uploads gespeichert.
- Automatisches Vorladen läuft bei geöffneter, sichtbarer Seite. Keine Zusage für Downloads bei geschlossener iPad-App, kein ungefragtes Herunterladen aller Sets, keine dauerhafte Speicherzusage bei vom Browser entfernten Website-Daten.

## Eine gemeinsame Asset-Schicht

`asset-cache.js` läuft unverändert in Seite und Service Worker. Das abgeleitete `data/offline-assets.bundle.js` enthält ausschließlich Dateipfade, MIME-Typen, Längen und SHA-256; Lerninhalte bleiben in den bestehenden Set-/Feedback-JSONs.

- `lernwort-content-v1`: vollständige, hashgeprüfte Medien/JSONs. Cache-Schlüssel enthalten den Dateihash (`?asset=…`), nicht die App-Version. Abgebrochene, falsche oder partielle Antworten werden nicht gespeichert.
- `lernwort-pwa-v…`: Oberfläche, Scripts und Set-Bundles. Shell-Updates löschen nur alte Shell-Caches; der Inhaltsspeicher bleibt bestehen. Unveränderte Dateien werden über App-Versionen hinweg wiederverwendet.
- Das bestehende Audio-Bundle hat die Form `{ files: [...] }` und wird ohne JSON-Netzanfrage in einen `Set` überführt; die frühere reine `instanceof Set`-Prüfung übersah diesen Offline-Datenpfad.
- Der Service Worker beantwortet Audio-Teilbereichsanfragen aus vollständigen Dateien mit 206/416. Vorbereitete Audios erhalten zusätzlich lokale Blob-URLs für die Lebensdauer der Seite, damit sie auch vor der Übergabe eines älteren Service Workers abspielbar sind; es werden keine dekodierten Audio-Puffer gesammelt.
- Downloads werden zusammengeführt, priorisiert und bei Fehlern mit Abstand wiederholt. Zusätzlich zu `online`/Sichtbarkeitswechseln gibt es einen Wiederholungsabstand von 15 bis 120 s für Verbindungen, die ohne Browser-Ereignis zurückkehren.
- Neue Worker werden nur beim Start/in Menüs aktiv angefordert, ohne automatischen Seitenreload mitten in einer Runde. Datei-Hashes verhindern, dass ältere Worker eine andere Revision unterschieben.
- Gesperrter/voller Gerätespeicher fällt auf normale Online-Nutzung zurück. Ein Set gilt in der UI deshalb nicht pauschal als garantiert „offline bereit“. Es gibt keinen neuen Persistenz-/Benutzerdatenbestand auf dem Server.

## Änderungen an Lerninhalten

Nach Bild-, Audio-, Lipsync- oder Setänderungen:

```bash
python3 tools/build_offline_assets.py
python3 tools/build_offline_assets.py --check
node --test tests/*.test.cjs
```

Der Generator aktualisiert die Inventar-URL in Index/Worker. Erfolgreiche schreibende Bild-/Audio-Syncs rufen ihn automatisch auf; reine Prüf-/Dry-runs bleiben unverändert. App-/Helper-Änderungen brauchen gemeinsam neue Script-URLs und eine neue Shell-Cache-Version. JSON/SVG werden durch `.gitattributes` als LF ausgecheckt, damit Inhalts-Hashes auch auf dem Windows-Server stimmen. Neue Dateitypen benötigen einen expliziten, plattformunabhängigen MIME-Eintrag im Generator.

Der minimale Runtime-Export enthält `asset-cache.js` sowie das unter `data/` erzeugte Inventar; Generator, Tests und Referenzbilder gehören nicht zum Runtime-Paket.

## Decision Log – 2026-10-24

Gewählt: bestandswahrendes Vorladen pro Set in der bestehenden PWA, ohne neue Dependencies, Downloadbedienung oder native App. Globale Komplettdownloads würden Mobilfunk und Speicher unnötig belasten. Ein Download-/Offline-Badge würde zusätzliche Bedienung und eine Zusage einführen, die bei browserseitiger Speicherbereinigung erneut geprüft werden müsste.

Prüfung: Cache-/Range-/Prioritäts-/Retry-/Update-Tests sowie Browserlauf mit gestopptem Origin nach automatischem Vorladen. Ein simulierter Browser oder gestoppter Testserver ersetzt weiterhin keine physische iPad-Abnahme.
