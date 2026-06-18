#!/usr/bin/env python3
from __future__ import annotations

import argparse
import array
import json
import math
import statistics
import subprocess
import sys
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
AUDIO_ROOT = PROJECT_ROOT / "assets" / "audio"
SAMPLE_RATE = 16_000
FRAME_SIZE = 800
HOP_SIZE = 320
MIN_F0_HZ = 65
MAX_F0_HZ = 360


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Detect MP3 files whose estimated voice pitch is far below the project voice majority.",
    )
    parser.add_argument("--dir", default=str(AUDIO_ROOT), help="Audio directory to scan. Default: assets/audio.")
    parser.add_argument("--report", help="Optional JSON report path.")
    parser.add_argument("--fail-on-issues", default="on", choices=("on", "off"), help="Exit 2 when outliers are found.")
    parser.add_argument("--max-low-f0-ratio", type=float, default=0.58)
    parser.add_argument("--max-low-f0-hz", type=float, default=130.0)
    parser.add_argument("--max-low-robust-z", type=float, default=-4.0)
    parser.add_argument("--min-voiced-frames", type=int, default=4)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = resolve_path(args.dir)
    mp3_files = sorted(root.rglob("*.mp3"))
    if not mp3_files:
        raise SystemExit(f"No MP3 files found in {root}")

    analyses = [analyze_mp3(path, root) for path in mp3_files]
    voiced_f0 = [entry["medianF0Hz"] for entry in analyses if entry["medianF0Hz"] is not None]
    if len(voiced_f0) < 8:
        raise SystemExit("Not enough voiced MP3 files for voice-consistency QA.")

    baseline_f0 = statistics.median(voiced_f0)
    mad_f0 = median_abs_deviation(voiced_f0, baseline_f0) or 1.0

    issues = []
    for entry in analyses:
        f0 = entry["medianF0Hz"]
        if f0 is None:
            entry["f0RatioToBaseline"] = None
            entry["robustF0Z"] = None
            entry["flags"] = ["no-reliable-pitch"]
            continue

        ratio = f0 / baseline_f0
        robust_z = (f0 - baseline_f0) / (1.4826 * mad_f0)
        entry["f0RatioToBaseline"] = round(ratio, 4)
        entry["robustF0Z"] = round(robust_z, 4)
        entry["flags"] = []

        if (
            entry["voicedFrames"] >= args.min_voiced_frames
            and f0 <= args.max_low_f0_hz
            and ratio <= args.max_low_f0_ratio
            and robust_z <= args.max_low_robust_z
        ):
            entry["flags"].append("voice-too-low-outlier")
            issues.append(entry)

    report = {
        "checkedAt": iso_now(),
        "source": rel(root),
        "thresholds": {
            "maxLowF0Ratio": args.max_low_f0_ratio,
            "maxLowF0Hz": args.max_low_f0_hz,
            "maxLowRobustZ": args.max_low_robust_z,
            "minVoicedFrames": args.min_voiced_frames,
        },
        "summary": {
            "files": len(analyses),
            "voicedFiles": len(voiced_f0),
            "baselineMedianF0Hz": round(baseline_f0, 2),
            "baselineMadF0Hz": round(mad_f0, 2),
            "filesWithIssues": len(issues),
        },
        "issues": compact_entries(issues),
        "files": compact_entries(analyses),
    }

    if args.report:
        report_path = resolve_path(args.report)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    print(
        "Voice consistency QA: "
        f"{len(analyses)} MP3, baseline F0 {baseline_f0:.1f} Hz, issues {len(issues)}."
    )
    for issue in issues:
        print(
            "VOICE-OUTLIER "
            f"{issue['path']} f0={issue['medianF0Hz']:.1f}Hz "
            f"ratio={issue['f0RatioToBaseline']:.2f} z={issue['robustF0Z']:.1f}"
        )

    if issues and args.fail_on_issues == "on":
        return 2
    return 0


