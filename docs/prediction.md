# How Bakenoh V3 (馬券王V3) predicts races

Asmik, 1993, Game Boy. This is the complete algorithm, decoded from the cartridge (bank 1, `01:5800`–`01:7800`;
data entry in bank 0). A JavaScript port lives in [`src/engine.js`](../src/engine.js). It was checked against the original
game running in the recompiled build: **120 random races, identical scores, rankings, picks and commentary**
(test harness in [`test/`](../test/)).

---

## In plain terms

Every horse gets a single score: a starting value from its past results, plus or minus points for each piece of data you enter. The highest score is the predicted winner.

1. **Starting mark.** Every horse starts with points from its last four races and its record at today's distance.
   A G1 counts far more than a maiden race, and a big win counts more than a narrow one.
   *Probable reason: the newspaper form guide was the most reliable data a 1993 punter had.*
2. **A ruler.** The field's average starting mark ÷ 9 becomes the value of "one point" in this race.
   *Probable reason: a +2 bonus then means the same in a race of champions as in a race of maidens.*
3. **Plus and minus points** for everything else you enter: training, jockey, paddock, your newspaper marks,
   sex and age for the distance, best distance and track type, odds, heavy-ground form, and so on. Each is worth
   about −3 to +4 points, multiplied by the weight you set for that item (0–300%).
   *Probable reason: hand-tunable tables that run fast on a 4 MHz Game Boy.*
4. **Track knowledge.** Hand-written rules per racecourse: closers do well at Tokyo and struggle at Nakayama,
   inside draws help at Hanshin, a lone front-runner holds on, and the widest draws suffer in big fields.
   *Probable reason: this is the "expert" content the box sold on, the same wisdom as the on-screen course tips.*
5. **Rank, then pair up.** Horses are sorted by total. A second scoring pass drops the starting mark and leans
   on today's signals. Pairs inside the top six of both lists are sorted by price (the product of the two odds)
   into favorite, mid-price and longshot picks.
   *Probable reason: quinellas (馬連, introduced 1991) and bracket quinellas (枠連) were the popular bets,
   and splitting picks by price gives a sensible spread.*
6. **A sentence to finish.** Many horses within 20% of the leader means "wide open"; a leader far ahead means
   "a safe bet". The number of non-favorite picks decides whether a big payout is promised.

When there's a juvenile in the field or the race is in the lowest class, a second weight table switches nearly
everything off except jockey, marks and odds.
*Probable reason: those horses have too little history to trust.*

---

## 1. Inputs (WRAM, saved per file in SRAM)

`i` = horse index 0..17, horse number = i+1 = draw order.

| WRAM | Meaning | Encoding |
|---|---|---|
| C651 | runners | value + 5 (5..18) |
| C652 | racecourse | 0 Tokyo, 1 Nakayama, 2 Kyoto, 3 Hanshin, 4 Sapporo, 5 Hakodate, 6 Fukushima, 7 Niigata, 8 Chukyo, 9 Kokura, 10 Other |
| C653 | race | 0–15 G1s, 16–44 G2s, 45 "¥15M+ class", 46 "¥9M and under". Preset rows at `0x3F63` |
| C64C | distance class | 0 short (≤1600 m), 1 mid (1700–2200 m), 2 long (≥2300 m) |
| C64D | surface | 0 turf, 1 dirt |
| C64E | direction | 0 left, 1 right |
| C64F | circuit | 0 inner, 1 outer, 2 single |
| C650 | weight rule | 0 set weights, 1 allowance, 2 weight for age, 3 handicap |
| CC2A | track condition | 0 firm, 1 good to soft, 2 soft, 3 heavy |
| C64B | input mode | bit 0: 1 = simple |
| CC2B..CC34 | question items, 1 = off | names, sex/age, distance record, course record, racecourse record, fresh record, training, body weight, marks, paddock |
| C62F..C63B | item weight levels (0..10, default 5) | see §3 |
| C750 / C762 | sex / age | sex 0 colt, 1 filly; age = old count − 3 (0 = juvenile) |
| C774 | jockey | 0..60 (60 = other), 61 = unset |
| C786 | weight carried | kg − 40 |
| C798 | running style | 0 front-runner, 1 stalker, 2 closer, 3 deep closer, 4 versatile |
| C7AA+16i | distance record | columns short / mid / long / heavy track, each [1st, 2nd, 3rd, unplaced] 0..15 |
| C8CA+16i | course record | L-turf / L-dirt / R-turf / R-dirt |
| C9EA+4i | record at this racecourse | |
| CB0A+4i | record when fresh | first run after a layoff |
| CA32+12i | last 4 races, oldest first | [class 0..10, finish 0..17, margin in tenths of a second, 15 = 1.5 s+]. Class: G1, G2, G3, Open, ¥15M, ¥9M, ¥5M, maiden, debut, other, 10 = layoff |
| CB52 | training | 0 very poor .. 4 very good |
| CB64 / CB76 / CB88 / CBAC | body weight: last race / winning range low / high / today | kg − 390, 0 = not entered |
| CB9A | mark | 0 none, 1 ◎, 2 ○, 3 △, 4 × |
| CBBE / CBD0 / CBE2 | paddock excitement / sweat / coat | 0..2, default 1 |
| CBF4+2i | win odds | ×10, word |
| CC18 | scratched | |

