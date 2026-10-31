"""Find loose text strings outside the screen-tilemap banks (2,3,5,6 screen areas)."""
import sys; sys.path.insert(0, __file__.rsplit('/', 1)[0]); from tbl import dec, inline
r = open(sys.argv[1], 'rb').read()
SCREENS = [(0x8000, 0xbf48), (0xc000, 0xe058), (0x14000, 0x17f48), (0x18000, 0x190e0)]
KANA = set(range(0x80, 0xDC)) | set(range(0xE2, 0xF0))
TEXT = KANA | {0x00, 0xDF, 0xF1, 0xE1, 0xE2, 0xDC} | set(range(0x0C, 0x60)) | set(range(0xF2, 0xFC)) | {0x7D, 0x7E}
i = 0; n = 0
while i < len(r):
    if any(a <= i < b for a, b in SCREENS): i += 1; continue
    j = i
    while j < len(r) and r[j] in TEXT and not any(a <= j < b for a, b in SCREENS): j += 1
    seg = r[i:j].strip(b'\0')
    if len(seg) >= 5:
        pairs = sum(seg[k] in KANA and seg[k+1] in KANA for k in range(len(seg)-1))
        hira = sum(0x80 <= x <= 0xAD for x in seg)
        # real text: long kana runs and hiragana or long katakana words
        if pairs >= 0.6 * (len(seg) - 1) and len(seg) >= 6 or (hira >= 4 and pairs >= 0.4*len(seg) and seg.count(0) >= 1):
            print("%06x %3d %s" % (i + (len(r[i:j]) - len(r[i:j].lstrip(b'\0'))), len(seg), inline(dec(seg)))); n += 1
    i = max(j, i + 1)
print(n, file=sys.stderr)
