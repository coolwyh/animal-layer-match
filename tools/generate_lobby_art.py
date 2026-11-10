#!/usr/bin/env python3
"""Generate premium lobby art placeholders for 动物层层消."""
from __future__ import annotations

import json
import math
import uuid
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
UI = ROOT / "assets/textures/ui"
RES_UI = ROOT / "assets/resources/textures/ui"


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def image_meta(u: str, name: str, w: int, h: int) -> dict:
    return {
        "ver": "1.0.27",
        "importer": "image",
        "imported": True,
        "uuid": u,
        "files": [".png", ".json"],
        "subMetas": {
            "6c48a": {
                "importer": "texture",
                "uuid": f"{u}@6c48a",
                "displayName": name,
                "id": "6c48a",
                "name": "texture",
                "ver": "1.0.22",
                "imported": True,
                "files": [".json"],
                "subMetas": {},
                "userData": {
                    "wrapModeS": "clamp-to-edge",
                    "wrapModeT": "clamp-to-edge",
                    "minfilter": "linear",
                    "magfilter": "linear",
                    "mipfilter": "none",
                    "premultiplyAlpha": False,
                    "anisotropy": 0,
                    "isUuid": True,
                    "imageUuidOrDatabaseUri": u,
                },
            },
            "f9941": {
                "ver": "1.0.12",
                "importer": "sprite-frame",
                "uuid": f"{u}@f9941",
                "imported": True,
                "files": [".json"],
                "subMetas": {},
                "userData": {
                    "trimType": "auto",
                    "trimThreshold": 1,
                    "rotated": False,
                    "offsetX": 0,
                    "offsetY": 0,
                    "trimX": 0,
                    "trimY": 0,
                    "width": w,
                    "height": h,
                    "rawWidth": w,
                    "rawHeight": h,
                    "borderTop": 0,
                    "borderBottom": 0,
                    "borderLeft": 0,
                    "borderRight": 0,
                    "packable": True,
                    "isUuid": True,
                    "imageUuidOrDatabaseUri": f"{u}@6c48a",
                    "atlasUuid": "",
                },
                "displayName": name,
                "id": "f9941",
                "name": "spriteFrame",
            },
        },
        "userData": {
            "type": "sprite-frame",
            "redirect": f"{u}@f9941",
            "hasAlpha": True,
            "fixAlphaTransparencyArtifacts": False,
        },
    }


def save(img: Image.Image, name: str, key: str) -> None:
    for folder in (UI, RES_UI):
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / name
        img.save(path, "PNG")
        u = str(uuid.uuid5(uuid.NAMESPACE_URL, f"alm-lobby-{key}-{folder.name}"))
        write_json(Path(str(path) + ".meta"), image_meta(u, path.stem, img.width, img.height))


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def vertical_gradient(w, h, top, bottom) -> Image.Image:
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        c = lerp(top, bottom, y / max(1, h - 1))
        for x in range(w):
            px[x, y] = c
    return img.convert("RGBA")


def font(size: int):
    for p in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ):
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            pass
    return ImageFont.load_default()


def draw_blob(draw, cx, cy, r, color):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)


def make_lobby_bg():
    # Soft mint-sky atmosphere (not flat cream, not purple)
    W, H = 750, 1334
    img = vertical_gradient(W, H, (186, 230, 210), (255, 236, 210))
    d = ImageDraw.Draw(img, "RGBA")
    # sun glow
    for i, a in enumerate((40, 28, 16)):
        r = 180 + i * 40
        draw_blob(d, 560, 220, r, (255, 210, 140, a))
    # meadow hills
    d.ellipse([-120, 880, 520, 1500], fill=(120, 180, 120, 90))
    d.ellipse([200, 940, 900, 1600], fill=(90, 160, 110, 100))
    d.rectangle([0, 1180, 750, 1334], fill=(78, 140, 96, 160))
    # soft light rays
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for i in range(7):
        x = 80 + i * 100
        od.polygon([(375, 180), (x - 30, 1334), (x + 30, 1334)], fill=(255, 255, 255, 12))
    img = Image.alpha_composite(img, overlay)
    # vignette-ish top mist
    mist = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    md = ImageDraw.Draw(mist)
    for y in range(0, 260):
        a = int(28 * (1 - y / 260))
        md.line([(0, y), (W, y)], fill=(255, 255, 255, a))
    img = Image.alpha_composite(img, mist)
    save(img, "lobby_bg.png", "bg")


def make_hero_animals():
    W, H = 700, 520
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    # soft pedestal
    d.ellipse([120, 390, 580, 500], fill=(255, 255, 255, 70))

    animals = [
        ((180, 300), 78, (255, 138, 101), "CAT"),
        ((350, 250), 96, (129, 199, 132), "FROG"),
        ((520, 310), 74, (79, 195, 247), "PEN"),
        ((260, 360), 58, (240, 152, 177), "PIG"),
        ((450, 365), 56, (255, 183, 77), "FOX"),
    ]
    for (cx, cy), r, rgb, tag in animals:
        # shadow
        d.ellipse([cx - r * 0.7, cy + r * 0.55, cx + r * 0.7, cy + r * 0.85], fill=(40, 60, 40, 40))
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=rgb + (255,))
        d.ellipse([cx - r * 0.55, cy - r * 0.7, cx + r * 0.15, cy - r * 0.05], fill=(255, 255, 255, 70))
        f = font(18)
        bbox = d.textbbox((0, 0), tag, font=f)
        tw = bbox[2] - bbox[0]
        d.text((cx - tw / 2, cy - 8), tag, fill=(62, 39, 35, 230), font=f)

    img = img.filter(ImageFilter.SMOOTH_MORE)
    save(img, "lobby_hero.png", "hero")


def make_primary_btn():
    W, H = 480, 120
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    # depth slab
    d.rounded_rectangle([8, 18, W - 8, H - 4], radius=36, fill=(196, 98, 12, 255))
    # face
    d.rounded_rectangle([8, 4, W - 8, H - 18], radius=36, fill=(255, 152, 0, 255))
    # top sheen
    d.rounded_rectangle([28, 14, W - 28, 48], radius=20, fill=(255, 220, 150, 90))
    save(img, "lobby_btn_primary.png", "btn_primary")


def make_secondary_btn():
    W, H = 420, 84
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    d.rounded_rectangle([4, 10, W - 4, H - 4], radius=28, fill=(255, 255, 255, 55))
    d.rounded_rectangle([4, 4, W - 4, H - 12], radius=28, fill=(255, 255, 255, 120))
    d.rounded_rectangle([4, 4, W - 4, H - 12], radius=28, outline=(255, 255, 255, 180), width=2)
    save(img, "lobby_btn_ghost.png", "btn_ghost")


def make_brand_mark():
    W, H = 560, 180
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    d.rounded_rectangle([20, 30, W - 20, H - 20], radius=32, fill=(255, 255, 255, 70))
    d.text((48, 58), "ANIMAL LAYER", fill=(46, 90, 70, 220), font=font(28))
    d.text((48, 100), "MATCH", fill=(255, 140, 40, 255), font=font(54))
    save(img, "lobby_brand.png", "brand")


def main():
    make_lobby_bg()
    make_hero_animals()
    make_primary_btn()
    make_secondary_btn()
    make_brand_mark()
    print("Lobby art generated under assets/textures/ui and resources/textures/ui")


if __name__ == "__main__":
    main()
