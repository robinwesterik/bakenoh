"""Find text-like runs in the ROM and report them by region."""
import sys; sys.path.insert(0, __file__.rsplit('/', 1)[0]); from tbl import dec
r = open(sys.argv[1], 'rb').read()
KANA = set(range(0x80, 0xE0)) | set(range(0xE2, 0xF0))
runs = []; i = 0
while i < len(r):
    j = i
    while j < len(r) and (r[j] in KANA or r[j] == 0 or 0x0C <= r[j] <= 0x5F or r[j] in (0xF1, 0xDF, 0xE1)):
        j += 1
    seg = r[i:j]
    k = sum(b in KANA for b in seg)
    if k >= 4 and k / max(1, len(seg.strip(b'\0'))) > 0.5:
        runs.append((i, seg))
    i = max(j, i + 1)
from collections import Counter
c = Counter(o >> 12 for o, _ in runs)
for blk in sorted(c): print("%05x-%05x: %d runs" % (blk << 12, (blk << 12) + 0xfff, c[blk]))
if len(sys.argv) > 2:
    for o, seg in runs: print("%06x %s" % (o, dec(seg.strip(b'\0'))))
