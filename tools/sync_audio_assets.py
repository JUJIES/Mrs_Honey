#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
AUDIO_ROOT = PROJECT_ROOT / "assets" / "audio"
LIPSYNC_ROOT = PROJECT_ROOT / "assets" / "lipsync"
MANIFEST_JSON = AUDIO_ROOT / "audio-manifest.json"
MANIFEST_BUNDLE = AUDIO_ROOT / "audio-manifest.bundle.js"
SET_DIR = PROJECT_ROOT / "data" / "sets"
FEEDBACK_CATALOG = AUDIO_ROOT / "feedback_en_01" / "feedback_en_01.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Rebuild audio manifest files, generate missing/stale lipsync JSONs, and validate audio assets.",
    )
    parser.add_argument("--skip-lipsync", action="store_true", help="Skip missing/stale lipsync generation.")
    parser.add_argument("--force-lipsync", action="store_true", help="Regenerate every lipsync JSON, even if up to date.")
    parser.add_argument("--skip-voice-qa", action="store_true", help="Skip low-voice outlier detection.")
    parser.add_argument("--voice-qa-report", help="Optional JSON report path for voice consistency QA.")
    return parser.parse_args()


def posix_relative(path: Path) -> str:
    return path.relative_to(PROJECT_ROOT).as_posix()


def collect_mp3_files() -> list[str]:
    return sorted(posix_relative(path) for path in AUDIO_ROOT.rglob("*.mp3"))


def write_manifest(files: list[str]) -> None:
    data = {"files": files}
    MANIFEST_JSON.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    MANIFEST_BUNDLE.write_text(
        "window.LERNWORT_AUDIO_MANIFEST = " + json.dumps(data, indent=2) + ";\n",
        encoding="utf-8",
    )


def run_lipsync(force: bool) -> None:
    command = [sys.executable, str(PROJECT_ROOT / "tools" / "generate_lipsync.py")]
    if force:
        command.append("--force")
    subprocess.run(command, cwd=PROJECT_ROOT, check=True)


def run_voice_qa(report_path: str | None) -> None:
    command = [sys.executable, str(PROJECT_ROOT / "tools" / "voice_consistency_qa.py")]
    if report_path:
        command.extend(["--report", report_path])
    subprocess.run(command, cwd=PROJECT_ROOT, check=True)


def lipsync_path_for_audio(audio_path: str) -> Path:
    relative = audio_path.replace("assets/audio/", "assets/lipsync/").rsplit(".", 1)[0] + ".json"
    return PROJECT_ROOT / relative


def collect_expected_audio_paths() -> set[str]:
    expected: set[str] = set()

    for set_path in sorted(SET_DIR.glob("*.json")):
        data = json.loads(set_path.read_text(encoding="utf-8"))
        for item in data.get("items", []):
            expected.update((item.get("audio") or {}).values())
            expected.update((item.get("readFeedback") or {}).values())

    if FEEDBACK_CATALOG.exists():
        data = json.loads(FEEDBACK_CATALOG.read_text(encoding="utf-8"))
        for item in data.get("items", []):
            if item.get("audio", {}).get("en"):
                expected.add(item["audio"]["en"])
            expected.update(item.get("audioVariants", {}).get("en") or [])

    return {path for path in expected if path}


def validate(files: list[str]) -> None:
    errors: list[str] = []
    listed = set(files)
    disk_mp3s = set(collect_mp3_files())

    if any("/de/" in path for path in files):
        errors.append("German audio path found in manifest.")

    missing_from_manifest = sorted(disk_mp3s - listed)
    missing_on_disk = sorted(path for path in listed if not (PROJECT_ROOT / path).exists())
    if missing_from_manifest:
        errors.append(f"MP3 files missing from manifest: {missing_from_manifest[:8]}")
    if missing_on_disk:
        errors.append(f"Manifest entries missing on disk: {missing_on_disk[:8]}")

    expected_paths = collect_expected_audio_paths()
    missing_expected = sorted(path for path in expected_paths if path not in listed or not (PROJECT_ROOT / path).exists())
    if missing_expected:
        errors.append(f"Referenced set/feedback audio missing or unlisted: {missing_expected[:8]}")

    missing_lipsync: list[str] = []
    invalid_lipsync: list[str] = []
    for audio_path in files:
        lipsync_path = lipsync_path_for_audio(audio_path)
        if not lipsync_path.exists():
            missing_lipsync.append(posix_relative(lipsync_path))
            continue

        try:
            data = json.loads(lipsync_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            invalid_lipsync.append(posix_relative(lipsync_path))
            continue

        if data.get("metadata", {}).get("soundFile") != audio_path or not data.get("mouthCues"):
            invalid_lipsync.append(posix_relative(lipsync_path))

    if missing_lipsync:
        errors.append(f"Lipsync JSON missing: {missing_lipsync[:8]}")
    if invalid_lipsync:
        errors.append(f"Lipsync JSON invalid: {invalid_lipsync[:8]}")

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)


def main() -> int:
    args = parse_args()
    files = collect_mp3_files()
    write_manifest(files)

    if not args.skip_lipsync:
        run_lipsync(args.force_lipsync)

    validate(files)
    if not args.skip_voice_qa:
        run_voice_qa(args.voice_qa_report)
    print(f"Audio assets synced. MP3: {len(files)}. Lipsync JSON: {len(list(LIPSYNC_ROOT.rglob('*.json')))}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
