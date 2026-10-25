# Agent Guide: Lernspiel Oskar MVP

This package is the current English-only MVP of the learning app.

Do not re-add German mode, German audio, or German set data unless explicitly requested.

## New Set Generation

For any future request to create a vocabulary set from a title and word list, follow:

```txt
docs/SET_GENERATION_PIPELINE.md
```

Default for new regular vocabulary sets:

- generate one square `768x768` scene-card PNG per word
- store images in `assets/images/<set_id>_scene/`
- use `display: "scene-card"`
- do not create transparent cutouts unless explicitly requested
- create new English MP3 prompts through `tools/render_openai_audio.py` (`gpt-audio-1.5`), following `docs/OPENAI_AUDIO.md`
- create item-specific English read-feedback MP3s for Lesen mode, e.g. `Yes! That's a cow.`
- use the user-approved warm, slow British English `alloy` profile in `tools/audio_profile.json` for all new audio; approved after three listening samples on 2026-10-24. Preserve this voice and direction unless the user requests a change; listen to new clips for content/quality before importing
- require transcript/MP3 QA and preserve the renderer metadata sidecars before importing MP3s
- rebuild set bundle files
- run `tools/sync_audio_assets.py` after importing MP3s so the audio manifest and Lipsync JSONs are updated together
- visually verify Hören, Lesen, and Sprechen in the app

## Audio Contract

The app currently expects local MP3 files only for English learning modes.

Required MVP inventory:

- `assets/audio/animals_01/en/*.mp3`: 20 files (10 item prompts + 10 read-feedback prompts)
- `assets/audio/body_parts/en/*.mp3`: 30 files (15 item prompts + 15 read-feedback prompts)
- `assets/audio/colours/en/*.mp3`: 20 files (10 item prompts + 10 read-feedback prompts)
- `assets/audio/colours_hidden_object/en/*.mp3`: 42 files
- `assets/audio/emotions/en/*.mp3`: 20 files (10 item prompts + 10 read-feedback prompts)
- `assets/audio/food/en/*.mp3`: 20 files (10 item prompts + 10 read-feedback prompts)
- `assets/audio/home/en/*.mp3`: 20 files (10 item prompts + 10 read-feedback prompts)
- `assets/audio/school/en/*.mp3`: 20 files (10 item prompts + 10 read-feedback prompts)
- `assets/audio/transport/en/*.mp3`: 20 files (10 item prompts + 10 read-feedback prompts)
- `assets/audio/tools/en/*.mp3`: 30 files (15 item prompts + 15 read-feedback prompts)
- `assets/audio/feedback_en_01/en/*.mp3`: 42 files
- `assets/audio/sentence_prompts_en_01_v3_soft/en/*.mp3`: 5 files

Existing migration baseline: 289 MP3 files. New sets may increase this count; never regenerate the baseline to migrate providers.

Every MP3 must be listed in:

- `assets/audio/audio-manifest.json`
- `assets/audio/audio-manifest.bundle.js`

Every MP3 must also have a matching Rhubarb Lipsync file under:

```txt
assets/lipsync/<same-relative-path>.json
```

Every learning-set item audio path must exist on disk and be present in the manifest.

## Audio Generation (OpenAI)

Read `docs/OPENAI_AUDIO.md` and `docs/SET_GENERATION_PIPELINE.md`.
The old external Wizard-only rule has been replaced: Oskar owns a focused offline
Python CLI using Video Lab's GPT-Audio-1.5 / Chat Completions pattern. No runtime
service, frontend API call, external Wizard dependency or new package dependency.
Do not modify Video Lab or the shared ElevenLabs Wizard for this workflow.

- Own key: `python3 tools/configure_openai_audio.py`, local password form only.
- Secret: `~/.config/lernspiel-oskar/openai-tts.key`, outside repo/web root, 0600.
  Never read, print, copy, screenshot or put the real key in chat/arguments/exports.
  Do not inherit another project's environment key.
