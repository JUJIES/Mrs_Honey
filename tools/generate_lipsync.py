#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_RHUBARB = PROJECT_ROOT / "tools" / "rhubarb" / "Rhubarb-Lip-Sync-1.14.0-macOS" / "rhubarb"
SET_DIR = PROJECT_ROOT / "data" / "sets"
AUDIO_MANIFEST = PROJECT_ROOT / "assets" / "audio" / "audio-manifest.json"
FEEDBACK_CATALOG = PROJECT_ROOT / "assets" / "audio" / "feedback_en_01" / "feedback_en_01.json"
SENTENCE_PROMPT_TEXT = "Say it in a sentence."


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate Rhubarb mouthCue JSON files for manifest audio.")
    parser.add_argument("--force", action="store_true", help="Regenerate JSON files that already exist.")
    parser.add_argument("--limit", type=int, default=0, help="Only process the first N files.")
    parser.add_argument(
        "--audio-prefix",
        action="append",
        default=[],
        help="Only process audio paths that start with this prefix. May be passed more than once.",
    )
    parser.add_argument(
        "--rhubarb",
        default=os.environ.get("RHUBARB_BIN") or str(DEFAULT_RHUBARB),
        help="Path to the Rhubarb Lip Sync binary. Defaults to RHUBARB_BIN or the bundled tool.",
    )
    return parser.parse_args()


def collect_dialog_map() -> dict[str, str]:
    dialogs: dict[str, str] = {}

    for set_path in sorted(SET_DIR.glob("*.json")):
        with set_path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)

        for item in data.get("items", []):
            labels = item.get("labels", {})
            for language, audio_path in (item.get("audio") or {}).items():
                if audio_path:
                    dialogs[audio_path] = labels.get(language) or item.get("id") or dialog_from_filename(audio_path)

            feedback_text = item.get("readFeedbackText", {})
            for language, audio_path in (item.get("readFeedback") or {}).items():
                if audio_path:
                    dialogs[audio_path] = feedback_text.get(language) or labels.get(language) or dialog_from_filename(audio_path)

    if FEEDBACK_CATALOG.exists():
        with FEEDBACK_CATALOG.open("r", encoding="utf-8") as handle:
            data = json.load(handle)

        for item in data.get("items", []):
            text = item.get("text", {}).get("en") or dialog_from_filename(item.get("id", ""))
            paths = set()
            if item.get("audio", {}).get("en"):
                paths.add(item["audio"]["en"])
            paths.update(item.get("audioVariants", {}).get("en") or [])
            for audio_path in paths:
                dialogs[audio_path] = text

    return dialogs


def collect_audio_entries() -> list[dict[str, str]]:
    dialogs = collect_dialog_map()

    if AUDIO_MANIFEST.exists():
        with AUDIO_MANIFEST.open("r", encoding="utf-8") as handle:
            files = json.load(handle).get("files", [])
    else:
        files = [str(path.relative_to(PROJECT_ROOT)) for path in (PROJECT_ROOT / "assets" / "audio").rglob("*.mp3")]

    entries: list[dict[str, str]] = []
    seen: set[str] = set()

    for audio_path in files:
        if not audio_path or audio_path in seen:
            continue
        seen.add(audio_path)
        entries.append(
            {
                "audio": audio_path,
                "dialog": dialogs.get(audio_path) or fallback_dialog_for_audio(audio_path),
            },
        )

    return entries


def fallback_dialog_for_audio(audio_path: str) -> str:
    if "/sentence_prompts_" in audio_path:
        return SENTENCE_PROMPT_TEXT
    return dialog_from_filename(audio_path)


def dialog_from_filename(audio_path: str) -> str:
    stem = Path(audio_path).stem
    if stem.startswith("read_feedback_"):
        stem = stem.removeprefix("read_feedback_")
    stem = stem.removesuffix("_v2").removesuffix("_v3")
    return stem.replace("_", " ").strip() or "speech"


def output_path_for_audio(audio_path: str) -> Path:
    if not audio_path.startswith("assets/audio/"):
        raise ValueError(f"Unsupported audio path: {audio_path}")

    relative = audio_path.removeprefix("assets/audio/")
    return PROJECT_ROOT / "assets" / "lipsync" / Path(relative).with_suffix(".json")


def temp_wav_path(temp_root: Path, audio_path: str) -> Path:
    relative = Path(audio_path.removeprefix("assets/audio/")).with_suffix(".wav")
    return temp_root / relative


def run_checked(command: list[str]) -> None:
    subprocess.run(command, cwd=PROJECT_ROOT, check=True)


def normalize_output_metadata(target: Path, audio_path: str) -> None:
    with target.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    metadata = data.setdefault("metadata", {})
    metadata["soundFile"] = audio_path

    with target.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)
        handle.write("\n")


def main() -> int:
    args = parse_args()
    rhubarb = Path(args.rhubarb).expanduser()
    ffmpeg = shutil.which("ffmpeg")

    if not rhubarb.exists():
        print(f"Rhubarb binary not found: {rhubarb}", file=sys.stderr)
        return 1

    if not ffmpeg:
        print("ffmpeg not found in PATH.", file=sys.stderr)
        return 1

    entries = collect_audio_entries()
    if args.audio_prefix:
        prefixes = tuple(args.audio_prefix)
        entries = [entry for entry in entries if entry["audio"].startswith(prefixes)]
    if args.limit:
        entries = entries[: args.limit]

    generated = 0
    skipped = 0

    with tempfile.TemporaryDirectory(prefix="lernwort-lipsync-") as temp_dir_name:
        temp_root = Path(temp_dir_name)

        for entry in entries:
            source = PROJECT_ROOT / entry["audio"]
            target = output_path_for_audio(entry["audio"])

            if not source.exists():
                print(f"Missing audio: {entry['audio']}", file=sys.stderr)
                continue

            should_skip = target.exists() and not args.force and target.stat().st_mtime >= source.stat().st_mtime

            if should_skip:
                normalize_output_metadata(target, entry["audio"])
                skipped += 1
                continue

            wav_path = temp_wav_path(temp_root, entry["audio"])
            dialog_path = wav_path.with_suffix(".txt")
            wav_path.parent.mkdir(parents=True, exist_ok=True)
            target.parent.mkdir(parents=True, exist_ok=True)
            dialog_path.write_text(entry["dialog"], encoding="utf-8")

            run_checked([ffmpeg, "-y", "-loglevel", "error", "-i", str(source), "-ac", "1", "-ar", "16000", str(wav_path)])
            run_checked(
                [
                    str(rhubarb),
                    "-r",
                    "pocketSphinx",
                    "-f",
                    "json",
                    "--extendedShapes",
                    "X",
                    "-d",
                    str(dialog_path),
                    "-o",
                    str(target),
                    str(wav_path),
                ],
            )
            normalize_output_metadata(target, entry["audio"])
            generated += 1
            print(f"generated {target.relative_to(PROJECT_ROOT)}")

    print(f"Done. Generated: {generated}. Skipped: {skipped}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
