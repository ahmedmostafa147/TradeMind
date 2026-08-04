import math
from PIL import Image, ImageDraw, ImageFont

def render_logo(output_path, size=1024):
    # 4x supersampling for ultra-crisp anti-aliasing
    scale = 4
    S = size * scale
    img = Image.new("RGBA", (S, S), (10, 11, 13, 255)) # #0A0B0D obsidian background
    draw = ImageDraw.Draw(img)

    cx, cy = S / 2, S / 2
    lime = (217, 255, 48, 255)  # #D9FF30 Acid Lime
    
    # 1. Outer Sliced Radar Ring
    r1 = 0.38 * S
    w1 = int(0.024 * S)
    # Two clean 130-degree arcs facing opposite each other with 50-degree slices
    draw.arc([cx - r1, cy - r1, cx + r1, cy + r1], start=40, end=160, fill=lime, width=w1)
    draw.arc([cx - r1, cy - r1, cx + r1, cy + r1], start=220, end=340, fill=lime, width=w1)

    # 2. Inner Sliced Radar Ring (staggered slices)
    r2 = 0.29 * S
    w2 = int(0.016 * S)
    draw.arc([cx - r2, cy - r2, cx + r2, cy + r2], start=110, end=250, fill=lime, width=w2)
    draw.arc([cx - r2, cy - r2, cx + r2, cy + r2], start=290, end=70, fill=lime, width=w2)

    # 3. Radar Signal Target Dot at top right
    dot_r = 0.022 * S
    angle = math.radians(-45)
    dot_x = cx + r1 * math.cos(angle)
    dot_y = cy + r1 * math.sin(angle)
    draw.ellipse([dot_x - dot_r, dot_y - dot_r, dot_x + dot_r, dot_y + dot_r], fill=lime)

    # 4. Center Geometric 'R' + Arrow Symbol
    # Perfect mathematical proportions
    stroke = 0.055 * S
    r_h = 0.32 * S # height of R
    r_w = 0.22 * S # width of R
    
    x_left = cx - r_w / 2
    y_top = cy - r_h / 2
    y_bottom = cy + r_h / 2
    
    # Vertical Stem of R
    draw.rectangle([x_left, y_top, x_left + stroke, y_bottom], fill=lime)
    
    # Top Loop of R (Semicircle + top/bottom bars)
    loop_h = r_h * 0.5
    loop_r = loop_h / 2
    loop_cx = x_left + stroke
    loop_cy = y_top + loop_r
    
    # Top horizontal bar of loop
    draw.rectangle([x_left + stroke, y_top, x_left + r_w - loop_r, y_top + stroke], fill=lime)
    # Bottom horizontal bar of loop
    draw.rectangle([x_left + stroke, y_top + loop_h - stroke, x_left + r_w - loop_r, y_top + loop_h], fill=lime)
    # Outer arc of loop
    draw.arc([x_left + r_w - 2 * loop_r, y_top, x_left + r_w, y_top + loop_h],
             start=270, end=90, fill=lime, width=int(stroke))

    # Upward Arrow Leg (starts from middle of stem and extends up-right at 45 deg)
    leg_start_x = x_left + stroke * 0.8
    leg_start_y = y_top + loop_h - stroke * 0.5
    
    leg_end_x = cx + 0.18 * S
    leg_end_y = cy - 0.22 * S
    
    draw.line([leg_start_x, leg_start_y, leg_end_x, leg_end_y], fill=lime, width=int(stroke))

    # Arrow Head
    ah_len = 0.08 * S
    # Triangle head at leg_end pointing up-right
    p_tip = (leg_end_x + 0.035 * S, leg_end_y - 0.035 * S)
    p1 = (leg_end_x - ah_len, leg_end_y - 0.01 * S)
    p2 = (leg_end_x + 0.01 * S, leg_end_y + ah_len)
    draw.polygon([p_tip, p1, p2], fill=lime)

    # High-quality downsampling with Lanczos filter
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    final_img.save(output_path, "PNG")
    print(f"Generated clean 2D vector logo at {output_path}")

if __name__ == "__main__":
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else "logo_out.png"
    render_logo(out)
