"""Generate high-quality PNG icons for PWA using the real Mydeen AI logo design"""
import os
import sys

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Installing Pillow...")
    os.system(f"{sys.executable} -m pip install Pillow")
    from PIL import Image, ImageDraw

SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
OUT_DIR = os.path.join(os.path.dirname(__file__), "public", "icons")
os.makedirs(OUT_DIR, exist_ok=True)

def draw_real_logo(size):
    # Create transparent image
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Background rounded rect (deep dark background for better contrast)
    radius = size // 5
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=(5, 5, 5, 255))
    
    # Scale from 48x46 SVG viewport
    scale = (size * 0.75) / 48.0
    ox = (size - 48 * scale) / 2
    oy = (size - 46 * scale) / 2

    # Points extracted from the real SVG path in favicon.svg
    # M25.946 44.938 ... L25.947 44.94z
    pts = [
        (25.9, 44.9), (23.9, 44.2), (23.9, 33.9), (21.6, 31.6), 
        (10.2, 31.6), (9.3, 29.8), (16.8, 19.3), (1.2, 15.7), 
        (0.3, 13.9), (10.0, 0.4), (10.9, 0), (39.8, 0), 
        (40.7, 1.7), (33.2, 12.2), (35.0, 15.7), (46.3, 15.7), 
        (47.2, 17.5), (25.9, 44.9)
    ]
    
    # Scale points
    scaled_pts = [(ox + x * scale, oy + y * scale) for x, y in pts]
    
    # Draw the main bolt shape with the brand color #863bff
    # Brand color RGB: (134, 59, 255)
    draw.polygon(scaled_pts, fill=(134, 59, 255, 255))
    
    # Add a slight "glow" effect by drawing a smaller, lighter version inside
    inner_scale = 0.9
    inner_pts = []
    for x, y in pts:
        # Move towards center (24, 23)
        dx = x - 24
        dy = y - 23
        inner_pts.append((24 + dx * inner_scale, 23 + dy * inner_scale))
    
    inner_scaled_pts = [(ox + x * scale, oy + y * scale) for x, y in inner_pts]
    # Slightly lighter color for inner part to simulate gradient
    # draw.polygon(inner_scaled_pts, fill=(155, 100, 255, 255))
    
    return img

print("Generating real PWA icons...")
for size in SIZES:
    img = draw_real_logo(size)
    path = os.path.join(OUT_DIR, f"icon-{size}.png")
    img.save(path, "PNG")
    print(f"  OK icon-{size}.png saved")

print(f"\nDONE: All {len(SIZES)} icons generated in {OUT_DIR}")
