#!/usr/bin/env python3
from __future__ import annotations

import argparse
import contextlib
import fcntl
import json
import math
import os
import sys
import time
from pathlib import Path
from typing import Any

try:
    from PIL import Image, ImageChops, ImageDraw, ImageStat
except ModuleNotFoundError:
    bundled_python = (
        Path.home()
        / ".cache"
        / "codex-runtimes"
        / "codex-primary-runtime"
        / "dependencies"
        / "python"
        / "bin"
        / "python3"
    )
    if bundled_python.exists() and Path(sys.executable).resolve() != bundled_python.resolve():
        os.execv(str(bundled_python), [str(bundled_python), *sys.argv])
    raise SystemExit("Pillow is required. Use the bundled Codex Python runtime or install Pillow.")
import numpy as np


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SET_DIR = PROJECT_ROOT / "data" / "sets"
IMAGE_ROOT = PROJECT_ROOT / "assets" / "images"
REFERENCE_ROOT = PROJECT_ROOT / "references" / "source_images"
LOCK_ROOT = PROJECT_ROOT / ".pipeline_locks"
MAX_SHEET_ITEMS = 10
PADDING_SENSITIVE_SETS = {"animals_01", "tools"}
PADDING_SENSITIVE_ITEMS = {
    "backpack",
    "book",
    "chair",
    "desk",
    "eraser",
    "glue",
    "notebook",
    "pencil",
    "ruler",
    "scissors",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import, validate, and bundle vocabulary image assets.",
    )
    parser.add_argument("--set", dest="set_id", help="Set id to process, e.g. animals_01.")
    parser.add_argument("--all-sets", action="store_true", help="Validate all set JSON files.")
    parser.add_argument(
        "--batch-plan",
        help="JSON file describing multiple sheet imports for one set. Imports run sequentially in one locked process.",
    )
    parser.add_argument("--from-sheet", help="Optional generated source sheet to import.")
    parser.add_argument("--grid", help="Sheet grid like 2x5. Inferred from item count if omitted.")
    parser.add_argument(
        "--items",
        help="Comma-separated item ids to import in row-major order. Defaults to set order.",
    )
    parser.add_argument("--start", type=int, default=0, help="Start index in set order for sheet import.")
    parser.add_argument("--limit", type=int, default=0, help="Number of set items to import.")
    parser.add_argument("--target-dir", help="Directory for output PNGs. Defaults to set image folder.")
    parser.add_argument("--display", choices=["scene-card", "cutout"], help="Display mode to enforce.")
    parser.add_argument("--canvas", type=int, default=768, help="Output image size.")
    parser.add_argument(
        "--crop-mode",
        choices=["auto", "center"],
        default="auto",
        help="Sheet crop strategy. auto detects the card area inside each grid cell.",
    )
    parser.add_argument(
        "--safe-crop",
        type=float,
        default=1.0,
        help="Extra crop fraction after card detection. Use <1 only for difficult sheets.",
    )
    parser.add_argument("--edge-inset", type=int, default=28, help="Pixels to inset when detected card content touches a cell edge.")
    parser.add_argument("--report", help="Optional JSON QA report path.")
    parser.add_argument("--contact-sheet", help="Optional contact sheet path.")
    parser.add_argument("--qa-candidates", help="Optional JSON path for likely rerender/review candidates.")
    parser.add_argument("--qa-candidate-contact", help="Optional contact sheet for likely rerender/review candidates.")
    parser.add_argument("--qa-full-contact", help="Optional contact sheet for every validated image.")
    parser.add_argument("--dry-run", action="store_true", help="Report planned changes without writing files.")
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Validate images and write the report without importing sheets, updating JSON, or regenerating bundles.",
    )
    parser.add_argument("--no-write-bundle", action="store_true", help="Do not regenerate the set bundle file.")
    parser.add_argument("--no-write-set", action="store_true", help="Do not update set JSON image paths/display.")
    parser.add_argument(
        "--lock-timeout",
        type=float,
        default=0.0,
        help="Seconds to wait for the image pipeline lock. Default fails immediately if another image sync is running.",
    )
    parser.add_argument("--strict", action="store_true", help="Exit non-zero on warnings as well as failures.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.validate_only:
        if args.from_sheet or args.batch_plan:
            raise SystemExit("--validate-only cannot be combined with --from-sheet or --batch-plan.")
        args.no_write_set = True
        args.no_write_bundle = True
        args.contact_sheet = None
    if args.batch_plan and args.all_sets:
        raise SystemExit("--batch-plan can only be used with one --set.")
    if args.all_sets and args.from_sheet:
        raise SystemExit("--from-sheet can only be used with one --set.")
    if args.batch_plan and args.from_sheet:
        raise SystemExit("Use either --batch-plan or --from-sheet, not both.")
    if not args.all_sets and not args.set_id:
        raise SystemExit("Pass --set <id> or --all-sets.")

    with image_pipeline_lock(args.lock_timeout):
        if args.all_sets:
            reports = [process_set(path.stem, args) for path in sorted(SET_DIR.glob("*.json"))]
        elif args.batch_plan:
            reports = [process_batch_plan(args.set_id, args)]
        else:
            reports = [process_set(args.set_id, args)]

    combined = {
        "sets": reports,
        "summary": summarize_reports(reports),
    }

    report_path = Path(args.report) if args.report else default_report_path(args, reports[0] if reports else None)
    if report_path and not args.dry_run:
        write_json(report_path, combined)
    candidates = collect_qa_candidates(reports)
    if args.qa_candidates and not args.dry_run:
        write_json(Path(args.qa_candidates), {"candidates": candidates})
    if args.qa_candidate_contact and candidates and not args.dry_run:
        write_contact_sheet(
            paths=[PROJECT_ROOT / candidate["path"] for candidate in candidates],
            labels=[f"{candidate['setId']}/{candidate['id']}" for candidate in candidates],
            target_path=Path(args.qa_candidate_contact),
        )
    all_items = collect_report_items(reports)
    if args.qa_full_contact and all_items and not args.dry_run:
        write_contact_sheet(
            paths=[PROJECT_ROOT / item["path"] for item in all_items],
            labels=[f"{item['setId']}/{item['id']}" for item in all_items],
            target_path=Path(args.qa_full_contact),
        )

    print(json.dumps(combined["summary"], indent=2))
    has_failures = any(report["failures"] for report in reports)
    has_warnings = any(report["warnings"] for report in reports)
    if has_failures or (args.strict and has_warnings):
        return 2
    return 0


def process_set(set_id: str, args: argparse.Namespace) -> dict[str, Any]:
    set_path = SET_DIR / f"{set_id}.json"
    if not set_path.exists():
        raise SystemExit(f"Set not found: {set_id}")

    data = read_json(set_path)
    all_items = data.get("items") or []
    if not all_items:
        raise SystemExit(f"Set has no items: {set_id}")

    selected_items = select_items(all_items, args)
    target_dir = resolve_target_dir(data, selected_items, args)
    display = args.display or data.get("display") or ("scene-card" if target_dir.name.endswith("_scene") else "cutout")

    report: dict[str, Any] = {
        "setId": set_id,
        "setPath": rel(set_path),
        "display": display,
        "targetDir": rel(target_dir),
        "selectedItems": [item["id"] for item in selected_items],
        "importedFromSheet": rel(Path(args.from_sheet)) if args.from_sheet else None,
        "items": [],
        "warnings": [],
        "failures": [],
        "written": [],
    }

    if args.from_sheet:
        import_from_sheet(selected_items, target_dir, args, report)

    if not args.no_write_set:
        update_set_paths(data, selected_items, target_dir, display, args, report)

    validate_images(data, target_dir, report)

    if not args.dry_run and not args.no_write_bundle:
        write_bundle(data, set_path.with_suffix(".bundle.js"))
        report["written"].append(rel(set_path.with_suffix(".bundle.js")))

    if args.contact_sheet or (args.from_sheet and not args.validate_only):
        contact_path = Path(args.contact_sheet) if args.contact_sheet else default_contact_path(target_dir)
        if not args.dry_run:
            write_contact_sheet(
                paths=[PROJECT_ROOT / item["image"] for item in data.get("items", [])],
                labels=[item["id"] for item in data.get("items", [])],
                target_path=contact_path,
            )
        report["contactSheet"] = rel(contact_path)

    report["qualityStatus"] = "fail" if report["failures"] else ("warn" if report["warnings"] else "pass")
    return report


def process_batch_plan(set_id: str, args: argparse.Namespace) -> dict[str, Any]:
    plan_path = resolve_project_path(args.batch_plan)
    if not plan_path.exists():
        raise SystemExit(f"Batch plan not found: {plan_path}")

    plan = read_json(plan_path)
    plan_set_id = plan.get("set") or plan.get("setId")
    if plan_set_id and plan_set_id != set_id:
        raise SystemExit(f"Batch plan set {plan_set_id!r} does not match --set {set_id!r}.")

    batches = plan.get("sheets") or plan.get("batches")
    if not isinstance(batches, list) or not batches:
        raise SystemExit("Batch plan must contain a non-empty 'sheets' array.")

    set_path = SET_DIR / f"{set_id}.json"
    if not set_path.exists():
        raise SystemExit(f"Set not found: {set_id}")

    data = read_json(set_path)
    all_items = data.get("items") or []
    if not all_items:
        raise SystemExit(f"Set has no items: {set_id}")

    target_dir = resolve_target_dir(data, all_items, args)
    display = plan.get("display") or args.display or data.get("display") or (
        "scene-card" if target_dir.name.endswith("_scene") else "cutout"
    )
    report: dict[str, Any] = {
        "setId": set_id,
        "setPath": rel(set_path),
        "display": display,
        "targetDir": rel(target_dir),
        "selectedItems": [],
        "importedFromSheet": [],
        "items": [],
        "batches": [],
        "warnings": [],
        "failures": [],
        "written": [],
        "plan": rel(plan_path),
    }

    for index, batch in enumerate(batches, start=1):
        if not isinstance(batch, dict):
            raise SystemExit(f"Batch {index} must be an object.")

        batch_args = batch_namespace(args, batch)
        selected_items = select_items(all_items, batch_args)
        report["selectedItems"].extend(item["id"] for item in selected_items)
        report["importedFromSheet"].append(rel(resolve_project_path(batch_args.from_sheet)))

        before_items = len(report["items"])
        before_warnings = len(report["warnings"])
        import_from_sheet(selected_items, target_dir, batch_args, report)
        update_set_paths(data, selected_items, target_dir, display, batch_args, report)

        report["batches"].append(
            {
                "index": index,
                "fromSheet": rel(resolve_project_path(batch_args.from_sheet)),
                "grid": batch_args.grid,
                "items": [item["id"] for item in selected_items],
                "importedItems": len(report["items"]) - before_items,
                "warnings": report["warnings"][before_warnings:],
            }
        )

    validate_images(data, target_dir, report)

    if not args.dry_run and not args.no_write_bundle:
        write_bundle(data, set_path.with_suffix(".bundle.js"))
        report["written"].append(rel(set_path.with_suffix(".bundle.js")))

    contact_path = Path(args.contact_sheet or plan.get("contactSheet") or default_contact_path(target_dir))
    if not args.dry_run:
        write_contact_sheet(
            paths=[PROJECT_ROOT / item["image"] for item in data.get("items", [])],
            labels=[item["id"] for item in data.get("items", [])],
            target_path=contact_path,
        )
    report["contactSheet"] = rel(contact_path)
    report["qualityStatus"] = "fail" if report["failures"] else ("warn" if report["warnings"] else "pass")
    return report


def batch_namespace(args: argparse.Namespace, batch: dict[str, Any]) -> argparse.Namespace:
    from_sheet = batch.get("fromSheet") or batch.get("from_sheet")
    if not from_sheet:
        raise SystemExit("Every batch needs fromSheet.")

    items = batch.get("items")
    if isinstance(items, list):
        items = ",".join(str(item) for item in items)
    elif items is not None and not isinstance(items, str):
        raise SystemExit("Batch items must be a comma-separated string or an array.")

    return argparse.Namespace(
        **{
            **vars(args),
            "from_sheet": from_sheet,
            "grid": batch.get("grid") or args.grid,
            "items": items,
            "start": int(batch.get("start", args.start)),
            "limit": int(batch.get("limit", args.limit)),
            "crop_mode": batch.get("cropMode") or batch.get("crop_mode") or args.crop_mode,
            "safe_crop": float(batch.get("safeCrop", batch.get("safe_crop", args.safe_crop))),
            "edge_inset": int(batch.get("edgeInset", batch.get("edge_inset", args.edge_inset))),
            "canvas": int(batch.get("canvas", args.canvas)),
        }
    )


def select_items(all_items: list[dict[str, Any]], args: argparse.Namespace) -> list[dict[str, Any]]:
    by_id = {item.get("id"): item for item in all_items}

    if args.items:
        ids = [item.strip() for item in args.items.split(",") if item.strip()]
        missing = [item_id for item_id in ids if item_id not in by_id]
        if missing:
            raise SystemExit(f"Items not found in set: {', '.join(missing)}")
        selected = [by_id[item_id] for item_id in ids]
    elif args.from_sheet:
        limit = args.limit or min(MAX_SHEET_ITEMS, len(all_items) - args.start)
        selected = all_items[args.start : args.start + limit]
    else:
        selected = all_items

    if args.from_sheet and len(selected) > MAX_SHEET_ITEMS:
        raise SystemExit(f"Sheet import supports at most {MAX_SHEET_ITEMS} items per generation.")
    if args.from_sheet and not selected:
        raise SystemExit("No items selected for sheet import.")

    return selected


def resolve_target_dir(
    data: dict[str, Any],
    selected_items: list[dict[str, Any]],
    args: argparse.Namespace,
) -> Path:
    if args.target_dir:
        return resolve_project_path(args.target_dir)

    image_paths = [item.get("image") for item in selected_items if item.get("image")]
    parents = {Path(path).parent.as_posix() for path in image_paths}
    if len(parents) == 1:
        return PROJECT_ROOT / parents.pop()

    suffix = "_scene" if (args.display or data.get("display")) == "scene-card" else ""
    return IMAGE_ROOT / f"{data['id']}{suffix}"


def import_from_sheet(
    selected_items: list[dict[str, Any]],
    target_dir: Path,
    args: argparse.Namespace,
    report: dict[str, Any],
) -> None:
    source_path = resolve_project_path(args.from_sheet)
    if not source_path.exists():
        raise SystemExit(f"Sheet not found: {source_path}")
    if args.safe_crop <= 0 or args.safe_crop > 1:
        raise SystemExit("--safe-crop must be > 0 and <= 1.")

    grid = parse_grid(args.grid) if args.grid else infer_grid(len(selected_items))
    rows, cols = grid
    capacity = rows * cols
    if capacity < len(selected_items):
        raise SystemExit(f"Grid {rows}x{cols} has only {capacity} cells for {len(selected_items)} items.")
    if capacity > len(selected_items):
        report["warnings"].append(
            f"Grid {rows}x{cols} has {capacity} cells but only {len(selected_items)} selected items."
        )

    image = Image.open(source_path).convert("RGB")
    validate_sheet_geometry(image, rows, cols, report)
    cell_width = image.width / cols
    cell_height = image.height / rows
    if not args.dry_run:
        target_dir.mkdir(parents=True, exist_ok=True)

    for index, item in enumerate(selected_items):
        row = index // cols
        col = index % cols
        cell_box = (
            round(col * cell_width),
            round(row * cell_height),
            round((col + 1) * cell_width),
            round((row + 1) * cell_height),
        )
        cell = image.crop(cell_box)
        if args.crop_mode == "auto":
            local_box = auto_scene_card_crop_box(cell, args.safe_crop, args.edge_inset)
        else:
            side = min(cell.width, cell.height) * args.safe_crop
            local_box = crop_box(cell.width / 2, cell.height / 2, side, cell.width, cell.height)

        tile = cell.crop(local_box).resize((args.canvas, args.canvas), Image.Resampling.LANCZOS)
        target_path = target_dir / f"{item['id']}.png"
        if not args.dry_run:
            tile.save(target_path)
        source_crop = [
            cell_box[0] + local_box[0],
            cell_box[1] + local_box[1],
            cell_box[0] + local_box[2],
            cell_box[1] + local_box[3],
        ]
        report["written"].append(rel(target_path))
        report["items"].append(
            {
                "id": item["id"],
                "imported": True,
                "path": rel(target_path),
                "sourceCell": {"row": row + 1, "col": col + 1},
                "cropMode": args.crop_mode,
                "sourceCrop": source_crop,
            }
        )


def update_set_paths(
    data: dict[str, Any],
    selected_items: list[dict[str, Any]],
    target_dir: Path,
    display: str,
    args: argparse.Namespace,
    report: dict[str, Any],
) -> None:
    changed = False
    selected_ids = {item["id"] for item in selected_items}

    if display == "scene-card" and data.get("display") != "scene-card":
        data = insert_or_update_display(data, "scene-card")
        changed = True

    for item in data.get("items", []):
        if item.get("id") not in selected_ids:
            continue
        desired = rel(target_dir / f"{item['id']}.png")
        if item.get("image") != desired:
            item["image"] = desired
            changed = True

    if changed:
        set_path = SET_DIR / f"{data['id']}.json"
        if not args.dry_run:
            write_json(set_path, data)
        report["written"].append(rel(set_path))


def validate_images(data: dict[str, Any], target_dir: Path, report: dict[str, Any]) -> None:
    expected_paths = [PROJECT_ROOT / item["image"] for item in data.get("items", []) if item.get("image")]
    expected_in_target = {path.name for path in expected_paths if path.parent == target_dir}
    target_pngs = {path.name for path in target_dir.glob("*.png")} if target_dir.exists() else set()

    if target_dir.exists():
        extra = sorted(target_pngs - expected_in_target)
        if extra:
            report["failures"].append(f"Extra PNGs in target dir: {extra[:12]}")
    else:
        report["failures"].append(f"Target image directory missing: {rel(target_dir)}")

    seen_paths: set[str] = set()
    for item in data.get("items", []):
        item_id = item.get("id")
        image_path_raw = item.get("image")
        if not image_path_raw:
            report["failures"].append(f"{item_id}: missing image path")
            continue
        if image_path_raw in seen_paths:
            report["failures"].append(f"{item_id}: duplicate image path {image_path_raw}")
        seen_paths.add(image_path_raw)

        image_path = PROJECT_ROOT / image_path_raw
        item_report = {"id": item_id, "path": image_path_raw}
        if not image_path.exists():
            report["failures"].append(f"{item_id}: image missing: {image_path_raw}")
            report["items"].append(item_report)
            continue

        try:
            with Image.open(image_path) as image:
                item_report["size"] = [image.width, image.height]
                if image.format != "PNG":
                    report["failures"].append(f"{item_id}: image is not PNG")
                if (image.width, image.height) != (768, 768):
                    report["failures"].append(f"{item_id}: expected 768x768, got {image.width}x{image.height}")
                edge_warning = edge_artifact_warning(image.convert("RGB"))
                if edge_warning:
                    report["warnings"].append(f"{item_id}: {edge_warning}")
                item_report["edgeSalience"] = edge_salience(image.convert("RGB"))
                offset = visual_center_offset(image.convert("RGB"))
                item_report["visualCenterOffset"] = [round(offset[0], 3), round(offset[1], 3)]
                if max(abs(offset[0]), abs(offset[1])) > 0.18:
                    report["warnings"].append(
                        f"{item_id}: visual center looks off ({offset[0]:.2f}, {offset[1]:.2f})"
                    )
        except OSError as error:
            report["failures"].append(f"{item_id}: cannot read image: {error}")

        if item_report not in report["items"]:
            report["items"].append(item_report)


def edge_artifact_warning(image: Image.Image) -> str | None:
    width, height = image.size
    strips = {
        "left": (0, 0, 6, height),
        "right": (width - 6, 0, width, height),
        "top": (0, 0, width, 6),
        "bottom": (0, height - 6, width, height),
    }
    inner = {
        "left": (18, 0, 24, height),
        "right": (width - 24, 0, width - 18, height),
        "top": (0, 18, width, 24),
        "bottom": (0, height - 24, width, height - 18),
    }
    risky_edges: list[str] = []
    for name, box in strips.items():
        edge = image.crop(box)
        nearby = image.crop(inner[name])
        delta = ImageChops.difference(edge.resize(nearby.size), nearby)
        stat = ImageStat.Stat(delta)
        mean_delta = sum(stat.mean) / 3
        variance = sum(stat.var) / 3
        edge_white = near_white_fraction(edge)
        inner_white = near_white_fraction(nearby)
        has_white_gutter = edge_white > 0.45 and edge_white - inner_white > 0.2
        if has_white_gutter:
            risky_edges.append(name)
    if risky_edges:
        return f"possible edge stripe at {', '.join(risky_edges)}"
    return None


def edge_salience(image: Image.Image) -> dict[str, float]:
    width, height = image.size
    strips = {
        "left": (0, 0, 10, height),
        "right": (width - 10, 0, width, height),
        "top": (0, 0, width, 10),
        "bottom": (0, height - 10, width, height),
    }
    return {name: round(salient_fraction(image.crop(box)), 3) for name, box in strips.items()}


def near_white_fraction(image: Image.Image) -> float:
    arr = np.array(image.convert("RGB"))
    maxc = arr.max(axis=2)
    minc = arr.min(axis=2)
    saturation = maxc - minc
    return float(((maxc > 246) & (saturation < 22)).mean())


def salient_fraction(image: Image.Image) -> float:
    arr = np.array(image.convert("RGB"))
    maxc = arr.max(axis=2)
    minc = arr.min(axis=2)
    saturation = maxc - minc
    darkness = 255 - maxc
    mask = (saturation > 55) | (darkness > 80)
    return float(mask.mean())


def visual_center_offset(image: Image.Image) -> tuple[float, float]:
    small = image.resize((96, 96), Image.Resampling.BILINEAR).convert("RGB")
    pixels = small.load()
    weights: list[tuple[int, int, float]] = []
    for y in range(small.height):
        for x in range(small.width):
            r, g, b = pixels[x, y]
            maxc = max(r, g, b)
            minc = min(r, g, b)
            saturation = maxc - minc
            darkness = 255 - maxc
            weight = max(0.0, saturation - 18) + max(0.0, darkness - 28) * 0.7
            if weight > 0:
                weights.append((x, y, weight))
    total = sum(weight for _, _, weight in weights)
    if total <= 0:
        return (0.0, 0.0)
    cx = sum(x * weight for x, _, weight in weights) / total
    cy = sum(y * weight for _, y, weight in weights) / total
    return ((cx / (small.width - 1)) - 0.5, (cy / (small.height - 1)) - 0.5)


def write_bundle(data: dict[str, Any], target_path: Path) -> None:
    target_path.write_text(
        "window.LERNWORT_BUNDLED_SETS = window.LERNWORT_BUNDLED_SETS || {};\n"
        f"window.LERNWORT_BUNDLED_SETS[{json.dumps(data['id'])}] = "
        f"{json.dumps(data, indent=2, ensure_ascii=False)};\n",
        encoding="utf-8",
    )


def write_contact_sheet(paths: list[Path], labels: list[str], target_path: Path) -> None:
    images: list[tuple[str, Image.Image]] = []
    for label, path in zip(labels, paths):
        if path.exists():
            with Image.open(path) as image:
                images.append((label, image.convert("RGB")))
    if not images:
        return

    cols = min(5, len(images))
    rows = math.ceil(len(images) / cols)
    thumb = 220
    gap = 18
    label_height = 24
    sheet = Image.new("RGB", (cols * thumb + (cols + 1) * gap, rows * (thumb + label_height) + (rows + 1) * gap), "#f8f2e7")
    draw = ImageDraw.Draw(sheet)

    for index, (label, image) in enumerate(images):
        col = index % cols
        row = index // cols
        x = gap + col * (thumb + gap)
        y = gap + row * (thumb + label_height + gap)
        thumb_image = image.resize((thumb, thumb), Image.Resampling.LANCZOS)
        sheet.paste(thumb_image, (x, y))
        draw.text((x, y + thumb + 5), label, fill="#24364f")

    target_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(target_path)


def insert_or_update_display(data: dict[str, Any], value: str) -> dict[str, Any]:
    if "display" in data:
        data["display"] = value
        return data

    reordered: dict[str, Any] = {}
    inserted = False
    for key, existing in data.items():
        reordered[key] = existing
        if key == "category":
            reordered["display"] = value
            inserted = True
    if not inserted:
        reordered["display"] = value
    data.clear()
    data.update(reordered)
    return data


def parse_grid(value: str) -> tuple[int, int]:
    normalized = value.lower().replace(" ", "")
    if "x" not in normalized:
        raise SystemExit("--grid must look like 2x5.")
    raw_rows, raw_cols = normalized.split("x", 1)
    rows = int(raw_rows)
    cols = int(raw_cols)
    if rows <= 0 or cols <= 0:
        raise SystemExit("--grid rows and columns must be positive.")
    return rows, cols


def validate_sheet_geometry(image: Image.Image, rows: int, cols: int, report: dict[str, Any]) -> None:
    cell_width = image.width / cols
    cell_height = image.height / rows
    ratio = max(cell_width, cell_height) / min(cell_width, cell_height)
    if ratio > 1.25:
        report["warnings"].append(
            f"Sheet cells are not close to square ({cell_width:.1f}x{cell_height:.1f}, ratio {ratio:.2f}); long objects may crop poorly."
        )


def infer_grid(count: int) -> tuple[int, int]:
    if count <= 0:
        raise SystemExit("Cannot infer a grid for zero items.")
    if count <= 5:
        return (1, count)
    return (2, math.ceil(count / 2))


def crop_box(center_x: float, center_y: float, side: float, width: int, height: int) -> tuple[int, int, int, int]:
    half = side / 2
    left = max(0, round(center_x - half))
    top = max(0, round(center_y - half))
    right = min(width, round(center_x + half))
    bottom = min(height, round(center_y + half))
    return (left, top, right, bottom)


def auto_scene_card_crop_box(cell: Image.Image, safe_crop: float, edge_inset: int) -> tuple[int, int, int, int]:
    arr = np.array(cell.convert("RGB"))
    maxc = arr.max(axis=2)
    minc = arr.min(axis=2)
    saturation = maxc - minc
    non_gutter = ~((maxc > 242) & (saturation < 22))

    col_density = non_gutter.mean(axis=0)
    row_density = non_gutter.mean(axis=1)
    xs = np.where(col_density > 0.12)[0]
    ys = np.where(row_density > 0.12)[0]
    if len(xs) == 0 or len(ys) == 0:
        side = min(cell.width, cell.height) * safe_crop
        return crop_box(cell.width / 2, cell.height / 2, side, cell.width, cell.height)

    left = int(xs.min())
    top = int(ys.min())
    right = int(xs.max() + 1)
    bottom = int(ys.max() + 1)

    if left <= 2:
        left += edge_inset
    if right >= cell.width - 2:
        right -= edge_inset
    if top <= 2:
        top += edge_inset
    if bottom >= cell.height - 2:
        bottom -= edge_inset

    padding = 3
    left = max(0, left + padding)
    top = max(0, top + padding)
    right = min(cell.width, right - padding)
    bottom = min(cell.height, bottom - padding)

    if right <= left or bottom <= top:
        side = min(cell.width, cell.height) * safe_crop
        return crop_box(cell.width / 2, cell.height / 2, side, cell.width, cell.height)

    side = min(right - left, bottom - top) * safe_crop
    center_x = (left + right) / 2
    center_y = (top + bottom) / 2
    return crop_box(center_x, center_y, side, cell.width, cell.height)


def summarize_reports(reports: list[dict[str, Any]]) -> dict[str, Any]:
    failures = sum(len(report["failures"]) for report in reports)
    warnings = sum(len(report["warnings"]) for report in reports)
    written = [path for report in reports for path in report["written"]]
    return {
        "sets": len(reports),
        "status": "fail" if failures else ("warn" if warnings else "pass"),
        "warnings": warnings,
        "failures": failures,
        "written": written,
    }


def collect_qa_candidates(reports: list[dict[str, Any]]) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    for report in reports:
        warning_by_id: dict[str, list[str]] = {}
        for warning in report["warnings"]:
            item_id = warning.split(":", 1)[0]
            warning_by_id.setdefault(item_id, []).append(warning)

        for item in report["items"]:
            item_id = item.get("id")
            reasons = warning_by_id.get(item_id, []).copy()
            padding_reason = padding_sensitive_reason(report["setId"], item_id)
            if padding_reason:
                reasons.append(padding_reason)
            offset = item.get("visualCenterOffset") or [0, 0]
            offset_score = max(abs(offset[0]), abs(offset[1])) if len(offset) == 2 else 0
            if offset_score > 0.22 and not any("visual center" in reason for reason in reasons):
                reasons.append(f"{item_id}: visual center needs review ({offset[0]:.2f}, {offset[1]:.2f})")
            if not reasons:
                continue
            candidates.append(
                {
                    "setId": report["setId"],
                    "id": item_id,
                    "path": item.get("path"),
                    "visualCenterOffset": offset,
                    "edgeSalience": item.get("edgeSalience"),
                    "reasons": reasons,
                }
            )
    return candidates


def collect_report_items(reports: list[dict[str, Any]]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str]] = set()
    for report in reports:
        for item in report["items"]:
            item_id = item.get("id")
            path = item.get("path")
            if not item_id or not path:
                continue
            key = (report["setId"], item_id, path)
            if key in seen:
                continue
            seen.add(key)
            items.append({"setId": report["setId"], "id": item_id, "path": path})
    return items


