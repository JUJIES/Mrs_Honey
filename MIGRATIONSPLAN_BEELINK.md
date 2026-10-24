# Migrationsplan Beelink: Mrs Honey

Diese eine Datei ist Plan, Entscheidungsprotokoll und Abschlussnachweis. Statuswerte: `offen`, `bestanden`, `blockiert`, `nicht relevant`. `Nicht relevant` benötigt einen Grund.

## 1. Auftrag und kleinster Betriebsvertrag

| Feld | Entscheidung |
|---|---|
| Projekt / Zweck | Mrs Honey, dauerhaft erreichbare Englisch-Lern-PWA mit lokaler Whisper-Sprechprüfung |
| Klasse | `service`, weil App und stabile URL dauerhaft verfügbar sein sollen |
| Quellrepository / Branch | `git@github.com:JUJIES/Mrs_Honey.git`, `main` |
| Produkt-Freeze-Commit auf GitHub | `fda31f55b1a856babffd1c8c6196c4cbcc9da4f3` |
| Readiness-Dokumentationscommit | `21bdbf5e5255f48474a2be4bb1d52a6e945434db` |
| Schreibender Arbeitsort | Mac-Repository; Beelink `_dev\Mrs_Honey` reproduziert nur gepushte Commits |
| Persistente Daten | keine Lern- oder Nutzerdaten; Runtime enthält nur reproduzierbare Dependencies, temporäre Dateien und redigierte Betriebslogs |
| Secrets / personenbezogene Daten | Mikrofon-Audio und Transkript nur anfragebezogen; keine dauerhafte Speicherung; Named-Tunnel-Credential ausschließlich ACL-geschützt außerhalb von Git |
| Startmodell | zwei getrennte automatische Windows-SCM-Dienste für App und Named Tunnel |
| Öffentliche URL | `https://mrshoney.jujies.app` |
| Control-Center-Scope | App status-only: Status, Details, Logs und Ereignisse; keine Liveaktionen |
| Nichtziele | keine neuen Lernfeatures, kein Redesign, keine Benutzerkonten, kein Fortschritts-Backend und kein Cleanup bestehender Beelink-Dienste |

## 2. Gates und Evidenz

| Gate | Status | Knappe Evidenz oder Blocker |
|---|---|---|
| Produktlogik, Datenfluss, Persistenz und bisheriger Startweg verstanden | bestanden | Statische PWA und `/api/speech/check` laufen same-origin; Speech-Dateien sind temporär; Browserzustand ist nicht persistent |
| Dirty-/Remote-/Branch-Drift geklärt; Freeze-Commit auf GitHub vorhanden | bestanden | Freeze `fda31f55b1a856babffd1c8c6196c4cbcc9da4f3` ist gepusht und von `origin/main` erreichbar |
| Readiness-Commit enthält nur Plan-/Evidenzdokumentation und ist gepusht | bestanden | `21bdbf5e5255f48474a2be4bb1d52a6e945434db` ändert ausschließlich diesen Migrationsplan |
| Secrets, Nutzerdaten, Logs und Backup-Scope klassifiziert | bestanden | keine App-Secrets oder persistenten Nutzerdaten; Transkripte standardmäßig redigiert; Tunnel-Credential bleibt externe geheime Konfiguration |
| `_dev` reproduziert Setup, Tests und Produktverhalten | bestanden | Beelink-`_dev\Mrs_Honey` ist sauber auf `main`/`21bdbf5...`; ein separater Freeze-Worktree bestand 5 Unit-Tests, Syntax- und Readiness-Smoke |
| Kandidat auf freiem Port lokal gesund / Tool-Dry-run bestanden | bestanden | lokaler integrierter Server auf 5190; `/health/ready` 200; reales `cat.mp3` wurde korrekt als `cat` erkannt |
| Persistenz und Runtime liegen außerhalb des Releases | bestanden | minimaler Release enthält nur 856 Runtime-Dateien; Modell, Binaries, Temp und Logs liegen außerhalb |
| Unveränderlicher `_services`-Release erzeugt | bestanden | sauberer detached Git-Worktree `_services\Mrs_Honey\fda31f55...`, exakt auf dem Produkt-Freeze |
| App-Lifecycle unabhängig vom Control Center nachgewiesen | bestanden | `BeelinkApp-MrsHoney`, Automatic/LocalService; Restart und erzwungener Child-Crash führten jeweils zu neuem gesundem Listener |
| Named-Tunnel-Lifecycle separat nachgewiesen | bestanden | `BeelinkTunnel-MrsHoney`, Automatic/LocalService; Tunnel-Restart ließ die lokale App unangetastet und stellte vier Edge-Verbindungen wieder her |
| Rollback vor Cutover konkret und ausführbar geprüft | bestanden | App- und Tunnel-Dienst lassen sich getrennt stoppen/starten; ursprüngliches Runtime-Paket bleibt unter `_runtime\Mrs_Honey\rollback` rückholbar; Route ist separat entfernbar |
| Verschlüsseltes Backup plus isolierte Restore-Probe bestanden | nicht relevant | keine persistenten App-/Nutzerdaten; Runtime-Abhängigkeiten sind hashverzeichnet und reproduzierbar, das ersetzbare Tunnel-Credential bleibt ACL-geschützt außerhalb von Git |
| Kleinster Registry-Vertrag ohne Sonderlogik validiert | bestanden | Control Center `2ea37cebdb717e2a29c880c5a58212a7f55d3b96`: `mrs-honey`, status-only, keine Mutationen, sechs registrierte Logs |
| Lokaler und – falls relevant – öffentlicher Postcheck bestanden | bestanden | lokal und öffentlich `/health/ready` 200; Root 200; echter öffentlicher `cat.mp3`-Speech-Check korrekt in 6,3 s |
| Autostart/Recovery geprüft; voller Reboot durchgeführt oder als offenes Gate benannt | bestanden | beide Dienste Automatic, App-/Tunnel-Restart und App-Crash-Recovery bestanden; voller Host-Reboot bleibt mangels gesonderter Freigabe offen |
| Abschlussstand in GitHub, `_dev`, `_services`, Runtime und Registry konsistent | bestanden | GitHub/`_dev` Readiness `21bdbf5...`, Produktivrelease Freeze `fda31f55...`, Runtime-Hashes dokumentiert, Control Center meldet `healthy` |

