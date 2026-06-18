#!/usr/bin/env python3
"""Extract vocabulary cutouts from a generated object sheet.

The script is intentionally dependency-light: Pillow and Numpy only. It is
designed for generated sheets with separated objects on a light checkerboard or
flat chroma-key background.
"""

from __future__ import annotations

import argparse
import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, help="Input sheet image.")
    parser.add_argument("--out-dir", required=True, help="Directory for PNG cutouts.")
    parser.add_argument("--items", required=True, help="Comma-separated item ids in row-major order.")
    parser.add_argument("--canvas", type=int, default=512, help="Output canvas size in pixels.")
    parser.add_argument("--padding", type=int, default=44, help="Transparent padding inside each output.")
    parser.add_argument("--min-area", type=int, default=1000, help="Minimum foreground component area.")
    parser.add_argument("--grid", default=None, help="Expected sheet grid, e.g. 2x5.")
    parser.add_argument("--cell-margin", type=int, default=8, help="Minimum distance from a component to its grid-cell edge.")
    parser.add_argument("--cell-overlap-tolerance", type=int, default=12, help="Allowed px overlap past a grid-cell edge before fail.")
    parser.add_argument("--trim-output", action="store_true", help="Trim final PNGs to their alpha bounds plus 2px.")
    parser.add_argument("--edge-feather", type=float, default=0.35, help="Small alpha blur for smoother edges.")
    parser.add_argument("--edge-contract", type=int, default=0, help="Shrink alpha mask before smoothing to remove color fringes.")
    parser.add_argument("--despill", action="store_true", help="Neutralize chroma-key color spill on semi-transparent edges.")
    parser.add_argument("--key-color", default="auto", help="Chroma key color as #rrggbb, or auto/off.")
    parser.add_argument("--key-threshold", type=float, default=75, help="Chroma-key distance threshold for foreground extraction.")
    parser.add_argument("--report", default=None, help="Optional JSON report path.")
    parser.add_argument("--contact-sheet", default=None, help="Optional contact sheet path.")
    parser.add_argument(
        "--transparent-hole-items",
        default="",
        help="Comma-separated item ids whose enclosed background-like holes should stay transparent.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    items = [item.strip() for item in args.items.split(",") if item.strip()]
    transparent_hole_items = {
        item.strip() for item in args.transparent_hole_items.split(",") if item.strip()
    }
    if not items:
        raise SystemExit("No items provided.")

    source_path = Path(args.source)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    image = Image.open(source_path).convert("RGBA")
    rgb = np.array(image)[:, :, :3].astype(np.int16)
    alpha = np.array(image)[:, :, 3]
    grid = parse_grid(args.grid)
    key_color = resolve_key_color(image, args.key_color)
    foreground = build_foreground_mask(rgb, alpha, key_color=key_color, key_threshold=args.key_threshold)
    components = connected_components(
        foreground,
        rgb=rgb,
        min_area=args.min_area,
        key_color=key_color,
        key_threshold=args.key_threshold,
    )
    components = sorted_components_by_rows(components)
    grid_report = evaluate_grid(
        components=components,
        image_size=image.size,
        grid=grid,
        expected_count=len(items),
        cell_margin=args.cell_margin,
        overlap_tolerance=args.cell_overlap_tolerance,
    )

    report = {
        "source": str(source_path),
        "imageSize": list(image.size),
        "expectedItems": len(items),
        "detectedComponents": len(components),
        "canvas": args.canvas,
        "padding": args.padding,
        "grid": args.grid,
        "gridCheck": grid_report,
        "postProcessing": {
            "trimOutput": args.trim_output,
            "edgeFeather": args.edge_feather,
            "edgeContract": args.edge_contract,
            "despill": args.despill,
            "keyColor": list(key_color) if key_color else None,
        },
        "transparentHoleItems": sorted(transparent_hole_items),
        "items": [],
        "warnings": [],
        "failures": [],
        "qualityStatus": "pass",
    }
    report["warnings"].extend(grid_report["warnings"])
    report["failures"].extend(grid_report["failures"])

    if len(components) != len(items):
        report["failures"].append(
            f"Expected {len(items)} components but detected {len(components)}."
        )

    for index, (item_id, component) in enumerate(zip(items, components)):
        component_mask = (
            component["selectiveMask"] if item_id in transparent_hole_items else component["filledMask"]
        )
        cutout, item_report = extract_item(
            image=image,
            mask=component_mask,
            bbox=component["bbox"],
            canvas_size=args.canvas,
            padding=args.padding,
            preserve_internal_holes=item_id in transparent_hole_items,
            trim_output=args.trim_output,
            edge_feather=args.edge_feather,
            edge_contract=args.edge_contract,
            despill=args.despill,
            key_color=key_color,
            key_threshold=args.key_threshold,
        )
        target_path = out_dir / f"{item_id}.png"
        cutout.save(target_path)
        item_report.update(
            {
                "id": item_id,
                "path": str(target_path),
                "sourceBbox": list(component["bbox"]),
                "sourceArea": component["area"],
                "sourceCentroid": [round(component["cx"], 2), round(component["cy"], 2)],
            }
        )
        report["items"].append(item_report)
        report["warnings"].extend(
            f"{item_id}: {warning}" for warning in item_report.get("warnings", [])
        )
        report["failures"].extend(
            f"{item_id}: {failure}" for failure in item_report.get("failures", [])
        )

    report["qualityStatus"] = quality_status(report)

    if args.contact_sheet:
        write_contact_sheet(
            paths=[Path(item["path"]) for item in report["items"]],
            labels=[item["id"] for item in report["items"]],
            target_path=Path(args.contact_sheet),
        )

    if args.report:
        report_path = Path(args.report)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({
        "detected": len(components),
        "expected": len(items),
        "status": report["qualityStatus"],
        "warnings": report["warnings"],
        "failures": report["failures"],
    }, indent=2))
    if report["qualityStatus"] == "fail":
        raise SystemExit(2)


