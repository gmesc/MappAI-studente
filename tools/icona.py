#!/usr/bin/env python3
"""tools/icona.py — l'icona dell'app: quella di MappAI con una piccola «S» in basso a destra

`ios/` non è nel repo: la sorgente è `resources/icona-1024.png` (generata qui da
`MappAI re/public/MappAI_icon.png`) e questo script la copia nell'appiconset di
Xcode. Si rilancia dopo `npx cap add ios`.

    python3 tools/icona.py           # genera resources/icona-1024.png e la copia in ios/
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

QUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.environ.get('MAPPAI_ICON', os.path.join(QUI, '..', 'MappAI re', 'public', 'MappAI_icon.png'))
OUT = os.path.join(QUI, 'resources', 'icona-1024.png')
DEST = os.path.join(QUI, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png')

def badge(img):
    """un cerchio viola in basso a destra con una S bianca — abbastanza grande da leggersi a 60 px"""
    w, h = img.size
    r = int(w * 0.135)
    cx, cy = w - r - int(w * 0.05), h - r - int(w * 0.05)
    d = ImageDraw.Draw(img)
    d.ellipse([cx - r - 12, cy - r - 12, cx + r + 12, cy + r + 12], fill=(255, 255, 255, 255))   # bordo bianco: stacca dal fondo
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(79, 70, 229, 255))                           # #4f46e5
    font = None
    for path in ['/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/System/Library/Fonts/Helvetica.ttc']:
        if os.path.exists(path):
            try: font = ImageFont.truetype(path, int(r * 1.4)); break
            except Exception: pass
    font = font or ImageFont.load_default()
    bb = d.textbbox((0, 0), 'S', font=font)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    d.text((cx - tw / 2 - bb[0], cy - th / 2 - bb[1]), 'S', font=font, fill=(255, 255, 255, 255))
    return img

def main():
    if not os.path.exists(SRC):
        sys.exit('manca l\'icona di MappAI: ' + SRC)
    img = Image.open(SRC).convert('RGBA').resize((1024, 1024), Image.LANCZOS)
    img = badge(img)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    # l'icona iOS non ammette trasparenza: fondo bianco sotto
    piatta = Image.new('RGB', img.size, (255, 255, 255))
    piatta.paste(img, mask=img.split()[3])
    piatta.save(OUT, 'PNG')
    print('icona →', OUT)
    if os.path.exists(os.path.dirname(DEST)):
        piatta.save(DEST, 'PNG'); print('copiata in', DEST)
    else:
        print('ios/ non c\'è: prima `npx cap add ios`, poi rilancia')

if __name__ == '__main__':
    main()
