import os
from PIL import Image

# Path to the rendered SVG image
source_image_path = r'D:\Mydeen AI\mydeen.ai\chatbot\master_logo_512.png'
# Directory where icons should be saved
target_dir = r'D:\Mydeen AI\mydeen.ai\chatbot\public\icons'

sizes = [72, 96, 128, 144, 152, 192, 384, 512]

def resize_and_save():
    if not os.path.exists(source_image_path):
        print(f"Source image not found: {source_image_path}")
        return

    with Image.open(source_image_path) as img:
        # The image is already 512x512 and has the white background from the SVG
        for s in sizes:
            resized_img = img.resize((s, s), Image.Resampling.LANCZOS)
            target_path = os.path.join(target_dir, f'icon-{s}.png')
            resized_img.save(target_path, 'PNG')
            print(f"Saved: {target_path}")

if __name__ == "__main__":
    resize_and_save()
