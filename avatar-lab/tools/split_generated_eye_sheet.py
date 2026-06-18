#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import argparse
from PIL import Image, ImageChops, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "avatar-lab" / "assets" / "mrs-honey-eye-rig" / "generated"
KEY = (255, 0, 255)


def remove_key(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    rgb = Image.new("RGBA", image.size, KEY + (255,))
    diff = ImageChops.difference(image, rgb).convert("L")
    alpha = diff.point(lambda value: 0 if value < 42 else min(255, int(value * 2.8)))
    image.putalpha(alpha)
    return image


def trim_transparent(image: Image.Image, padding: int = 28) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
      return image

    left = max(0, bbox[0] - padding)
    top = max(0, bbox[1] - padding)
    right = min(image.width, bbox[2] + padding)
    bottom = min(image.height, bbox[3] + padding)
    return image.crop((left, top, right, bottom))


def make_contact_sheet(images: list[tuple[str, Image.Image]]) -> Image.Image:
    cell_w = 360
    cell_h = 230
    sheet = Image.new("RGBA", (cell_w * len(images), cell_h), (245, 243, 236, 255))
    draw = ImageDraw.Draw(sheet)

    for index, (label, image) in enumerate(images):
        preview = image.copy()
        preview.thumbnail((cell_w - 30, cell_h - 46), Image.Resampling.LANCZOS)
        x = index * cell_w + (cell_w - preview.width) // 2
        y = 8 + (cell_h - 54 - preview.height) // 2
        sheet.alpha_composite(preview, (x, y))
        draw.text((index * cell_w + 12, cell_h - 30), label, fill=(35, 48, 66, 255))

    return sheet


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--input",
        default=str(OUT_DIR / "eyes-spritesheet-magenta.png"),
        help="Generated four-frame magenta sprite sheet.",
    )
    parser.add_argument("--suffix", default="", help="Suffix before .png for exported frames.")
    args = parser.parse_args()

    source = Image.open(args.input).convert("RGBA")
    frame_width = source.width // 4
    frames: list[tuple[str, Image.Image]] = []
    frame_names = [
        f"eyes-open-gen{args.suffix}.png",
        f"eyes-half-gen{args.suffix}.png",
        f"eyes-closed-gen{args.suffix}.png",
        f"eyes-open-gen-2{args.suffix}.png",
    ]

    for index, name in enumerate(frame_names):
        crop = source.crop((index * frame_width, 0, (index + 1) * frame_width, source.height))
        frame = trim_transparent(remove_key(crop))
        frame.save(OUT_DIR / name)
        frames.append((name, frame))

    make_contact_sheet(frames).save(OUT_DIR / f"generated-eye-contact-sheet{args.suffix}.png")


if __name__ == "__main__":
    main()