def padding_sensitive_reason(set_id: str, item_id: str | None) -> str | None:
    if not item_id:
        return None
    if set_id in PADDING_SENSITIVE_SETS or item_id in PADDING_SENSITIVE_ITEMS:
        return f"{item_id}: padding-sensitive subject; visually verify equal breathing room"
    return None


def default_report_path(args: argparse.Namespace, report: dict[str, Any] | None) -> Path | None:
    if not report:
        return None
    name = Path(report["targetDir"]).name
    suffix = "import_report.json" if (args.from_sheet or args.batch_plan) else "qa_report.json"
    return REFERENCE_ROOT / f"{name}_generation" / suffix


def default_contact_path(target_dir: Path) -> Path:
    return REFERENCE_ROOT / f"{target_dir.name}_generation" / f"{target_dir.name}_contact_sheet.png"


def resolve_project_path(path: str) -> Path:
    raw = Path(path)
    return raw if raw.is_absolute() else PROJECT_ROOT / raw


def rel(path: Path) -> str:
    try:
        return path.resolve().relative_to(PROJECT_ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


@contextlib.contextmanager
def image_pipeline_lock(timeout: float):
    LOCK_ROOT.mkdir(parents=True, exist_ok=True)
    lock_path = LOCK_ROOT / "sync_image_assets.lock"
    with lock_path.open("w", encoding="utf-8") as handle:
        deadline = time.monotonic() + timeout
        while True:
            try:
                fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except BlockingIOError:
                if timeout <= 0 or time.monotonic() >= deadline:
                    raise SystemExit(
                        f"Another image sync/import is running ({lock_path}). Retry after it finishes, or pass --lock-timeout."
                    )
                time.sleep(0.2)
        try:
            handle.write(f"pid={os.getpid()} started={time.time():.0f}\n")
            handle.flush()
            yield
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


if __name__ == "__main__":
    raise SystemExit(main())