## 3. Entscheidungen und Abweichungen

- Der öffentliche Origin bleibt ohne zusätzliche Login-Seite, damit die Lernabläufe unverändert bleiben. Uploadlimit, Einzel-Whisper-Slot auf dem Beelink und redigierte Logs begrenzen die zusätzliche Internetangriffsfläche.
- Das bestehende Same-Origin-Python-Muster bleibt erhalten; es wird kein paralleler Reverse-Proxy- oder Container-Stack eingeführt.
- Der minimale Build-/Auditexport ist eine überprüfbare Runtime-Auswahl aus dem Freeze-Commit und enthält keine Entwicklungs- oder Referenzartefakte.
- Der produktive `_services`-Pfad ist nach der Control-Center-Vorabnahme ein sauberer detached Git-Worktree des Freeze-Commits. Das minimale 856-Dateien-Paket bleibt Build-/Auditnachweis, wird aber nicht als produktiver Registry-Pfad verwendet.
- Auf dem Intel N150 war `ggml-small.bin` korrekt, aber mit rund 21,5 Sekunden pro Prüfung zu langsam. `ggml-base.en.bin` erkannte vier repräsentative Wörter korrekt und senkte die warme öffentliche `cat`-Prüfung zuletzt auf 6,3 Sekunden; `small` bleibt Fallback.
- Python, whisper.cpp, Modelle, FFmpeg, WinSW, cloudflared und Servicekonfigurationen sind mit Versionen und SHA-256 unter `deployment/windows/runtime-dependencies.json` festgehalten.

## 4. Rollback

- Vorheriger Zustand: keine Mrs-Honey-App, kein Mrs-Honey-Dienst und kein DNS-Eintrag auf dem Beelink.
- Exakte Rückfallaktion: Tunnel-Dienst und App-Dienst stoppen; öffentliche Route entfernen oder auf 404 setzen; neuen Release und Runtime für Diagnose behalten.
- Nachweis: getrennte App-/Tunnel-Restarts und App-Crash-Recovery bestanden. Das vor der Git-Worktree-Ausrichtung aktive Runtime-Paket liegt rückholbar unter `_runtime\Mrs_Honey\rollback\release-package-fda31f55-20260726-0745Z`.
- Cleanup bleibt separat und ist nicht freigegeben.

## 5. Abschluss

- Ergebnis: `bestanden`
- Produkt-Freeze-Commit: `fda31f55b1a856babffd1c8c6196c4cbcc9da4f3`
- Readiness-Dokumentationscommit: `21bdbf5e5255f48474a2be4bb1d52a6e945434db`
- Control-Center-Commit: `2ea37cebdb717e2a29c880c5a58212a7f55d3b96`
- Lokaler Healthcheck: `http://127.0.0.1:5900/health/ready` → 200
- Öffentlicher Healthcheck: `https://mrshoney.jujies.app/health/ready` → 200
- Öffentlicher Produktcheck: Start-, Lernset-, Modus- und Sprechen-Ansicht im Desktop-/Mobil-Viewport; Speech-API mit realem MP3 → korrekt/200
- Backup-/Restore-Nachweis: `nicht relevant`, weil keine persistenten App-/Nutzerdaten existieren; Abhängigkeiten sind reproduzierbar und hashverzeichnet
- Bewusst offene Praxischecks: voller Host-Reboot erst nach ausdrücklicher Freigabe; reale Mikrofonberechtigung einmal auf dem konkreten Handy bestätigen

