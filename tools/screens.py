"""Dump 20x18 screen tilemaps packed at the start of banks 2,3,5,6."""
import sys; sys.path.insert(0, __file__.rsplit('/', 1)[0]); from tbl import dec, merge_rows
r = open(sys.argv[1], 'rb').read()
SZ = 360
def is_screen(b):
    # every row has border tiles at both ends
    return all(0x60 <= b[row*20] <= 0x7c and 0x60 <= b[row*20+19] <= 0x7c for row in range(18))
for bank in (2, 3, 5, 6):
    n = 0
    while True:
        off = bank*0x4000 + n*SZ
        b = r[off:off+SZ]
        if len(b) < SZ or not is_screen(b): break
        print("=== bank %d screen %d  @%06x" % (bank, n, off))
        for line in merge_rows([b[row*20:row*20+20] for row in range(18)]): print(line)
        n += 1
    print("### bank %d: %d screens, ends @%06x" % (bank, n, bank*0x4000 + n*SZ), file=sys.stderr)
