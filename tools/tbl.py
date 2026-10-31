"""Bakenoh V3 character table (tile IDs, partial; low IDs are per-screen kanji)."""
HIRA = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん"
KATA = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン"
T = {}
for i, c in enumerate(HIRA): T[0x80 + i] = c
for i, c in enumerate(KATA): T[0xAE + i] = c
for i in range(10): T[0xF2 + i] = str(i)
T.update({0xDF: "゛", 0xF1: "ー", 0xE1: "?", 0xEE: "ュ", 0xE7: "ァ", 0x00: " "})
KANJI = {i + 0x01: c for i, c in enumerate("ABVKGQCSM◎△")}
KANJI.update({0x0C + i: c for i, c in enumerate(
    "競馬場騎手番枠上下牡牝中別体変更比重調教終了確認成績着予想単勝順逃先追差"
    "自左右作内穴削回出走数芝入力長短除不良悪連対歳稍名休定量並首込毛"
    "次項目前以外状態基本性直戦当日設")})
KANJI.update({0x7D: "行", 0x7E: "決"})
T.update({0xDC: "~", 0xDD: "゛", 0xDE: ".", 0xE0: "゜", 0xF0: "・", 0xFC: "▲", 0xFD: "▼", 0xFE: "○", 0xFF: "×"})
T.update({0xE2 + i: c for i, c in enumerate("!っゃゅょァィゥェォッャュョ")})
BOX = set(range(0x60, 0x7D))
def dec(b, kanji=True):
    out = []
    for x in b:
        if x in T: out.append(T[x])
        elif kanji and x in KANJI: out.append(KANJI[x])
        elif x in BOX: out.append("|")
        else: out.append("{%02x}" % x)
    return "".join(out)

import unicodedata
def voice(c, mark):
    d = unicodedata.normalize('NFC', c + ('\u3099' if mark == '゛' else '\u309a'))
    return d if len(d) == 1 else c + mark
def compose(c, mark):
    return voice(c, mark)
def merge_rows(rows):
    """rows: list of raw byte rows. Fold dakuten-only rows (0xDD/0xDE) into the row below,
    and fold inline ゛ (0xDF) into the preceding kana. Returns list of strings."""
    out = []; i = 0
    while i < len(rows):
        r = rows[i]
        marks = [b for b in r if b not in (0, 0xDD, 0xDE) and not 0x60 <= b <= 0x7C]
        if not marks and any(b in (0xDD, 0xDE) for b in r) and i + 1 < len(rows):
            nxt = rows[i + 1]; line = []
            for a, b in zip(r, nxt):
                ch = dec(bytes([b]))
                if a == 0xDD: ch = voice(ch, '゛')
                elif a == 0xDE: ch = voice(ch, '゜')
                line.append(ch)
            out.append(inline("".join(line))); i += 2; continue
        if not any(b not in (0,) and not 0x60 <= b <= 0x7C for b in r):
            i += 1; continue
        out.append(inline(dec(r))); i += 1
    return out
def inline(s):
    res = []
    for ch in s:
        if ch in '゛゜' and res: res[-1] = voice(res[-1], ch)
        else: res.append(ch)
    return "".join(res)