## 6. Folgeupdate 2026-10-04 – Kompetenzauswahl

- Geprüfter App-Release: `75d089cf52ec6441ad4f33aac44d936b5cfae338` (GitHub `main`). Drei neue Kompetenzmotive, kurze Lernziele und responsives Kartenlayout; keine Änderung an Übungen, Audio, Setdaten oder Speech-API.
- Checks vor Cutover: JS-Syntax und Diffprüfung, fünf Speech-Unit-Tests, Browserprüfung Desktop/Handy/Querformat ohne horizontalen Überlauf, Start/Zurück in allen drei Modi. Beelink-Kandidat auf freiem Port 5191: vollständige Speech-Readiness und sechs UI-/Asset-Requests erfolgreich.
- Neuer `_services\Mrs_Honey\75d089cf52ec6441ad4f33aac44d936b5cfae338`-Worktree bleibt sauber und detached. Bestehender App-Dienst, Tunnel, Runtime, Port und Zugriffsmodell bleiben bestehen.
- Rückfall vor Cutover festgelegt: `service-5900.before.xml` unter `_runtime\Mrs_Honey\ops\competencies-20261004` wiederherstellen und ausschließlich `BeelinkApp-MrsHoney` neu starten. Alter Freeze-Worktree bleibt erhalten; keine Route oder Credentials ändern.
- Control Center: ausschließlich Versions-/Pfadnachweise und WinSW-XML-Hash für `mrs-honey` anpassen, ausgehend vom tatsächlich laufenden Control-Center-Commit `de5226560ddf24265ee733e26d50da345b0f82b8`. Andere Workloads, Zugriffskonfiguration und Aktionen müssen byte-/semantikgleich bleiben. Vorherige Task-Aktion und CC-Release sind der getrennte Rückfall.
- Produktiver Cutover und öffentlicher Postcheck: **bestanden**. App-Dienst läuft mit XML-Hash `d0040a86c6c553a13625695fd38b2ce6ea932f0b2d3cbc9c448dee2e03524536`. LocalService erhielt ausschließlich RX auf den neuen Release (wie beim bisherigen Stand). Der erste, wegen fehlender ACL gescheiterte Start fiel erfolgreich auf den alten Stand zurück; anschließender Neustart gesund.
- Öffentlich: Root und `/health/ready` 200, drei neue Motive vollständig geladen, Desktop 1280×720 und Handy 390×844 ohne horizontalen Überlauf; Screenshots unter `references/app_screenshots/mode_competencies/`. Reales `cat.mp3` über Speech-API mit `requiresSentence=false`: korrekt/200 in 5,96 s. Dies ist ein Erkennungs-Smoke, kein Nachweis einer erlaubten Sprech-Antwort in der Satzübung.
- Control Center: Registry-/Sicherheits-/Präsentationstests (25) und Build bestanden. Kandidat 4191 gesund. Release `cb2479cd1c6a6245a6ae9b566a272f0e3d503515` aus dem bisherigen aktiven Stand, ohne andere Workload-Änderungen, gepusht und sauber detached. Task-Aktion nach Sicherung und owner-verifiziertem Stop angepasst; alle externen Zugriffspfade unverändert. Erster Start erreichte das 60-s-Verifikationsfenster nicht und wurde sauber zurückgerollt; Wiederholung erfolgreich, Owner `verified`, privates HTTPS-Healthcheck 200.
- Control-Center-Abnahme: `mrs-honey` **healthy**, tatsächlicher Git-Commit `75d089cf...`, `dirty=false`, Prozess-Ownership `verified`. Spätere reine Doku-/Nachweiscommits auf App-`main` sind bewusst nicht der Runtime-Freeze; `remote_commit_available` ist in diesem Fall nur ein Dokumentationshinweis.

## 7. Folgeupdate 2026-10-24 – iPad-/Mobil-Ladefehler

