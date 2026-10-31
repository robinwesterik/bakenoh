import sys; sys.path.insert(0, __file__.rsplit('/', 1)[0]); from tbl import dec
r = open(sys.argv[1], 'rb').read(); s = int(sys.argv[2], 16); n = int(sys.argv[3], 16)
for o in range(s, s + n, 16):
    b = r[o:o + 16]; print("%06x  %s  %s" % (o, b.hex(' '), dec(b)))
