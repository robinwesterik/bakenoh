"""Extract VRAM/WRAM/IO from a gb-recompiled savestate."""
import struct, os
def load(path):
    d = open(path, 'rb').read()
    magic, ver, h, rom, eram, wram, vram, oam, hram, io, ppu, apu = struct.unpack_from('<IIQ9I', d, 0)
    core = len(d) - 56 - (eram + wram + vram + oam + hram + io + ppu + apu)
    o = 56 + core
    out = {}
    for name, n in (('eram', eram), ('wram', wram), ('vram', vram), ('oam', oam), ('hram', hram), ('io', io)):
        out[name] = d[o:o + n]; o += n
    out['core_size'] = core
    return out
