import math
import os
from PIL import Image, ImageDraw, ImageFilter

def create_apple_water_icon(size=512):
    # High resolution supersampling
    scale = 2
    dim = size * scale
    img = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx, cy = dim / 2, dim / 2
    r_squircle = dim * 0.45
    corner_r = dim * 0.22

    # 1. Base Squircle / Rounded Rectangle
    # Apple squircle bounds
    pad = dim * 0.04
    bbox = [pad, pad, dim - pad, dim - pad]
    
    # Create background mask with rounded corners
    bg = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg)
    bg_draw.rounded_rectangle(bbox, radius=int(corner_r), fill=(10, 15, 26, 255))
    
    # Subtle dark navy-titanium gradient on squircle
    for y in range(int(pad), int(dim - pad)):
        prog = (y - pad) / (dim - 2 * pad)
        # Deep space black (#070B14) to midnight navy slate (#0D1F38)
        r = int(7 * (1 - prog) + 13 * prog)
        g = int(11 * (1 - prog) + 28 * prog)
        b = int(20 * (1 - prog) + 52 * prog)
        bg_draw.line([(pad, y), (dim - pad, y)], fill=(r, g, b, 255))
    
    # Mask to rounded rect
    mask = Image.new("L", (dim, dim), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(bbox, radius=int(corner_r), fill=255)
    
    # Apply mask to background
    bg.putalpha(mask)
    img.alpha_composite(bg)

    # 2. Ambient Cyan Radial Glow in center
    glow = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_radius = dim * 0.38
    for i in range(int(glow_radius), 0, -4):
        p = i / glow_radius
        alpha = int(45 * (1 - p)**1.5)
        glow_draw.ellipse(
            [cx - i, cy - i * 0.9, cx + i, cy + i * 0.9],
            fill=(2, 132, 199, alpha)
        )
    glow = glow.filter(ImageFilter.GaussianBlur(dim * 0.05))
    glow.putalpha(mask)
    img.alpha_composite(glow)

    # 3. Precision Concentric Dashboard Rings (ERP / Telemetry)
    rings = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    rings_draw = ImageDraw.Draw(rings)
    for ring_r, opacity in [(dim * 0.32, 35), (dim * 0.28, 25)]:
        rings_draw.ellipse(
            [cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r],
            outline=(56, 189, 248, opacity),
            width=int(2 * scale)
        )
    # Ticks along the ring
    for angle in range(0, 360, 30):
        rad = math.radians(angle)
        r1 = dim * 0.31
        r2 = dim * 0.33
        x1 = cx + r1 * math.cos(rad)
        y1 = cy + r1 * math.sin(rad)
        x2 = cx + r2 * math.cos(rad)
        y2 = cy + r2 * math.sin(rad)
        rings_draw.line([(x1, y1), (x2, y2)], fill=(56, 189, 248, 50), width=int(1.5 * scale))
    rings.putalpha(mask)
    img.alpha_composite(rings)

    # 4. Apple-style Water Droplet Glyph
    # Droplet geometry: top sharp tip at (cx, cy - drop_h/2), bottom circular bulge
    drop = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    drop_draw = ImageDraw.Draw(drop)

    drop_top_y = cy - dim * 0.24
    drop_bot_y = cy + dim * 0.22
    bulb_cy = cy + dim * 0.06
    bulb_r = dim * 0.17

    # Construct smooth drop polygon / points
    drop_points = []
    # Tip
    drop_points.append((cx, drop_top_y))
    # Right curve towards bulb
    for a in range(295, 435, 3):
        rad = math.radians(a)
        px = cx + bulb_r * math.cos(rad)
        py = bulb_cy + bulb_r * math.sin(rad)
        drop_points.append((px, py))
    # Bottom circle
    for a in range(75, 245, 3):
        rad = math.radians(a)
        px = cx + bulb_r * math.cos(rad)
        py = bulb_cy + bulb_r * math.sin(rad)
        drop_points.append((px, py))
    # Left curve back to tip
    for a in range(105, 245, 3):
        pass # covered

    # Simple clean droplet path
    # Draw droplet gradient
    drop_mask = Image.new("L", (dim, dim), 0)
    dm_draw = ImageDraw.Draw(drop_mask)
    
    # Approximate drop using bulb + triangle top with rounded corners
    dm_draw.ellipse([cx - bulb_r, bulb_cy - bulb_r, cx + bulb_r, bulb_cy + bulb_r], fill=255)
    # Tangent lines from tip to bulb
    dx = bulb_r * math.cos(math.radians(35))
    dy = bulb_r * math.sin(math.radians(35))
    dm_draw.polygon([(cx, drop_top_y), (cx + dx, bulb_cy - dy), (cx - dx, bulb_cy - dy)], fill=255)

    # Render liquid gradient inside droplet (Electric Cyan #00E5FF to Royal Azure #0284C7)
    liquid = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    l_draw = ImageDraw.Draw(liquid)
    for y in range(int(drop_top_y), int(bulb_cy + bulb_r + 2)):
        prog = (y - drop_top_y) / (bulb_cy + bulb_r - drop_top_y + 1)
        r = int(0 * (1 - prog) + 2 * prog)
        g = int(229 * (1 - prog) + 132 * prog)
        b = int(255 * (1 - prog) + 199 * prog)
        l_draw.line([(0, y), (dim, y)], fill=(r, g, b, 240))
    
    liquid.putalpha(drop_mask)

    # Internal wave crest for living liquid feel
    wave = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    w_draw = ImageDraw.Draw(wave)
    wave_y = bulb_cy - bulb_r * 0.1
    wave_points = []
    for x in range(int(cx - bulb_r), int(cx + bulb_r) + 1):
        rel_x = (x - cx) / bulb_r
        wy = wave_y + math.sin(rel_x * math.pi * 2) * (dim * 0.015)
        wave_points.append((x, wy))
    wave_points.extend([(cx + bulb_r, bulb_cy + bulb_r), (cx - bulb_r, bulb_cy + bulb_r)])
    w_draw.polygon(wave_points, fill=(255, 255, 255, 45))
    w_mask = Image.new("L", (dim, dim), 0)
    w_mdraw = ImageDraw.Draw(w_mask)
    w_mdraw.polygon(wave_points, fill=255)
    wave.putalpha(drop_mask)
    liquid.alpha_composite(wave)

    # Specular reflection highlight (Apple glass highlight on top curve)
    specular = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(specular)
    spec_r = bulb_r * 0.72
    s_draw.ellipse(
        [cx - bulb_r * 0.55, bulb_cy - bulb_r * 0.65, cx + bulb_r * 0.15, bulb_cy - bulb_r * 0.05],
        fill=(255, 255, 255, 110)
    )
    specular = specular.filter(ImageFilter.GaussianBlur(dim * 0.012))
    specular.putalpha(drop_mask)
    liquid.alpha_composite(specular)

    # Refractive frosted glass border for the droplet
    drop_border = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    db_draw = ImageDraw.Draw(drop_border)
    db_draw.ellipse([cx - bulb_r, bulb_cy - bulb_r, cx + bulb_r, bulb_cy + bulb_r], outline=(255, 255, 255, 180), width=int(2.5 * scale))
    db_draw.line([(cx, drop_top_y), (cx + dx, bulb_cy - dy)], fill=(255, 255, 255, 180), width=int(2.5 * scale))
    db_draw.line([(cx, drop_top_y), (cx - dx, bulb_cy - dy)], fill=(255, 255, 255, 180), width=int(2.5 * scale))
    
    img.alpha_composite(liquid)
    img.alpha_composite(drop_border)

    # 5. Apple Outer Squircle Bevel Stroke & Subtle Top Highlight
    border = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(border)
    # Metallic rim
    b_draw.rounded_rectangle(bbox, radius=int(corner_r), outline=(56, 189, 248, 80), width=int(2.5 * scale))
    # Top specular rim line
    b_draw.line([(pad + corner_r, pad), (dim - pad - corner_r, pad)], fill=(255, 255, 255, 120), width=int(2 * scale))
    img.alpha_composite(border)

    # Final resize with LANCZOS downsampling for crisp perfection
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

if __name__ == "__main__":
    out_dir = r"c:\Users\DELL\Desktop\Sai Waters\generated_icons"
    os.makedirs(out_dir, exist_ok=True)
    
    resolutions = [
        ("admin_icon_512.png", 512),
        ("admin_icon_192.png", 192),
        ("admin_icon_144.png", 144),
        ("admin_icon_96.png", 96),
        ("admin_icon_72.png", 72),
        ("admin_icon_48.png", 48),
    ]
    
    for filename, sz in resolutions:
        path = os.path.join(out_dir, filename)
        icon = create_apple_water_icon(sz)
        icon.save(path, format="PNG")
        print(f"Generated {filename} ({sz}x{sz})")
