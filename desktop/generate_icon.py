"""
Generate clean desktop application icons for FRIEND.OS.
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

desktop_dir = Path(__file__).parent
size = (256, 256)

img = Image.new("RGBA", size, (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Draw rounded rectangle with subtle gradient-like layers
# Background rounded rectangle
corner_radius = 56
draw.rounded_rectangle(
    [(8, 8), (248, 248)],
    radius=corner_radius,
    fill=(15, 23, 42, 255), # Slate 900
    outline=(59, 130, 246, 200), # Blue 500 border
    width=6,
)

# Draw an inner electric glow / accent node
draw.ellipse([(96, 40), (160, 104)], fill=(37, 99, 235, 255)) # Blue circle
draw.ellipse([(110, 54), (146, 90)], fill=(96, 165, 250, 255)) # Light blue core

# Draw connecting line to memory node
draw.line([(128, 104), (128, 150)], fill=(147, 197, 253, 255), width=8)

# Draw bottom horizontal connection to waiting node
draw.line([(80, 150), (176, 150)], fill=(147, 197, 253, 255), width=8)
draw.ellipse([(64, 134), (96, 166)], fill=(16, 185, 129, 255)) # Emerald resolved node
draw.ellipse([(160, 134), (192, 166)], fill=(245, 158, 11, 255)) # Amber waiting node

# Draw bottom base anchor
draw.line([(128, 150), (128, 196)], fill=(147, 197, 253, 255), width=8)
draw.ellipse([(112, 180), (144, 212)], fill=(59, 130, 246, 255))

png_path = desktop_dir / "icon.png"
ico_path = desktop_dir / "icon.ico"

img.save(str(png_path), format="PNG")
img.save(str(ico_path), format="ICO", sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])

print("Generated icon.png and icon.ico successfully.")
