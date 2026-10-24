# Catch a Pair – Belohnungsspiel

## Produktlogik

Nach einer abgeschlossenen Lernrunde erscheint eine Spieleauswahl: Catch a Pair,
Memory, Word Blaster und bei Colours zusätzlich das bisherige Wimmelspiel. Die Lernmodi bleiben
Hören, Lesen und Sprechen; kein neuer Lernschritt oder Fortschrittsspeicher.
Memory und Catch a Pair erhalten eigene transparente Auswahlmotive unter
`assets/images/bonus_games/`; Darstellung und Assetvertrag siehe `UI_REQUIREMENTS.md`.

Catch a Pair verwendet alle Items des gewählten Sets unverändert (`id`,
`labels.en`, `image`), je ein Wort und ein Bild. Beide Bahnen sind gemischt;
Partner liegen immer auf gegenüberliegenden Bahnen. Ausgewählt wird der **Sockel**:
native Buttons sind die vollständigen Tap-/Klick-/Tastaturziele, Bild und Wort sind
dekorative Einsätze. Falsche Partner bestrafen nicht, der erste Sockel bleibt gewählt.

Fortschritt erscheint genau einmal, groß und mittig unter dem Board:
`3 / 10 Paare`. Unter dem Spieltitel steht ausschließlich der Setname.
Normale Zustandsbeschreibungen sind nur für Screenreader vorhanden; die sichtbaren
Signale übernehmen Sockel und Animationen. Laden und Bildladefehler bleiben als
sichtbare Hinweise mit bestehender Wiederholungsmöglichkeit erhalten.

- Bild-/Wortkarte und vertiefter Sockel haben dieselbe Grundform mit 6px passendem
  Rand in der Ausgangsgeometrie. Bilder bleiben vollständig in ihrer
  Innenfläche; keine versetzten Plattformen oder zusätzlichen blauen Doppelrahmen.
- Im Ruhezustand ist der Einsatz ein echtes Kind seines Sockelbuttons und sitzt
  2px tief unter einer vorderen Sockellippe. Kein dauerhaftes Schweben, Wippen
  oder Verformen des Inhalts. Kurzes Drücken/Rütteln animiert den ganzen Sockel
  samt Inhalt gemeinsam, nicht Bild und Umrandung auf getrennten Uhren.
- Antippen wählt den Sockel mit Klang und dezenter türkiser Markierung;
  erneutes Antippen löst die Auswahl. Ein falscher Partner färbt ausschließlich
  dessen Sockel 480ms rot, ohne die erste Auswahl zu lösen. Ein Treffer färbt
  beide Sockel vor dem Verpuffen grün.
- Zufällige Wechsel schließen direkte Nachbarn und ausgewählte Teile ein.
  Nur wenn ein ausgewähltes Teil tatsächlich wechselt, löst seine Markierung.
- 700 ms Ankündigung mit gelb leuchtenden Sockeln, ohne Schloss. Während der
  Bewegung werden sie wieder neutral. Nur die zwei beteiligten Teile
  sind bis nach dem Einsenken gesperrt; andere Sockel bleiben wählbar.
- Transportfolge: Ankündigung/kurzes gemeinsames Rütteln → 180ms Herausheben
  (Einsatz auf −6px, räumlicher Schatten) → gemeinsame Fahrt auf getrennten
  Pfaden → 220ms Einsenken auf 2px. Erst dann den Einsatz in den Zielsockel
  einsetzen und dessen Eingabe wieder freigeben. Das Einfliegen neuer Abschnitte
  endet mit derselben Einsenkbewegung; keine zusätzliche Jelly-/Bob-Animation.
- Karten bewegen sich gleichzeitig auf getrennten, abgerundeten Routen.
  Bahnwechsel betreffen beide Teile eines Paars, damit der Gegenbahn-Vertrag gilt.
  Geprüfte lokale Routen statt äußerer Umwege; unsichere Kandidaten entfallen.
- Treffer verpuffen synchron an Ort und Stelle. Danach verschwinden ihre Sockel,
  übrige Karten rutschen unter Erhalt der Reihenfolge zusammen, Bahnen werden
  neutral kürzer. Während eines Wechsels wird das Nachrutschen zurückgestellt.
- Der Platz bestimmt Kartengröße und gleichzeitige Paarzahl. Desktop/Tablet
  erhalten mindestens 64px Karten; größere Sets laufen in Abschnitten. Gefundene
  Paare kommen dabei nicht zurück. Hochkant/Querformat neu vermessen.
- Nach dem letzten Paar treffen sich die zwei Bahnpunkte in der Mitte und lösen
  einen gemeinsamen großen Sternenwirbel mit Klang aus; danach „Noch mal!“.

## Architektur und Lebenszyklus

`app.js` besitzt Navigation/Setauswahl und die Bonus-Sessions; `stopBonusGames()` zerstört beide vor Navigation.
`catch-pair.js` stellt `LernwortCatchPair.mount(root, {items,title,urlFor})` bereit;
der Rückgabewert hat `destroy()`. Optional reserviert `viewportReserve` die
Höhe der umgebenden Oberfläche; die App nutzt eine gemeinsame Kopfzeile mit
Zurück/Spielname/Ton statt zwei gestapelter Leisten. Vor dem Ersetzen des Spiels immer zerstören:
Timer, Resize-/Visibility-Listener, RAF-Job, Web-Animations und eigener AudioContext
werden beendet; veraltete Promises dürfen keinen Treffer/Wechsel mehr abschließen.
Karten bleiben während des Spiels gemountet.

