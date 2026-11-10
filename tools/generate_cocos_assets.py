#!/usr/bin/env python3
"""Generate Cocos Creator 3.8 scenes, metas, placeholder sprites & prefab."""
from __future__ import annotations

import json
import os
import uuid
import wave
import struct
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"

Base64KeyChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="

# Stable UUIDs so refs stay constant across regenerations
UUIDS = {
    "folder_assets": "a1000001-0000-4000-8000-000000000001",
    "folder_scenes": "a1000001-0000-4000-8000-000000000002",
    "folder_prefabs": "a1000001-0000-4000-8000-000000000003",
    "folder_textures": "a1000001-0000-4000-8000-000000000004",
    "folder_animals": "a1000001-0000-4000-8000-000000000005",
    "folder_ui": "a1000001-0000-4000-8000-000000000006",
    "folder_audio": "a1000001-0000-4000-8000-000000000007",
    "folder_scripts": "a1000001-0000-4000-8000-000000000010",
    "scene_loading": "b2000001-1111-4111-8111-000000000001",
    "scene_lobby": "b2000001-1111-4111-8111-000000000002",
    "scene_game": "b2000001-1111-4111-8111-000000000003",
    "prefab_card": "c3000001-2222-4222-8222-000000000001",
    "script_loading": "d4000001-3333-4333-8333-000000000001",
    "script_lobby": "d4000001-3333-4333-8333-000000000002",
    "script_game": "d4000001-3333-4333-8333-000000000003",
    "tex_logo": "e5000001-4444-4444-8444-000000000001",
    "tex_btn_orange": "e5000001-4444-4444-8444-000000000002",
    "tex_btn_green": "e5000001-4444-4444-8444-000000000003",
    "tex_btn_blue": "e5000001-4444-4444-8444-000000000004",
    "tex_board": "e5000001-4444-4444-8444-000000000005",
    "tex_card_base": "e5000001-4444-4444-8444-000000000006",
    "tex_mask": "e5000001-4444-4444-8444-000000000007",
    "tex_progress": "e5000001-4444-4444-8444-000000000008",
    "tex_avatar": "e5000001-4444-4444-8444-000000000009",
    "tex_white": "e5000001-4444-4444-8444-00000000000a",
    "audio_bgm": "f6000001-5555-4555-8555-000000000001",
    "audio_match": "f6000001-5555-4555-8555-000000000002",
    "audio_crit": "f6000001-5555-4555-8555-000000000003",
}

ANIMALS = {
    "cat": ("#FF8A65", "猫"),
    "dog": ("#A1887F", "狗"),
    "chicken": ("#FFD54F", "鸡"),
    "frog": ("#81C784", "蛙"),
    "cow": ("#90A4AE", "牛"),
    "pig": ("#F48FB1", "猪"),
    "rabbit": ("#CE93D8", "兔"),
    "monkey": ("#FFB74D", "猴"),
    "penguin": ("#4FC3F7", "企"),
    "fox": ("#FF7043", "狐"),
}

for i, name in enumerate(ANIMALS):
    UUIDS[f"tex_{name}"] = f"e5000002-4444-4444-8444-{i+1:012d}"
    UUIDS[f"audio_{name}"] = f"f6000002-5555-4555-8555-{i+1:012d}"


def compress_uuid(u: str, min_form: bool = False) -> str:
    u = u.replace("-", "").lower()
    reserved = 2 if min_form else 5
    out = list(u[:reserved])
    rem = u[reserved:]
    while len(rem) % 3:
        rem += "0"
    for i in range(0, len(rem), 3):
        h0 = int(rem[i], 16)
        h1 = int(rem[i + 1], 16)
        h2 = int(rem[i + 2], 16)
        lhs = (h0 << 2) | (h1 >> 2)
        rhs = ((h1 & 3) << 4) | h2
        out.append(Base64KeyChars[lhs])
        out.append(Base64KeyChars[rhs])
    return "".join(out)


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def folder_meta(uuid_str: str) -> dict:
    return {
        "ver": "1.2.0",
        "importer": "directory",
        "imported": True,
        "uuid": uuid_str,
        "files": [],
        "subMetas": {},
        "userData": {},
    }


def ts_meta(uuid_str: str, module_path: str) -> dict:
    return {
        "ver": "4.0.23",
        "importer": "typescript",
        "imported": True,
        "uuid": uuid_str,
        "files": [],
        "subMetas": {},
        "userData": {
            "moduleId": f"project:///{module_path}",
            "importerSettings": 0,
            "simulateGlobals": [],
        },
    }