def build_foreground_mask(
    rgb: np.ndarray,
    alpha: np.ndarray,
    key_color: tuple[int, int, int] | None,
    key_threshold: float,
) -> np.ndarray:
    if key_color:
        rgb32 = rgb.astype(np.int32)
        key = np.array(key_color, dtype=np.int32)
        distance = np.sqrt(((rgb32 - key) ** 2).sum(axis=2))
        return (distance > key_threshold) & (alpha > 0)

    maxc = rgb.max(axis=2)
    minc = rgb.min(axis=2)
    saturation = maxc - minc

    # Generated fake-transparency checkerboards are nearly white/grey and low
    # saturation. Foreground illustrations are either colored, dark outlined, or
    # both. This also works for solid chroma-key sheets.
    foreground = ((saturation > 18) | (maxc < 225)) & (alpha > 0)
    return foreground


def parse_grid(value: str | None) -> tuple[int, int] | None:
    if not value:
        return None
    normalized = value.lower().replace(" ", "")
    if "x" not in normalized:
        raise SystemExit("--grid must look like 2x5.")
    row_raw, col_raw = normalized.split("x", 1)
    rows = int(row_raw)
    cols = int(col_raw)
    if rows <= 0 or cols <= 0:
        raise SystemExit("--grid rows and columns must be positive.")
    return rows, cols


def resolve_key_color(image: Image.Image, value: str) -> tuple[int, int, int] | None:
    normalized = value.strip().lower()
    if normalized in {"", "off", "none", "false", "0"}:
        return None
    if normalized.startswith("#") and len(normalized) == 7:
        return tuple(int(normalized[index : index + 2], 16) for index in (1, 3, 5))
    if normalized != "auto":
        raise SystemExit("--key-color must be #rrggbb, auto, or off.")

    arr = np.array(image.convert("RGBA"))[:, :, :3].astype(np.int16)
    border = np.concatenate([arr[0, :, :], arr[-1, :, :], arr[:, 0, :], arr[:, -1, :]], axis=0)
    mean = border.mean(axis=0)
    maxc = border.max(axis=1)
    minc = border.min(axis=1)
    saturation = maxc - minc
    if float((saturation > 80).mean()) < 0.75:
        return None

    dominant = int(np.argmax(mean))
    if dominant == 1 and mean[1] > mean[0] + 45 and mean[1] > mean[2] + 45:
        return (0, 255, 0)
    if mean[0] > 180 and mean[2] > 180 and mean[1] < 120:
        return (255, 0, 255)
    return tuple(int(round(channel)) for channel in mean)


