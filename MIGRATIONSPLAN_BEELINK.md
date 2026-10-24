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
- Geplanter Cutover: gepushter sauberer Git-Freeze, neuer detached Release mit LocalService-RX, Kandidat auf freiem Port 5195 mit Readiness/Assets; danach öffentlicher Browser- und Audiotest. Noch nicht als veröffentlicht abgenommen.
