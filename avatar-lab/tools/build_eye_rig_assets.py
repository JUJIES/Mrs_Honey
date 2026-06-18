#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets" / "images" / "ui" / "mrs-honey-tutor-mouthless.png"
OUT_DIR = ROOT / "avatar-lab" / "assets" / "mrs-honey-eye-rig"

LEFT_EYE = {
    "center": (498, 470),
    "box": (438, 404, 558, 532),
    "sample_box": (306, 408, 426, 536),
    "lid_line": [(448, 458), (474, 482), (504, 488), (548, 464)],
}
RIGHT_EYE = {
    "center": (756, 470),
    "box": (696, 404, 816, 532),
    "sample_box": (828, 408, 948, 536),
    "lid_line": [(706, 464), (748, 488), (780, 482), (806, 458)],
}
EYES = (LEFT_EYE, RIGHT_EYE)


def ellipse_mask(size: tuple[int, int], box: tuple[int, int, int, int], feather: float = 2.2) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse(box, fill=255)
    return mask.filter(ImageFilter.GaussianBlur(feather))


def hard_ellipse_mask(size: tuple[int, int], box: tuple[int, int, int, int]) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).ellipse(box, fill=255)
    return mask


def make_fur_patch(source: Image.Image, eye: dict[str, object], mask: Image.Image) -> Image.Image:
    box = eye["box"]
    sample_box = eye["sample_box"]
    sample = source.crop(sample_box).resize((box[2] - box[0], box[3] - box[1]))
    sample = sample.filter(ImageFilter.GaussianBlur(1.4))

    warm_glaze = Image.new("RGBA", sample.size, (232, 126, 34, 82))
    sample = Image.alpha_composite(sample, warm_glaze)

    patch = Image.new("RGBA", source.size, (0, 0, 0, 0))
    patch.alpha_composite(sample, (box[0], box[1]))
    patch.putalpha(mask)
    return patch


def make_open_layer(source: Image.Image, eye_masks: list[Image.Image]) -> Image.Image:
    alpha = Image.new("L", source.size, 0)
    for mask in eye_masks:
        alpha = Image.composite(Image.new("L", source.size, 255), alpha, mask)

    layer = source.copy()
    layer.putalpha(alpha)
    return layer


def make_base_no_eyes(source: Image.Image, eye_masks: list[Image.Image]) -> Image.Image:
    base = source.copy()
    for eye, mask in zip(EYES, eye_masks):
        base.alpha_composite(make_fur_patch(source, eye, mask))
    return base


def make_half_layer(source: Image.Image, eye_masks: list[Image.Image]) -> Image.Image:
    layer = make_open_layer(source, eye_masks)

    for eye, mask in zip(EYES, eye_masks):
        box = eye["box"]
        top_cover = Image.new("L", source.size, 0)
        draw = ImageDraw.Draw(top_cover)
        draw.rounded_rectangle(
            (box[0] - 4, box[1] - 8, box[2] + 4, box[1] + 82),
            radius=34,
            fill=255,
        )
        top_cover = Image.composite(top_cover, Image.new("L", source.size, 0), mask)
        top_cover = top_cover.filter(ImageFilter.GaussianBlur(1.2))

        fur_patch = make_fur_patch(source, eye, top_cover)
        layer.alpha_composite(fur_patch)

        line = Image.new("RGBA", source.size, (0, 0, 0, 0))
        line_draw = ImageDraw.Draw(line)
        line_draw.line(eye["lid_line"], fill=(84, 38, 16, 224), width=7, joint="curve")
        line_draw.line([(x, y - 2) for x, y in eye["lid_line"]], fill=(238, 148, 55, 130), width=2)
        layer.alpha_composite(line)

    return layer


def make_closed_layer(source: Image.Image, eye_masks: list[Image.Image]) -> Image.Image:
    layer = Image.new("RGBA", source.size, (0, 0, 0, 0))

    for eye, mask in zip(EYES, eye_masks):
        layer.alpha_composite(make_fur_patch(source, eye, mask))

        line = Image.new("RGBA", source.size, (0, 0, 0, 0))
        line_draw = ImageDraw.Draw(line)
        line_draw.line(eye["lid_line"], fill=(74, 34, 17, 238), width=8, joint="curve")
        line_draw.line([(x, y - 3) for x, y in eye["lid_line"]], fill=(235, 143, 45, 120), width=2)

        for x, y in eye["lid_line"][1:-1]:
            line_draw.line((x, y + 1, x - 7, y + 12), fill=(54, 27, 17, 190), width=3)

        layer.alpha_composite(line)

    return layer


def make_contact_sheet(images: list[tuple[str, Image.Image]]) -> Image.Image:
    thumb_size = 360
    sheet = Image.new("RGBA", (thumb_size * len(images), thumb_size + 42), (245, 243, 236, 255))
    draw = ImageDraw.Draw(sheet)

    for index, (label, image) in enumerate(images):
        preview = image.copy()
        preview.thumbnail((thumb_size, thumb_size), Image.Resampling.LANCZOS)
        x = index * thumb_size + (thumb_size - preview.width) // 2
        y = 0
        sheet.alpha_composite(preview, (x, y))
        draw.text((index * thumb_size + 14, thumb_size + 12), label, fill=(35, 48, 66, 255))

    return sheet


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    source = Image.open(SOURCE).convert("RGBA")
    eye_masks = [ellipse_mask(source.size, eye["box"]) for eye in EYES]
    hard_masks = [hard_ellipse_mask(source.size, eye["box"]) for eye in EYES]

    base = make_base_no_eyes(source, eye_masks)
    open_layer = make_open_layer(source, hard_masks)
    half_layer = make_half_layer(source, eye_masks)
    closed_layer = make_closed_layer(source, eye_masks)

    outputs = [
        ("base-no-eyes.png", base),
        ("eyes-open.png", open_layer),
        ("eyes-half.png", half_layer),
        ("eyes-closed.png", closed_layer),
    ]

    for filename, image in outputs:
        image.save(OUT_DIR / filename)

    contact = make_contact_sheet(outputs)
    contact.save(OUT_DIR / "eye-rig-contact-sheet.png")


if __name__ == "__main__":
    main()