`selection={lane,slot}` gehört zum festen Sockel; sein aktueller Inhalt wird nur
abgeleitet. Beim Transport wandert ausschließlich derselbe Einsatzknoten kurz in
die dekorative Bewegungsebene und nach erfolgreichem Abschluss in den Zielbutton.
Bei Abbruch zurücksetzen statt einen halben Transport übernehmen. Größenwechsel
lösen eine Auswahl; gefundenen Fortschritt erhalten. Beim Zusammenrücken bleibt
ein gewählter Sockel räumlich verankert. Fokus wird nach einem Grid-Neuaufbau auf
denselben gültigen Sockel zurückgesetzt, nicht dem vorherigen Bild hinterher.
Hat der Nutzer inzwischen einen anderen Button fokussiert, bleibt dieser Fokus.

Die Sockelfarbe wird zentral aus dem Karten-/Bewegungszustand abgeleitet
(`socketState` → `data-state`). Fehler-Timer werden beim nächsten Zustand,
Größenwechsel oder Zerstören entfernt. Auswahl, Treffer und Tausch erhalten keine
zusätzlichen unabhängigen Zustandsmodelle; alte Treffer können neue Plätze nicht
einfärben. Farbe ergänzt vorhandene Bewegung, Klang und zugängliche Statusmeldungen.

Geometriefunktionen sind DOM-frei und für Node-Tests exportiert. Das Spiel nutzt
die gemeinsame `assetUrl`-Schicht und die schon pro Set vorgeladenen Bilder.
Fehlgeschlagene Bilder sperren den Start und bieten Wiederholung. Kein neues
Datenmodell, keine Dependency, kein API-Key und keine neuen Sprach-/MP3-Dateien.
Effektklänge entstehen lokal über WebAudio und werden beim ersten echten Tap
freigeschaltet. Bilder und MP3s bleiben unverändert.

`catch-pair.css` ist auf das Spiel bzw. die neue Bonusauswahl begrenzt. Bewegung
verwendet Transform/Opacity, keine animierten Layout-/Blur-Effekte. Verdeckte Tabs
planen keine neuen Wechsel, RAF-Zeit wird gegen Sprünge nach Suspendierung begrenzt;
reduzierte Bewegung verkürzt die Animationen. Keine Zusage für eine bestimmte
Bildrate ohne Messung auf dem Zielgerät.

Runtime-Scripts und CSS gehören gemeinsam in Index, PWA-Precache und
`deployment/build_release.py`. Medieninventar nur bei Inhaltsänderungen neu bauen.

## Prüfung

`node --test tests/*.test.cjs`: Slotgrößen, ein einzelnes Paar, Nachbar-/Fernwege,
lokale Gegenbahn-Wege, Kandidatenauswahl und kollisionsfreies Nachrutschen.
`tests/browser/catch-pair-smoke.html` ist eine explizit startbare Testseite für
Auswahlverlust beim Wechsel, Abschluss/Replay auch bei Größenänderung während
der letzten Schrumpfanimation, Abbruch beim Ankündigen/Treffen/
Bildladen und Größenwechsel; nicht Teil des Runtime-Exports.
`tests/browser/catch-pair-layout-audit.js` prüft nur lesend Touchgrößen, Bildladen,
Wortbreiten und horizontalen Überlauf auf dem gemounteten Board.

Zusätzlich reale Browserabläufe: vollständiges Set mit mehreren Abschnitten,
lange Wörter (Tools), Neustart, Zurück während Wechsel/Treffer/Laden, Auswahlverlust
bei tatsächlichem Wechsel, Größen-/Orientierungswechsel und versteckter Tab.
Bestehende Hören-/Lesen-Matrix nach `RENDERING.md` weiter prüfen.
Desktop-/Tablet-Viewport ist keine physische iPad-9- oder Safari-GPU-Abnahme.

## Entscheidung – 2026-10-24

Bonusauswahl statt Ersatz eines bisherigen Spiels. Eigenes kleines Runtime-Modul
statt weiterem großen Block in `app.js`; bestehende Setdaten/Asset-Schicht bleiben
maßgeblich. Der Visualisierungsprototyp ist Referenz, kein Runtime-Datenbestand.

## Abnahmestand – 2026-10-24

- 43 Node-Tests, Server-/Inventarprüfung; Browser-Audits für Desktop 1440×900,
  Tablet 810×1080 / 1080×810 sowie 390×844, 844×390, 320×568 / 568×320.
- Vollständiges Tools-Set (15 Paare, mehrere Abschnitte), lange Wörter, Abschluss,
  Neustart und Zurück im Browser geprüft; Hören/Lesen-Matrix ohne neue Auditfehler.
- Lebenszyklus-Smoke-Test mit tatsächlichem DOM bestanden; zusätzlich gelbe
  Tauschankündigung, selektiver roter Fehlversuch mit Ablauf und zwei grüne
  Treffersockel geprüft.
  Native Sockelauswahl per Leertaste, getrennte Hebe-/Fahrt-/Senkphasen sowie
  ruhende, wirklich im Button enthaltene Einsätze geprüft. Geometrieprüfung
  berücksichtigt zusätzlich Hub, Kurvenneigung und ein kurzes Sockelrütteln.
  Abschluss wird aus dem Rundenstand auch nach abgebrochener Schrumpfanimation
  ausgelöst; eine Größenänderung darf ihn nicht verschlucken.
- Gemeinsame Kopfzeile hält das komplette Board bei 1440×900, 810×1080 und
  1080×810 ohne vertikalen Scrollbedarf sichtbar; kleine Handy-Querformate dürfen
  vertikal scrollen. Memory-/Colours-Bonuspfade zusätzlich im Browser geöffnet.
- Physisches iPad 9 und abschließende Safari-Sicht-/Tonprüfung bleiben offen:
  die vorhandene Safari-Sitzung wurde vom Nutzer aktiv bedient; nicht unterbrechen.
