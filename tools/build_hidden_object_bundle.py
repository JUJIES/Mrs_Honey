#!/usr/bin/env python3
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/minigames/colours_hidden_object.json"
TARGET = ROOT / "data/minigames/colours_hidden_object.bundle.js"


def main():
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    payload = json.dumps(data, ensure_ascii=False, indent=2)
    TARGET.write_text(
        'window.LERNWORT_BUNDLED_MINIGAMES = window.LERNWORT_BUNDLED_MINIGAMES || {};\n'
        f'window.LERNWORT_BUNDLED_MINIGAMES["colours_hidden_object"] = {payload};\n',
        encoding="utf-8",
    )
    print(f"Wrote {TARGET.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
