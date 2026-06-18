#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[2]
RIG_DIR = ROOT / "avatar-lab" / "assets" / "mrs-honey-eye-rig" / "generated"
SOURCE = RIG_DIR / "base-no-eyes-imagegen.png"
OUT_DIR = ROOT / "avatar-lab" / "assets" / "mrs-honey-body-rig"


def polygon_mask(size: tuple[int, int], points: list[tuple[int, int]], feather: float = 0) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    if feather:
        mask = mask.filter(ImageFilter.GaussianBlur(feather))
    return mask


def rect_mask(size: tuple[int, int], box: tuple[int, int, int, int], feather: float = 0) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rectangle(box, fill=255)
    if feather:
        mask = mask.filter(ImageFilter.GaussianBlur(feather))
    return mask


def apply_mask(image: Image.Image, mask: Image.Image) -> Image.Image:
    layer = image.copy()
    alpha = ImageChops.multiply(layer.getchannel("A"), mask)
    layer.putalpha(alpha)
    return layer


def make_body_frame(body: Image.Image, amount: float) -> Image.Image:
    # amount is 0..1. The rendered body frame expands mostly through the chest/scarf area.
    width, height = body.size
    scale_x = 1 + amount * 0.014
    scale_y = 1 + amount * 0.008
    scaled = body.resize((round(width * scale_x), round(height * scale_y)), Image.Resampling.BICUBIC)
    anchor_x = width // 2
    anchor_y = 790
    paste_x = round(anchor_x - anchor_x * scale_x)
    paste_y = round(anchor_y - anchor_y * scale_y)

    frame = Image.new("RGBA", body.size, (0, 0, 0, 0))
    frame.alpha_composite(scaled, (paste_x, paste_y))
    return frame


def make_contact_sheet(images: list[tuple[str, Image.Image]]) -> Image.Image:
    cell = 250
    sheet = Image.new("RGBA", (cell * len(images), cell + 34), (245, 243, 236, 255))
    draw = ImageDraw.Draw(sheet)
    for index, (label, image) in enumerate(images):
        preview = image.copy()
        preview.thumbnail((cell, cell), Image.Resampling.LANCZOS)
        x = index * cell + (cell - preview.width) // 2
        y = (cell - preview.height) // 2
        sheet.alpha_composite(preview, (x, y))
        draw.text((index * cell + 8, cell + 10), label, fill=(35, 48, 66, 255))
    return sheet


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGBA")
    size = source.size

    # Head keeps enough lower jaw overlap to hide the body/head boundary during small motion.
    head_mask = polygon_mask(
        size,
        [
            (190, 70),
            (1064, 70),
            (1120, 420),
            (1030, 650),
            (830, 760),
            (630, 800),
            (425, 760),
            (225, 650),
            (130, 420),
        ],
        feather=1.2,
    )
    body_mask = polygon_mask(
        size,
        [
            (0, 655),
            (360, 610),
            (505, 675),
            (625, 715),
            (750, 675),
            (895, 610),
            (1254, 655),
            (1254, 1254),
            (0, 1254),
        ],
        feather=1.0,
    )

    # Keep the book and lower arms solid even if transparent anti-edges are present.
    body_mask = ImageChops.lighter(body_mask, rect_mask(size, (0, 820, 1254, 1254), feather=0.5))

    head = apply_mask(source, head_mask)
    body = apply_mask(source, body_mask)
    head.save(OUT_DIR / "head-base.png")
    body.save(OUT_DIR / "body-breathe-00.png")

    breath_amounts = [0.18, 0.46, 0.78, 1.0, 0.78, 0.46, 0.18]
    body_frames = [("body-breathe-00.png", body)]
    for index, amount in enumerate(breath_amounts, start=1):
        frame = make_body_frame(body, amount)
        name = f"body-breathe-{index:02d}.png"
        frame.save(OUT_DIR / name)
        body_frames.append((name, frame))

    make_contact_sheet([("head-base.png", head), ("body-base.png", body)]).save(OUT_DIR / "head-body-contact-sheet.png")
    make_contact_sheet(body_frames).save(OUT_DIR / "body-breathe-contact-sheet.png")


if __name__ == "__main__":
    main()
