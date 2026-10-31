"""Extract all known Bakenoh V3 text into a readable Japanese script dump."""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tbl import dec, inline, merge_rows
r = open(sys.argv[1], 'rb').read()
out = []
def P(s=""): out.append(s)
def clean(s): return inline(s).replace('|', ' ').rstrip()

P("# Bakenoh V3 (馬券王V3, Asmik 1993) - Japanese script dump"); P()
P("## 1. Screens (20x18 tilemaps, 360 bytes each)")
SCREEN_BANKS = {5: "UI screens", 6: "UI screens (results)", 2: "Course tips", 3: "Course tips (cont.)"}
def is_screen(b): return all(0x60 <= b[i*20] <= 0x7c and 0x60 <= b[i*20+19] <= 0x7c for i in range(18))
for bank in (5, 6, 2, 3):
    P(); P("### Bank %d - %s" % (bank, SCREEN_BANKS[bank])); n = 0
    while True:
        off = bank*0x4000 + n*360; b = r[off:off+360]
        if len(b) < 360 or not is_screen(b): break
        lines = [clean(l) for l in merge_rows([b[i*20:i*20+20] for i in range(18)])]
        lines = [l for l in lines if l.strip()]
        P(); P("[%d:%02d @%06x]" % (bank, n, off))
        for l in lines: P("  " + l.strip())
        n += 1

P(); P("## 2. Menu help lines (bank 0 @00043d, 36 bytes = 2x18)")
for k in range(4):
    a = 0x43d + 36*k; P("[help %d @%06x] %s %s" % (k, a, clean(dec(r[a:a+18])).strip(), clean(dec(r[a+18:a+36])).strip()))

P(); P("## 3. Prediction commentary (bank 1, 16-byte headline + 18-byte rows)")
pts = [0x4c16, 0x4c92, 0x4cea, 0x4d66, 0x4de2, 0x4e5e, 0x4eda, 0x4efe, 0x4f46, 0x4f8e, 0x4ffa, 0x5042, 0x5086]
for a, b in zip(pts, pts[1:]):
    d = r[a:b]; P()
    if a < 0x4eda: P("[comment @%06x] HEADLINE: %s" % (a, clean(dec(d[:16])).strip())); d = d[16:]
    else: P("[comment @%06x]" % a)
    for l in merge_rows([d[i:i+18] for i in range(0, len(d), 18)]):
        if l.strip(): P("  " + clean(l).strip())

P(); P("## 4. Racecourses (bank 0 @003954, 7 bytes each)")
for k in range(11):
    a = 0x3954 + 7*k; P("[course %d @%06x] %s" % (k, a, clean(dec(r[a:a+7])).strip()))

P(); P("## 5. Graded races (bank 0 @0039a1, header [width,count] then names)")
P("   note: on this screen tiles E7-EB/50/51 show Latin J,N,H,?,Z,T,R (e.g. ィゥK=NHK, ィォ次=NZT, AァCC=AJCC, A項G=ARG)")
o = 0x39a1
for lst in range(2):
    w, n = r[o], r[o+1]; o += 2; P("-- list %d (%s), %d entries" % (lst, "G1" if lst == 0 else "G2", n))
    for k in range(n): P("[race %d.%02d @%06x] %s" % (lst, k, o, clean(dec(r[o:o+w])).strip())); o += w

P(); P("## 6. Distance filters (@003bc1)")
P("[dist 0 @003bc1] %s" % clean(dec(r[0x3bc1:0x3bcd])).strip())
P("[dist 1 @003bcd] %s" % clean(dec(r[0x3bcd:0x3bd8])).strip())

P(); P("## 7. Jockeys (bank 0 @003bd8, 13 bytes each)")
o = 0x3bd8; k = 0
while o < 0x3ef2:
    P("[jockey %02d @%06x] %s" % (k, o, clean(dec(r[o:o+13])).strip())); o += 13; k += 1

P(); P("## 8. Misc UI strings (bank 0)")
for a, n, note in [(0x5e6, 5, "detail level option"), (0x5eb, 5, "detail level option"),
                   (0x628, 5, "file delete option"), (0x1033, 13, "scroll hint"),
                   (0x1040, 13, "scroll hint"), (0x104d, 13, "scroll hint"),
                   (0x17f9, 13, "name-entry row initials"), (0x87d, 0x45, "name-entry kana grid")]:
    P("[misc @%06x] %s   ; %s" % (a, clean(dec(r[a:a+n])).strip(), note))
open(sys.argv[2], 'w').write("\n".join(out) + "\n")
print(len(out), "lines")
