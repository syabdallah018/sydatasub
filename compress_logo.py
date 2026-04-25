#!/usr/bin/env python3
"""
Logo Compression & Optimization Script
Handles JPEG compression with optimal settings for web delivery
"""
import os
import sys
from pathlib import Path

def compress_logo():
    """Compress and optimize logo.jpeg for web delivery"""
    
    # Import PIL only when needed
    try:
        from PIL import Image
    except ImportError:
        print("Installing Pillow...")
        os.system(f"{sys.executable} -m pip install Pillow -q")
        from PIL import Image
    
    logo_src = Path('public/logo.jpeg')
    logo_backup = Path('public/logo.backup.jpeg')
    logo_optimized = Path('public/logo.jpeg')
    
    print(f"📦 Logo Compression & Optimization")
    print(f"─" * 50)
    
    if logo_src.exists():
        print(f"✓ Logo file found: {logo_src}")
        print(f"  Original size: {logo_src.stat().st_size / 1024:.2f} KB")
        
        # Backup original
        if not logo_backup.exists():
            import shutil
            shutil.copy(logo_src, logo_backup)
            print(f"✓ Backup created: {logo_backup}")
        
        try:
            # Open & analyze
            img = Image.open(logo_src)
            print(f"✓ Image format: {img.format}")
            print(f"  Resolution: {img.size}")
            print(f"  Mode: {img.mode}")
            
            # Optimize & compress
            if img.mode == 'RGBA':
                # Convert RGBA to RGB (JPEG doesn't support alpha)
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[3] if len(img.split()) > 3 else None)
                img = background
            
            # Save with optimization
            img.save(
                logo_optimized,
                'JPEG',
                quality=85,
                optimize=True,
                progressive=True
            )
            
            optimized_size = logo_optimized.stat().st_size / 1024
            print(f"\n✓ Compression complete!")
            print(f"  New size: {optimized_size:.2f} KB")
            print(f"  Quality: 85% (web-optimal)")
            print(f"  Progressive: Yes (faster loading)")
            
            return True
            
        except Exception as e:
            print(f"✗ Error processing logo: {e}")
            return False
    else:
        print(f"✗ Logo not found. Creating placeholder...")
        # Create a simple gradient placeholder
        create_placeholder_logo()
        return True

def create_placeholder_logo():
    """Create a professional placeholder logo"""
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        print("Installing Pillow...")
        os.system(f"{sys.executable} -m pip install Pillow -q")
        from PIL import Image, ImageDraw
    
    # Create a 512x512 image with gradient-like background
    img = Image.new('RGB', (512, 512), '#06B6D4')  # Cyan brand color
    draw = ImageDraw.Draw(img)
    
    # Add orange accent
    for i in range(256):
        color = (
            6 + (255-6) * i // 256,
            182 - 100 * i // 256,
            212 - 50 * i // 256
        )
        draw.line([(0, i*2), (512, i*2)], fill=color, width=2)
    
    # Add text
    try:
        font = ImageFont.truetype("arial.ttf", 100)
    except:
        font = ImageDraw.ImageDraw.getfont(img)
    
    draw.text((256, 256), "DB", fill='white', anchor='mm', font=font)
    
    # Save
    logo_path = Path('public/logo.jpeg')
    img.save(logo_path, 'JPEG', quality=90, optimize=True)
    
    print(f"✓ Placeholder created: {logo_path}")
    print(f"  Size: {logo_path.stat().st_size / 1024:.2f} KB")

if __name__ == '__main__':
    os.chdir(Path(__file__).parent)
    compress_logo()
