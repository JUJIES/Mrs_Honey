from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
BODY_DIR = ROOT / "assets" / "mrs-honey-body-rig"
FRAME_PATTERN = "body-imagegen-breathe-{index:02d}.png"
OUT_PATTERN = "scarf-overlay-breathe-{index:02d}.png"


def build_overlay(source_path: Path, out_path: Path) -> None:
    image = Image.open(source_path).convert("RGBA")
    pixels = np.array(image)
    r, g, b, a = [pixels[:, :, channel] for channel in range(4)]

    height, width = a.shape
    yy, xx = np.mgrid[:height, :width]

    # The overlay should only lift the real scarf above the head/neck seam.
    # Keep this region narrow enough to avoid duplicating the book.
    scarf_region = (
        (xx >= width * 0.24)
        & (xx <= width * 0.76)
        & (yy >= height * 0.28)
        & (yy <= height * 0.51)
    )
    blue_scarf = (
        (a > 20)
        & scarf_region
        & (b.astype(int) > r.astype(int) + 18)
        & (b > 72)
        & (g > 45)
        & (r < 165)
    )

    mask = Image.fromarray((blue_scarf.astype(np.uint8) * 255), "L")
    mask = mask.filter(ImageFilter.MaxFilter(9))
    mask = mask.filter(ImageFilter.MinFilter(5))
    mask = mask.filter(ImageFilter.GaussianBlur(1.4))

    result = image.copy()
    original_alpha = image.getchannel("A")
    result.putalpha(Image.composite(original_alpha, Image.new("L", image.size, 0), mask))
    result.save(out_path)


def main() -> None:
    for index in range(8):
        build_overlay(BODY_DIR / FRAME_PATTERN.format(index=index), BODY_DIR / OUT_PATTERN.format(index=index))


if __name__ == "__main__":
    main()
