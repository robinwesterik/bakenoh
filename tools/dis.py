"""Linear SM83 listing using gbrecomp's mnemonics, chained by real instruction lengths.
usage: dis.py BANK START END  (addresses as hex, CPU addresses)"""
import sys, re, glob, os
L2 = {0x06,0x0e,0x16,0x1e,0x26,0x2e,0x36,0x3e,0x18,0x20,0x28,0x30,0x38,0xc6,0xce,0xd6,0xde,0xe6,0xee,0xf6,0xfe,0xe0,0xf0,0xe8,0xf8,0xcb,0x10}
L3 = {0x01,0x11,0x21,0x31,0x08,0xc2,0xc3,0xca,0xd2,0xda,0xc4,0xcc,0xcd,0xd4,0xdc,0xea,0xfa}
def ilen(op): return 3 if op in L3 else 2 if op in L2 else 1
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
rom = open(os.environ.get('BKV3_ROM', os.path.join(ROOT, 'bkv3.gb')), 'rb').read()
RECOMP = os.environ.get('BKV3_RECOMP', os.path.join(ROOT, 'recomp'))
cache = os.path.join(ROOT, 'work', 'mnem.txt'); os.makedirs(os.path.dirname(cache), exist_ok=True)
if not os.path.exists(cache):
    m = {}; prev = None
    pat = re.compile(r'/\* (?:([0-9a-f]{2}):)?([0-9a-f]{4}) \*/')
    for f in sorted(glob.glob(os.path.join(RECOMP, '*_funcs_*.c'))):
        for line in open(f):
            s = line.strip()
            mm = pat.search(s)
            if mm and s.startswith('/* ' + (mm.group(1) + ':' if mm.group(1) else '') + mm.group(2)):
                k = '%s:%s' % (mm.group(1) or '00', mm.group(2))
                if prev: m.setdefault(k, prev)
            elif s.startswith('/* ') and s.endswith('*/'):
                prev = s[3:-2].strip()
    open(cache, 'w').write('\n'.join('%s %s' % kv for kv in m.items()))
M = dict(l.split(' ', 1) for l in open(cache).read().splitlines())
bank, a, end = int(sys.argv[1]), int(sys.argv[2], 16), int(sys.argv[3], 16)
def off(x): return x if x < 0x4000 else bank * 0x4000 + x - 0x4000
while a < end:
    op = rom[off(a)]; n = ilen(op)
    k = '%02x:%04x' % (0 if a < 0x4000 else bank, a)
    raw = rom[off(a):off(a) + n].hex()
    mn = M.get(k, '?? (data?)')
    if op == 0xcb: mn = M.get(k, 'CB %02x' % rom[off(a) + 1])
    print('%04x  %-8s %s' % (a, raw, mn)); a += n
