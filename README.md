# Bakenoh V3 calculator

**Live:** https://robinwesterik.github.io/bakenoh/

An English, browser-based version of the race predictor from **馬券王V3 (Bakenō V3)**, Asmik's 1993
Game Boy horse-racing betting tool. You enter a race card the way you would on the cartridge
(form, records, jockey, paddock, odds, your newspaper marks) and get the same predicted finishing
order, quinella and bracket picks and commentary the game would show.

The scoring engine is a port of the cartridge's own code. It was checked against the original game
running in a recompiled build: 120 randomly generated races gave identical scores, rankings, picks
and commentary. A "Bugs fixed" switch shows what the game would have done without its original
programming bugs (body weight is effectively ignored, paddock counts 250%, and more).

Racecourses, jockeys and race presets start with the 1993 data from the cartridge. All of them can
be edited, cleared or extended in the page, and edits stay in your browser.

## What's here

| Path | What it is |
|---|---|
| `index.html` | The site (one self-contained file, served by GitHub Pages) |
| `src/engine.js` | The prediction engine (works in the browser and in Node) |
| `src/data.json` | Courses, course tips, races, jockey ratings and bias rules from the cartridge |
| `src/index.src.html` | Page source; `src/build.sh` inlines engine + data into `index.html` |
| `docs/prediction.md` | The full algorithm: inputs, every point table, rules, picks, commentary and bugs |
| `tools/` | Python helpers for reading the ROM: character table, disassembly listing, screen and text dumps |
| `test/` | Harness that runs the original game headless and compares it with `engine.js` |

**Not included:** the ROM, the recompiled game, and the game's music. To reproduce the research
you need your own legally obtained cartridge dump. The steps are below.

## Reproducing the recompiled game

The research used [gb-recompiled](https://github.com/arcanite24/gb-recompiled) v0.1.0, a static
recompiler that turns a Game Boy ROM into C plus an SDL runtime. These steps are for Linux x64;
the release also has macOS and Windows builds.

1. **Dump your cartridge** to `bkv3.gb` (128 KB). The header title is `BAKENOH V3`, MBC1+RAM+battery.
   Put it in the root of this repo (it's git-ignored).

2. **Install gb-recompiled v0.1.0**:
   ```sh
   gh release download v0.1.0 -R arcanite24/gb-recompiled -p 'gb-recompiled-linux-x64.tar.gz' -p SHA256SUMS.txt
   grep linux SHA256SUMS.txt | sha256sum -c
   mkdir -p ~/.local/opt && tar xzf gb-recompiled-linux-x64.tar.gz -C ~/.local/opt
   mv ~/.local/opt/gb-recompiled-linux ~/.local/opt/gb-recompiled
   printf '#!/bin/sh\nexec "$HOME/.local/opt/gb-recompiled/gbrecomp" "$@"\n' > ~/.local/bin/gbrecomp
   chmod +x ~/.local/bin/gbrecomp
   ```
   Use a wrapper script, not a symlink. Through a symlink, `gbrecomp` can't find its bundled runtime
   ("Could not locate the runtime snapshot").

3. **Install the build tools**: CMake, Ninja, a C/C++ compiler and SDL2 development files.
   On Arch: `sudo pacman -S cmake ninja gcc sdl2-compat`.

4. **Recompile and build**:
   ```sh
   gbrecomp bkv3.gb -o recomp
   cmake -G Ninja -S recomp -B recomp/build
   ninja -C recomp/build
   ./recomp/build/bkv3
   ```
   The analyzer reports 6 unresolved `JP HL` jump tables and 57 "undefined instruction" hits, which are
   data bytes. The game still boots and the prediction routines run correctly.

5. **Useful runtime flags** for research:

   | Flag | What it does |
   |---|---|
   | `--headless --no-audio` | Run without a window or sound |
   | `--limit-frames N` | Stop after N frames |
   | `--input "300:A:4,360:D:4"` | Press buttons at given frames (`frame:buttons:duration`; U D L R A B, S = Start, T = Select) |
   | `--dump-frames 60,120 --screenshot-prefix shots/f` | Save screenshots as PPM |
   | `--save-state-file s.state` | Write a savestate at exit (`tools/state.py` reads WRAM, VRAM and IO from it) |
   | `--save-dir DIR` | Where the battery save (`bkv3.sav`) lives |

## Verifying the engine against the game

`test/batch.sh` generates random races and writes each one into the cartridge's save RAM. The format
is a bit-packed copy of WRAM `C63D..CC34` with a checksum, documented in `docs/prediction.md`. It then
runs the recompiled game headless, navigates to *Prediction results*, and compares the game's
memory with `engine.js`:

```sh
test/batch.sh 1 40          # needs Node, Python 3 and ./recomp/build/bkv3 (or set BKV3_BIN)
# pass=40 fail=0
```

## Reading the ROM yourself

```sh
python3 tools/hexdump.py bkv3.gb 43d 40       # hexdump with the game's character table decoded
python3 tools/screens.py bkv3.gb              # all 125 text screens (20x18 tilemaps in banks 2, 3, 5, 6)
python3 tools/extract.py bkv3.gb script_ja.txt  # every known string with its ROM offset
python3 tools/dis.py 1 5c35 5d41              # disassembly listing (needs ./recomp for mnemonics)
```

Text is stored as raw tile numbers: hiragana from 0x80, katakana from 0xAE, kanji in 0x0C–0x5F,
digits at 0xF2. `tools/tbl.py` has the full table.

## Credits

- 馬券王V3 © 1993 Asmik. This is an unofficial fan project and is not affiliated with Asmik.
- [gb-recompiled](https://github.com/arcanite24/gb-recompiled) by arcanite24.
