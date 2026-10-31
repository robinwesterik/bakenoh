#!/bin/bash
# Compare the JS engine with the original game on random races.
# usage: test/batch.sh FROM TO      (needs the recompiled game, see README)
# env:   BKV3_BIN = path to the recompiled binary (default: ../recomp/build/bkv3)
cd "$(dirname "$0")"; BIN=${BKV3_BIN:-../recomp/build/bkv3}; mkdir -p out; pass=0; fail=0
for seed in $(seq "$1" "$2"); do
  node -e "const {sample2}=require('./sample2.js'); require('fs').writeFileSync('out/b.json', JSON.stringify(sample2($seed)));"
  narrow=$(node -e "console.log(require('./out/b.json').cfg.narrow)")
  rm -rf out/sav && mkdir out/sav && python3 -I mksav.py out/b.json out/none out/sav/bkv3.sav >/dev/null
  # title -> Prediction results -> file 1 -> yes -> (don't) narrow
  if [ "$narrow" = 1 ]; then IN="300:A:4,360:D:4,400:A:4,460:A:4,520:A:4,580:D:4,620:A:4"; else IN="300:A:4,360:D:4,400:A:4,460:A:4,520:A:4,580:A:4"; fi
  timeout 120 "$BIN" --headless --no-audio --limit-frames 1500 --save-dir out/sav --input "$IN" --save-state-file out/b.state >/dev/null 2>&1
  python3 -I romread.py out/b.state > out/rom.json
  res=$(node cmp.js out/b.json out/rom.json)
  if echo "$res" | grep -q '^MATCH'; then pass=$((pass+1)); else fail=$((fail+1)); echo "seed $seed:"; echo "$res" | head -8; cp out/b.json "out/fail_$seed.json"; fi
done
echo "pass=$pass fail=$fail"
