#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "avatar-lab" / "assets" / "mrs-honey-body-rig"
SOURCE = OUT_DIR / "body-head-socket-imagegen.png"
PREFIX = "body-head-socket-breathe"


def make_body_frame(body: Image.Image, amount: float) -> Image.Image:
    width, height = body.size
    scale_x = 1 + amount * 0.012
    scale_y = 1 + amount * 0.006
    scaled = body.resize((round(width * scale_x), round(height * scale_y)), Image.Resampling.BICUBIC)
    anchor_x = width // 2
    anchor_y = 805
    paste_x = round(anchor_x - anchor_x * scale_x)
    paste_y = round(anchor_y - anchor_y * scale_y)
    frame = Image.new("RGBA", body.size, (0, 0, 0, 0))
    frame.alpha_composite(scaled, (paste_x, paste_y))
    return frame


def make_contact_sheet(frames: list[tuple[str, Image.Image]]) -> Image.Image:
    cell = 250
    sheet = Image.new("RGBA", (cell * len(frames), cell + 34), (245, 243, 236, 255))
    draw = ImageDraw.Draw(sheet)
    for index, (label, image) in enumerate(frames):
        preview = image.copy()
        preview.thumbnail((cell, cell), Image.Resampling.LANCZOS)
        x = index * cell + (cell - preview.width) // 2
        y = (cell - preview.height) // 2
        sheet.alpha_composite(preview, (x, y))
        draw.text((index * cell + 8, cell + 10), label, fill=(35, 48, 66, 255))
    return sheet


def main() -> None:
    body = Image.open(SOURCE).convert("RGBA")
    amounts = [0, 0.18, 0.46, 0.78, 1.0, 0.78, 0.46, 0.18]
    frames: list[tuple[str, Image.Image]] = []

    for index, amount in enumerate(amounts):
        frame = body if index == 0 else make_body_frame(body, amount)
        name = f"{PREFIX}-{index:02d}.png"
        frame.save(OUT_DIR / name)
        frames.append((name, frame))

    make_contact_sheet(frames).save(OUT_DIR / f"{PREFIX}-contact-sheet.png")


if __name__ == "__main__":
    main()
