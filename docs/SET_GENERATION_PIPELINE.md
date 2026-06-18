# Set Generation Pipeline

This is the fixed pipeline for adding new vocabulary sets to the Lernwort app.

Use it when the user says something like:

```txt
Lege ein Set "Transport" an: airplane, ferry, boat, car, bus, train.
```

The intended result is a complete playable English learning set with scene-card images, MP3 prompts, read-mode feedback MP3s, app data, manifest updates, and visual/audio QA.

## Core Decision

New regular vocabulary sets use full square scene cards, not transparent cutout images.

Reason: transparent cutouts were too fragile for generated assets. Fake checkerboard transparency, enclosed holes, spokes, thin details, and background remnants caused too much manual QA. Scene cards avoid background removal entirely and look better in the answer cards.

## Input Contract

When given only a title and words:

- create a lowercase ASCII snake_case set id, for example `vehicles` or `classroom_02`
- create lowercase ASCII snake_case item ids, for example `airplane`, `fire_truck`
- avoid hyphenated ids because the audio renderer normalizes hyphens to underscores for MP3 filenames
- the set id must be safe as a JavaScript property name, for example `transport`, `school_02`, or `vehicles`
- app language remains English-only unless explicitly requested otherwise
- keep `languages` as `["en"]`
- do not add German labels, German audio, or German set data
- use 10 items when the user provides 10; do not invent extra items unless asked

## Image Pipeline

Run a preflight check before long pipeline runs:

```bash
tools/pipeline_preflight.py --port 5187 --min-free-mb 2048
```

If the preflight fails, fix that first. Low free disk space can break browser/screenshot QA and temporary audio/image tooling.

### Asset Shape

Final app assets still need one PNG per word:

```txt
assets/images/<set_id>_scene/<item_id>.png
```

For generation, prefer contact sheets whenever the user provides multiple words. Generate several separated square tiles in one image, then slice the contact sheet into the final per-word PNGs. This is the default for normal set creation because it is cheaper, keeps style drift lower, and makes QA easier.

Recommended contact-sheet layouts:

- 1-5 words: 1 row x N columns
- 10 words: 2 rows x 5 columns
- 8 words: 2 rows x 4 columns
- 6 words: 2 rows x 3 columns
- 4 words: 2 rows x 2 columns

Generate at most 10 motifs per image-generation call. If a set has more than 10 words, split it into batches and import each batch with `--items` or `--start` / `--limit`.

Only use one image-generation call per item when:

- testing a new visual concept before committing to a full set
- replacing one failed tile from a contact sheet
- the set has a very small number of words
- the contact sheet cannot keep the objects separated cleanly

Contact-sheet prompt requirements:

- clear white or very light gutters between tiles
- straight, evenly spaced grid
- one complete square scene card per tile
- exact tile order stated in the prompt
- no text labels inside tiles
- no rounded corners, frames, fake transparency, or checkerboard
- no generated white outer frame, paper-card edge, or hard square border around any tile
- enough spacing so deterministic slicing does not cut subjects

Required image properties:

- square PNG
- target size: `768x768`
- full scene card, not a transparent cutout
- no alpha/transparency requirement
- no checkerboard
- no generated white outer frame, paper-card edge, or hard square border around the image
- no text, letters, labels, logos, or watermarks
- one obvious target object as the main subject
- object fully visible, not cropped
- simple background that supports the word
- style consistent with `assets/images/transport_scene/*.png`
- child-friendly watercolor/cartoon look for grade 1/2
- not photorealistic, not dark, not cluttered

For complex or thin objects, simplify the depiction rather than relying on later cleanup. This is especially important for bicycles, scissors, spokes, antennas, strings, handles, holes, and similar details.

### Generation Prompt Template

Use this structure for each item:

```txt
Create a square 768x768 child-friendly watercolor cartoon scene card for a first/second grade English vocabulary learning app.

Subject: one clear <WORD>.

The <WORD> must be the only main object, centered, fully visible, and easy for a young child to recognize. Use a simple cheerful background that fits the object. Match the existing soft watercolor transport scene-card style: gentle outlines, soft texture, bright natural colors, friendly classroom-app look.

No text, no letters, no labels, no logo, no watermark. No transparent background. No checkerboard. No extra competing objects. Keep the composition clean with a small safe margin around the main object.
```

