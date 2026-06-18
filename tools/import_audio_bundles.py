#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import zipfile
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SET_DIR = PROJECT_ROOT / "data" / "sets"
AUDIO_ROOT = PROJECT_ROOT / "assets" / "audio"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate and import repaired 11labs wizard MP3 ZIPs into a Lernwort set.",
    )
    parser.add_argument("--set", dest="set_id", required=True, help="Set id, e.g. tools.")
    parser.add_argument("--words-zip", required=True, help="QA ZIP containing <item_id>.mp3 files.")
    parser.add_argument(
        "--read-feedback-zip",
        required=True,
        help="QA ZIP containing read_feedback_<item_id>.mp3 files.",
    )
    parser.add_argument("--lang", default="en", help="Language folder. Default: en.")
    parser.add_argument("--dry-run", action="store_true", help="Validate ZIP contents without extracting or syncing.")
    parser.add_argument("--skip-sync", action="store_true", help="Do not run sync_audio_assets.py after import.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    set_path = SET_DIR / f"{args.set_id}.json"
    if not set_path.exists():
        raise SystemExit(f"Set not found: {set_path}")

    data = read_json(set_path)
    item_ids = [item["id"] for item in data.get("items", [])]
    if not item_ids:
        raise SystemExit(f"Set has no items: {args.set_id}")

    words_zip = resolve_path(args.words_zip)
    feedback_zip = resolve_path(args.read_feedback_zip)
    expected_words = {f"{item_id}.mp3" for item_id in item_ids}
    expected_feedback = {f"read_feedback_{item_id}.mp3" for item_id in item_ids}

    validate_zip(words_zip, expected_words, "word prompt")
    validate_zip(feedback_zip, expected_feedback, "read feedback")

    target_dir = AUDIO_ROOT / args.set_id / args.lang
    if args.dry_run:
        imported = sorted(rel(target_dir / name) for name in expected_words | expected_feedback)
    else:
        target_dir.mkdir(parents=True, exist_ok=True)
        imported = extract_mp3s(words_zip, target_dir) + extract_mp3s(feedback_zip, target_dir)

    if not args.skip_sync and not args.dry_run:
        subprocess.run([sys.executable, str(PROJECT_ROOT / "tools" / "sync_audio_assets.py")], cwd=PROJECT_ROOT, check=True)

    print(json.dumps({"set": args.set_id, "dryRun": args.dry_run, "imported": imported, "targetDir": rel(target_dir)}, indent=2))
    return 0


def validate_zip(path: Path, expected: set[str], label: str) -> None:
    if not path.exists():
        raise SystemExit(f"{label} ZIP not found: {path}")
    with zipfile.ZipFile(path) as archive:
        names = {info.filename for info in archive.infolist() if not info.is_dir()}
    mp3_names = {name for name in names if name.endswith(".mp3") and "/" not in name}
    unexpected = sorted(mp3_names - expected)
    missing = sorted(expected - mp3_names)
    nested = sorted(name for name in names if name.endswith(".mp3") and "/" in name)
    non_mp3 = sorted(name for name in names if not name.endswith(".mp3"))
    if missing or unexpected or nested or non_mp3:
        raise SystemExit(
            f"{label} ZIP content mismatch: missing={missing[:8]} unexpected={unexpected[:8]} "
            f"nested={nested[:8]} nonMp3={non_mp3[:8]}"
        )


def extract_mp3s(path: Path, target_dir: Path) -> list[str]:
    written = []
    with zipfile.ZipFile(path) as archive:
        for info in archive.infolist():
            if info.is_dir() or not info.filename.endswith(".mp3"):
                continue
            target = target_dir / info.filename
            target.write_bytes(archive.read(info))
            written.append(rel(target))
    return sorted(written)


def resolve_path(path: str) -> Path:
    raw = Path(path).expanduser()
    return raw if raw.is_absolute() else PROJECT_ROOT / raw


def rel(path: Path) -> str:
    try:
        return path.resolve().relative_to(PROJECT_ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    raise SystemExit(main())
