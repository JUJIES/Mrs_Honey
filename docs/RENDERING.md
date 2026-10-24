# Darstellungsstabilität und Browser-Abnahme

## Aktueller Komponentenvertrag

- Der Bär besteht ausschließlich aus dem geschichteten Companion-Rig in `mrsHoneyAvatar()`. Die frühere SVG-/Portrait-Variante samt konkurrierender Größen-, Masken- und Animationsregeln wurde aus dem Runtime-Stylesheet entfernt. Avatar Lab verwendet sein eigenes Stylesheet.
- Kopf, Körper und Augen verwenden ein gemeinsames quadratisches Koordinatensystem. Keine gerätespezifische zweite Darstellung und keine Safari-Erkennung zum Abschalten von Features.
- Auf überstehenden Rig-/Button-Ebenen keine Filter, Masken oder beschneidenden Overflow-Regeln einsetzen. Ein Schatten bekommt ein eigenes begrenztes Element. Bekannter Safari-Fall: [WebKit 313665](https://bugs.webkit.org/show_bug.cgi?id=313665).
- Animationsbilder werden einmal pro Seite vorab dekodiert. Erst wenn beide Body-Blendbilder bzw. alle benötigten Augenvarianten fertig sind, darf die Darstellung wechseln. Bei Netzwerk-/Decode-Fehlern bleibt der zuletzt dargestellte Zustand erhalten; ein späterer Rundenstart kann fehlende Frames erneut vorbereiten.
- Der kleine Decode-Cache enthält nur die 14 Body-/Augenframes, keine vollständigen Lernsets oder dekodierten Audiopuffer. Dauerhafte Downloads bleiben Aufgabe der gemeinsamen Asset-Schicht.
- Verdeckte Tabs beenden dekorative Timer/RAF-Arbeit; sichtbare Tabs starten mit einer frischen Atemphase. Audiowiedergabe wird dadurch nicht gestoppt. Eine lange Safari-Suspendierung darf nicht als Folge veralteter Atemzyklen nachgeholt werden.
- `prefers-reduced-motion` unterbindet dekoratives Atmen, Blinzeln und Kopfnicken. Die wortbezogene Mundbewegung bleibt als visuelle Sprechhilfe erhalten.

## Verbindliche Abnahme bei Avatar-/Layoutänderungen

1. `node --test tests/*.test.cjs`, Speech-/Inventarprüfungen und `git diff --check` ausführen. Keine Tests anpassen, um einen echten Darstellungsfehler zu verdecken.
2. Hören und Lesen bei 390×844, 810×1080, 1080×810 und 844×390 prüfen; kompakte 320×568 / 568×320 zusätzlich bei Änderungen der Größen-/Touch-Regeln. Sprechen ebenfalls öffnen, wenn gemeinsame Companion-Regeln geändert werden; Mikrofonfreigabe ist dafür nicht erforderlich.
3. Nach dem Laden den nur lesenden Audit `tests/browser/avatar-layout-audit.js` auf dem echten App-DOM ausführen. Er prüft Filter-/Overflow-Ketten, quadratische Rig-Geometrie, geladene sichtbare Bilder, mindestens 44px große Touch-Ziele, Kopfposition und horizontalen Überlauf.
4. Im echten Safari Ruheansicht und laufendes Wort-Audio ansehen; danach in einen anderen Tab und zurück wechseln. Kopf/Ohrbereich, Augen, Mund und Karten dürfen nicht abgeschnitten sein oder flackern. Screenshots unter `references/app_screenshots/` ablegen, ohne fremde Tabs/Browserleiste mitzupublizieren.
5. Versionsgleiches App-/CSS-Paar und neue Shell-Cache-Version verwenden; Medieninventar nur bei Inhaltsänderungen neu erzeugen. Nach Deployment den öffentlichen Stand im Safari prüfen, nicht nur localhost.

Cua-Beispiel für den wiederverwendbaren Audit (nur lesend):

```js
const source = await fs.readFile("<repo>/tests/browser/avatar-layout-audit.js", "utf8");
const report = await tab.playwright.evaluate(`(${source})()`);
// report.ok muss true sein; echte issues vor Freigabe beheben.
```

DOM-Rechtecke und bestandene Unit-Tests erkennen keinen GPU-/Compositor-Beschnitt. Ein Browser-Viewport ist auch kein physisches iPad. Falls echter Safari oder das Zielgerät nicht verfügbar ist, die fehlende Praxisabnahme ausdrücklich benennen; keine allgemeine Gerätefreigabe daraus ableiten.

## Decision Log – 2026-10-24

Gezielte Härtung entlang des vorhandenen Rigs statt neuer Render-Engine oder Browser-Sonderfällen: alte CSS-Implementierung entfernen, Frames erst nach Decode tauschen, dekorative Arbeit sauber pausieren, und eine wiederholbare DOM-Matrix plus echte Safari-Sichtprüfung als Freigabevertrag festhalten. Lernlogik, Audio-Inhalte, Exportformat und Serverdatenmodell bleiben bestehen.