def scene_meta(uuid_str: str) -> dict:
    return {
        "ver": "1.1.50",
        "importer": "scene",
        "imported": True,
        "uuid": uuid_str,
        "files": [".json"],
        "subMetas": {},
        "userData": {},
    }


def prefab_meta(uuid_str: str) -> dict:
    return {
        "ver": "1.1.50",
        "importer": "prefab",
        "imported": True,
        "uuid": uuid_str,
        "files": [".json"],
        "subMetas": {},
        "userData": {"syncNodeName": True},
    }


def image_sprite_meta(uuid_str: str, name: str, width: int, height: int) -> dict:
    return {
        "ver": "1.0.27",
        "importer": "image",
        "imported": True,
        "uuid": uuid_str,
        "files": [".png", ".json"],
        "subMetas": {
            "6c48a": {
                "importer": "texture",
                "uuid": f"{uuid_str}@6c48a",
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
                    "imageUuidOrDatabaseUri": uuid_str,
                },
            },
            "f9941": {
                "ver": "1.0.12",
                "importer": "sprite-frame",
                "uuid": f"{uuid_str}@f9941",
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
                    "width": width,
                    "height": height,
                    "rawWidth": width,
                    "rawHeight": height,
                    "borderTop": 0,
                    "borderBottom": 0,
                    "borderLeft": 0,
                    "borderRight": 0,
                    "packable": True,
                    "isUuid": True,
                    "imageUuidOrDatabaseUri": f"{uuid_str}@6c48a",
                    "atlasUuid": "",
                },
                "displayName": name,
                "id": "f9941",
                "name": "spriteFrame",
            },
        },
        "userData": {
            "type": "sprite-frame",
            "redirect": f"{uuid_str}@f9941",
            "hasAlpha": True,
            "fixAlphaTransparencyArtifacts": False,
        },
    }


def audio_meta(uuid_str: str) -> dict:
    return {
        "ver": "1.0.0",
        "importer": "audio-clip",
        "imported": True,
        "uuid": uuid_str,
        "files": [".json"],
        "subMetas": {},
        "userData": {"downloadMode": 0},
    }


def hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def try_font(size: int):
    for path in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/System/Library/Fonts/PingFang.ttc",
    ):
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass
    return ImageFont.load_default()


def draw_round_rect(draw: ImageDraw.ImageDraw, box, radius: int, fill):
    x0, y0, x1, y1 = box
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill)


