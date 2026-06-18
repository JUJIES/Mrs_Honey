#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets" / "images" / "ui" / "mrs-honey-tutor-mouthless.png"
OUT_DIR = ROOT / "avatar-lab" / "assets" / "mrs-honey-eye-rig"

LEFT_FILL = (394, 354, 606, 570)
RIGHT_FILL = (648, 354, 860, 570)
LEFT_OUTER = (392, 350, 606, 570)
RIGHT_OUTER = (648, 350, 862, 570)
LEFT_INNER_RING = (430, 388, 568, 536)
RIGHT_INNER_RING = (686, 388, 824, 536)


def ellipse_mask(size: tuple[int, int], box: tuple[int, int, int, int], feather: float = 0) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).ellipse(box, fill=255)
    if feather:
        mask = mask.filter(ImageFilter.GaussianBlur(feather))
    return mask


def rect_mask(size: tuple[int, int], box: tuple[int, int, int, int]) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(box, radius=10, fill=255)
    return mask


def combine_lighter(*masks: Image.Image) -> Image.Image:
    out = Image.new("L", masks[0].size, 0)
    for mask in masks:
        out = ImageChops.lighter(out, mask)
    return out


def subtract_mask(mask: Image.Image, subtract: Image.Image) -> Image.Image:
    return ImageChops.subtract(mask, subtract)


def diffuse_fill(source: Image.Image, mask: Image.Image, passes: int = 150) -> Image.Image:
    base = source.copy()
    keep = ImageChops.invert(mask)

    for _ in range(passes):
        blurred = base.filter(ImageFilter.GaussianBlur(4.2))
        base = Image.composite(blurred, base, mask)
        base = Image.composite(source, base, keep)

    return base


def make_glasses_overlay(source: Image.Image, fill_mask: Image.Image) -> Image.Image:
    size = source.size
    left_ring = subtract_mask(ellipse_mask(size, LEFT_OUTER), ellipse_mask(size, LEFT_INNER_RING))
    right_ring = subtract_mask(ellipse_mask(size, RIGHT_OUTER), ellipse_mask(size, RIGHT_INNER_RING))
    bridge = rect_mask(size, (542, 420, 712, 485))
    left_arm = rect_mask(size, (276, 421, 420, 474))
    right_arm = rect_mask(size, (836, 421, 980, 474))
    glasses_shape = combine_lighter(left_ring, right_ring, bridge, left_arm, right_arm)

    pixels = source.convert("RGBA")
    alpha = Image.new("L", size, 0)
    src = pixels.load()
    out_alpha = alpha.load()
    shape = glasses_shape.load()
    blocked = fill_mask.filter(ImageFilter.MaxFilter(11)).load()

    for y in range(size[1]):
        for x in range(size[0]):
            if not shape[x, y]:
                continue
            r, g, b, a = src[x, y]
            luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
            is_gold = r > 132 and 72 < g < 178 and b < 92
            is_dark_frame = luminance < 105
            is_bridge_or_arm = 560 <= x <= 694 and 430 <= y <= 470 or 276 <= x <= 420 and 421 <= y <= 474 or 836 <= x <= 980 and 421 <= y <= 474
            if blocked[x, y] and not is_bridge_or_arm:
                continue
            if is_dark_frame or is_gold:
                out_alpha[x, y] = a

    alpha = alpha.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.45))
    overlay = pixels.copy()
    overlay.putalpha(alpha)
    return overlay


def make_clean_lens_fill(size: tuple[int, int], box: tuple[int, int, int, int], side: str) -> Image.Image:
    patch = Image.new("RGBA", size, (0, 0, 0, 0))
    width = box[2] - box[0]
    height = box[3] - box[1]
    lens = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    pixels = lens.load()

    for y in range(height):
        for x in range(width):
            nx = (x / max(1, width - 1)) - 0.5
            ny = (y / max(1, height - 1)) - 0.5
            radial = max(0, 1 - (nx * nx * 1.7 + ny * ny * 1.35))
            vertical = y / max(1, height - 1)
            side_warmth = -8 if side == "left" else 6
            r = int(205 + 24 * radial - 18 * vertical + side_warmth)
            g = int(117 + 18 * radial - 10 * vertical)
            b = int(36 + 8 * radial - 4 * vertical)
            a = 255
            pixels[x, y] = (r, g, b, a)

    lens = lens.filter(ImageFilter.GaussianBlur(0.6))
    mask = ellipse_mask((width, height), (0, 0, width, height), feather=2.0)
    lens.putalpha(mask)
    patch.alpha_composite(lens, (box[0], box[1]))
    return patch


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGBA")
    size = source.size

    raw_fill_mask = combine_lighter(
        ellipse_mask(size, LEFT_FILL),
        ellipse_mask(size, RIGHT_FILL),
    )
    base = source.copy()
    base.alpha_composite(make_clean_lens_fill(size, LEFT_FILL, "left"))
    base.alpha_composite(make_clean_lens_fill(size, RIGHT_FILL, "right"))

    glasses_overlay = make_glasses_overlay(source, raw_fill_mask)
    base.alpha_composite(glasses_overlay)

    base.save(OUT_DIR / "base-no-eyes-v2.png")
    glasses_overlay.save(OUT_DIR / "glasses-overlay-v2.png")
    base.save(OUT_DIR / "base-no-eyes-v3.png")
    glasses_overlay.save(OUT_DIR / "glasses-overlay-v3.png")
    base.save(OUT_DIR / "base-no-eyes-v4.png")
    glasses_overlay.save(OUT_DIR / "glasses-overlay-v4.png")


if __name__ == "__main__":
    main()
