"""Render the 256 BG tiles (LCDC.4=0 signed addressing) from a savestate as a labeled grid."""
import sys; sys.path.insert(0, __file__.rsplit('/', 1)[0]); import state
from PIL import Image, ImageDraw
s = state.load(sys.argv[1]); v = s['vram']
def tile(i):
    off = (0x1000 + i * 16) if i < 0x80 else (0x0800 + (i - 0x80) * 16)
    if s['io'][0x40] & 0x10: off = i * 16
    im = Image.new('L', (8, 8))
    for y in range(8):
        lo, hi = v[off + 2*y], v[off + 2*y + 1]
        for x in range(8):
            c = ((lo >> (7-x)) & 1) | (((hi >> (7-x)) & 1) << 1)
            im.putpixel((x, y), (255, 170, 85, 0)[c])
    return im
S = 4; cell = 8*S + 14
out = Image.new('L', (16*cell, 16*cell), 255); d = ImageDraw.Draw(out)
for i in range(256):
    x, y = (i % 16)*cell, (i // 16)*cell
    out.paste(tile(i).resize((8*S, 8*S), Image.NEAREST), (x+2, y+12)); d.text((x+2, y), '%02x' % i, fill=0)
out.save(sys.argv[2])