- Outputs/cache: `~/.cache/lernspiel-oskar/audio/`, outside the repository.
- Default runs are dry; paid generation requires `--generate` and user authorization.
- Existing MP3s are immutable for this migration. Import creates missing files only.
- Keep `.metadata.json` sidecars beside ZIPs. Import records profile/checksum for
  new audio in `assets/audio/audio-provenance.json`; legacy audio needs no rewrite.
- Provider transcripts are a word-comparison guard, not independent ASR or proof of
  exact pronunciation. The default voice profile is user-approved; new recordings still need content/quality listening checks.
- Run `python3 -B -m unittest discover -s tools -p 'test_audio_pipeline.py'` after
  renderer, credentials, importer or voice QA changes. No real key/call in tests.

## App Data Files

Learning sets live in:

```txt
data/sets/*.json
data/sets/*.bundle.js
```

For MVP, set JSONs should contain only English runtime language data:

- `languages` must be `["en"]`
- keep `title.en`
- keep `labels.en`
- keep `audio.en`
- keep `speak.en` when present
- keep `readFeedback.en` and `readFeedbackText.en` when present
- do not add `title.de`, `labels.de`, `audio.de`, `speak.de`, `readFeedback.de`, or `readFeedbackText.de`

After editing a set JSON, regenerate its matching `.bundle.js`.

## Feedback Data

Feedback audio is loaded from:

```txt
assets/audio/feedback_en_01/feedback_en_01.json
assets/audio/feedback_en_01/feedback_en_01.bundle.js
```

The app supports `audioVariants.en`. Keep variant paths valid and listed in the audio manifest.

Sentence reminder prompts are currently referenced directly in `app.js`:

```txt
assets/audio/sentence_prompts_en_01_v3_soft/en/say_in_sentence_01.mp3
assets/audio/sentence_prompts_en_01_v3_soft/en/say_in_sentence_02.mp3
assets/audio/sentence_prompts_en_01_v3_soft/en/say_in_sentence_03.mp3
assets/audio/sentence_prompts_en_01_v3_soft/en/say_in_sentence_04.mp3
assets/audio/sentence_prompts_en_01_v3_soft/en/say_in_sentence_05.mp3
```

## Required Checks After Audio Changes

Run the project sync first:

```bash
tools/sync_audio_assets.py
```

This rebuilds both audio manifest files, generates missing or stale Lipsync JSONs, and validates the result.
It also runs `tools/voice_consistency_qa.py` to catch low-pitched outliers within each voice profile and verify provenance hashes. Legacy and OpenAI voices must not share a pitch baseline.

If debugging is needed, run these checks after importing or changing audio:

1. No German audio files:

```bash
find assets/audio -type f -path '*/de/*'
```

2. Manifest completeness:

```bash
node - <<'NODE'
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync('assets/audio/audio-manifest.json', 'utf8'));
const mp3 = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.mp3')) mp3.push(full.split(path.sep).join('/'));
  }
}
walk('assets/audio');
const listed = new Set(manifest.files);
console.log({
  mp3: mp3.length,
  manifest: manifest.files.length,
  missing: manifest.files.filter((file) => !fs.existsSync(file)),
  unmanifested: mp3.filter((file) => !listed.has(file)),
});
NODE
```

3. New OpenAI audio QA:

The renderer normalizes/pads MP3s, checks full decoding, non-silence and measured
duration, and compares provider transcript words with the exact source text.
The importer verifies sidecar hashes and source text before accepting new audio.
Listen for pronunciation, pace and warmth; technical checks cannot establish these.
Legacy files stay unchanged and do not need a fresh Wizard repair pass.

4. Voice consistency outliers:

```bash
tools/voice_consistency_qa.py --report /tmp/oskar_voice_consistency.json
```