For a set, keep the prompt wording stable and generate the batch as a contact sheet where practical. Style drift across items is a QA issue.

### Image QA

Accept an image only if:

- file exists at the expected path
- dimensions are exactly `768x768` or intentionally normalized to that size
- subject is obvious and matches the label
- subject is not cropped
- no text/logos/watermarks
- no fake transparency or checkerboard
- no white model-generated outer frame; if present, crop it away before app integration
- set style is consistent
- no generated extra object is likely to confuse the answer

For contact sheets, first archive the source image under:

```txt
references/source_images/<set_id>_scene_generation/
```

Then save a sliced QA contact sheet next to it. Accept the slice only if every tile has the expected word/order, the crop is square, and no subject is cut off by the slice boundary.

Use the image sync tool for import and validation:

```bash
tools/sync_image_assets.py --set <set_id>
```

For a generated scene-card sheet:

```bash
tools/sync_image_assets.py \
  --set <set_id> \
  --from-sheet references/source_images/<set_id>_scene_generation/source.png \
  --grid 2x5 \
  --items item_1,item_2,item_3,item_4,item_5,item_6,item_7,item_8,item_9,item_10
```

The tool:

- slices up to 10 motifs per sheet with deterministic grid cells
- detects the actual scene-card area inside each cell before cropping
- applies a default edge inset so contact-sheet gutters and pale generated side strips do not enter the final cards
- writes `assets/images/<set_id>_scene/<item_id>.png`
- keeps images at `768x768`
- updates the set image paths when needed
- regenerates the matching bundle file
- writes a QA report and contact sheet under `references/source_images/<set_id>_scene_generation/`
- warns about likely edge stripes and strong visual centering offsets

For partial batches, either pass explicit items:

```bash
tools/sync_image_assets.py --set <set_id> --from-sheet <sheet.png> --grid 2x3 --items item_1,item_2,item_3,item_4,item_5,item_6
```

or use a slice of the set order:

```bash
tools/sync_image_assets.py --set <set_id> --from-sheet <sheet.png> --grid 2x5 --start 10 --limit 10
```

For sets split across multiple generated sheets, prefer one batch-plan import instead of several shell commands. This keeps the import sequential, holds one image-pipeline lock, writes the bundle once, and avoids contact-sheet races:

```json
{
  "set": "<set_id>",
  "display": "scene-card",
  "contactSheet": "references/source_images/<set_id>_scene_generation/<set_id>_scene_contact_sheet.png",
  "sheets": [
    {
      "fromSheet": "references/source_images/<set_id>_scene_generation/source_01.png",
      "grid": "2x5",
      "items": ["item_1", "item_2", "item_3", "item_4", "item_5", "item_6", "item_7", "item_8", "item_9", "item_10"]
    },
    {
      "fromSheet": "references/source_images/<set_id>_scene_generation/source_02.png",
      "grid": "2x3",
      "items": ["item_11", "item_12", "item_13", "item_14", "item_15"]
    }
  ]
}
```

```bash
tools/sync_image_assets.py --set <set_id> --batch-plan references/source_images/<set_id>_scene_generation/import_plan.json
```

The image sync now uses a project lock. Do not work around lock failures by running parallel imports for the same set; retry after the active import finishes or pass `--lock-timeout`.

Before app QA, validate all image sets:

```bash
tools/sync_image_assets.py --all-sets --validate-only --report references/source_images/image_asset_qa_report.json
```

For a new set, create screenshots of all learning modes after integration:

```txt
references/app_screenshots/<set_id>_scene_cards/
```

At minimum verify:

- Hören answer cards
- Lesen answer cards
- Sprechen large card
- desktop viewport
- mobile viewport when layout was touched

For `display: "scene-card"`, app QA must confirm:

- `.game-screen[data-display="scene-card"]`
- card image paths are under `assets/images/<set_id>_scene/`
- image natural size is `768x768`
- answer card and image use the same slight border radius
- scene images slightly bleed under the rounded card clip so source-image edge pixels cannot show
- scene cards have the standard subtle inset edge cover
- image uses `object-fit: cover`
- images fill the card, with no old cutout-style white interior
- no visible white square edge remains between the image and the rounded card corners