- Anlass: Auf dem iPad fehlten Bildkarten, Audio spielte teilweise nicht und der Bärenkopf erschien verschoben. Die frühere HTTP-/Desktop-Stichprobe war kein ausreichender Geräte- oder Wiedergabenachweis.
- Korrektur: gemeinsam freigeschaltetes Audioelement, getrennte Lade-/Wiedergabezeitfenster, nichtblockierende Lipsync-Daten, wiederholbare Bild-/Setanfragen, Freigabe erst bei vier dekodierten Karten und ein quadratisches Bären-Koordinatensystem. App/CSS `mobile-reliability-3`, PWA-Cache v31, vollständige Set-Bundles und exakte Cover-URLs im Precache.
- Vorabprüfung bestanden: 8 JS-Regressionstests, 5 Speech-Tests, Syntax/Diff; alle 100 öffentlichen Lernbilder entsprechen den lokal erfolgreich dekodierten PNGs. 18 Hören-/Lesen-Startpfade ohne defekte Karten. Browser-Fehlerserver: erste Bildanfragen 503 → erfolgreiche Wiederholung; Audio 3,2 s verzögert → vollständig abgespielt. Tablet 810×1080/1080×810 visuell geprüft.
- Rollback: bestehender sauberer Freeze `75d089cf52ec6441ad4f33aac44d936b5cfae338` bleibt bestehen. Vor Aktivierung `service-5900.xml` unter `_runtime\Mrs_Honey\ops\mobile-reliability-20261024` sichern; bei fehlender Readiness nur `BeelinkApp-MrsHoney` stoppen, XML zurückkopieren und denselben Dienst starten. Tunnel und Speech-Konfiguration bleiben bestehen.
- Deployment bestanden: Produkt-Freeze `f7aec00ce766be825dee6bd5e398111302a6dc1b` gepusht und als sauberer detached `_services`-Worktree mit LocalService-RX bereitgestellt. Kandidat 5192: vollständige Readiness und sechs UI-/Assetpfade 200; Kandidatenprozess anschließend beendet. App-Dienst über dieselbe feste Service-ID aktiviert, XML-SHA256 `101f6e47714d9c105f1af1d7e9075aeab68faee0944495309a1df57c06df0464`. Tunnel unverändert.
- Öffentlicher Postcheck bestanden: `/health/ready` 200, Index enthält `mobile-reliability-3`; Emotions-Hören lädt vier Karten und Wort-Audio endet regulär, Lesen spielt itembezogenes Feedback vollständig ab und wechselt auf 2/10. Öffentlich zusätzlich 810×1080, 1080×810 und 390×844 ohne horizontales Überlaufen und ohne defekte Bildkarten geprüft; Screenshots unter `references/app_screenshots/mobile-reliability-20261024/`.
- Bekannter separater Betriebsdrift: Das laufende Control Center `cb2479cd...` referenziert weiterhin den vorigen Mrs-Honey-Freeze; dessen Versions-/XML-Nachweis muss separat aktualisiert werden. Keine Control-Center-/Task-/Zugriffskonfiguration in diesem App-Fix geändert. App und Tunnel sind davon unabhängig gesund.
- Reales iPad/Safari bleibt Praxisabnahme, kein simulierter Viewport gilt als physischer Gerätetest.

## 8. Folgeupdate 2026-10-24 – Unauffälliges Vorladen