def evaluate_grid(
    components: list[dict],
    image_size: tuple[int, int],
    grid: tuple[int, int] | None,
    expected_count: int,
    cell_margin: int,
    overlap_tolerance: int,
) -> dict:
    result = {"enabled": bool(grid), "warnings": [], "failures": [], "cells": []}
    if not grid:
        return result

    rows, cols = grid
    width, height = image_size
    cell_width = width / cols
    cell_height = height / rows

    if rows * cols != expected_count:
        result["failures"].append(
            f"Grid {rows}x{cols} has {rows * cols} cells but expected {expected_count} items."
        )

    occupancy: dict[tuple[int, int], list[int]] = {}
    for index, component in enumerate(components):
        col = min(cols - 1, max(0, int(component["cx"] // cell_width)))
        row = min(rows - 1, max(0, int(component["cy"] // cell_height)))
        occupancy.setdefault((row, col), []).append(index)
        left, top, right, bottom = component["bbox"]
        cell_left = col * cell_width
        cell_top = row * cell_height
        cell_right = (col + 1) * cell_width
        cell_bottom = (row + 1) * cell_height
        margins = [
            left - cell_left,
            top - cell_top,
            cell_right - right,
            cell_bottom - bottom,
        ]
        cell_record = {
            "componentIndex": index,
            "row": row,
            "col": col,
            "bbox": [left, top, right, bottom],
            "centroid": [round(component["cx"], 2), round(component["cy"], 2)],
            "margins": [round(value, 2) for value in margins],
        }
        result["cells"].append(cell_record)
        if min(margins) < -overlap_tolerance:
            result["failures"].append(
                f"Component {index + 1} crosses grid cell {row + 1},{col + 1} by {round(abs(min(margins)), 1)}px."
            )
        elif min(margins) < cell_margin:
            result["warnings"].append(
                f"Component {index + 1} is close to grid cell {row + 1},{col + 1} edge: {round(min(margins), 1)}px."
            )

    for row in range(rows):
        for col in range(cols):
            count = len(occupancy.get((row, col), []))
            if count == 0:
                result["failures"].append(f"Grid cell {row + 1},{col + 1} has no component.")
            elif count > 1:
                result["failures"].append(f"Grid cell {row + 1},{col + 1} has {count} components.")

    return result


def connected_components(
    mask: np.ndarray,
    rgb: np.ndarray,
    min_area: int,
    key_color: tuple[int, int, int] | None,
    key_threshold: float,
) -> list[dict]:
    height, width = mask.shape
    seen = np.zeros(mask.shape, dtype=bool)
    components = []

    for y in range(height):
        xs = np.where(mask[y] & ~seen[y])[0]
        for x_start in xs:
            if seen[y, x_start] or not mask[y, x_start]:
                continue

            points = []
            stack = [(int(x_start), int(y))]
            seen[y, x_start] = True
            min_x = max_x = int(x_start)
            min_y = max_y = int(y)

            while stack:
                x, current_y = stack.pop()
                points.append((x, current_y))
                min_x = min(min_x, x)
                max_x = max(max_x, x)
                min_y = min(min_y, current_y)
                max_y = max(max_y, current_y)

                for ny in range(current_y - 1, current_y + 2):
                    if ny < 0 or ny >= height:
                        continue
                    for nx in range(x - 1, x + 2):
                        if nx < 0 or nx >= width or seen[ny, nx] or not mask[ny, nx]:
                            continue
                        seen[ny, nx] = True
                        stack.append((nx, ny))

            area = len(points)
            if area < min_area:
                continue

            component_mask = np.zeros(mask.shape, dtype=bool)
            xs_points = [point[0] for point in points]
            ys_points = [point[1] for point in points]
            component_mask[ys_points, xs_points] = True
            filled_mask = fill_holes(component_mask, (min_x, min_y, max_x + 1, max_y + 1))
            selective_mask = fill_holes_selectively(
                component_mask,
                rgb=rgb,
                bbox=(min_x, min_y, max_x + 1, max_y + 1),
                key_color=key_color,
                key_threshold=key_threshold,
            )
            area = int(filled_mask.sum())
            ys_full, xs_full = np.where(filled_mask)
            components.append(
                {
                    "bbox": (int(xs_full.min()), int(ys_full.min()), int(xs_full.max() + 1), int(ys_full.max() + 1)),
                    "area": area,
                    "cx": float(xs_full.mean()),
                    "cy": float(ys_full.mean()),
                    "filledMask": filled_mask,
                    "selectiveMask": selective_mask,
                }
            )

    return components


def fill_holes(mask: np.ndarray, bbox: tuple[int, int, int, int]) -> np.ndarray:
    left, top, right, bottom = bbox
    crop = mask[top:bottom, left:right]
    exterior = find_exterior_background(crop)
    filled_crop = crop | (~crop & ~exterior)
    filled = mask.copy()
    filled[top:bottom, left:right] = filled_crop
    return filled


def fill_holes_selectively(
    mask: np.ndarray,
    rgb: np.ndarray,
    bbox: tuple[int, int, int, int],
    key_color: tuple[int, int, int] | None,
    key_threshold: float,
) -> np.ndarray:
    left, top, right, bottom = bbox
    crop = mask[top:bottom, left:right]
    crop_rgb = rgb[top:bottom, left:right]
    exterior = find_exterior_background(crop)
    holes = ~crop & ~exterior
    fillable_holes = np.zeros(crop.shape, dtype=bool)

    for xs_points, ys in iter_components(holes):
        hole_rgb = crop_rgb[ys, xs_points]
        if not is_background_like(hole_rgb, key_color=key_color, key_threshold=key_threshold):
            fillable_holes[ys, xs_points] = True

    filled_crop = crop | fillable_holes
    filled = mask.copy()
    filled[top:bottom, left:right] = filled_crop
    return filled


def find_exterior_background(crop: np.ndarray) -> np.ndarray:
    height, width = crop.shape
    exterior = np.zeros(crop.shape, dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    def add_if_background(x: int, y: int) -> None:
        if 0 <= x < width and 0 <= y < height and not crop[y, x] and not exterior[y, x]:
            exterior[y, x] = True
            queue.append((x, y))

    for x in range(width):
        add_if_background(x, 0)
        add_if_background(x, height - 1)
    for y in range(height):
        add_if_background(0, y)
        add_if_background(width - 1, y)

    while queue:
        x, y = queue.popleft()
        add_if_background(x - 1, y)
        add_if_background(x + 1, y)
        add_if_background(x, y - 1)
        add_if_background(x, y + 1)

    return exterior


def iter_components(mask: np.ndarray):
    height, width = mask.shape
    seen = np.zeros(mask.shape, dtype=bool)
    for y in range(height):
        xs = np.where(mask[y] & ~seen[y])[0]
        for x_start in xs:
            if seen[y, x_start] or not mask[y, x_start]:
                continue
            stack = [(int(x_start), int(y))]
            seen[y, x_start] = True
            points = []
            while stack:
                x, current_y = stack.pop()
                points.append((x, current_y))
                for ny in range(current_y - 1, current_y + 2):
                    if ny < 0 or ny >= height:
                        continue
                    for nx in range(x - 1, x + 2):
                        if nx < 0 or nx >= width or seen[ny, nx] or not mask[ny, nx]:
                            continue
                        seen[ny, nx] = True
                        stack.append((nx, ny))

            ys = [point[1] for point in points]
            xs_points = [point[0] for point in points]
            yield xs_points, ys


def is_background_like(
    rgb_values: np.ndarray,
    key_color: tuple[int, int, int] | None = None,
    key_threshold: float = 75,
) -> bool:
    if len(rgb_values) == 0:
        return True
    if key_color:
        rgb32 = rgb_values.astype(np.int32)
        key = np.array(key_color, dtype=np.int32)
        distance = np.sqrt(((rgb32 - key) ** 2).sum(axis=1))
        if float((distance <= key_threshold * 1.35).mean()) >= 0.70:
            return True

    maxc = rgb_values.max(axis=1)
    minc = rgb_values.min(axis=1)
    saturation = maxc - minc
    bright_low_sat = (saturation <= 18) & (maxc >= 225)
    return float(bright_low_sat.mean()) >= 0.82


def sorted_components_by_rows(components: list[dict]) -> list[dict]:
    if not components:
        return []

    median_height = np.median([component["bbox"][3] - component["bbox"][1] for component in components])
    row_threshold = max(40, median_height * 0.55)
    rows: list[list[dict]] = []

    for component in sorted(components, key=lambda item: item["cy"]):
        for row in rows:
            row_cy = float(np.mean([item["cy"] for item in row]))
            if abs(component["cy"] - row_cy) <= row_threshold:
                row.append(component)
                break
        else:
            rows.append([component])

    sorted_rows = sorted(rows, key=lambda row: np.mean([item["cy"] for item in row]))
    return [item for row in sorted_rows for item in sorted(row, key=lambda component: component["cx"])]


def extract_item(
    image: Image.Image,
    mask: np.ndarray,
    bbox: tuple[int, int, int, int],
    canvas_size: int,
    padding: int,
    preserve_internal_holes: bool,
    trim_output: bool,
    edge_feather: float,
    edge_contract: int,
    despill: bool,
    key_color: tuple[int, int, int] | None,
    key_threshold: float,
) -> tuple[Image.Image, dict]:
    left, top, right, bottom = bbox
    source = image.crop((left, top, right, bottom)).convert("RGBA")
    alpha = Image.fromarray((mask[top:bottom, left:right] * 255).astype(np.uint8), mode="L")
    source.putalpha(alpha)

    max_content = canvas_size - padding * 2
    width, height = source.size
    scale = min(max_content / width, max_content / height)
    target_size = (max(1, round(width * scale)), max(1, round(height * scale)))
    resized = source.resize(target_size, Image.Resampling.LANCZOS)

    output = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    paste_x = (canvas_size - target_size[0]) // 2
    paste_y = (canvas_size - target_size[1]) // 2
    output.alpha_composite(resized, (paste_x, paste_y))
    output = clean_internal_alpha_holes(output, preserve_internal_holes=preserve_internal_holes)
    output = polish_alpha_edges(output, edge_contract=edge_contract, edge_feather=edge_feather)
    if despill and key_color:
        output = remove_key_residue(output, key_color=key_color, key_threshold=key_threshold)
        output = despill_edges(output, key_color=key_color)
        output = remove_key_edge_fringe(output, key_color=key_color)
    if trim_output:
        output = trim_to_alpha(output, pad=2)
    output = clean_internal_alpha_holes(output, preserve_internal_holes=preserve_internal_holes)

    warnings = []
    failures = []
    alpha_np = np.array(output)[:, :, 3]
    hole_report = analyze_internal_transparency(alpha_np)
    ys, xs = np.where(alpha_np > 0)
    if len(xs) == 0:
        failures.append("empty alpha mask")
        content_bbox = None
    else:
        content_bbox = (int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1))
        output_width, output_height = output.size
        edge_margin = min(content_bbox[0], content_bbox[1], output_width - content_bbox[2], output_height - content_bbox[3])
        min_margin = 1 if trim_output else 18
        if edge_margin < min_margin:
            warnings.append(f"low edge margin: {edge_margin}px")

    corners = [
        int(alpha_np[0, 0]),
        int(alpha_np[0, -1]),
        int(alpha_np[-1, 0]),
        int(alpha_np[-1, -1]),
    ]
    if any(value != 0 for value in corners):
        warnings.append("non-transparent corner")
    green_residue = count_key_residue(output, key_color=key_color)
    if green_residue["strong"] > 1200:
        warnings.append(f"visible key-color residue remains: {green_residue['strong']} strong pixels")
    if hole_report["smallInternalHoles"]:
        warnings.append("small internal transparent islands remain")
    if hole_report["largeInternalHoles"] and not preserve_internal_holes:
        failures.append("large internal transparent holes are not allowed for this item")

    return output, {
        "outputSize": list(output.size),
        "contentBbox": list(content_bbox) if content_bbox else None,
        "internalTransparency": hole_report,
        "keyResidue": green_residue,
        "warnings": warnings,
        "failures": failures,
    }


def clean_internal_alpha_holes(image: Image.Image, preserve_internal_holes: bool) -> Image.Image:
    arr = np.array(image.convert("RGBA"))
    alpha = arr[:, :, 3]
    foreground = alpha > 0
    exterior = find_exterior_background(foreground)
    internal_transparent = ~foreground & ~exterior

    if not internal_transparent.any():
        return image

    alpha_clean = alpha.copy()
    for xs_points, ys in iter_components(internal_transparent):
        area = len(xs_points)
        if preserve_internal_holes and area >= 450:
            continue
        alpha_clean[ys, xs_points] = 255

    arr[:, :, 3] = alpha_clean
    return Image.fromarray(arr, mode="RGBA")


def polish_alpha_edges(image: Image.Image, edge_contract: int, edge_feather: float) -> Image.Image:
    if edge_contract <= 0 and edge_feather <= 0:
        return image
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    if edge_contract > 0:
        size = max(3, edge_contract * 2 + 1)
        alpha = alpha.filter(ImageFilter.MinFilter(size=size))
    if edge_feather > 0:
        alpha = alpha.filter(ImageFilter.GaussianBlur(radius=edge_feather))
    rgba.putalpha(alpha)
    return rgba


def despill_edges(image: Image.Image, key_color: tuple[int, int, int]) -> Image.Image:
    arr = np.array(image.convert("RGBA")).astype(np.int16)
    alpha = arr[:, :, 3]
    edge = (alpha > 0) & (alpha < 250)
    if not edge.any():
        return image

    red_key, green_key, blue_key = key_color
    rgb = arr[:, :, :3]

    if green_key > red_key + 80 and green_key > blue_key + 80:
        target = np.maximum(rgb[:, :, 0], rgb[:, :, 2]) + 8
        rgb[:, :, 1] = np.where(edge & (rgb[:, :, 1] > target), target, rgb[:, :, 1])
    elif red_key > 180 and blue_key > 180 and green_key < 120:
        target = rgb[:, :, 1] + 25
        rgb[:, :, 0] = np.where(edge & (rgb[:, :, 0] > target), target, rgb[:, :, 0])
        rgb[:, :, 2] = np.where(edge & (rgb[:, :, 2] > target), target, rgb[:, :, 2])

    arr[:, :, :3] = np.clip(rgb, 0, 255)
    return Image.fromarray(arr.astype(np.uint8), mode="RGBA")


def remove_key_residue(image: Image.Image, key_color: tuple[int, int, int], key_threshold: float) -> Image.Image:
    arr = np.array(image.convert("RGBA")).astype(np.int16)
    alpha = arr[:, :, 3]
    key = np.array(key_color, dtype=np.int16)
    rgb = arr[:, :, :3]
    distance = np.sqrt(((rgb.astype(np.int32) - key.astype(np.int32)) ** 2).sum(axis=2))

    red_key, green_key, blue_key = key_color
    if green_key > red_key + 80 and green_key > blue_key + 80:
        key_like = (distance < key_threshold * 1.45) | (
            (rgb[:, :, 1] > 105)
            & (rgb[:, :, 1] > rgb[:, :, 0] + 18)
            & (rgb[:, :, 1] > rgb[:, :, 2] + 18)
            & ((rgb[:, :, 1] - np.maximum(rgb[:, :, 0], rgb[:, :, 2])) > 26)
        )
    elif red_key > 180 and blue_key > 180 and green_key < 120:
        key_like = (distance < key_threshold * 1.45) | (
            (rgb[:, :, 0] > 105)
            & (rgb[:, :, 2] > 105)
            & (rgb[:, :, 0] > rgb[:, :, 1] + 18)
            & (rgb[:, :, 2] > rgb[:, :, 1] + 18)
            & ((np.minimum(rgb[:, :, 0], rgb[:, :, 2]) - rgb[:, :, 1]) > 26)
        )
    else:
        key_like = distance < key_threshold * 1.2

    alpha[key_like & (alpha > 0)] = 0
    arr[:, :, 3] = alpha
    return Image.fromarray(arr.astype(np.uint8), mode="RGBA")


def remove_key_edge_fringe(image: Image.Image, key_color: tuple[int, int, int]) -> Image.Image:
    arr = np.array(image.convert("RGBA")).astype(np.int16)
    alpha = arr[:, :, 3]
    rgb = arr[:, :, :3]
    transparent = alpha == 0
    near_transparent = dilate_bool(transparent, radius=2)
    red_key, green_key, blue_key = key_color

    if green_key > red_key + 80 and green_key > blue_key + 80:
        fringe = (
            (alpha > 0)
            & near_transparent
            & (rgb[:, :, 1] > 85)
            & (rgb[:, :, 1] > rgb[:, :, 0] + 12)
            & (rgb[:, :, 1] > rgb[:, :, 2] + 12)
        )
    elif red_key > 180 and blue_key > 180 and green_key < 120:
        fringe = (
            (alpha > 0)
            & near_transparent
            & (rgb[:, :, 0] > 85)
            & (rgb[:, :, 2] > 85)
            & (rgb[:, :, 0] > rgb[:, :, 1] + 12)
            & (rgb[:, :, 2] > rgb[:, :, 1] + 12)
        )
    else:
        return image

    alpha[fringe] = 0
    arr[:, :, 3] = alpha
    return Image.fromarray(arr.astype(np.uint8), mode="RGBA")


def dilate_bool(mask: np.ndarray, radius: int) -> np.ndarray:
    result = mask.copy()
    height, width = mask.shape
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            if dx == 0 and dy == 0:
                continue
            y_src_start = max(0, -dy)
            y_src_end = min(height, height - dy)
            x_src_start = max(0, -dx)
            x_src_end = min(width, width - dx)
            y_dst_start = max(0, dy)
            y_dst_end = min(height, height + dy)
            x_dst_start = max(0, dx)
            x_dst_end = min(width, width + dx)
            result[y_dst_start:y_dst_end, x_dst_start:x_dst_end] |= mask[
                y_src_start:y_src_end,
                x_src_start:x_src_end,
            ]
    return result


def trim_to_alpha(image: Image.Image, pad: int) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = np.array(rgba.getchannel("A"))
    ys, xs = np.where(alpha > 0)
    if len(xs) == 0:
        return rgba
    left = max(0, int(xs.min()) - pad)
    top = max(0, int(ys.min()) - pad)
    right = min(rgba.width, int(xs.max() + 1) + pad)
    bottom = min(rgba.height, int(ys.max() + 1) + pad)
    return rgba.crop((left, top, right, bottom))


def analyze_internal_transparency(alpha: np.ndarray) -> dict:
    foreground = alpha > 0
    exterior = find_exterior_background(foreground)
    internal_transparent = ~foreground & ~exterior
    components = []
    for xs_points, ys in iter_components(internal_transparent):
        area = len(xs_points)
        if area < 20:
            continue
        components.append(
            {
                "area": area,
                "bbox": [min(xs_points), min(ys), max(xs_points) + 1, max(ys) + 1],
            }
        )
    components = sorted(components, key=lambda item: item["area"], reverse=True)
    return {
        "components": components,
        "largeInternalHoles": [component for component in components if component["area"] >= 450],
        "smallInternalHoles": [component for component in components if component["area"] < 450],
    }


def count_key_residue(image: Image.Image, key_color: tuple[int, int, int] | None) -> dict:
    if not key_color:
        return {"greenish": 0, "strong": 0}
    arr = np.array(image.convert("RGBA")).astype(np.int16)
    alpha = arr[:, :, 3]
    rgb = arr[:, :, :3]
    red_key, green_key, blue_key = key_color
    if green_key > red_key + 80 and green_key > blue_key + 80:
        greenish = (
            (alpha > 0)
            & (rgb[:, :, 1] > 110)
            & (rgb[:, :, 1] > rgb[:, :, 0] + 20)
            & (rgb[:, :, 1] > rgb[:, :, 2] + 20)
        )
        strong = (
            (alpha > 0)
            & (rgb[:, :, 1] > 140)
            & (rgb[:, :, 1] > rgb[:, :, 0] + 35)
            & (rgb[:, :, 1] > rgb[:, :, 2] + 35)
        )
        return {"greenish": int(greenish.sum()), "strong": int(strong.sum())}
    return {"greenish": 0, "strong": 0}


def quality_status(report: dict) -> str:
    if report["failures"]:
        return "fail"
    if report["warnings"]:
        return "warn"
    return "pass"


def write_contact_sheet(paths: list[Path], labels: list[str], target_path: Path) -> None:
    thumb = 180
    label_height = 28
    columns = 5
    rows = (len(paths) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * thumb, rows * (thumb + label_height)), "white")
    draw = ImageDraw.Draw(sheet)

    for index, path in enumerate(paths):
        row = index // columns
        col = index % columns
        image = Image.open(path).convert("RGBA")
        checker = checkerboard(image.size, 24)
        checker.alpha_composite(image)
        checker = checker.resize((thumb, thumb), Image.Resampling.LANCZOS)
        x = col * thumb
        y = row * (thumb + label_height)
        sheet.paste(checker.convert("RGB"), (x, y))
        draw.text((x + 8, y + thumb + 6), labels[index], fill=(0, 0, 0))

    target_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(target_path)


def checkerboard(size: tuple[int, int], cell: int) -> Image.Image:
    width, height = size
    image = Image.new("RGBA", size, (255, 255, 255, 255))
    draw = ImageDraw.Draw(image)
    for y in range(0, height, cell):
        for x in range(0, width, cell):
            if ((x // cell) + (y // cell)) % 2 == 0:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(235, 235, 235, 255))
    return image


if __name__ == "__main__":
    main()
