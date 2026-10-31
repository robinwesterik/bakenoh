/* Bakenoh V3 prediction engine — a port of the Game Boy code (bank 1, 01:5800..7800).
   Integer maths follows the original: truncating division, 16-bit score words.
   opts.fixBugs = false reproduces the shipped cartridge, bugs included. */
(function (root) {
'use strict';

const W_MAIN = [0, 10, 20, 30, 60, 100, 120, 150, 200, 250, 300];
const W_ALT_KEY = [100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300];
const W_ALT = [0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10];
const ITEMS = ['Sex & age', 'Running style', 'Jockey', 'Prediction marks', 'Heavy-track record', 'Distance record',
  'Course record', 'Racecourse record', 'Recent form', 'Body weight', 'Training', 'Win odds', 'Paddock'];

// recent form tables (rows: G1,G2,G3,OP,1500,900,500,Maiden,Debut,Other,Layoff)
const T1 = [[6000,4000,2500,1500,750,500,375],[4500,3125,2250,1250,625,400,200],[3500,2625,1750,875,500,300,175],
  [2125,1500,1000,500,300,175,100],[1000,500,375,250,125,85,50],[450,250,175,100,50,40,25],[225,125,75,40,25,20,15],
  [100,65,35,20,15,10,5],[100,65,25,10,5,5,0],[100,65,35,20,15,10,5],[5,5,5,5,5,5,5]];
const T1A = [[6000,4000,2500,250,150,100,50],[4500,3125,2250,225,125,75,40],[3500,2625,1750,185,100,50,25],
  [2125,1500,1000,100,50,25,15],[1000,500,375,25,15,5,0],[450,250,175,15,5,0,0],[225,125,75,10,0,0,0],
  [100,65,35,10,0,0,0],[100,65,25,5,0,0,0],[100,65,35,15,5,0,0],[5,5,5,5,5,5,5]];
const T2 = [[6000,4000,2500,1500,750,500,375,175],[4500,3125,2250,1250,625,400,200,135],[3500,2625,1750,875,500,300,175,75],
  [2125,1500,1000,500,300,175,100,35],[1000,500,375,250,125,85,50,20],[450,250,175,100,50,40,25,10],[225,125,75,40,25,20,15,5],
  [100,65,35,20,15,10,5,0],[100,65,25,10,5,5,0,0],[100,65,35,20,15,10,5,0],[5,5,5,5,5,5,5,5]];
const T2A = [[6000,4000,2500,250,200,150,100,50],[4500,3125,2250,225,150,100,50,25],[3500,2625,1750,185,100,50,25,10],
  [2125,1500,1000,100,50,25,10,5],[1000,500,375,25,10,5,0,0],[450,250,175,15,5,0,0,0],[225,125,75,10,0,0,0,0],
  [100,65,35,10,0,0,0,0],[100,65,25,5,0,0,0,0],[100,65,35,10,5,0,0,0],[5,5,5,5,5,5,5,5]];
const T3 = [[6000,5000],[4500,4000],[3500,3125],[2125,1875],[1000,750],[450,350],[225,200],[100,75],[100,75],[100,75],[5,5]];
const M3 = [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0];
const M2 = [0,1,1,2,2,3,3,4,4,5,5,6,6,6,7,7];
const FORM_DIV = [1, 11, 13, 15, 17];
// sex/age table 6189: [dist][ageIdx 0..5][male p0, male p1, female p0, female p1]
const SEXAGE = [
  [[0,0,0,0],[1,0,1,0],[2,1,2,1],[1,2,1,2],[0,1,0,1],[-1,0,-1,0]],
  [[0,0,0,-1],[1,0,0,-1],[2,1,1,0],[1,2,0,1],[0,1,-1,0],[-1,0,-2,-1]],
  [[1,1,0,-1],[2,1,0,-1],[3,2,1,0],[2,3,0,1],[1,2,-1,0],[0,1,-2,-1]]];
const HEAVY_T = [[0,-1,-2,-2,-3,-3,-5,-5,-8,-8,-8,-8,-8,-8,-8,-8],[0,0,-1,-1,-2,-2,-3,-3,-4,-4,-4,-4,-4,-4,-4,-4]];
const BODY_T = { // [openPlus][bigChange][outsideRange] -> [p0,p1]
  1: { 0: { 0: [3, 2], 1: [-3, -5] }, 1: { 0: [5, 3], 1: [-5, -8] } },
  0: { 0: { 0: [2, 1], 1: [-1, -3] }, 1: { 0: [2, 1], 1: [-2, -4] } } };
const PAIRS = [[1,2],[1,3],[1,4],[1,5],[1,6],[2,3],[2,4],[2,5],[2,6],[3,4],[3,5],[3,6],[4,5],[4,6],[5,6]];
const BRACKETS = {
  9: [1,2,3,4,5,6,7,8,8], 10: [1,2,3,4,5,6,7,7,8,8], 11: [1,2,3,4,5,6,6,7,7,8,8], 12: [1,2,3,4,5,5,6,6,7,7,8,8],
  13: [1,2,3,4,4,5,5,6,6,7,7,8,8], 14: [1,2,3,3,4,4,5,5,6,6,7,7,8,8], 15: [1,2,2,3,3,4,4,5,5,6,6,7,7,8,8],
  16: [1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8], 17: [1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,8], 18: [1,1,2,2,3,3,4,4,5,5,6,6,7,7,7,8,8,8] };
const HEADLINES = ['Wide open!', 'Neck and neck!', 'As expected!', "The favorite's race!", 'A safe bet!', 'Upset brewing!'];
const HEAD_BODY = [
  'There is no big gap in ability between the horses. Every horse has a chance.',
  'It looks like a three-way battle between the top three.',
  'Expect a predictable race built around the most capable horses.',
  'It looks likely to be decided between the two highest-rated horses.',
  'The top horse is far stronger than the rest of the field.',
  'No horse stands out, so expect a rough race.'];
const CONNECT = { D: 'Therefore,', K: 'That said,', S: 'But if the favorite stumbles,' };
const CONNECT_T = [['K','D','D','D','D','K'],['K','D','D','D','D','K'],['D','S','S','S','S','D'],['K','K','D','D','D','K']];
const FOLLOW = ["don't expect a big payout; that's not how this race will go.",
  "a big payout is unlikely; it should follow the favorite's line.",
  'a high-paying combination is entirely possible.',
  "even with an upset, don't expect a very big payout."];

const tdiv = (a, b) => (b === 0 ? 0 : Math.trunc(a / b));
const s16 = v => ((v & 0xFFFF) ^ 0x8000) - 0x8000;
const sum4 = c => c[0] + c[1] + c[2] + c[3];
const wsum = c => 5000 * c[0] + 2500 * c[1] + 1000 * c[2] + 250 * c[3];

function selSort(keys, ids, n, better) {
  for (let i = 0; i < n; i++) {
    let b = i;
    for (let j = i; j < n; j++) if (better(keys[j], keys[b])) b = j;
    [keys[i], keys[b]] = [keys[b], keys[i]]; [ids[i], ids[b]] = [ids[b], ids[i]];
  }
}

function predict(race, horses, cfg, data, opts) {
  opts = opts || {};
  const fix = !!opts.fixBugs;
  const N = horses.length;                       // entered runners (C4FB during scoring)
  const active = horses.filter(h => !h.scratched).length;
  const simple = !!cfg.simple;
  const q = cfg.questions;                       // true = item is asked
  const jockeyById = Object.fromEntries(data.jockeys.map(j => [j.id, j.r]));
  const alt = !!race.lowClass || horses.some(h => h.age === 0);
  const today = 2 * race.dir + race.surface;
  const layoff = h => h.form[3].c === 10;

  function pct(item) {
    const lvl = cfg.weights[item];
    let off = 2 * lvl + 22 * item;
    if (!fix) off &= 0xFF;
    const row = Math.floor(off / 22), col = (off % 22) / 2;
    if (alt) return (row === 2 || row === 3 || row === 11) ? W_ALT_KEY[col] : W_ALT[col];
    return W_MAIN[col];
  }

  function runPass(pass) {
    const score = new Array(N).fill(0);
    const parts = horses.map(() => ({}));
    let scale = 10;
    const credit = (i, key, v) => { parts[i][key] = (parts[i][key] || 0) + v; };
    const addRaw = (i, key, v) => { score[i] = s16(score[i] + v); credit(i, key, v); };
    const add = (i, key, E, item) => addRaw(i, key, tdiv(s16(E * scale) * pct(item), 100));   // 6A90
    const addU = (i, key, E) => addRaw(i, key, s16(E * scale));                               // 6AD4
    const addD = (i, key, E) => addU(i, key, pass ? 2 * E : E);                              // 6AC1
    const addWD = (i, key, E, item) => add(i, key, pass ? 2 * E : E, item);                  // 6A87

    // ---- base score 6B09 ----
    const recScore = (cells, item) => {
      const n = sum4(cells) & 0xFF, dv = (2 * n + 9) & 0xFF;
      const v = dv === 9 ? 15 : Math.floor(wsum(cells) / dv);
      return tdiv(v * pct(item), 100);
    };
    const base = horses.map(h => {
      let dist = 0;
      if (q.distance) {
        if (simple || pass === 0) dist = recScore(h.distRec[race.dist], 5);
        else dist = Math.floor((recScore(h.distRec[0], 5) + recScore(h.distRec[1], 5) + recScore(h.distRec[2], 5)) / 3);
      }
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        const r = h.form[k]; let c = r.c, fA = r.f;
        if (k < 3 && c >= 5 && c <= 9 && h.form[k + 1].c < c && h.form[k + 1].f === 0) { c = h.form[k + 1].c; if (c !== 8) fA = 1; }
        const d = (r.c === 8 && r.f !== 0) ? 3 : 2;
        const A = (alt ? T1A : T1)[c][Math.min(fA, 6)];
        const B = r.f === 0 ? T3[c][M3[r.m]] : (alt ? T2A : T2)[c][M2[r.m]];
        sum += Math.floor(A / d) + Math.floor(B / d);
      }
      const cnt = h.form.filter(r => r.c !== 10).length;
      const form = tdiv(Math.floor(sum / FORM_DIV[cnt]) * pct(8), 100);
      return { dist, form, total: ((dist + form) & 0xFFFF) >> 1 };
    });
    const S = base.reduce((a, b) => a + b.total, 0);
    scale = Math.max(10, Math.floor(Math.floor(S / N) / 9));
    for (let i = 0; i < N; i++) {
      if (pass === 0) { score[i] = s16(base[i].total); parts[i]['Base: distance record'] = base[i].dist >> 1; parts[i]['Base: recent form'] = base[i].total - (base[i].dist >> 1); }
    }

    // ---- per-horse factors P00..P33 ----
    for (let i = 0; i < N; i++) {
      const h = horses[i];
      // P00 heavy-track record
      if (q.distance && (race.surface ? cfg.track === 3 : cfg.track >= 2)) {
        const c = h.distRec[3], n = sum4(c);
        if (n === 0) add(i, 'Heavy-track record', [-3, -1][pass], 4);
        else {
          const v = Math.floor(Math.floor(wsum(c) / (2 * n + 9)) / [3, 5][pass]);
          if (c[0] | c[1] | c[2]) addRaw(i, 'Heavy-track record', tdiv(s16(v) * pct(4), 100));
          else add(i, 'Heavy-track record', HEAVY_T[pass][Math.min(c[3], 15)], 4);
        }
      }
      // P01 course record
      if (q.course) {
        const [dm, dx] = pass ? [2, 5] : [4, 10];
        for (let g = 0; g < 4; g++) {
          const c = h.courseRec[g], v = Math.floor(wsum(c) / (2 * sum4(c) + 9));
          let div;
          // original bug (01:66AD): the right-dirt group tests for a LEFT-handed dirt race
          const isToday = (!fix && g === 3) ? (race.surface === 1 && race.dir === 0) : g === today;
          if (isToday) div = dm; else if (simple) continue; else div = dx;
          addRaw(i, 'Course record', tdiv(s16(Math.floor(v / div)) * pct(6), 100));
        }
      }
      // P02 racecourse record
      if (q.track) {
        const c = h.trackRec, v = Math.floor(Math.floor(wsum(c) / (2 * sum4(c) + 9)) / [10, 5][pass]);
        addRaw(i, 'Racecourse record', tdiv(s16(v) * pct(7), 100));
      }
      // P03 training
      if (q.training) {
        add(i, 'Training', [[-3, -1, 0, 1, 3], [-8, -3, 0, 3, 8]][pass][h.training], 10);
        if (layoff(h)) add(i, 'Training', [[-3, -1, 0, 0, 0], [-6, -3, -1, 0, 0]][pass][h.training], 10);
      }
      // P04 fresh (first run after a layoff) record
      if (!simple && q.fresh && layoff(h)) {
        const [a, b, c, d] = h.freshRec;
        if (((a | b | c) === 0) && d) addU(i, 'Fresh record', [-2, -5][pass]);
        else {
          const n = a + b + c + d;
          const div8 = x => (n === 0 ? 0xFF : Math.floor(x / n) & 0xFF);
          const rw = div8(20 * a), rt = div8(20 * a + 10 * b + 5 * c), ro = div8(10 * d);
          const x = fix ? (rt - rw) & 0xFF : (rw - rt) & 0xFF;   // fix: compare place-rate with win-rate the intended way round
          let e = (x & 0x80) ? [0, 0] : x < 10 ? [0, 1] : x < 20 ? [1, 2] : [2, 5];
          addU(i, 'Fresh record', e[pass]);
          const y = (rt - ro) & 0xFF;
          e = (y & 0x80) ? [-1, -3] : y < 10 ? [0, 0] : y < 20 ? [1, 2] : [2, 4];
          addU(i, 'Fresh record', e[pass]);
        }
      }
      // P05-P07 paddock
      if (!simple && q.paddock) {
        add(i, 'Paddock', [[-1, 0, 1], [-3, 0, 3]][pass][h.excite], 12);
        add(i, 'Paddock', [[-1, 0, -1], [-3, 0, -3]][pass][h.sweat], 12);
        add(i, 'Paddock', [[-1, 0, 1], [-3, 0, 3]][pass][h.coat], 12);
      }
      // P08 weight carried in handicaps
      if (!simple && race.wcond === 3) {
        const a = h.weight - 56;
        if (a >= 0) addU(i, 'Weight carried', pass ? a : a >> 1);
      }
      // P09 prediction marks
      if (q.marks) add(i, 'Prediction marks', [[-1, 3, 2, 1, 0], [0, 1, 1, 1, 1]][pass][h.mark], 3);
      // P10 sex & age
      if (!simple && q.sexage) add(i, 'Sex & age', SEXAGE[race.dist][Math.min(h.age, 5)][2 * h.sex + pass], 0);
      // P11 best distance, P12 best course (no question check in the original)
      const bestOf = (groups, item, target, bug) => {
        const val = c => { const n = sum4(c) & 0xFF, dv = (2 * n + 9) & 0xFF; return tdiv((dv === 9 ? 15 : Math.floor(wsum(c) / dv)) * pct(item), 100); };
        const v = groups.map(val);
        let best = 0, m = v[0];
        for (let g = 1; g < v.length; g++) if (m < v[g]) { best = g; if (!(bug && g === 3)) m = v[g]; }
        if (m === 15) return null;
        return [2, -1, 4, -2][2 * pass + (target !== best ? 1 : 0)];
      };
      let e = bestOf(h.distRec.slice(0, 3), 5, race.dist, false);
      if (e !== null) add(i, 'Best distance', e, 5);
      e = bestOf(h.courseRec, 6, today, !fix);
      if (e !== null) add(i, 'Best course type', e, 6);
      // P13 jockey
      const jr = jockeyById[h.jockey] || [0, 0, 0, 0, 0, 0, 0, 0];
      add(i, 'Jockey', jr[0], 2);
      if (race.surface === 0) add(i, 'Jockey', jr[1], 2); else add(i, 'Jockey', jr[2], 2);
      if (h.style === 0 || h.style === 1) add(i, 'Jockey', jr[3], 2);
      if (h.style === 2 || h.style === 3) add(i, 'Jockey', jr[4], 2);
      add(i, 'Jockey', jr[5 + race.dist], 2);
      // P14 body weight
      if (!simple && q.body) {
        const openPlus = h.form.some(r => r.c < 4) ? 1 : 0;
        let big = 0, outside = 0;
        if (fix) {
          if (h.bwToday && h.bwLast) big = Math.abs(h.bwToday - h.bwLast) >= 10 ? 1 : 0;
          if (h.bwToday && h.bwLow && h.bwHigh) outside = (h.bwLow > h.bwToday || h.bwHigh < h.bwToday) ? 1 : 0;
        }
        add(i, 'Body weight', BODY_T[openPlus][big][outside][pass], 9);
      }
      // P15-P32 course bias rules (style rules)
      for (const ru of data.rules) {
        if (Array.isArray(ru.target) && ruleMatches(ru, race) && ru.target.includes(h.style)) addD(i, 'Course bias', ru.pts);
      }
      // P33 handicap on soft ground, 40 kg
      if (!simple && race.wcond === 3 && cfg.track >= 2 && h.weight === 40) addU(i, 'Weight carried', 1);
    }

    // ---- race-wide passes ----
    const odds = horses.map(h => h.odds);
    const pool = fix ? horses.map((h, i) => i).filter(i => !horses[i].scratched) : horses.map((h, i) => i);
    const Np = pool.length;
    // R00 popularity spread (pass 0 only)
    if (pass === 0) {
      const k = pool.map(i => odds[i]), ids = pool.slice();
      selSort(k, ids, Np, (a, b) => a < b);
      const m = Np - Math.floor(Np / 2) - 1, s = Np - Math.floor(Np / 2);
      let j = 0, tie = m > 0 && k[m] === k[m - 1];
      for (let p = m; p >= 0; p--) { add(ids[p], 'Popularity', j, 11); if (fix ? !(p > 0 && k[p] === k[p - 1]) : !tie) j++; }
      j = 0; tie = s + 1 < Np && k[s] === k[s + 1];
      for (let p = s; p < Np; p++) { add(ids[p], 'Popularity', -j, 11); if (fix ? !(p + 1 < Np && k[p] === k[p + 1]) : !tie) j++; }
    }
    // R01 big-field draw penalty
    const A = active - 12;
    if (A >= 0) {
      const e1 = [-1, -1, -1, -2, -2, -3, -3][A], e2 = [-1, -1, -1, -1, -2, -2, -2][A];
      for (const i of [0, 1, N - 1, N - 2]) if (i >= 0 && i < N) addU(i, 'Draw (field size)', e1);
      for (const i of [2, 3, N - 3, N - 4]) if (i >= 0 && i < N) addU(i, 'Draw (field size)', e2);
    }
    // R02 light horses on firm dirt
    if (q.body && race.surface === 1 && cfg.track < 2) {
      const k = pool.map(i => horses[i].bwToday), ids = pool.slice();
      selSort(k, ids, Np, (a, b) => a < b);
      if (k[0] !== 0) for (let p = 0; p < 5 && p < Np; p++) add(ids[p], 'Light horse on fast dirt', [[-4, -3, -2, -1, 0], [-8, -6, -4, -2, -1]][pass][p], 9);
    }
    // R03-R11 draw rules, R12/R13 lone front-runner
    const fronts = horses.map((h, i) => i).filter(i => horses[i].style === 0);
    for (const ru of data.rules) {
      if (Array.isArray(ru.target) || !ruleMatches(ru, race)) continue;
      if (ru.target === 'inside') for (const i of [0, 1, 2]) if (i < N) addD(i, 'Course bias', ru.pts);
      if (ru.target === 'outside') for (const i of [N - 1, N - 2, N - 3]) if (i >= 0) addD(i, 'Course bias', ru.pts);
      if (ru.target === 'lone' && fronts.length === 1) addD(fronts[0], 'Lone front-runner', ru.pts);
    }
    // R14 ◎ and ○ share a running style
    const b = horses.findIndex(h => h.mark === 1), c = horses.findIndex(h => h.mark === 2);
    if (b >= 0 && c >= 0 && horses[b].style === horses[c].style) { addWD(b, 'Marks clash', -1, 1); addWD(c, 'Marks clash', -1, 1); }
    // R15 outsider front-runners on soft ground
    if (!simple && cfg.track >= 2) {
      const k = pool.map(i => odds[i]), ids = pool.slice();
      selSort(k, ids, Np, (a, b) => a < b);
      for (let p = 5; p < Np; p++) if (horses[ids[p]].style === 0) addU(ids[p], 'Front-runner on soft ground', 1);
    }
    // R16 underrated marked favorites
    {
      let T;
      if (fix) { const sum = pool.reduce((a, i) => a + score[i], 0); T = Math.trunc(Math.trunc(sum / Np) / 4) * 3; }
      else { const sum = score.reduce((a, v) => a + v, 0) & 0xFFFFFF; T = ((Math.floor(Math.floor(sum / N) / 4)) & 0xFFFF) * 3 & 0xFFFF; }
      for (let i = 0; i < N; i++) {
        const sc = fix ? score[i] : score[i] & 0xFFFF;
        if (sc < T && odds[i] < 51 && (horses[i].mark === 1 || horses[i].mark === 2)) addU(i, 'Underrated favorite', 16);
      }
    }

    // ---- finalize 752A ----
    const keep = horses.map((h, i) => i).filter(i => !horses[i].scratched);
    const keys = keep.map(i => (score[i] + 0x8000) & 0xFFFF), ids = keep.slice();
    selSort(keys, ids, keys.length, (a, b) => a > b);
    return { scale, base, score, parts, order: ids, sorted: keys.map(k => k - 0x8000) };
  }

  const p0 = runPass(0), p1 = runPass(1);

  // ---- commentary 5B57 ----
  const s = p0.sorted;
  let cat = 0;
  if (s.length >= 2) {
    const t5 = Math.trunc(s[0] / 5), thr = s[0] - t5;
    let C = 0; for (let k = 1; k < s.length && s[k] >= thr; k++) C++;
    const s3 = s.length >= 3 ? s[2] : -Infinity;
    if (C >= 6) cat = 0; else if (C >= 3) cat = 1; else if (s[1] - t5 < s3) cat = 2;
    else if (C === 0 && s[1] <= s[0] - 2 * t5) cat = 4; else cat = 3;
  }

  // ---- picks 590A/5AE8 ----
  const rnd = o => Math.floor(o / 10) + ((o % 10) >= 5 ? 1 : 0);
  const odds = horses.map(h => h.odds);
  const LIM = active >= 11 ? [[14, 5, 8, 2], [10, 4, 6, 1]] : [[12, 4, 6, 1], [8, 3, 4, 0]];
  const L = LIM[cfg.narrow ? 1 : 0];
  const picks = []; let total = 0, favCount = 0;
  function collect(rec, ids, lo, hi, needLong) {
    for (const [r1, r2] of PAIRS) {
      if (ids.length < r1 || ids.length < r2) continue;
      const a = ids[r1 - 1], b = ids[r2 - 1];
      if (needLong && (odds[a] < 100 || odds[b] < 100)) continue;
      let p = rnd(odds[a]) * rnd(odds[b]); if (p > 0xFFFF) p = 0xFFFE;
      if (p >= lo && p < hi) rec.push({ p, a, b });
    }
  }
  function accept(catIdx, rec) {
    const k = rec.map(r => r.p), ids = rec.map((r, j) => j);
    if (rec.length >= 2) selSort(k, ids, rec.length, (a, b) => a < b);
    let n = 0;
    for (const j of ids) {
      const { a, b, p } = rec[j];
      if (total >= L[0] || n >= L[1 + catIdx]) continue;
      const lo = Math.min(a, b), hi = Math.max(a, b);
      if (picks.some(x => x.lo === lo && x.hi === hi)) continue;
      picks.push({ lo, hi, cat: catIdx, product: p }); total++; n++;
    }
  }
  let rec = []; collect(rec, p0.order, 0, 36); accept(0, rec);
  favCount = Math.min(total, 6);
  rec = []; collect(rec, p0.order, 30, 201); collect(rec, p1.order, 30, 201); accept(1, rec);
  rec = []; collect(rec, p0.order, 201, 0xFFFF, true); collect(rec, p1.order, 201, 0xFFFF, true); accept(2, rec);

  // brackets
  let bracketPicks;
  if (N <= 8) bracketPicks = picks.map(p => ({ lo: p.lo + 1, hi: p.hi + 1, cat: p.cat }));
  else {
    const map = BRACKETS[N]; bracketPicks = [];
    for (const p of picks) {
      const lo = map[p.lo], hi = map[p.hi];
      if (!bracketPicks.some(x => x.lo === lo && x.hi === hi)) bracketPicks.push({ lo, hi, cat: p.cat });
    }
  }

  const x = Math.min(total - favCount, 5), k = [0, 1, 2, 2, 3, 3][x];
  const commentary = { cat, headline: HEADLINES[cat], body: HEAD_BODY[cat], connector: CONNECT[CONNECT_T[k][cat]], follow: FOLLOW[k] };

  const weightsUsed = ITEMS.map((n, i) => ({ item: n, pct: pct(i) }));
  return { pass0: p0, pass1: p1, picks, bracketPicks, favCount, commentary, alt, weightsUsed, active };
}

function ruleMatches(ru, race) {
  if (ru.course !== 'any' && ru.course !== race.course) return false;
  if (ru.surface !== 'any' && (ru.surface === 'turf' ? 0 : 1) !== race.surface) return false;
  if (!ru.dist.includes(race.dist)) return false;
  if (ru.circuit === 'inner' && race.circuit !== 0) return false;
  if (ru.circuit === 'outer' && race.circuit === 0) return false;
  return true;
}

const api = { predict, ruleMatches, ITEMS, W_MAIN, BRACKETS };
if (typeof module !== 'undefined') module.exports = api; else root.BKV3 = api;
})(this);
