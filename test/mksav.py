"""Pack a race (JSON from sample.js) into the cartridge SRAM format (file slot 0)."""
import json, sys
GROUPS = [(0xC63D,14,8),(0xC64B,1,1),(0xC64C,1,2),(0xC64D,1,1),(0xC64E,1,1),(0xC64F,1,2),(0xC650,1,2),(0xC651,1,4),(0xC652,1,4),
 (0xC653,1,7),(0xC654,252,8),(0xC750,18,1),(0xC762,18,3),(0xC774,18,7),(0xC786,18,5),(0xC798,18,3),(0xC7AA,288,4),(0xC8CA,288,4),
 (0xC9EA,72,4),(0xCA32,216,5),(0xCB0A,72,4),(0xCB52,18,3),(0xCB64,18,8),(0xCB76,18,8),(0xCB88,18,8),(0xCB9A,18,3),(0xCBAC,18,8),
 (0xCBBE,18,2),(0xCBD0,18,2),(0xCBE2,18,2),(0xCBF4,36,8),(0xCC18,18,1),(0xCC2A,1,2),(0xCC2B,10,1)]
def image(s):
    w = bytearray(0xCC35 - 0xC63D); put = lambda a, v: w.__setitem__(a - 0xC63D, v & 0xFF)
    race, hs, cfg = s['race'], s['horses'], s['cfg']
    for k, b in enumerate([0xB6,0xBA,0xB2,0xAF,0xD6,0xF3,0x00]): put(0xC63D + k, b)   # "テストファイル1"-ish name
    put(0xC64B, 1 if cfg['simple'] else 0); put(0xC64C, race['dist']); put(0xC64D, race['surface']); put(0xC64E, race['dir'])
    put(0xC64F, race['circuit']); put(0xC650, race['wcond']); put(0xC651, len(hs) - 5); put(0xC652, race['courseIdx']); put(0xC653, race['raceIdx'])
    for i, h in enumerate(hs):
        put(0xC654 + 14*i, 0xC8 + i)
        put(0xC750 + i, h['sex']); put(0xC762 + i, h['age']); put(0xC774 + i, h['jockeyIdx']); put(0xC786 + i, h['weight'] - 40); put(0xC798 + i, h['style'])
        for c in range(4):
            for f in range(4): put(0xC7AA + 16*i + 4*c + f, h['distRec'][c][f]); put(0xC8CA + 16*i + 4*c + f, h['courseRec'][c][f])
        for f in range(4): put(0xC9EA + 4*i + f, h['trackRec'][f]); put(0xCB0A + 4*i + f, h['freshRec'][f])
        for k in range(4):
            r = h['form'][k]; put(0xCA32 + 12*i + 3*k, r['c']); put(0xCA33 + 12*i + 3*k, r['f']); put(0xCA34 + 12*i + 3*k, r['m'])
        put(0xCB52 + i, h['training'])
        for a, key in ((0xCB64,'bwLast'),(0xCB76,'bwLow'),(0xCB88,'bwHigh'),(0xCBAC,'bwToday')): put(a + i, h[key] - 390 if h[key] else 0)
        put(0xCB9A + i, h['mark']); put(0xCBBE + i, h['excite']); put(0xCBD0 + i, h['sweat']); put(0xCBE2 + i, h['coat'])
        put(0xCBF4 + 2*i, h['odds'] & 0xFF); put(0xCBF5 + 2*i, h['odds'] >> 8); put(0xCC18 + i, 1 if h['scratched'] else 0)
    put(0xCC2A, cfg['track'])
    for k, key in enumerate(['names','sexage','distance','course','track','fresh','training','body','marks','paddock']): put(0xCC2B + k, 0 if cfg['questions'][key] else 1)
    return w
def pack(w):
    bits = []
    for a, n, b in GROUPS:
        for k in range(n):
            v = w[a - 0xC63D + k]
            bits += [(v >> j) & 1 for j in range(b)]
    out = bytearray((len(bits) + 7) // 8)
    for j, bit in enumerate(bits): out[j >> 3] |= bit << (j & 7)
    return out
s = json.load(open(sys.argv[1])); w = image(s)
import os
if os.path.exists(sys.argv[2]):
    sav = bytearray(open(sys.argv[2], 'rb').read())
else:   # fresh SRAM: signature + default weights, all files empty
    sav = bytearray(0x2000); sav[0x10:0x14] = b'MAHO'
body = pack(w); base = 0x50
sav[base:base + 0x3C0] = bytes(0x3C0); sav[base:base + len(body)] = body; sav[base + 0x3BF] = sum(w) & 0xFF
sav[0x20:0x2D] = bytes(s['cfg']['weights']); sav[0x2D] = 1   # BGM off
open(sys.argv[3], 'wb').write(sav); open(sys.argv[3] + '.wram', 'wb').write(w)
print('packed', len(body), 'bytes, checksum', sum(w) & 0xFF)