## App Data Pipeline

Create:

```txt
data/sets/<set_id>.json
data/sets/<set_id>.bundle.js
```

Set JSON structure:

```json
{
  "schemaVersion": 1,
  "id": "<set_id>",
  "title": {
    "en": "<Set Title>"
  },
  "category": "<set_id>",
  "display": "scene-card",
  "languages": ["en"],
  "items": [
    {
      "id": "<item_id>",
      "image": "assets/images/<set_id>_scene/<item_id>.png",
      "labels": {
        "en": "<word>"
      },
      "audio": {
        "en": "assets/audio/<set_id>/en/<item_id>.mp3"
      },
      "readFeedback": {
        "en": "assets/audio/<set_id>/en/read_feedback_<item_id>.mp3"
      },
      "readFeedbackText": {
        "en": "Yes! That's a <word>."
      },
      "difficulty": 1,
      "tags": ["<set_id>"],
      "speak": {
        "en": "Can you find the <word>?"
      }
    }
  ]
}
```

Rotate simple prompt patterns across items:

- `Can you find the <word>?`
- `Where is the <word>?`
- `Can you see the <word>?`

For Lesen mode, every item also needs an item-specific feedback sentence that confirms the answer and repeats the word. Rotate sentence patterns so the set does not sound repetitive:

- `Yes! That's a <word>.`
- `Great! It's a <word>.`
- `Nice! You found a <word>.`
- `Correct! That's a <word>.`
- `Well done! That's a <word>.`

Adjust articles and grammar:

- use `an` before vowel sounds, for example `an apple`, `an eraser`, `an airplane`
- use no article for colours, mass nouns, and material-like words, for example `That's red`, `That's milk`, `That's glue`
- use plural grammar where needed, for example `Those are scissors`

After creating/editing JSON:

- regenerate the matching bundle file
- add the bundle script tag in `index.html` if the set is new
- add the set entry in `app.js` set catalog if the set is new
- bump the `styles.css` / `app.js` query version in `index.html` when CSS or app loading behavior changed

Bundle format:

```js
window.LERNWORT_BUNDLED_SETS = window.LERNWORT_BUNDLED_SETS || {};
window.LERNWORT_BUNDLED_SETS.<set_id> = { ...setJson };
```

## Audio Pipeline

Generate MP3s only through:

```txt
/Users/Julius/coding_projects/tools/11labs wizard
```

Do not call ElevenLabs directly from the app repo.

For this English-only app, use the generic MP3 renderer with flat temporary prompt JSON files. This avoids older bilingual renderers that expect German fields.

The generic renderer is configured for the Lernspiel Oskar child-friendly voice profile. For `eleven_multilingual_v2`, the expected settings are:

```json
{
  "stability": 0.92,
  "similarity_boost": 0.9,
  "style": 0.0,
  "speed": 0.78,
  "use_speaker_boost": true
}
```

Do not use the older neutral defaults (`stability: 0.5`, no `speed`) for this app; they sound faster and harsher.

Each set needs two audio groups:

- item prompts for Hören mode: `assets/audio/<set_id>/en/<item_id>.mp3`
- item-specific read feedback for Lesen mode: `assets/audio/<set_id>/en/read_feedback_<item_id>.mp3`

Temporary item-prompt JSON shape:

```json
{
  "setId": "<set_id>",
  "language": "en",
  "items": [
    {
      "id": "<item_id>",
      "word": "<word>",
      "speak": "Can you find the <word>?"
    }
  ]
}
```

Temporary read-feedback prompt JSON shape:

```json
{
  "setId": "<set_id>_read_feedback",
  "language": "en",
  "items": [
    {
      "id": "read_feedback_<item_id>",
      "word": "<word>",
      "speak": "Yes! That's a <word>."
    }
  ]
}
```

Generate both temporary prompt files directly from the set JSON:

```bash
tools/build_audio_prompts.py --set <set_id> --out-dir /tmp
```

The command prints the matching 11labs wizard commands and avoids hand-writing prompt JSON paths and `read_feedback_` ids.

Recommended commands from the wizard repo:

```bash
npm run audio -- --dry-run --in /tmp/<set_id>_en_prompts.json --out dist/<set_id>-bundle.zip --lang en --voice hpp4J3VqNfWAUOO0d1Us --skip-existing
```

```bash
npm run audio -- --in /tmp/<set_id>_en_prompts.json --out dist/<set_id>-bundle.zip --lang en --voice hpp4J3VqNfWAUOO0d1Us --skip-existing
```

Use the same commands for read feedback with `/tmp/<set_id>_read_feedback_prompts.json` and `dist/<set_id>-read-feedback-bundle.zip`.

Then always run repair QA:

```bash
npm run spelling:qa -- --zip dist/<set_id>-bundle.zip --fix --out dist/<set_id>-bundle.qa.zip --report dist/<set_id>-bundle.qa.json --fail-on-issues off
```

Run the same repair QA for the read-feedback bundle:

```bash
npm run spelling:qa -- --zip dist/<set_id>-read-feedback-bundle.zip --fix --out dist/<set_id>-read-feedback-bundle.qa.zip --report dist/<set_id>-read-feedback-bundle.qa.json --fail-on-issues off
```

Import the repaired MP3s into:

```txt
assets/audio/<set_id>/en/*.mp3
```

The MP3 file names must match item ids:

```txt
assets/audio/<set_id>/en/<item_id>.mp3
assets/audio/<set_id>/en/read_feedback_<item_id>.mp3
```

Prefer the importer for repaired QA ZIPs:

```bash
tools/import_audio_bundles.py \
  --set <set_id> \
  --words-zip "/Users/Julius/coding_projects/tools/11labs wizard/dist/<set_id>-bundle.qa.zip" \
  --read-feedback-zip "/Users/Julius/coding_projects/tools/11labs wizard/dist/<set_id>-read-feedback-bundle.qa.zip"
```

The importer validates exact flat MP3 filenames before extracting and then runs `tools/sync_audio_assets.py`.

After importing MP3s, run the app audio sync so the manifest and Rhubarb lipsync files stay aligned with the new audio:

```bash
python3 tools/sync_audio_assets.py
```

## Audio Sync Pipeline

After importing MP3s:

- rebuild `assets/audio/audio-manifest.json`
- rebuild `assets/audio/audio-manifest.bundle.js`
- generate or refresh `assets/lipsync/**/*.json` for every new or changed MP3
- verify every MP3 on disk is listed
- verify every set `audio.en` / `readFeedback.en` path exists
- verify every manifest MP3 has a matching Lipsync JSON
- verify no German audio files were added
- run voice-consistency QA to detect very low-pitched ElevenLabs voice drift outliers

Use the project automation:

```bash
tools/sync_audio_assets.py
```

This command is idempotent. It skips existing Lipsync JSONs when the MP3 is unchanged, and regenerates a JSON automatically when the MP3 file is newer than its existing Lipsync file.
It also runs `tools/voice_consistency_qa.py` by default. If it reports `voice-too-low-outlier`, re-render the affected MP3 or restore a known-good backup, then run sync again.

To force all Lipsync files after a voice/style change:

```bash
tools/sync_audio_assets.py --force-lipsync
```

Acceptance checks:

```bash
find assets/audio -type f -path '*/de/*'
```

```bash
node - <<'NODE'
const fs = require('fs');
const path = require('path');
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

The manual checks above should match the output of `tools/sync_audio_assets.py`; use them only for debugging if the automation fails.

## Final QA

A new set is done only when all checks pass:

- set appears in the app set picker
- all three modes start: Hören, Lesen, Sprechen
- in Lesen mode, a correct answer plays the item-specific `readFeedback.en` sentence instead of only generic positive feedback
- in Hören mode, a correct answer keeps generic feedback and does not repeat the item word again
- images load from the new scene folder
- no broken or blank cards after waiting for images to load
- scene cards keep the Transport-style square layout with slight rounded corners and no visible white image edge
- audio files exist and are in the manifest
- Lipsync JSON exists for every MP3 and follows the same path under `assets/lipsync/`
- wizard QA report has `filesWithIssues: 0`
- no German data or audio was added unless explicitly requested

Store screenshots and relevant QA reports outside app runtime paths unless the user asks otherwise. Screenshots belong under `references/app_screenshots/`.
