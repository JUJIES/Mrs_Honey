#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SET_DIR = PROJECT_ROOT / "data" / "sets"
DEFAULT_VOICE = "hpp4J3VqNfWAUOO0d1Us"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build flat 11labs wizard prompt JSON files from a Lernwort set JSON.",
    )
    parser.add_argument("--set", dest="set_id", required=True, help="Set id, e.g. tools.")
    parser.add_argument("--lang", default="en", help="Language key to export. Default: en.")
    parser.add_argument("--out-dir", default="/tmp", help="Output directory for prompt JSON files.")
    parser.add_argument("--voice", default=DEFAULT_VOICE, help="Voice id to include in printed wizard commands.")
    parser.add_argument("--no-commands", action="store_true", help="Only write JSON files; do not print wizard commands.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    set_path = SET_DIR / f"{args.set_id}.json"
    if not set_path.exists():
        raise SystemExit(f"Set not found: {set_path}")

    data = read_json(set_path)
    items = data.get("items") or []
    if not items:
        raise SystemExit(f"Set has no items: {args.set_id}")

    word_prompts = []
    feedback_prompts = []
    for item in items:
        item_id = require_string(item, "id")
        label = require_lang_string(item, "labels", args.lang, item_id)
        speak = require_lang_string(item, "speak", args.lang, item_id)
        feedback_text = require_lang_string(item, "readFeedbackText", args.lang, item_id)
        word_prompts.append({"id": item_id, "word": label, "speak": speak})
        feedback_prompts.append(
            {
                "id": f"read_feedback_{item_id}",
                "word": label,
                "speak": feedback_text,
            }
        )

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    words_path = out_dir / f"{args.set_id}_{args.lang}_prompts.json"
    feedback_path = out_dir / f"{args.set_id}_read_feedback_prompts.json"

    write_json(
        words_path,
        {
            "setId": args.set_id,
            "language": args.lang,
            "items": word_prompts,
        },
    )
    write_json(
        feedback_path,
        {
            "setId": f"{args.set_id}_read_feedback",
            "language": args.lang,
            "items": feedback_prompts,
        },
    )

    result = {
        "set": args.set_id,
        "items": len(items),
        "wordPrompts": str(words_path),
        "readFeedbackPrompts": str(feedback_path),
    }
    print(json.dumps(result, indent=2))

    if not args.no_commands:
        print()
        print("# 11labs wizard commands")
        print(
            f"npm run audio -- --in {words_path} --out dist/{args.set_id}-bundle.zip "
            f"--lang {args.lang} --voice {args.voice} --skip-existing"
        )
        print(
            f"npm run audio -- --in {feedback_path} --out dist/{args.set_id}-read-feedback-bundle.zip "
            f"--lang {args.lang} --voice {args.voice} --skip-existing"
        )
    return 0


def require_string(data: dict[str, Any], key: str) -> str:
    value = data.get(key)
    if not isinstance(value, str) or not value:
        raise SystemExit(f"Missing string field: {key}")
    return value


def require_lang_string(item: dict[str, Any], key: str, lang: str, item_id: str) -> str:
    values = item.get(key)
    if not isinstance(values, dict) or not isinstance(values.get(lang), str) or not values[lang]:
        raise SystemExit(f"{item_id}: missing {key}.{lang}")
    return values[lang]


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    raise SystemExit(main())
