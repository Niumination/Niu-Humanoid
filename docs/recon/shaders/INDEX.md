# INDEKS SHADER — hasil P3 (Fase 1.3)

Diekstrak ulang dengan `resolve_shaders.py` (rekonstruksi ekspresi konkatenasi) lalu diklasifikasi
dengan `CLASSIFY.json`. Semua file **verbatim** (escape JS sudah di-decode), termasuk komentar aslinya.

## Ringkasan angka

| target | assignment GLSL di bundle | unik | identik dengan bundle lain (vendor) | APP (custom aplikasi) | belum terklasifikasi |
|---|---|---|---|---|---|
| apex | — | 66 | 62 | 4 | 0 |
| mira | — | 88 | 62 | 15 | 11 |

**Kunci klasifikasi:** shader yang teksnya **identik di kedua bundle** = pustaka vendor
(three.js builtin + postprocessing). Shader aplikasi dikenali dari uniform khas app atau komentar niat desain.

## apex

| file | peran (dugaan berbasis uniform+komentar) | grup | byte | uniform | atribut |
|---|---|---|---|---|---|
| `01-vert-8504b-aU.glsl` | utama | Partikel humanoid (aBoil/aBucket/aBright, blend uStateA/B + uBloomR, palet cyan/pale) | 8570 | 7 | 7 |
| `11-vert-1727b-mU.glsl` | utama | Starfield + vein: mode aTw (1=wandering star, .5=vein breath, 0=glitter), shockwave uWave | 1793 | 4 | 3 |
| `17-frag-1357b-lU.glsl` | utama | Fragmen sprite titik: "THE TILE" — sampling artwork uTexA/uTexB/uTexS di posisi rest | 1423 | 2 | 0 |
| `21-vert-1146b-uU.glsl` | utama | Mote "ESCAPE-AND-RETURN" (round 8): lompat radial + jatuh kembali, alpha ikut terbang | 1212 | 1 | 2 |

## mira

| file | peran (dugaan berbasis uniform+komentar) | grup | byte | uniform | atribut |
|---|---|---|---|---|---|
| `00-frag-14287b-cN.glsl` | utama | FIELD shader layar-penuh: hash/noise/fbm/domain-warp, membrane+ridge, iAlpha/iField/iMatter | 14353 | 14 | 0 |
| `03-vert-5061b-Jk.glsl` | build | Matter (build): aFly/aTArr/aTRev/aTurns, core uCore+uShock, TRAIL copy via uLag/uTrail | 5127 | 5 | 7 |
| `05-frag-4333b-Qk.glsl` | utama | WIRE line frag (uTaper/uHot/uSketchBright) — aturan NO BLUNT CUTS + HOT-then-own-colour | 4399 | 6 | 0 |
| `08-frag-3007b-Nk.glsl` | utama | RIBBON near-orb (sections 12-13): satu tepi lipat terang, badan transparan memudar | 3073 | 3 | 0 |
| `09-frag-2599b-sF.glsl` | gambar | Gambar dirinya + reveal (uReveal/uShock) + head cut (uHeadOn/uHeadCut) | 2665 | 11 | 0 |
| `14-frag-1919b-hF.glsl` | gambar | Debu/grain di atas gambar (dibobot nilai tembus-pandang gambar) | 1985 | 5 | 0 |
| `21-vert-1360b-Zk.glsl` | utama | WIRE line vertex: strip segitiga (aDir/aS/aLen/aId/aSketch/aEnd/aF) + kepala menoleh | 1426 | 3 | 9 |
| `24-vert-1258b-fF.glsl` | rambut | Shell rambut/kepala 3D (aKind/aRest/aZ, uStep/uPxPerPic/uBackK/uRim/uZRef) | 1324 | 1 | 3 |
| `36-frag-947b-nF.glsl` | efek | Fragmen depan gelombang (uShock/uShockW) | 1013 | 2 | 0 |
| `38-frag-929b-Yw.glsl` | efek | Kilat: flash → drop out → re-strike → fade (beat sama dengan lib/miraBuild flicker) | 995 | 1 | 0 |
| `46-frag-793b-ak.glsl` | rambut | Pulse cahaya turun di helai rambut (uLifted/uPulse/uPulseSpeed) | 859 | 3 | 0 |
| `52-vert-755b-T_.glsl` | rambut | Zona rambut terkait kepala (uHz/uHzSkull/uHzInner) | 821 | 2 | 0 |
| `55-frag-707b-oF.glsl` | gambar | Gambar + reveal versi ringkas (uFill/uMap/uReveal) | 773 | 5 | 0 |
| `67-vert-416b-$0.glsl` | efek | Displacement gelombang (uShock/uShockW) | 482 | 2 | 0 |
| `72-vert-377b-A_.glsl` | gambar | Titik reveal (uReveal) | 443 | 1 | 0 |

**Belum terklasifikasi** (perlu tinjauan; tidak memakai uniform app yang dikenal):

- `22-vert-1338b-NN.glsl` — 1404B, uniform: uCore, uCoreT
- `54-vert-712b-iF.glsl` — 778B, uniform: uHalfPx, uRes
- `58-frag-633b-rF.glsl` — 699B, uniform: uCol, uHead, uTail, uLen, uCorePx, uHalfPx, uSoft, uOn
- `65-vert-450b-pN.glsl` — 516B, uniform: uTime, uPx
- `70-vert-388b-ik.glsl` — 454B, uniform: uTime, uSway
- `73-vert-344b-qw.glsl` — 410B, uniform: -
- `75-frag-326b-uk.glsl` — 392B, uniform: uOn, uSpark
- `76-frag-313b-mN.glsl` — 379B, uniform: uColor, uOpacity
- `77-frag-309b-$k.glsl` — 375B, uniform: -
- `80-vert-291b-rh.glsl` — 357B, uniform: uFace
- `86-frag-260b-sk.glsl` — 326B, uniform: uGain, uOn, uMap, uSize


## Shader APP yang belum diberi nama peran (perlu tinjauan Fase 2)

- `mira/22-vert-1338b-NN.glsl` — 1404B; uniform: uCore, uCoreT; atribut: -
- `mira/54-vert-712b-iF.glsl` — 778B; uniform: uHalfPx, uRes; atribut: aDir, aS
- `mira/58-frag-633b-rF.glsl` — 699B; uniform: uCol, uHead, uTail, uLen, uCorePx, uHalfPx, uSoft, uOn; atribut: -
- `mira/65-vert-450b-pN.glsl` — 516B; uniform: uTime, uPx; atribut: aPhase, aSize
- `mira/70-vert-388b-ik.glsl` — 454B; uniform: uTime, uSway; atribut: -
- `mira/73-vert-344b-qw.glsl` — 410B; uniform: -; atribut: aCol, aStr, aT, aU, aW
- `mira/75-frag-326b-uk.glsl` — 392B; uniform: uOn, uSpark; atribut: -
- `mira/76-frag-313b-mN.glsl` — 379B; uniform: uColor, uOpacity; atribut: -
- `mira/77-frag-309b-$k.glsl` — 375B; uniform: -; atribut: -
- `mira/80-vert-291b-rh.glsl` — 357B; uniform: uFace; atribut: -
- `mira/86-frag-260b-sk.glsl` — 326B; uniform: uGain, uOn, uMap, uSize; atribut: -