- Autorisiert: ausgewähltes Set und gemeinsame Dateien automatisch im Hintergrund vorbereiten; keine Downloadbedienung. Oberfläche und hashversionierte Inhalte getrennt speichern, aktuelle/nächste Aufgabe priorisieren, vollständige Dateien behalten, Abbrüche automatisch wiederholen.
- Architektur/Decision Log: `docs/OFFLINE_LOADING.md`. Keine neuen Dependencies oder persistenten Serverdaten. Sprechprüfung weiterhin online. JSON-/SVG-Zeilenenden für identische Hashes auf Mac/Windows festgelegt.
- Regression: Das vorhandene Audio-Bundle ist `{files:[...]}`; die bisherige reine Set-Prüfung löste unnötige JSON-Abfragen aus und konnte Offline-Rückmeldungen verhindern. Bundledaten werden jetzt direkt unterstützt.
- Tests vor Release: 21 JS-Tests, 5 Speech-Tests und 2 Inventar-/Portabilitätstests, Syntax, Diff, aktuelles 733-Dateien-Inventar und minimaler Runtime-Export. Browser: automatisches Vorladen und erneutes Öffnen bei gestopptem Origin; Hören mit Audio und vollständiges Animals-Leseset bis Memory. Finaler Colours-Durchlauf nach vollständigem Vorladen und anschließendem Serverstop: alle zehn Lesefragen mit tatsächlicher lokaler Audiowiedergabe, danach Wimmel-Bonus mit Bild und regulär beendetem Prompt. Nachweis: `references/app_screenshots/background-cache-20261024/offline-bonus.jpg`.
- Rollback bleibt der unmittelbar vorige App-Freeze `f7aec00ce766be825dee6bd5e398111302a6dc1b`; Service-XML vor Cutover unter `_runtime\Mrs_Honey\ops\background-cache-20261024` sichern. Kandidat auf freiem Port 5193 und GitHub-Freeze vor App-Aktivierung erforderlich. Nur `BeelinkApp-MrsHoney` umstellen; Tunnel und Control Center bleiben getrennt.
- Parallele Audio-CLI-/Provider-Arbeiten wurden unabhängig als `eb79a01` versioniert und sind Vorfahr dieses Commits; keine davon wurde in den Offline-Änderungssatz aufgenommen oder zurückgesetzt. Der minimale Runtime-Export schließt Generatoren/CLI weiterhin aus; vorhandene Medien und Server-API wurden dadurch nicht geändert.
- Die erste Windows-Vorabprüfung fand native Backslashes in Lipsync-Inventarschlüsseln und plattformabhängige Script-Bundle-Hashes. Kandidat blieb inaktiv; Generator auf POSIX-URLs und Medien/JSON-Inventar begrenzt, Shell-Bundles getrennt. Aktivierung bestanden: Freeze `56413667cb8c8031859e181eb2ead28785962bfe`, sauberer detached Worktree mit LocalService-RX; Kandidat 5193 mit vollständiger Readiness und sieben Ressourcenpfaden gesund, anschließend beendet. Inventar auf Windows unverändert reproduzierbar (733 Dateien, Revision `69ea418066b0b570`). Service-XML-SHA256 `a871732bd4abf655d9a3a9f27c835c546b5b6958eee0b3616b370ba8d7544d89`; nur der App-Dienst wurde umgestellt, App und Tunnel laufen.
- Öffentlich bestanden: `/health/ready` 200, neue App-/Helper-/Inventar-URLs; fünf exemplarische JSON-/Lipsync-/MP3-/PNG-/SVG-Antworten entsprechen ihren Datei-Hashes. Emotions-Hören lädt vier Karten und verwendet nach automatischem Vorladen lokale Blob-Audios; Lesen spielt itembezogenes Feedback und wechselt regulär auf 2/10. Öffentliche Tabletansicht 810×1080 ohne Überlauf/Browserfehler: `references/app_screenshots/background-cache-20261024/public-tablet.jpg`.
- Physische iPad-Abnahme sowie separater Control-Center-Versionsabgleich bleiben offen. Parallele, noch uncommittete Memory-UI-Änderungen im Mac-Arbeitsverzeichnis wurden nicht in diesen Freeze aufgenommen.

## 9. Folgeupdate 2026-10-24 – Gesprochene Memory-Treffer

