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
- create English MP3 prompts through the 11labs wizard generic MP3 renderer
- create item-specific English read-feedback MP3s for Lesen mode, e.g. `Yes! That's a cow.`
- keep the 11labs wizard's child-friendly soft voice profile; do not use fast/neutral renderer defaults
- run audio QA repair before importing MP3s
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

Expected total: 289 MP3 files.

Every MP3 must be listed in:

- `assets/audio/audio-manifest.json`
- `assets/audio/audio-manifest.bundle.js`

Every MP3 must also have a matching Rhubarb Lipsync file under:

```txt
assets/lipsync/<same-relative-path>.json
```

Every learning-set item audio path must exist on disk and be present in the manifest.

## Audio Source Repo

Generate or repair MP3 files in:

```txt
/Users/Julius/coding_projects/tools/11labs wizard
```

Read that repo's `AGENTS.md` before generating audio.

Do not call ElevenLabs directly from this app repo. Use the wizard repo scripts and import the resulting files.

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
It also runs `tools/voice_consistency_qa.py` to catch low-pitched voice outliers that indicate an ElevenLabs voice drift/regeneration failure.

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

3. Audio QA for each English group from the wizard repo:

```bash
node "/Users/Julius/coding_projects/tools/11labs wizard/tools/tts/qa-learning-audio.mjs" --dir "assets/audio/animals_01/en" --report /tmp/animals_01_en.qa.json --fail-on-issues off
```

Repeat for `body_parts/en`, `colours/en`, `colours_hidden_object/en`, `emotions/en`, `food/en`, `home/en`, `school/en`, `tools/en`, `transport/en`, `feedback_en_01/en`, and `sentence_prompts_en_01_v3_soft/en`.

Accept only if every group has `filesWithIssues: 0`.

4. Voice consistency outliers:

```bash
tools/voice_consistency_qa.py --report /tmp/oskar_voice_consistency.json
```

Accept only if `filesWithIssues: 0`. Re-render or restore any `voice-too-low-outlier` MP3 before importing or shipping audio.

## MVP Bias

For MVP, prefer stable, checked audio over repeated re-rendering.

Only re-render an MP3 when:

- QA still flags it after repair
- the expected word/sentence is wrong
- the voice/language is obviously wrong
- manual listening catches a distracting issue
