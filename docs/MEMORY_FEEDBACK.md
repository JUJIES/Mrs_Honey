# Memory: Wort und Trefferansage

## Produktlogik

- Bei jedem gefundenen Paar genau die vorhandene itembezogene `readFeedback.en`-Aufnahme aus der Leseübung abspielen. Kein vorgeschalteter Erfolgs-Cue, kein weiteres allgemeines „Great!“ und keine neuen Sprachdateien.
- Nach dem Umdrehen der zweiten Karte 220 ms für die Kartenanimation lassen. Der Player verwendet das bestehende, per Touch freigeschaltete Audioelement mit voller Medienlautstärke; die Aufnahmen selbst bleiben unverändert.
- Das echte `playing`-Ereignis startet die gemeinsame Hervorhebung der beiden neuen Trefferkarten und des Wortfelds. Keine unabhängig laufende Animationsuhr. `ended`, Fehler, Timeout oder Abbruch entfernen die Hervorhebung; CSS blendet sie über 220 ms aus. Danach geht das Spiel ohne zusätzlichen Bestätigungsklick weiter.
- Kartenknoten bleiben beim Aufdecken, Schließen und Treffen erhalten; ein Board-Rebuild würde die Flip-Übergänge und laufenden Audiozustand unterbrechen. Nur Start und abschließende Siegesansicht werden neu gerendert.
- Auf schmalen Hochkantgeräten erhalten dichte 4×4-/6×6-Raster kompakte Kartenlabels; lange Begriffe dürfen nicht das Bild vollständig verdecken. Das große Wortfeld bleibt die primäre Lesehilfe und kann lange Wörter bei Bedarf umbrechen.
- Während der Ansage sind weitere Spielzüge gesperrt, Zurück bleibt möglich. Alte asynchrone Abläufe dürfen nach dem Verlassen keine Sperre, Ansage oder Siegessequenz in einer neuen Runde auslösen.
- Der Lautsprecher neben dem letzten Wort wiederholt dieselbe Ansage. Bei Ladeverzögerung/Fehler gibt es einen Hinweis; eine blockierte Wiedergabe lässt das Spiel bedienbar und verweist auf diesen echten Wiederholungsknopf, nicht auf den hier fehlenden Bären.
- Falls eine Trefferaufnahme tatsächlich fehlt/fehlschlägt, nur auf die vorhandene Wort-/Aufgabenaufnahme dieses Items zurückfallen. Keine Manifest-Netzanfrage als Voraussetzung für eine gültige Setreferenz. Bei Autoplay-Blockade nicht eine zweite Aufnahme hinterherschicken.
- Letztes Paar erst vollständig aussprechen, dann die bestehende Siegessequenz. Kein Mikrofon, keine neue Lernprüfung, unveränderte Paarbildung und Schwierigkeitsgrade. `prefers-reduced-motion` behält die farbliche Kennzeichnung mit praktisch abgeschalteter Bewegung.

## Prüfung und Grenzen

`node --test tests/*.test.cjs` prüft Audio-/Cache-Regeln und Memory: Flip-Vorlauf, echter Wiedergabestart, Ende/Cleanup, Lautstärke, kein allgemeines Lob, Fallback, Wiederholung, Fehlpaar und Bildschirmwechsel.

Zusätzlich im Browser einen vollständigen Lernset-Durchlauf bis Memory, Trefferansage mit fortschreitender Audiozeit, beide Hervorhebungen während der Wiedergabe, Wiederholung und Abschlussfolge prüfen. Tablet-/Handy-Viewport ersetzt keinen physischen Safari-/Lautsprechertest; Geräte-Lautstärke und Stummschaltung bleiben außerhalb der App.