- Auftrag: bei jedem gefundenen Paar bestehende itembezogene Leseaufnahme ohne zusätzlichen Lobton/-satz, dazu flüssige gemeinsame Bild-/Wort-Hervorhebung. Kein neues Audio und keine neue Sprechprüfung.
- Vertrag und Decision Log: `docs/MEMORY_FEEDBACK.md`. Kartenknoten bleiben erhalten; 220 ms Flip-Vorlauf, Hervorhebung am echten Audiostart bis Ende, 220 ms Ausklang. Gemeinsamer freigeschalteter Player, volle Medienlautstärke, Wiederholungsknopf und sichtbarer Fehlerpfad. Satzende vor Siegessequenz.
- Vorab: 28 JS-Tests und 5 Speech-Tests, Syntax/Diff, unverändertes aktuelles Medieninventar. Browser-Durchlauf Animals/Lesen bis Memory; `cat`-Paar und Wiederholung mit real laufender, ungemuteter MP3 (1,666 s), genau zwei hervorgehobenen Karten und beendetem Player geprüft. Keine MP3-/Lipsync-/Setänderungen.
- Rollback vor Aktivierung: laufender sauberer Freeze `56413667cb8c8031859e181eb2ead28785962bfe` bleibt bestehen. Dienst-XML unter `_runtime\Mrs_Honey\ops\memory-feedback-20261024` sichern; bei fehlender Readiness nur `BeelinkApp-MrsHoney` stoppen, XML wiederherstellen und denselben Dienst starten. Tunnel, Speech-Umgebung und Control Center unangetastet.
- Cutover **bestanden**: erster Audio-Freeze `a75b565d8498a7f90ecd7e48d8f5f4ce11f7a87a`, danach gezielte mobile Label-Korrektur im endgültigen Freeze `6631217569d4ad0067da05562eb14b51eaefb575`. Beide gepusht, sauber detached und mit ausschließlich LocalService-RX; Kandidat 5195 jeweils mit vollständiger Readiness und acht Ressourcenpfaden erfolgreich, Kandidatenprozess danach beendet. App-Dienst automatisch/laufend, finaler XML-SHA256 `8f15f20d2abdec54c8c3d87fe29458abcabcfb78dadf89b2e9f6250070225436`. UI `memory-feedback-2`, Shell-Cache v37; Medieninventar unverändert.
- Öffentlicher Postcheck **bestanden**: `/health/ready` 200; vollständiger Transport-Lesedurchlauf und alle acht Memory-Paare mit real laufender, ungemuteter Trefferaufnahme und jeweils genau zwei hervorgehobenen Karten. Beim letzten Paar „helicopter“ Ansage vor Siegeszustand; danach abgeschlossene Siegeswiedergabe und wieder bedienbarer Lautsprecher. Der finale Layout-Freeze verändert gegenüber dem so geprüften Audio-Freeze kein App-JavaScript.
- Finale Mobil-/Tabletprüfung **bestanden**: erneut Transport bis Memory mit UI `memory-feedback-2`, „motorcycle“ 2,775 s vollständig beendet, korrekte Hervorhebung während Wiedergabe und Wiederholung. 390×844 und 810×1080 ohne horizontalen Überlauf oder defekte Kartenbilder. Das lange Kartenlabel ist auf dem Handy kompakt (ca. 14 px Höhe statt zuvor ca. 52 px im schmaleren Zwischencheck); das Bild bleibt sichtbar. Screenshots unter `references/app_screenshots/memory-feedback-20261024/`.
- Endgültiger Rückfall: XML aus `_runtime\Mrs_Honey\ops\memory-feedback-20261024-layout\service-5900.before.xml` stellt den geprüften Audio-Freeze `a75b565...` wieder her; der vorherige komplette Betriebsstand `5641366...` samt XML bleibt im ursprünglichen `memory-feedback-20261024`-Ordner erhalten. Kein Cleanup, kein Reboot, keine Tunnel- oder Control-Center-Änderung.
- Physisches iPad/Safari und Geräte-Lautstärke bleiben Praxisprüfung. Der bereits vorbestehende, separat dokumentierte Control-Center-Versions-/XML-Nachweisdrift wird von diesem App-Update nicht geändert.

## 10. Folgeupdate 2026-10-24 – Safari-Kopfbeschnitt

- Gemeldeten Fehler direkt in der bestehenden echten Mac-Safari-Sitzung reproduziert: Kopf/Ohrbereich horizontal an der oberen Filterfläche abgeschnitten. Lokaler Fix in separatem Safari-Tab: vollständiger Kopf im Ruhezustand und während Audiowiedergabe/Mundbewegung.
- Enger CSS-Fix: äußerer `drop-shadow`-Filter entfernt, radialer Bodenschatten mit eigenem Begrenzungsrahmen. Avatar-Geometrie, Kopf-/Augen-/Mundanimation, Medien und Produktlogik bleiben bestehen. CSS `safari-avatar-1`, Shell v38, App-JavaScript `memory-feedback-2` unverändert. WebKit-Referenz: `https://bugs.webkit.org/show_bug.cgi?id=313665`.
- Vorabchecks: 28 vorhandene JS-/Memory-/Cache-Tests, 5 Speech- und 2 Inventartests; Inventar weiter 733 Dateien / `69ea418066b0b570`, Syntax-/Diffprüfung.
- Rollback: sauberer aktueller Freeze `6631217569d4ad0067da05562eb14b51eaefb575`; Dienst-XML vor Cutover unter `_runtime\Mrs_Honey\ops\safari-avatar-20261024` sichern. Kandidat auf freiem Port 5196; nur `BeelinkApp-MrsHoney` umstellen, Tunnel und Control Center nicht verändern.
- Aktivierung **bestanden**: Freeze `cd55b99a7aafc6a2eb6726fd301eef398fa800f0`, sauber detached mit LocalService-RX; Kandidat 5196 inklusive Inventarprüfung, vollständiger Readiness und acht Ressourcenpfaden gesund, anschließend beendet. Dienst-XML-SHA256 `96b237698fb30872f967c7246545b4f85c800c58ef1ce4bb9c0a84637f7575f8`. App/Tunnel laufen, öffentliche `/health/ready` 200 und Index mit CSS `safari-avatar-1`.
- Öffentlicher Postcheck **bestanden**: ursprünglichen Safari-Spieltab nach Update auf Home/Hören geöffnet, vollständiger Kopf in Ruhe und während Wortwiedergabe, vier Bildkarten vollständig sichtbar. Lokaler Testtab geschlossen; ursprünglicher Nutzer-Tab bleibt erhalten. Nachweise (nur Seiteninhalt, Browserleiste ausgespart): `references/app_screenshots/safari-avatar-20261024/`.
- Reales Mac-Safari geprüft; physisches iPad bleibt gesonderte Geräteprüfung. Vorbestehender separater Control-Center-Versionsnachweisdrift bleibt unverändert.