## 2. Pipeline (`01:5800`)

```
pass 0 -> commentary category -> keep ranking R0
pass 1 -> keep ranking R1
picks: category 0 (favorite), 1 (mid-price), 2 (longshot)
```

Each pass (`5C35`):
1. Compute the base score B[i] (§4) and the scale `U = max(10, floor(floor(ΣB / N) / 9))`.
   N = entered runners, scratched horses included.
2. Pass 0 starts from B[i]; pass 1 starts from 0.
3. Add the 34 per-horse factors (§5), then the race-wide passes (§6).
4. Drop scratched horses and sort by score, descending. This is a selection sort, not stable.

Scores are 16-bit signed. Point helpers:
- `add(E,item)`: `score += trunc(s16(E·U) · pct(item) / 100)`
- `addU(E)`: `score += E·U`, no weight
- `addD(E)`: like addU, but E is doubled in pass 1

## 3. Item weights (`67B4`)

Items:

| id | item | id | item |
|---|---|---|---|
| 0 | sex/age | 7 | racecourse record |
| 1 | running style | 8 | recent form |
| 2 | jockey | 9 | body weight |
| 3 | marks | 10 | training |
| 4 | heavy-track record | 11 | win odds |
| 5 | distance record | 12 | paddock |
| 6 | course record | | |

**How the % is looked up.** `pct = table[(2·level + 22·item) & 0xFF]`:
- **Normal table:** 0, 10, 20, 30, 60, **100**, 120, 150, 200, 250, 300 for every item.
- **Alternate table:** used when race id ≥ 46 (¥9M and under) or any runner is a juvenile.
  - Jockey, marks and odds get 100–300% in steps of 20.
  - Everything else gets 0% (10% at the top three levels).

**Bug:** the `& 0xFF` wraps. Paddock reads item 0's row shifted by four, so its default is **250%**.
Odds at levels 7–10 read 0–30%.

## 4. Base score (`6B09`)

```
recScore(cells,item) = trunc((n==0 ? 15 : floor((5000·1st+2500·2nd+1000·3rd+250·unpl)/(2n+9))) · pct(item)/100)
distance part = question off ? 0
              : pass 0 or simple ? recScore(today's distance column, 5)
              : floor(Σ three distance columns / 3)
form part     = for each of the 4 races: A = T1[class][min(finish,6)]
                                         B = won ? T3[class][margin<=0.2] : T2[class][M2[margin]]
                                         sum += floor(A/d) + floor(B/d)      (d = 3 for a beaten debut run, else 2)
                class-upgrade rule: a ¥9M..other race followed by a win in a higher class counts as that class
                form = trunc(floor(sum / [1,11,13,15,17][races run]) · pct(8) / 100)
B = (distance + form) >> 1
```

