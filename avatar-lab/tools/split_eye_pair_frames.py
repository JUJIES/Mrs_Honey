#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
EYE_DIR = ROOT / "avatar-lab" / "assets" / "mrs-honey-eye-rig" / "generated"
FRAME_MAP = {
    "open": EYE_DIR / "eyes-open-gen-v2.png",
    "half": EYE_DIR / "eyes-half-gen-v2.png",
    "closed": EYE_DIR / "eyes-closed-gen-v2.png",
}


def trim(image: Image.Image, padding: int = 10) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        return image
    return image.crop(
        (
            max(0, bbox[0] - padding),
            max(0, bbox[1] - padding),
            min(image.width, bbox[2] + padding),
            min(image.height, bbox[3] + padding),
        )
    )


def split_frame(path: Path) -> tuple[Image.Image, Image.Image]:
    image = Image.open(path).convert("RGBA")
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        raise RuntimeError(f"No visible pixels: {path}")

    center = (bbox[0] + bbox[2]) // 2
    overlap = 12
    left = image.crop((bbox[0], bbox[1], center + overlap, bbox[3]))
    right = image.crop((center - overlap, bbox[1], bbox[2], bbox[3]))
    return trim(left), trim(right)


def make_contact_sheet(frames: list[tuple[str, Image.Image]]) -> Image.Image:
    cell_w = 190
    cell_h = 190
    sheet = Image.new("RGBA", (cell_w * len(frames), cell_h), (245, 243, 236, 255))
    draw = ImageDraw.Draw(sheet)

    for index, (label, frame) in enumerate(frames):
        preview = frame.copy()
        preview.thumbnail((cell_w - 24, cell_h - 44), Image.Resampling.LANCZOS)
        x = index * cell_w + (cell_w - preview.width) // 2
        y = 8 + (cell_h - 46 - preview.height) // 2
        sheet.alpha_composite(preview, (x, y))
        draw.text((index * cell_w + 8, cell_h - 28), label, fill=(35, 48, 66, 255))

    return sheet


def main() -> None:
    previews: list[tuple[str, Image.Image]] = []

    for name, path in FRAME_MAP.items():
        left, right = split_frame(path)
        left_path = EYE_DIR / f"eye-left-{name}-v2.png"
        right_path = EYE_DIR / f"eye-right-{name}-v2.png"
        left.save(left_path)
        right.save(right_path)
        previews.extend([(left_path.name, left), (right_path.name, right)])

    make_contact_sheet(previews).save(EYE_DIR / "split-eye-contact-sheet-v2.png")


if __name__ == "__main__":
    main()