## 11. Folgeupdate 2026-10-24 – Rendering-Härtung

- Autorisierte Weiterhärtung: nur noch eine Runtime-Avatar-Darstellung; überholte SVG-/Portrait-CSS-Regeln entfernt. Animationsframes erst nach Decode tauschen, bei Fehlern aktuellen Zustand behalten, dekorative Timer/RAF bei verdecktem Tab pausieren, lange Atempausen sanft neu starten und reduzierte Bewegung respektieren. Lern-/Speech-/Exportlogik und Medien bleiben bestehen.
- Freigabevertrag `docs/RENDERING.md` und `AGENTS.md`; lesender Audit `tests/browser/avatar-layout-audit.js`. DOM-Geometrie ersetzt keine Safari-/Compositor-Sichtprüfung.
- Checks vor Release: 35 JS-/Cache-/Memory-/Animationstests, 5 Speech- und 2 Inventartests; unveränderte 733 Dateien / Revision `69ea418066b0b570`, Syntax und Diff. 14 Browser-Matrixfälle ohne Probleme: Hören/Lesen/Sprechen bei 390×844, 810×1080, 1080×810, 844×390 plus Lesen bei 320×568 und 568×320. Echte Mac-Safari-Sichtprüfung in Ruhe, bei Wort-Audio und nach Tabwechsel bestanden. Nachweise: `references/app_screenshots/render-stability-20261024/`.
- Rollback: aktueller sauberer Freeze `cd55b99a7aafc6a2eb6726fd301eef398fa800f0`; Dienst-XML unter `_runtime\Mrs_Honey\ops\render-stability-20261024` sichern, Kandidat auf freiem Port 5197 prüfen. Nur App-Dienst umstellen; Tunnel/Control Center bleiben unverändert. App/CSS `render-stability-1`, Shell-Cache v39.
- Aktivierung **bestanden**: sauberer Freeze `f76ae1ff8871d1f4df4efc499e2c15baa6958023`, Kandidat 5197 mit Inventar, Readiness und acht Ressourcenpfaden erfolgreich, danach beendet. Dienst-XML-SHA256 `e8d36c920c802f0c428c0ef4636eba7dfc5deeb01f109623581296ea17fe445e`; App und Tunnel laufen. Rollback-XML liegt im oben genannten Ops-Ordner.
- Öffentlicher Postcheck **bestanden**: `/health/ready` 200 und App/CSS `render-stability-1`; öffentlicher DOM-Audit ohne Befund. Echte Mac-Safari-Ansicht nach Shell-Aktualisierung vollständig, Wortwiederholung bedienbar und Tab-Rückkehr ohne Kopfbeschnitt; Nachweis `safari-public.jpg`. Lokale Safari-Sprechansicht zuvor ebenfalls visuell geprüft. Physisches iPad bleibt gesonderte Praxisabnahme; keine Garantie gegen sämtliche künftigen Browserfehler. Tunnel/Control Center unverändert.

## 12. Folgeupdate 2026-10-24 – Bonusspiele und Challenge

- Autorisierter Gesamtstand: Catch a Pair mit Sockeln, Word Blaster mit generierter
  Gelenkkanone, Zieh-/Loslasssteuerung, drei Stufen und 60-Sekunden-Challenge.
  Lokale Challenge-Top-10 pro Set/Stufe; keine Speicherung von Namen auf dem Server.
- Vorab: 69 JS-Tests, 8 Server-Tests, Medieninventar 740 Dateien / `9d401a9541925218`.
  Gesten-/Lifecycle-Smokes, echte 60-Sekunden-Runde mit isoliertem Testspeicher und
  36 Kombinationen aus Stufe/Modus/Viewport bestanden; Memory/Catch a Pair weiter
  erreichbar. Physisches iPad und abschließende Safari-Geräteabnahme bleiben offen.
- Veröffentlichungsgrenze korrigiert: der Git-Worktree enthält Referenz-/Tool-Dateien;
  HTTP liefert nur App-Entryfiles, Assets und Setdaten. Private-/Quellpfade und
  Traversal sind per HTTP-Test gesperrt. Export enthält nur aktuelle Laufzeitdateien.