Tables T1/T2/T3 and their low-class variants are in [`src/engine.js`](../src/engine.js).
Example: winning a G1 by 0.3 s is worth 6000 + 6000. Winning a maiden race is worth about 100.

## 5. Per-horse factors

| # | Routine | Item | Points (pass 0 / pass 1) |
|---|---|---|---|
| P00 | 66DC | heavy track | Only on soft or heavy turf, or heavy dirt. No record: −3 / −1. Has placed: record score ÷3 / ÷5. Only unplaced runs: 0..−8 / 0..−4 by count |
| P01 | 65E5 | course record | Each column's record score ÷4 / ÷2 for today's course type, ÷10 / ÷5 for the others (others skipped in simple mode). **Bug:** right-dirt checks for a left-handed race |
| P02 | 65A4 | racecourse | record score ÷10 / ÷5 |
| P03 | 6543 | training | very poor..very good: −3, −1, 0, +1, +3 / −8, −3, 0, +3, +8. Coming off a layoff adds −3, −1, 0, 0, 0 / −6, −3, −1, 0, 0 |
| P04 | 6454 | fresh record, unweighted | Only after a layoff. Compares win and place rates. **Bug:** the top bonus can't be reached |
| P05 | 63CF | paddock excitement | −1, 0, +1 / −3, 0, +3 |
| P06 | 6402 | paddock sweat | heavy −1, a little 0, none −1 / −3, 0, −3 |
| P07 | 642B | paddock coat | −1, 0, +1 / −3, 0, +3 |
| P08 | 63AB | weight carried, unweighted | handicaps only: (kg − 56), halved in pass 0, if positive |
| P09 | 637A | marks | none, ◎, ○, △, ×: −1, +3, +2, +1, 0 / 0, +1, +1, +1, +1 |
| P10 | 613E | sex & age | table by distance × age × sex. Peak at age 5 (old count); fillies lose points over longer trips |
| P11 | 6080 | best distance | best column matches today: +2 / +4, otherwise −1 / −2 |
| P12 | 60D3 | best course type | same as P11. Minor original bug in the max tracking |
| P13 | 5DFB | jockey | 8-byte rating at `0x5E90`: base + surface + style + distance (all ratings in `src/data.json`) |
| P14 | 5D41 | body weight | Intended: ±1..±8 by weight change and winning range. **Bug:** both comparisons read an address, not the value, so it's always +3/+2 (Open class or better in the last 4) or +2/+1 |
| P15–P32 | 718F–73CE | course bias, unweighted, doubled in pass 1 | style rules (table below) |
| P33 | 7433 | unweighted | handicap on soft/heavy ground: weight carried exactly 40 kg gets +1 (probably a slip) |

### Course rules

Unweighted, doubled in pass 1. "Inside" = horse numbers 1–3; "outside" = the last 3 numbers.

| Course | Surface | Condition | Effect |
|---|---|---|---|
| Tokyo | turf | – | closers and deep closers +1 |
| Tokyo | turf | not long | inside +1 |
| Tokyo | turf | not short | outside +1 |
| Tokyo | dirt | – | inside +1 |
| Nakayama | turf | – | closers −1 |
| Kyoto | turf | inner circuit, short | stalkers +1, outside +1 |
| Kyoto | turf | inner circuit, mid/long | stalkers +1 |
| Hanshin | turf | – | inside +1; stalkers and deep closers +1 |
| Chukyo | turf | – | outside +1; stalkers and deep closers +1 |
| Chukyo | turf | mid | stalkers +1 |
| Chukyo | dirt | mid | inside +1 |
| Chukyo | dirt | short/long | inside +1, outside +1, stalkers +1 |
| Sapporo, Hakodate, Fukushima | turf | – | stalkers and deep closers +1 (Fukushima also inside +1) |
| Niigata | turf | short | closers +1, deep closers +1 |
| Niigata | turf | inner | stalkers +1 |
| Niigata | turf | outer | closers +1 |
| Kokura | turf | mid | closers +1 |
| Kokura | turf | short/long | front-runners and stalkers +1 |
| any | any | short | closers +1 |
| any | any | exactly one front-runner entered | that horse +1, +2 in long races |

