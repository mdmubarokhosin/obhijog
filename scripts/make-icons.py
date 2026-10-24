#!/usr/bin/env python3
# অভিযোগ — আইকন রিজেনারেটর (somossha-অনুপ্রাণিত মার্ক):
# কমলা বৃত্তাকার-বর্গ পট + সাদা ২×২ গ্রিড (৩ ভরা ঘর + ১ ফাঁকা ঘর)
from PIL import Image, ImageDraw
import os

OUT = "/home/z/my-project/public/icons"
os.makedirs(OUT, exist_ok=True)

ORANGE = (241, 74, 10, 255)     # #F14A0A
WHITE = (255, 255, 255, 255)
TRANSPARENT = (0, 0, 0, 0)


def rounded_bg(size: int, radius_ratio: float, bg=ORANGE) -> Image.Image:
    img = Image.new("RGBA", (size, size), TRANSPARENT)
    d = ImageDraw.Draw(img)
    r = int(size * radius_ratio)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=bg)
    return img


def draw_grid(img: Image.Image, scale: float, outline_last: bool = True) -> None:
    """কেন্দ্রে ২×২ গ্রিড; scale = গ্রিডের প্রস্থ / ছবির প্রস্থ"""
    size = img.size[0]
    d = ImageDraw.Draw(img)
    grid_w = size * scale
    pad = size * 0.045  # ঘরের মাঝে ফাঁক
    cell = (grid_w - pad) / 2
    x0 = (size - grid_w) / 2
    y0 = (size - grid_w) / 2
    positions = [
        (x0, y0),
        (x0 + cell + pad, y0),
        (x0, y0 + cell + pad),
        (x0 + cell + pad, y0 + cell + pad),
    ]
    rad = max(2, int(cell * 0.22))
    stroke = max(2, int(size * 0.028))
    for i, (x, y) in enumerate(positions):
        box = [x, y, x + cell, y + cell]
        if i == 3 and outline_last:
            d.rounded_rectangle(box, radius=rad, outline=WHITE, width=stroke)
        else:
            d.rounded_rectangle(box, radius=rad, fill=WHITE)


def make_icon(size: int, name: str, radius_ratio: float, grid_scale: float) -> None:
    img = rounded_bg(size, radius_ratio)
    draw_grid(img, grid_scale)
    img.save(os.path.join(OUT, name))
    print(f"✓ {name} ({size}×{size})")


# স্ট্যান্ডার্ড আইকন — রাউন্ডেড-স্কয়ার, বেশি মার্জিন নেই
make_icon(512, "icon-512.png", 0.225, 0.52)
make_icon(192, "icon-192.png", 0.225, 0.52)
make_icon(32, "favicon-32.png", 0.28, 0.52)

# মাস্কেবল — নিরাপদ অঞ্চলের জন্য ছোট গ্রিড, ফুল-ব্লিড পট
img = Image.new("RGBA", (512, 512), ORANGE)
draw_grid(img, 0.44)
img.save(os.path.join(OUT, "maskable-512.png"))
print("✓ maskable-512.png")

# অ্যাপল টাচ আইকন — ১৮০×১৮০ ফুল-ব্লিড (স্বচ্ছতা নেই)
img = Image.new("RGBA", (180, 180), ORANGE)
draw_grid(img, 0.52)
img.convert("RGB").save(os.path.join(OUT, "apple-touch-icon.png"))
print("✓ apple-touch-icon.png")