def analyze_mp3(path: Path, root: Path) -> dict[str, Any]:
    samples = decode_mono_pcm(path)
    starts = list(range(0, max(0, len(samples) - FRAME_SIZE + 1), HOP_SIZE))
    if not starts:
        return {
            "path": rel(path, root),
            "durationSec": round(len(samples) / SAMPLE_RATE, 3),
            "medianF0Hz": None,
            "voicedFrames": 0,
        }

    scored = [(frame_energy(samples, start), start) for start in starts]
    scored.sort(reverse=True)
    chosen = choose_spaced_frames(scored, limit=12, min_distance=1_280)
    f0_values = [f0 for start in chosen if (f0 := estimate_frame_f0(samples, start)) is not None]

    return {
        "path": rel(path, root),
        "durationSec": round(len(samples) / SAMPLE_RATE, 3),
        "medianF0Hz": round(statistics.median(f0_values), 2) if f0_values else None,
        "voicedFrames": len(f0_values),
    }


def decode_mono_pcm(path: Path) -> array.array[int]:
    try:
        raw = subprocess.check_output(
            [
                "ffmpeg",
                "-v",
                "error",
                "-i",
                str(path),
                "-ac",
                "1",
                "-ar",
                str(SAMPLE_RATE),
                "-f",
                "s16le",
                "pipe:1",
            ]
        )
    except (FileNotFoundError, subprocess.CalledProcessError) as error:
        raise SystemExit(f"ffmpeg failed for {path}: {error}") from error

    samples: array.array[int] = array.array("h")
    samples.frombytes(raw)
    if sys.byteorder != "little":
        samples.byteswap()
    return samples


def frame_energy(samples: array.array[int], start: int) -> int:
    return sum(int(value) * int(value) for value in samples[start : start + FRAME_SIZE])


def choose_spaced_frames(scored: list[tuple[int, int]], limit: int, min_distance: int) -> list[int]:
    chosen: list[int] = []
    for _energy, start in scored:
        if len(chosen) >= limit:
            break
        if all(abs(start - existing) > min_distance for existing in chosen):
            chosen.append(start)
    return chosen


def estimate_frame_f0(samples: array.array[int], start: int) -> float | None:
    frame = samples[start : start + FRAME_SIZE]
    if len(frame) < FRAME_SIZE:
        return None

    mean = sum(frame) / FRAME_SIZE
    values = [value - mean for value in frame]
    min_lag = int(SAMPLE_RATE / MAX_F0_HZ)
    max_lag = int(SAMPLE_RATE / MIN_F0_HZ)
    best_score = -1.0
    best_lag = None

    for lag in range(min_lag, max_lag + 1, 2):
        score = normalized_autocorrelation(values, lag)
        if score > best_score:
            best_score = score
            best_lag = lag

    if best_lag is None:
        return None

    for lag in range(max(min_lag, best_lag - 2), min(max_lag, best_lag + 2) + 1):
        score = normalized_autocorrelation(values, lag)
        if score > best_score:
            best_score = score
            best_lag = lag

    if best_score < 0.28:
        return None
    return SAMPLE_RATE / best_lag


def normalized_autocorrelation(values: list[float], lag: int) -> float:
    limit = FRAME_SIZE - lag
    cross = 0.0
    left_energy = 0.0
    right_energy = 0.0
    for index in range(limit):
        left = values[index]
        right = values[index + lag]
        cross += left * right
        left_energy += left * left
        right_energy += right * right
    denominator = math.sqrt(left_energy * right_energy)
    return cross / denominator if denominator > 0 else -1.0


def median_abs_deviation(values: list[float], median_value: float) -> float:
    return statistics.median(abs(value - median_value) for value in values)


def compact_entries(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        [
            {
                key: entry[key]
                for key in (
                    "path",
                    "durationSec",
                    "medianF0Hz",
                    "voicedFrames",
                    "f0RatioToBaseline",
                    "robustF0Z",
                    "flags",
                )
                if key in entry
            }
            for entry in entries
        ],
        key=lambda entry: entry["path"],
    )


def resolve_path(raw_path: str) -> Path:
    path = Path(raw_path).expanduser()
    return path if path.is_absolute() else PROJECT_ROOT / path


def rel(path: Path, root: Path = PROJECT_ROOT) -> str:
    try:
        return path.resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        return path.as_posix()


def iso_now() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


if __name__ == "__main__":
    raise SystemExit(main())