## 6. Race-wide passes

| Routine | What it does |
|---|---|
| R00 628E | **Popularity**, item 11, pass 0 only. Ranks the field by odds. The favorite half gets +(⌈N/2⌉−1)..0 and the outsider half 0..−(⌊N/2⌋−1). **Bug:** the tie check always compares the same middle pair |
| R01 6218 | **Big fields**, unweighted. With 12+ starters, horse numbers 1, 2 and the last two lose 1–3; numbers 3, 4 and the 3rd/4th from last lose 1–2 |
| R02 61D1 | **Firm dirt**, item 9. The 5 lightest horses lose 4..0 / 8..1 |
| R14 73E5 | **Marks clash**, item 1. If ◎ and ○ share a running style, both lose 1 / 2 |
| R15 7453 | **Soft ground**, unweighted. Front-runners at 6th favorite or longer get +1 |
| R16 7490 | **Underrated favorite**, unweighted. ◎ or ○ under 5.1× odds with a score below 75% of the average gets +16. **Bug:** unsigned compare, so negative scores never qualify |

## 7. Outputs

- **Finishing order:** the top 5 of pass 0.
- **Hidden debug mode** (Up ×6, Down ×2, Up ×2): shows every score, then the pass 1 list.
- **Picks** (`590A`):
  - Candidates are the 15 rank pairs inside the top 6.
  - `price = round(oddsA) × round(oddsB)`.
  - Favorite: pass 0 pairs with price < 36.
  - Mid-price: pass 0 and pass 1 pairs with price 30–200.
  - Longshot: both horses at 10.0× or more and price ≥ 201.
  - Each group is sorted by price and de-duplicated. Limits [total, fav, mid, long]:

    | | ≥11 starters | fewer |
    |---|---|---|
    | normal | 14, 5, 8, 2 | 12, 4, 6, 1 |
    | narrowed | 10, 4, 6, 1 | 8, 3, 4, 0 |

- **Brackets:** with 9+ runners, horse numbers map to brackets 1–8 by the JRA table for the field size. Duplicate pairs are dropped.
- **Commentary** (`5B57`), with t = top score / 5:

  | Horses within t of the top | Headline |
  |---|---|
  | 6+ | Wide open! |
  | 3–5 | Neck and neck! |
  | otherwise, if s2 − t < s3 | As expected! |
  | otherwise, none and s2 ≤ top − 2t | A safe bet! |
  | otherwise | The favorite's race! |

  "Upset brewing!" is in the ROM but can never be chosen. The connector and payout sentence come from the number of non-favorite picks.
- **Course tip:** a G1 uses table `0x3190` by race. Otherwise the tip is `table_314E[6·course + 3·surface + distance]`. The English tips per course and race are in `src/data.json`.

## 8. Original-game bugs

Reproduced in "1993 cartridge" mode and fixed in "Bugs fixed" mode.

1. **Body weight ignored** (P14 `5DC3`/`5DE4`): a missing `LD A,(HL)` compares pointer high bytes instead of values.
2. **Weight index wraps at 8 bits**: paddock defaults to 250%, and odds collapse at high levels.
3. **Right-dirt course record** (`66AD`) tests for a left-handed race.
4. **R16** uses unsigned maths on signed scores.
5. **R00** tie check is stuck on one pair.
6. **P04** subtraction is the wrong way round, so the best fresh-record bonus is unreachable.
7. **P12** doesn't update the maximum when right-dirt is best.
8. **P33** checks for exactly 40 kg.
9. **Scratched horses** are still ranked in R00/R02/R15, and "Upset brewing!" is unreachable.
10. **Jockey list:** Ishibashi's name starts one byte before the table base (0x3BD9).