Accept only if every voice group is assessed and passes. Fewer than eight reliably voiced files is an explicit insufficient baseline and fails by default. Investigate failures; do not bypass checks or replace old files automatically.

## MVP Bias

For MVP, prefer stable, checked audio over repeated re-rendering.

Only re-render an MP3 when:

- QA still flags it after repair
- the expected word/sentence is wrong
- the voice/language is obviously wrong
- manual listening catches a distracting issue

## Catch a Pair bonus

Read `docs/CATCH_A_PAIR.md` before changing bonus navigation or the game.
Socket buttons own selection; inserts are decorative children while seated and
only detach for lift/travel/seat. Do not restore independent idle bobbing.
The app owns the bonus mount/dispose sessions via `stopBonusGames()`; keep set data authoritative and
dispose the controller before replacing its DOM. Runtime files `catch-pair.js`
and `catch-pair.css` must remain in Index, PWA precache and release export.
Run `node --test tests/*.test.cjs` and the read-only Catch a Pair browser audit;
viewport checks do not establish physical iPad-9 performance.

## Rendering / Safari release checks

After changes to avatar markup, animation or shared layouts, follow
`docs/RENDERING.md`: run the read-only browser audit, the responsive matrix,
and inspect the real Safari view while idle, speaking and after returning to
the tab. DOM geometry/unit tests do not prove correct composited pixels.
Use the single Companion rig; do not reintroduce old portrait CSS, filtered
overflow ancestors or a second Safari-specific model. Record unavailable
physical-device checks explicitly.

## Word Blaster bonus

Read `docs/WORD_BLASTER.md` before changing this game. First prototype is read-word
→ hit-picture only. Fixed cannon angle, drag/release in the free cannon area plus desktop arrows/Space, shared swept wall geometry
for aim and shots; preserve generation guards, two-bounce/two-shot limits and
pause-on-resize/visibility. Runtime JS/CSS belong in Index, PWA and release export.
Run Node physics tests and the explicit browser smoke test; do not claim physical
iPad performance from viewport checks. No new audio/key needed.

Word Blaster cannon art uses generated raster layers in `assets/images/word_blaster/`.
Keep `cannonPose` authoritative for the painted muzzle, recoil, aim and laser;
do not restore code-drawn cannon placeholders. All four sprites must load before
start; keep their PWA precache entries and reduced-motion behavior.

Word Blaster touch input is relative horizontal drag + release, with a 10px dead
zone. Do not restore direction/fire buttons or a range slider. Keep pointercancel,
lost capture, multi-contact, resize/pause and stale-prompt releases non-firing;
use `dragAim` and the existing `shoot()` path for all input methods.
Touch travel caps at 180px plus dead zone; captured touch release allows a 24px
side/top and 40px bottom gutter via `dragReleaseInside`. Far-outside releases
and mouse/pen outside the frame remain cancelled.

The V2 cannon uses rear bearing → rotating/recoiling barrel → fixed front
bearing cap → flash. Keep `drawCannon` shared with the angle preview and keep
layer rectangles central in `CANNON`; never move/rotate the foreground bearing
with the barrel or restore an exposed pointed/long shaft. Retired V1 base/barrel
are archived under references, not runtime.

Word Blaster has three `DIFFICULTIES` profiles and round/challenge modes within
the same round model. The 60-second deadline continues during pause/visibility
loss; check expiry before every shot/hit and dispose the owned timer. Challenge
refills must preserve surviving target positions and unique visible IDs. Local
Top 10 keys are per set/level/rules version; render names as text, validate records
and keep failed saves retryable. See `docs/WORD_BLASTER.md`; run model/storage tests
and the real-minute browser challenge smoke test after changing these contracts.

Word Blaster challenge scoring v2: direct / one / two wall bounces award 10 / 15 / 20
points via `pointsForHit` and `registerHit`. Preserve old v1 lists; never mix them
with v2 scores. Keep bonus feedback cosmetic and honor reduced motion/mute.