- App/CSS `word-blaster-levels-2`, Shell v56. Vorhandene MP3s unverändert.
- Rückfall vor Cutover: laufender sauberer Freeze `f76ae1ff8871d1f4df4efc499e2c15baa6958023`
  und bestehende Dienst-XML. XML in separatem Ops-Ordner sichern, Kandidat auf
  freiem Port prüfen. Nur `BeelinkApp-MrsHoney` umstellen, Tunnel und Control Center
  unverändert lassen. Online-Abnahme und exakte Release-ID werden danach ergänzt.

- Aktivierung **bestanden**: Freeze `bb8bacd728bc3036215a91de0256507266491284` ist
  auf GitHub, im sauberen detached `_services`-Worktree und als Eigentümer des
  Listeners 5900 bestätigt. Windows: erneut 69 JS- und 8 Server-Tests sowie
  unverändert reproduzierbares Inventar bestanden. Kandidat 5198 mit vollständiger
  Speech-Readiness, acht Ressourcen und sechs gesperrten Quellpfaden erfolgreich;
  Kandidatenprozess anschließend beendet. LocalService erhielt nur RX.
- Nur App-Dienst umgestellt; App und Tunnel laufen. Aktive Dienst-XML-SHA256:
  `a7ae85c25f89af3b2d601f42f12ef8563a7866d405af19fbb83a2bdf83f3ca24`.
  Rückfall: `_runtime\Mrs_Honey\ops\bonus-games-20261024-bb8bacd\service-5900.before.xml`
  wiederherstellen und ausschließlich `BeelinkApp-MrsHoney` neu starten; vorheriger
  sauberer Freeze bleibt vorhanden. Ops-Ordner enthält Kandidaten-/Test-/Aktivierungsnachweise.
- Öffentlich **bestanden**: `/health/ready` 200, elf Runtime-Ressourcen entsprechen
  dem Release (Text mit Windows-CRLF/LF-Normalisierung, PNGs bytegenau SHA-256).
  Fünf vorhandene Entwicklungs-/Referenzpfade liefern 403. Bestehende synthetische
  `cat.mp3` über öffentliche Speech-API: verfügbar, korrekt, Konfidenz 1.0.
- Öffentlicher Browser: neue App/CSS-Version und Inventar geladen; vollständige
  Animals-Leserunde mit zehn Treffern bis zur neuen Bonusauswahl. Catch a Pair
  mit echtem Paar und Zähler 1/10; Word Blaster mit Mittel/Challenge, geladenen
  Kapseln, Gelenkkanone, Countdown und Tastaturbedienung geöffnet. Keine Testnamen
  in öffentlichen Bestenlisten gespeichert. Nachweise: `public-catch-pair-20261024.png`,
  `public-word-blaster-levels-20261024.png`, `public-word-blaster-game-20261024.png`
  unter `references/app_screenshots/` (HTTP-gesperrt).
- Folgender reiner Doku-/Nachweiscommit auf `main` benötigt keinen erneuten
  Runtime-Cutover. Bestehender separater Control-Center-Versionsabgleich sowie
  physisches iPad/Safari bleiben außerhalb dieser Online-Abnahme. Kein Reboot,
  keine Tunnel-/Control-Center-Änderung und kein Cleanup früherer Releases.


## 13. Folgeupdate 2026-10-24 – Kanonensitz und Bandenbonus

- Autorisiert: Kanone tiefer im Lager, gestrichelte Fokusellipse entfernen und
  Bandenbonus online veröffentlichen. Runtime `word-blaster-bonus-2`, Shell v59;
  Bilder, MP3s und Setdaten bleiben unverändert.
- Challenge-Wertung direkt/eine/zwei Banden: 10/15/20 Punkte, gemeinsame
  Trefferprüfung für Anzeige und Highscore. Regelversion v2 trennt frühere
  gespeicherte v1-Ranglisten. Goldene Bonusplakette, Doppelring und Tonfolge.
- Vorab bestanden: 73 Node-Tests, 8 Server-Tests, Inventar 740 Dateien unverändert;
  Browser-Eingabe-Smoke, echter Minutentest samt Speicherung und echter
  Banden-Treffer mit 15 Punkten. Details in `docs/WORD_BLASTER.md`.
- Rollback vor Cutover: aktiver sauberer Freeze
  `bb8bacd728bc3036215a91de0256507266491284`; Dienst-XML separat sichern.
  Erst sauberen GitHub-Freeze auf freiem Kandidatenport 5198 prüfen, danach nur
  App-Dienst umstellen. Tunnel und Control Center bleiben unverändert.
  Exakter Release und öffentliche Abnahme folgen nach erfolgreicher Aktivierung.