def save_png(path: Path, img: Image.Image, uuid_key: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG")
    meta = image_sprite_meta(UUIDS[uuid_key], path.stem, img.width, img.height)
    write_json(Path(str(path) + ".meta"), meta)


def gen_animal_icon(name: str, color: str, label: str) -> Image.Image:
    size = 128
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rgb = hex_to_rgb(color)
    d.ellipse([8, 8, size - 8, size - 8], fill=rgb + (255,))
    d.ellipse([18, 18, size - 18, size - 18], fill=(255, 255, 255, 60))
    font = try_font(42)
    # Prefer ASCII fallback if CJK missing
    text = label
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((size - tw) / 2, (size - th) / 2 - 4), text, fill=(62, 39, 35, 255), font=font)
    # English hint
    font2 = try_font(14)
    d.text((size // 2 - 18, size - 28), name[:4], fill=(62, 39, 35, 200), font=font2)
    return img


def gen_ui_textures():
    # logo banner
    logo = Image.new("RGBA", (512, 160), (0, 0, 0, 0))
    d = ImageDraw.Draw(logo)
    draw_round_rect(d, (0, 0, 511, 159), 28, (255, 248, 231, 255))
    d.text((40, 45), "Animal Layer Match", fill=(62, 39, 35, 255), font=try_font(36))
    d.text((40, 100), "动物层层消", fill=(139, 195, 74, 255), font=try_font(28))
    save_png(ASSETS / "textures/ui/logo.png", logo, "tex_logo")

    def btn(color: str, key: str, filename: str):
        img = Image.new("RGBA", (420, 96), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        draw_round_rect(d, (0, 0, 419, 95), 48, hex_to_rgb(color) + (255,))
        save_png(ASSETS / f"textures/ui/{filename}", img, key)

    btn("#FF9800", "tex_btn_orange", "btn_orange.png")
    btn("#8BC34A", "tex_btn_green", "btn_green.png")
    btn("#64B5F6", "tex_btn_blue", "btn_blue.png")

    board = Image.new("RGBA", (680, 680), (0, 0, 0, 0))
    d = ImageDraw.Draw(board)
    draw_round_rect(d, (0, 0, 679, 679), 28, (245, 236, 215, 255))
    d.rounded_rectangle([8, 8, 671, 671], radius=24, outline=(215, 204, 200, 180), width=6)
    save_png(ASSETS / "textures/ui/board_plate.png", board, "tex_board")

    card = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    draw_round_rect(d, (4, 4, 123, 123), 18, (255, 255, 255, 255))
    d.rounded_rectangle([4, 4, 123, 123], radius=18, outline=(255, 255, 255, 220), width=3)
    save_png(ASSETS / "textures/ui/card_base.png", card, "tex_card_base")

    mask = Image.new("RGBA", (128, 128), (0, 0, 0, 140))
    d = ImageDraw.Draw(mask)
    # soft round by alpha already full; keep square for mask sprite
    save_png(ASSETS / "textures/ui/card_mask.png", mask, "tex_mask")

    prog = Image.new("RGBA", (520, 24), (0, 0, 0, 0))
    d = ImageDraw.Draw(prog)
    draw_round_rect(d, (0, 0, 519, 23), 12, (139, 195, 74, 255))
    save_png(ASSETS / "textures/ui/progress_fill.png", prog, "tex_progress")

    avatar = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(avatar)
    d.ellipse([4, 4, 123, 123], fill=(100, 181, 246, 255))
    d.text((40, 40), "ME", fill=(255, 255, 255, 255), font=try_font(28))
    save_png(ASSETS / "textures/ui/avatar.png", avatar, "tex_avatar")

    white = Image.new("RGBA", (32, 32), (255, 255, 255, 255))
    save_png(ASSETS / "textures/ui/white.png", white, "tex_white")

    for name, (color, label) in ANIMALS.items():
        save_png(ASSETS / f"textures/animals/{name}.png", gen_animal_icon(name, color, label), f"tex_{name}")


def write_tone_wav(path: Path, freq: float, duration: float, uuid_key: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    rate = 22050
    n = int(rate * duration)
    with wave.open(str(path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        frames = bytearray()
        for i in range(n):
            t = i / rate
            # soft envelope
            env = min(1.0, t * 30) * max(0.0, 1.0 - (t / duration))
            val = int(12000 * env * math.sin(2 * math.pi * freq * t))
            frames += struct.pack("<h", val)
        w.writeframes(frames)
    write_json(Path(str(path) + ".meta"), audio_meta(UUIDS[uuid_key]))


def gen_audio():
    write_tone_wav(ASSETS / "audio/bgm_soft.wav", 220.0, 1.2, "audio_bgm")
    write_tone_wav(ASSETS / "audio/sfx_match.wav", 660.0, 0.18, "audio_match")
    write_tone_wav(ASSETS / "audio/sfx_crit.wav", 880.0, 0.28, "audio_crit")
    base = 400.0
    for i, name in enumerate(ANIMALS):
        write_tone_wav(ASSETS / f"audio/animals/{name}.wav", base + i * 35, 0.16, f"audio_{name}")


def nid() -> str:
    return uuid.uuid4().hex[:22]


def vec3(x=0, y=0, z=0):
    return {"__type__": "cc.Vec3", "x": x, "y": y, "z": z}


def quat():
    return {"__type__": "cc.Quat", "x": 0, "y": 0, "z": 0, "w": 1}


def color(r, g, b, a=255):
    return {"__type__": "cc.Color", "r": r, "g": g, "b": b, "a": a}


def size(w, h):
    return {"__type__": "cc.Size", "width": w, "height": h}


def vec2(x, y):
    return {"__type__": "cc.Vec2", "x": x, "y": y}


def make_scene(scene_name: str, scene_uuid: str, script_uuid: str, script_class_hint: str) -> list:
    """Minimal 750x1334 Canvas scene with camera + custom script on Canvas."""
    W, H = 750, 1334
    script_cid = compress_uuid(script_uuid, min_form=False)
    objs: list = []

    # 0 SceneAsset
    objs.append(
        {
            "__type__": "cc.SceneAsset",
            "_name": scene_name,
            "_objFlags": 0,
            "_native": "",
            "scene": {"__id__": 1},
        }
    )
    # 1 Scene
    objs.append(
        {
            "__type__": "cc.Scene",
            "_name": scene_name,
            "_objFlags": 0,
            "_parent": None,
            "_children": [{"__id__": 2}],
            "_active": True,
            "_components": [],
            "_prefab": {"__id__": 12},
            "autoReleaseAssets": False,
            "_globals": {"__id__": 8},
            "_id": scene_uuid,
        }
    )
    # 2 Canvas
    objs.append(
        {
            "__type__": "cc.Node",
            "_name": "Canvas",
            "_objFlags": 0,
            "_parent": {"__id__": 1},
            "_children": [{"__id__": 3}],
            "_active": True,
            "_components": [{"__id__": 5}, {"__id__": 6}, {"__id__": 7}, {"__id__": 11}],
            "_prefab": None,
            "_lpos": vec3(W / 2, H / 2, 0),
            "_lrot": quat(),
            "_lscale": vec3(1, 1, 1),
            "_layer": 33554432,
            "_euler": vec3(),
            "_id": nid(),
        }
    )
    # 3 Camera node
    objs.append(
        {
            "__type__": "cc.Node",
            "_name": "Camera",
            "_objFlags": 0,
            "_parent": {"__id__": 2},
            "_children": [],
            "_active": True,
            "_components": [{"__id__": 4}],
            "_prefab": None,
            "_lpos": vec3(),
            "_lrot": quat(),
            "_lscale": vec3(1, 1, 1),
            "_layer": 1073741824,
            "_euler": vec3(),
            "_id": nid(),
        }
    )
    # 4 Camera
    objs.append(
        {
            "__type__": "cc.Camera",
            "_name": "",
            "_objFlags": 0,
            "node": {"__id__": 3},
            "_enabled": True,
            "__prefab": None,
            "_projection": 0,
            "_priority": 0,
            "_fov": 45,
            "_fovAxis": 0,
            "_orthoHeight": H / 2,
            "_near": 0,
            "_far": 2000,
            "_color": color(253, 248, 235, 255),
            "_depth": 1,
            "_stencil": 0,
            "_clearFlags": 7,
            "_rect": {"x": 0, "y": 0, "width": 1, "height": 1},
            "_aperture": 19,
            "_shutter": 7,
            "_iso": 0,
            "_screenScale": 1,
            "_visibility": 41943040,
            "_targetTexture": None,
            "_cameraType": -1,
            "_trackingType": 0,
        }
    )
    # 5 UITransform
    objs.append(
        {
            "__type__": "cc.UITransform",
            "_name": "",
            "_objFlags": 0,
            "node": {"__id__": 2},
            "_enabled": True,
            "__prefab": None,
            "_contentSize": size(W, H),
            "_anchorPoint": vec2(0.5, 0.5),
            "_id": nid(),
        }
    )
    # 6 Canvas
    objs.append(
        {
            "__type__": "cc.Canvas",
            "_name": "",
            "_objFlags": 0,
            "node": {"__id__": 2},
            "_enabled": True,
            "__prefab": None,
            "_cameraComponent": {"__id__": 4},
            "_alignCanvasWithScreen": True,
            "_id": nid(),
        }
    )
    # 7 Widget
    objs.append(
        {
            "__type__": "cc.Widget",
            "_name": "",
            "_objFlags": 0,
            "node": {"__id__": 2},
            "_enabled": True,
            "__prefab": None,
            "_alignFlags": 45,
            "_target": None,
            "_left": 0,
            "_right": 0,
            "_top": 0,
            "_bottom": 0,
            "_horizontalCenter": 0,
            "_verticalCenter": 0,
            "_isAbsLeft": True,
            "_isAbsRight": True,
            "_isAbsTop": True,
            "_isAbsBottom": True,
            "_isAbsHorizontalCenter": True,
            "_isAbsVerticalCenter": True,
            "_originalWidth": W,
            "_originalHeight": H,
            "_alignMode": 2,
            "_lockFlags": 0,
            "_id": nid(),
        }
    )
    # 8 SceneGlobals
    objs.append(
        {
            "__type__": "cc.SceneGlobals",
            "ambient": {"__id__": 9},
            "shadows": {"__id__": 10},
            "_skybox": {"__id__": 13},
            "fog": {"__id__": 14},
            "octree": {"__id__": 15},
            "skin": {"__id__": 16},
            "lightProbeInfo": {"__id__": 17},
            "postSettings": {"__id__": 18},
            "bakedWithStationaryMainLight": False,
            "bakedWithHighpLightmap": False,
        }
    )
    # 9 Ambient
    objs.append(
        {
            "__type__": "cc.AmbientInfo",
            "_skyColorHDR": {"__type__": "cc.Vec4", "x": 0.2, "y": 0.5, "z": 0.8, "w": 0.52},
            "_skyColor": {"__type__": "cc.Vec4", "x": 0.2, "y": 0.5, "z": 0.8, "w": 0.52},
            "_skyIllumHDR": 20000,
            "_skyIllum": 20000,
            "_groundAlbedoHDR": {"__type__": "cc.Vec4", "x": 0.2, "y": 0.2, "z": 0.2, "w": 1},
            "_groundAlbedo": {"__type__": "cc.Vec4", "x": 0.2, "y": 0.2, "z": 0.2, "w": 1},
            "_skyColorLDR": {"__type__": "cc.Vec4", "x": 0.2, "y": 0.5, "z": 0.8, "w": 0.52},
            "_skyIllumLDR": 0.8,
            "_groundAlbedoLDR": {"__type__": "cc.Vec4", "x": 0.2, "y": 0.2, "z": 0.2, "w": 1},
        }
    )
    # 10 Shadows
    objs.append(
        {
            "__type__": "cc.ShadowsInfo",
            "_enabled": False,
            "_type": 0,
            "_normal": vec3(0, 1, 0),
            "_distance": 0,
            "_shadowColor": color(0, 0, 0, 76),
            "_maxReceived": 4,
            "_size": {"__type__": "cc.Vec2", "x": 512, "y": 512},
        }
    )
    # 11 custom script on Canvas
    objs.append(
        {
            "__type__": script_cid,
            "_name": "",
            "_objFlags": 0,
            "node": {"__id__": 2},
            "_enabled": True,
            "__prefab": None,
            "__editorExtras__": {"scriptClass": script_class_hint},
            "_id": nid(),
        }
    )
    # 12 PrefabInfo for scene
    objs.append({"__type__": "cc.PrefabInfo", "root": None, "asset": None, "fileId": scene_uuid, "instance": None, "targetOverrides": None})
    # 13 skybox
    objs.append(
        {
            "__type__": "cc.SkyboxInfo",
            "_envLightingType": 0,
            "_envmapHDR": None,
            "_envmap": None,
            "_envmapLDR": None,
            "_diffuseMapHDR": None,
            "_diffuseMap": None,
            "_diffuseMapLDR": None,
            "_enabled": False,
            "_useHDR": True,
            "_editableMaterial": None,
            "_reflectionHDR": None,
            "_reflectionLDR": None,
            "_rotationAngle": 0,
        }
    )
    # 14 fog
    objs.append(
        {
            "__type__": "cc.FogInfo",
            "_type": 0,
            "_fogColor": color(200, 200, 200, 255),
            "_enabled": False,
            "_fogDensity": 0.3,
            "_fogStart": 0.5,
            "_fogEnd": 300,
            "_fogAtten": 5,
            "_fogTop": 1.5,
            "_fogRange": 1.2,
            "_accurate": False,
        }
    )
    # 15 octree
    objs.append(
        {
            "__type__": "cc.OctreeInfo",
            "_enabled": False,
            "_minPos": vec3(-1024, -1024, -1024),
            "_maxPos": vec3(1024, 1024, 1024),
            "_depth": 8,
        }
    )
    # 16 skin
    objs.append({"__type__": "cc.SkinInfo", "_enabled": False, "_blurRadius": 0.01, "_sssIntensity": 3.0})
    # 17 light probe
    objs.append(
        {
            "__type__": "cc.LightProbeInfo",
            "_giScale": 1,
            "_giSamples": 1024,
            "_bounces": 2,
            "_reduceRinging": 0,
            "_showProbe": True,
            "_showWireframe": True,
            "_showConvex": False,
            "_data": None,
            "_lightProbeSphereVolume": 1,
        }
    )
    # 18 post
    objs.append({"__type__": "cc.PostSettingsInfo", "_toneMappingType": 0})

    return objs


def make_card_prefab() -> list:
    """CardPrefab: Shadow / Base / Icon / Mask structure."""
    objs: list = []
    # 0 Prefab
    objs.append(
        {
            "__type__": "cc.Prefab",
            "_name": "CardPrefab",
            "_objFlags": 0,
            "_native": "",
            "data": {"__id__": 1},
            "optimizationPolicy": 0,
            "persistent": False,
        }
    )
    # 1 Root
    objs.append(
        {
            "__type__": "cc.Node",
            "_name": "CardPrefab",
            "_objFlags": 0,
            "_parent": None,
            "_children": [{"__id__": 2}, {"__id__": 4}, {"__id__": 6}, {"__id__": 8}],
            "_active": True,
            "_components": [{"__id__": 10}],
            "_prefab": {"__id__": 11},
            "_lpos": vec3(),
            "_lrot": quat(),
            "_lscale": vec3(1, 1, 1),
            "_layer": 33554432,
            "_euler": vec3(),
            "_id": nid(),
        }
    )

    def child(name, idx_self, idx_uit, idx_sprite, y=0, size_wh=(72, 72), sprite_uuid_key=None, color_rgba=(255, 255, 255, 255), active=True):
        # returns nothing; appends nodes
        pass

    # 2 Shadow node
    objs.append(
        {
            "__type__": "cc.Node",
            "_name": "Shadow",
            "_objFlags": 0,
            "_parent": {"__id__": 1},
            "_children": [],
            "_active": True,
            "_components": [{"__id__": 3}],
            "_prefab": {"__id__": 12},
            "_lpos": vec3(0, -6, 0),
            "_lrot": quat(),
            "_lscale": vec3(1, 1, 1),
            "_layer": 33554432,
            "_euler": vec3(),
            "_id": nid(),
        }
    )
    objs.append(
        {
            "__type__": "cc.UITransform",
            "_name": "",
            "_objFlags": 0,
            "node": {"__id__": 2},
            "_enabled": True,
            "__prefab": {"__id__": 13},
            "_contentSize": size(72, 72),
            "_anchorPoint": vec2(0.5, 0.5),
            "_id": nid(),
        }
    )
    # 4 Base
    objs.append(
        {
            "__type__": "cc.Node",
            "_name": "Base",
            "_objFlags": 0,
            "_parent": {"__id__": 1},
            "_children": [],
            "_active": True,
            "_components": [{"__id__": 5}],
            "_prefab": {"__id__": 14},
            "_lpos": vec3(),
            "_lrot": quat(),
            "_lscale": vec3(1, 1, 1),
            "_layer": 33554432,
            "_euler": vec3(),
            "_id": nid(),
        }
    )
    objs.append(
        {
            "__type__": "cc.UITransform",
            "_name": "",
            "_objFlags": 0,
            "node": {"__id__": 4},
            "_enabled": True,
            "__prefab": {"__id__": 15},
            "_contentSize": size(72, 72),
            "_anchorPoint": vec2(0.5, 0.5),
            "_id": nid(),
        }
    )
    # 6 Icon
    objs.append(
        {
            "__type__": "cc.Node",
            "_name": "Icon",
            "_objFlags": 0,
            "_parent": {"__id__": 1},
            "_children": [],
            "_active": True,
            "_components": [{"__id__": 7}],
            "_prefab": {"__id__": 16},
            "_lpos": vec3(),
            "_lrot": quat(),
            "_lscale": vec3(1, 1, 1),
            "_layer": 33554432,
            "_euler": vec3(),
            "_id": nid(),
        }
    )
    objs.append(
        {
            "__type__": "cc.Sprite",
            "_name": "",
            "_objFlags": 0,
            "node": {"__id__": 6},
            "_enabled": True,
            "__prefab": {"__id__": 17},
            "_customMaterial": None,
            "_srcBlendFactor": 2,
            "_dstBlendFactor": 4,
            "_color": color(255, 255, 255, 255),
            "_spriteFrame": {"__uuid__": f"{UUIDS['tex_cat']}@f9941", "__expectedType__": "cc.SpriteFrame"},
            "_type": 0,
            "_fillType": 0,
            "_sizeMode": 0,
            "_fillCenter": vec2(0, 0),
            "_fillStart": 0,
            "_fillRange": 0,
            "_isTrimmedMode": True,
            "_useGrayscale": False,
            "_atlas": None,
            "_id": nid(),
        }
    )
    # 8 Mask
    objs.append(
        {
            "__type__": "cc.Node",
            "_name": "Mask",
            "_objFlags": 0,
            "_parent": {"__id__": 1},
            "_children": [],
            "_active": False,
            "_components": [{"__id__": 9}],
            "_prefab": {"__id__": 18},
            "_lpos": vec3(),
            "_lrot": quat(),
            "_lscale": vec3(1, 1, 1),
            "_layer": 33554432,
            "_euler": vec3(),
            "_id": nid(),
        }
    )
    objs.append(
        {
            "__type__": "cc.Sprite",
            "_name": "",
            "_objFlags": 0,
            "node": {"__id__": 8},
            "_enabled": True,
            "__prefab": {"__id__": 19},
            "_customMaterial": None,
            "_srcBlendFactor": 2,
            "_dstBlendFactor": 4,
            "_color": color(0, 0, 0, 140),
            "_spriteFrame": {"__uuid__": f"{UUIDS['tex_mask']}@f9941", "__expectedType__": "cc.SpriteFrame"},
            "_type": 0,
            "_fillType": 0,
            "_sizeMode": 0,
            "_fillCenter": vec2(0, 0),
            "_fillStart": 0,
            "_fillRange": 0,
            "_isTrimmedMode": True,
            "_useGrayscale": False,
            "_atlas": None,
            "_id": nid(),
        }
    )
    # 10 root UITransform
    objs.append(
        {
            "__type__": "cc.UITransform",
            "_name": "",
            "_objFlags": 0,
            "node": {"__id__": 1},
            "_enabled": True,
            "__prefab": {"__id__": 20},
            "_contentSize": size(72, 72),
            "_anchorPoint": vec2(0.5, 0.5),
            "_id": nid(),
        }
    )
    # PrefabInfo refs 11+
    for i, file_id in enumerate(["root", "shadow", "s_ut", "base", "b_ut", "icon", "i_sp", "mask", "m_sp", "r_ut"]):
        objs.append(
            {
                "__type__": "cc.CompPrefabInfo" if i in (2, 4, 6, 8, 9) or (i >= 1 and False) else "cc.PrefabInfo",
                "root": {"__id__": 1},
                "asset": {"__id__": 0},
                "fileId": f"card{i:02d}{file_id}"[:22],
                "instance": None,
                "targetOverrides": None,
                "nestedPrefabInstanceRoots": None,
            }
            if i == 0
            or True
            else {}
        )

    # Simplify PrefabInfo - Creator is lenient enough for import; use cc.PrefabInfo for node links
    # Rebuild prefab infos cleanly:
    while len(objs) > 11:
        objs.pop()

    def prefab_info(file_id: str, is_comp=False):
        t = "cc.CompPrefabInfo" if is_comp else "cc.PrefabInfo"
        if is_comp:
            return {"__type__": t, "fileId": file_id}
        return {
            "__type__": t,
            "root": {"__id__": 1},
            "asset": {"__uuid__": UUIDS["prefab_card"], "__expectedType__": "cc.Prefab"},
            "fileId": file_id,
            "instance": None,
            "targetOverrides": None,
            "nestedPrefabInstanceRoots": None,
        }

    # indices expected: 11 root prefab, 12 shadow node, 13 shadow ut, 14 base, 15 base ut, 16 icon, 17 icon sp, 18 mask, 19 mask sp, 20 root ut
    objs.append(prefab_info("a1CardRoot000000000001"))  # 11
    objs.append(prefab_info("a1CardShadow0000000002"))  # 12
    objs.append(prefab_info("a1CardShadowUT00000003", True))  # 13
    objs.append(prefab_info("a1CardBase000000000004"))  # 14
    objs.append(prefab_info("a1CardBaseUT0000000005", True))  # 15
    objs.append(prefab_info("a1CardIcon000000000006"))  # 16
    objs.append(prefab_info("a1CardIconSP0000000007", True))  # 17
    objs.append(prefab_info("a1CardMask000000000008"))  # 18
    objs.append(prefab_info("a1CardMaskSP0000000009", True))  # 19
    objs.append(prefab_info("a1CardRootUT0000000010", True))  # 20

    # Icon also needs UITransform for layout - add after (optional). Skip for brevity; Sprite works with node.
    # Add UITransform on Icon & Mask by expanding - for now add missing UT on icon/mask via Sprite sizeMode CUSTOM.
    return objs


def write_folder_metas():
    mapping = {
        ASSETS: "folder_assets",
        ASSETS / "scenes": "folder_scenes",
        ASSETS / "prefabs": "folder_prefabs",
        ASSETS / "textures": "folder_textures",
        ASSETS / "textures/animals": "folder_animals",
        ASSETS / "textures/ui": "folder_ui",
        ASSETS / "audio": "folder_audio",
        ASSETS / "scripts": "folder_scripts",
        ASSETS / "audio/animals": None,
        ASSETS / "scripts/scenes": None,
        ASSETS / "scripts/core": None,
        ASSETS / "scripts/managers": None,
        ASSETS / "scripts/ui": None,
        ASSETS / "scripts/ui/panels": None,
        ASSETS / "scripts/utils": None,
    }
    for path, key in mapping.items():
        path.mkdir(parents=True, exist_ok=True)
        u = UUIDS[key] if key else str(uuid.uuid4())
        write_json(Path(str(path) + ".meta"), folder_meta(u))


def write_script_metas():
    pairs = [
        (ASSETS / "scripts/scenes/LoadingScene.ts", "script_loading", "assets/scripts/scenes/LoadingScene.js"),
        (ASSETS / "scripts/scenes/LobbyScene.ts", "script_lobby", "assets/scripts/scenes/LobbyScene.js"),
        (ASSETS / "scripts/scenes/GameScene.ts", "script_game", "assets/scripts/scenes/GameScene.js"),
    ]
    for path, key, module in pairs:
        write_json(Path(str(path) + ".meta"), ts_meta(UUIDS[key], module))

    # Generate metas for other scripts with random stable-ish uuids derived from path
    for p in ASSETS.rglob("*.ts"):
        meta = Path(str(p) + ".meta")
        if meta.exists():
            continue
        # deterministic uuid5
        u = str(uuid.uuid5(uuid.NAMESPACE_URL, str(p.relative_to(ROOT))))
        mod = "assets/" + str(p.relative_to(ASSETS)).replace("\\", "/").replace(".ts", ".js")
        write_json(meta, ts_meta(u, mod))


def write_scenes():
    scenes = [
        ("LoadingScene", "scene_loading", "script_loading", "LoadingScene"),
        ("LobbyScene", "scene_lobby", "script_lobby", "LobbyScene"),
        ("GameScene", "scene_game", "script_game", "GameScene"),
    ]
    for name, skey, script_key, cls in scenes:
        path = ASSETS / f"scenes/{name}.scene"
        data = make_scene(name, UUIDS[skey], UUIDS[script_key], cls)
        write_json(path, data)
        write_json(Path(str(path) + ".meta"), scene_meta(UUIDS[skey]))


def write_prefab():
    path = ASSETS / "prefabs/CardPrefab.prefab"
    write_json(path, make_card_prefab())
    write_json(Path(str(path) + ".meta"), prefab_meta(UUIDS["prefab_card"]))


def update_project_settings():
    project = {
        "__version__": "1.0.6",
        "general": {
            "designResolution": {
                "width": 750,
                "height": 1334,
                "fitWidth": True,
                "fitHeight": False,
            }
        },
        "custom_joint_texture_layouts": [],
    }
    write_json(ROOT / "settings/v2/packages/project.json", project)

    # builder scenes include
    builder = {
        "__version__": "1.3.8",
        "textureCompressConfig": {"genMipmaps": False},
    }
    write_json(ROOT / "settings/v2/packages/builder.json", builder)

    # scene list for editor convenience
    scene_list = {
        "__version__": "1.0.0",
        "start-scene": UUIDS["scene_loading"],
    }
    # Cocos often stores start scene under project user data; keep a local note file too
    write_json(ROOT / "settings/v2/packages/program.json", {"__version__": "1.0.4"})
    write_json(ROOT / "profiles/v2/packages/scene.json", {
        "__version__": "1.0.0",
        "current-scene": UUIDS["scene_loading"],
    })


def write_asset_catalog():
    catalog = {
        "designResolution": [750, 1334],
        "startScene": "assets/scenes/LoadingScene.scene",
        "scenes": [
            "assets/scenes/LoadingScene.scene",
            "assets/scenes/LobbyScene.scene",
            "assets/scenes/GameScene.scene",
        ],
        "animals": list(ANIMALS.keys()),
        "textures": {
            "ui": [
                "textures/ui/logo.png",
                "textures/ui/btn_orange.png",
                "textures/ui/btn_green.png",
                "textures/ui/btn_blue.png",
                "textures/ui/board_plate.png",
                "textures/ui/card_base.png",
                "textures/ui/card_mask.png",
                "textures/ui/progress_fill.png",
                "textures/ui/avatar.png",
                "textures/ui/white.png",
            ],
            "animals": [f"textures/animals/{n}.png" for n in ANIMALS],
        },
        "audio": {
            "bgm": "audio/bgm_soft.wav",
            "sfx": ["audio/sfx_match.wav", "audio/sfx_crit.wav"],
            "animals": [f"audio/animals/{n}.wav" for n in ANIMALS],
        },
        "prefabs": ["prefabs/CardPrefab.prefab"],
        "uuids": UUIDS,
    }
    write_json(ASSETS / "asset-catalog.json", catalog)


def main():
    write_folder_metas()
    gen_ui_textures()
    gen_audio()
    write_script_metas()
    write_scenes()
    write_prefab()
    update_project_settings()
    write_asset_catalog()
    print("Generated scenes, textures, audio, prefab, metas under assets/")
    print("Start scene UUID:", UUIDS["scene_loading"])
    print("LoadingScene script CID:", compress_uuid(UUIDS["script_loading"]))


if __name__ == "__main__":
    main()
