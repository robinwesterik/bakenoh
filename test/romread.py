import sys, json
import os; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools')); import state
s = state.load(sys.argv[1]); w = s['wram']
rd = lambda a: w[a - 0xC000]; rw = lambda a: w[a - 0xC000] | (w[a - 0xBFFF] << 8)
n = rd(0xC4FB)
out = {'active': n, 'scale': rw(0xC5B0),
  'p0': [rw(0xC4FC + 2*k) - 0x8000 for k in range(n)], 'p0ids': [rw(0xC520 + 2*k) & 0xFF for k in range(n)],
  'p1': [rw(0xC544 + 2*k) - 0x8000 for k in range(n)], 'p1ids': [rw(0xC568 + 2*k) & 0xFF for k in range(n)],
  'cat': rd(0xC5C1), 'narrow': rd(0xCC4A), 'nPicks': rd(0xC5C3), 'fav': rd(0xC5C2), 'picks': []}
a = 0xC5C4
while rd(a) != 0xFF and len(out['picks']) < out['nPicks']: out['picks'].append([rd(a), rd(a + 1)]); a += 2
print(json.dumps(out))
