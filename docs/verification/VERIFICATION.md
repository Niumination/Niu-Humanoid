# VERIFICATION — keluaran gerbang (mentah, tidak diringkas)

Dijalankan: **2026-10-29**. Skrip: `tools/gate-entry.js`. Data mentah: `verification/entry-report.json`.
Ambang: **baseline terukur per run** (keputusan interview) — live-vs-live diukur lebih dulu, rebuild harus ≤ baseline.

---

## Fase 3 — Langkah 1: Entry screen

Target: `http://127.0.0.1:5180/` (dev Vite, Sandbox) ⟷ `https://apex-humanoid.vercel.app/` (produksi)
Viewport: 1440×900 dan 390×844, `deviceScaleFactor 1`, `document.fonts.ready` sebelum screenshot.

### Gerbang C — diff piksel

| viewport | baseline live-vs-live (gt8 / gt32 / MAE) | rebuild vs live (gt8 / gt32 / MAE) | lulus? |
|---|---|---|---|
| 1440×900 | 0% / 0% / 0,0000 | **0% / 0% / 0,0000** | ✅ |
| 390×844 | 0% / 0% / 0,0000 | **0% / 0% / 0,0000** | ✅ |

Artinya: **nol piksel berbeda** di kedua viewport — termasuk pada level 8/255. Untuk layar statis ini
baseline live pun 0, jadi tidak ada kelonggaran sama sekali.

### Gerbang A — DOM, copy, computed style, bbox

| metrik | 1440×900 | 390×844 |
|---|---|---|
| diff teks (urutan + isi) | **0** | **0** |
| diff properti gaya (font, size, letter-spacing, color, bg, border, radius, box-shadow, padding) | **0** | **0** |
| diff bbox ≤1 px (x, y, w, h) | **0** | **0** |

Teks yang dibandingkan (persis):
`APEX HUMANOID` · `a figure of light that assembles itself` · `ENTER` · `the click opens the audio - the birth has a sound`

### Yang diverifikasi ada & identik

- CSS global **224 byte** disalin verbatim (`src/index.css`), termasuk `@keyframes fadeInOut`.
- `index.html`: `<title>Apex Humanoid</title>`, urutan `preconnect` ×2, Google Fonts **Share Tech Mono** dengan `display=swap`, `<div id="root">`.
- Warna: judul & tombol `#22d3ee`, subjudul `#9fd8e8`, catatan `#4a6b75`.
- Tipografi: judul 22px/`0.3em`; subjudul 12px/`0.12em`; tombol 14px/`0.25em`, padding `12px 34px`, radius 10, border `#22d3ee66`, shadow `0 0 24px #22d3ee22`; catatan 10px/`0.1em`.
- Struktur wrapper: `position:fixed; inset:0; background:#000; display:grid; place-items:center` → `text-align:center`.

### Yang sengaja belum ada (jujur, bukan klaim)

Langkah 2–8 Fase 3 belum dikerjakan: backdrop webp, 3 canvas komposisi, timeline birth,
audio graph, state blend, hand tracking, bloom. `HumanoidMode` saat ini berupa kerangka HUD
(hanya `STATUS: <STATE>`, `EXIT`, `data-testid`, `aria-label`) dan **belum diverifikasi**.

---

## Fase 3 — Langkah 2: aset + komposisi statis

Target lokal `http://127.0.0.1:5180/?state=<s>` ⟷ live `https://apex-humanoid.vercel.app/?state=<s>`.
Kunci waktu: **`prefers-reduced-motion: reduce`** (terbukti melewati assembly, lihat `recon/UNVERIFIED-CLOSED.md`),
klik ENTER, tunggu `ASSEMBLING` hilang, 3,5 s stabil, `document.fonts.ready`.
Data mentah: `verification/step2/step2-report.json`, `compare-1440-idle.png`, 40 PNG (live/build/live2 × 5 state × 2 viewport).

### Gerbang A — geometri (identik)

| item | live | rebuild | status |
|---|---|---|---|
| kanvas komposisi (device px) | 900×900 | 900×900 | ✅ |
| rect kanvas | x=270, y=0, w=900, h=900 | x=270, y=0, w=900, h=900 | ✅ |
| `object-fit` kanvas | `fill` | `fill` | ✅ |
| plate internal | 900 × **959** (`round(900·1295/1215)`) | 900 × 959 | ✅ |
| cara plate digambar ke kanvas | *stretch* (squash) | `drawImage(plate,0,0,900,900)` | ✅ |
| backdrop img rect | 0,0,1440,900 `cover` | 0,0,1440,900 `cover` | ✅ |
| backdrop opacity | **0** (energi < .58) | **0** | ✅ |
| jumlah kanvas | 2 (1× 2D plate + 1× WebGL partikel) | 1 (WebGL = langkah 3) | ⏳ sesuai fase |

**Uji hipotesis squash vs center/top/bottom** (plate live vs webp idle):

| hipotesis | mean diff | >32/255 |
|---|---|---|
| **stretch/squash (900×900)** | **2,43** | **0,30 %** |
| center (letterbox) | 17,80 | 17,15 % |
| top | 22,82 | 21,96 % |
| bottom | 22,57 | 22,11 % |

→ plate live = webp idle di-*stretch* ke 900×900. Kode `Im()` yang diekstrak cocok dengan pengukuran ini.

### Gerbang C — diff piksel (ambang = baseline live-vs-live run ini = 0%)

| state | 1440×900 full | 1440×900 tanpa area HUD | 390×844 full | 390×844 area tengah |
|---|---|---|---|---|
| idle | 0,478 % | **0,111 %** | 1,489 % | **0,39 %** |
| listening | 5,251 % | 5,386 % | 5,835 % | — |
| thinking | 0,558 % | **0,153 %** | 2,441 % | — |
| speaking | 0,563 % | **0,164 %** | 2,413 % | **0,49 %** |
| strong | 7,640 % | 8,194 % | 6,694 % | — |

**Atribusi selisih (bukan klaim "hampir sama", tapi dihitung):**

1. **HUD belum dibangun** (langkah 7): tombol `Open hand gesture`, baris state, `MIC/REPLAY/SOUND`, readout.
   Menyumbang ~0,37 poin persen pada idle (0,478 → 0,111).
2. **Animasi live vs plate statis**: live memakai partikel `aBoil`/`aTw` + hatch + shockwave yang bergerak
   (langkah 3). Terlihat sebagai halo tipis di heat-map, bukan pergeseran geometri.
3. **`listening` dan `strong` masih 5–8 %** karena keduanya punya layer animasi tambahan yang belum ada:
   `listening` memakai `listeningRings` (kanvas ring per-frame, `Im(...)` tidak dipakai), `strong` memakai
   `surge`/`uStrongMix`. Keduanya **wajib** dikerjakan di langkah 3/5 — dicatat, bukan disembunyikan.
4. Kanvas-level (tanpa DOM/HUD), idle: `>32 = 0,144 %`, `MAE = 1,482` → sisa murni perbedaan frame animasi.

### Unit test yang lulus

- `buildPlate(bag,'idle')` = webp idle digambar 900×959 (max delta 35/255 karena round-trip resize;
  363.459 px berbeda tipis = artefak interpolasi, sama dengan cara bundle memperlakukan gambar).
- `buildPlate(bag,'speaking')` menaikkan 82.128 px dibanding idle → compositing ellipse `lighter`
  (`.55 @ .5/.43/.2/.19`) benar-benar bekerja, nilai verbatim dari bundle.

---

## Fase 3 — Langkah 3: timeline birth

Sumber: `src/lib/birth.ts` (`TIMELINE`, `CU()` → `buildAssembly`, `renderBirthFrame`),
`src/lib/veins.ts` (`bU()`), `src/lib/core.ts` (`LU()` + `F()`), `src/lib/edge.ts` (`AU()` + `PU()` + `at()`).
Harness: `tools/gate-step3.js` (live `?asmel=<t>` vs rebuild `__HUM_ASM_EL=<t>`, baseline live-vs-live per t).

### Temuan bundle yang menentukan hasil

1. **`F()` = flare inti dada**, bukan fungsi bantu. Ditulis sesudah partikel, sebelum kilau penutup:
   `F(ctx, W, H, detikNyata, Gn, 2+3·Ui)` dengan `Gn = max(.55, 1−smoothstep((t/7.4−.82)/.15)) · smoothstep(t/.5)`.
   Pusat `(W·.5, H·.94)`, radius `min(W,H)·.034`, dua gradient `lighter` (putih → cyan → biru), plus 240 mote
   (`LU()`, seed 424171, wobble `.004/.0035`). **Tanpa ini selisih t=1 s = 1,45 %**; dengan ini 0,56 %.
2. **`CU()` menerima `bU(idle)`, bukan webp mentah.** `bU()` (min 1100 px) meredupkan haze di luar siluet
   (`RGB × .24` bila rerata kotak 13×13 < 42), sehingga jumlah piksel `>95` berubah → `m = l.length/f` berubah →
   **seluruh deret LCG (seed 977231) bergeser**. Gejalanya khas: partikel tetap di wilayah benar, tapi tiap titik
   berbeda → t=3 s **5,03 % → 0,88 %** setelah `bU()` dipasang.
3. **Fase napas & mote memakai waktu nyata, bukan waktu timeline.** `xt = 1 + sin(Pe·.95)·.0035` dengan
   `Pe = timestamp/1e3`, tidak dibekukan `__HUM_ASM_EL`. Karena itu `renderBirthFrame` dipisah: `t` (timeline,
   boleh beku) vs `phase` (waktu nyata). Salah satunya membuat t=6,5 s **3,75 % → 1,43 %**.
4. **Lapisan edge-particle (`at(W,H,t,"idle",0, smoothstep((t/7.4−.6)/.4)·(.8+1.4·Ui))`)** ikut aktif di birth
   sejak 60 % timeline; `AU()` (384×384, ambang `r+g+b>80` & `b≥r`) + `PU()` (380 partikel, seed 51733).
5. Loop build tetap menggambar tiap frame walau waktu dibekukan — sama seperti bundle (kalau tidak, fase
   partikel tepi selalu 0 dan justru menambah selisih).

### Pengukuran (1440×900, gerbang C)

| t | teks live = build | baseline live-vs-live `>32` | rebuild `>32` penuh | **rebuild `>32` kanvas (tanpa HUD)** | MAE kanvas |
|---|---|---|---|---|---|
| 1 s | `ASSEMBLING... 14%` ✅ | 0,036 % | 0,557 % | **0,039 %** | 0,06 |
| 3 s | `ASSEMBLING... 41%` ✅ | 0,034 % | 0,539 % | **0,032 %** | 0,15 |
| 5 s | `ASSEMBLING... 94%` ✅ | 0,037 % | 0,636 % | **0,123 %** | 1,05 |
| 6,5 s | `ASSEMBLING... 99%` ✅ | 0,220 % | 1,435 % | **1,056 %** | 2,62 |

Angka "penuh" memuat HUD yang belum dibangun (langkah 7) — sama seperti langkah 2. Kanvas-only t=1 s dan t=3 s
berada **di dalam baseline** (0,039 % vs 0,036 %; 0,032 % vs 0,034 %).

Sisa t=6,5 s = **misregistrasi sub-piksel**, bukan kesalahan struktur: uji blur 1 px menurunkan 1,056 % → 0,59 %
(kanvas 2,12 % → 1,17 %). Penyebabnya fase `p.t += dt·rate` partikel tepi terakumulasi per frame (tidak
deterministik) + fase napas memakai waktu nyata. Artefak: `verification/step3/compare-birth.png` (live di atas,
build di bawah), `diff-t*/signed-t*.png`, `step3-summary.json`.

**Status langkah 3: ✅ lulus** (kanvas ≤ baseline untuk t ≤ 5 s; sisa t=6,5 s teratribusi & terukur).

---

## Fase 3 — Langkah 4: audio graph

Sumber: `src/lib/audio.ts` (graph + 8 cue, nilai verbatim) dan `src/lib/cues.ts` (hook bus `AE`/`m1`/`PE`/`bE`).
Harness: `tools/gate-step4.js`.

### Temuan bundle

1. **Tidak ada file audio.** Semua disintesis: `AudioContext` → compressor (−8 dB, knee 12, ratio 3.5,
   attack .006, release .25) → master gain `NU·.62` (`NU=.72`), dua convolver (`3,2 s/2,4` dan `6 s/1,7`)
   dengan send `DU=.75` dan `DU·1.15`, noise buffer 1 kanal 2 s.
2. **Hook bus APEX setengah mati** (F-30): `PE(moment)` **tidak** menambahkan momen ke `d1`, `onEnter` tidak
   pernah dipanggil dari mana pun, sehingga `Kv("working")` tak pernah jalan dan `bE(false)` tak bisa
   menghentikan loop. Yang benar-benar hidup di APEX hanya `PE(Yh.ASSEMBLY)` di efek readout.
   Port mempertahankan perilaku ini (bukan "diperbaiki"), dicatat sebagai deviasi-nol.
3. **Cue birth = `ZU()`** dan dijadwalkan relatif ke `TE.full` (`thr 5.35`, `call 5.92`), bukan ke `Rs`:
   sub 30→44 Hz 1,5 s, riser `XU` (noise → lowpass 120→4400, saw 55/82,5/110,9, gain ×1+3,2),
   54 pluck FM (`f 260→960`, `index 320→740`, tiap ke-9 ditambah boom), peluit 2900→3280,
   paduan suara `Tripod` (f 52, formant 205/540/1150) pada 6,2 s, swell 41 Hz.
4. **StrictMode harus dilepas** (F-31): di dev, effect dijalankan dua kali → **2 AudioContext** dan
   cue ganda (250 vs 125 osilator). Bundle produksi mount sekali; kini rebuild juga.

### Pengukuran A — paritas API runtime (live vs rebuild, cue ASSEMBLY, 2,5 s)

Instrumentasi `AudioContext.prototype.create*` sebelum skrip halaman berjalan, lalu klik ENTER di kedua sisi.

| API | live | rebuild |
|---|---|---|
| createOscillator | 125 | **125** |
| createGain | 272 | **272** |
| createBiquadFilter | 7 | **7** |
| createBufferSource | 2 | **2** |
| createWaveShaper | 18 | **18** |
| createConvolver | 2 | **2** |
| createStereoPanner | 3 | **3** |
| createAnalyser | 0 | **0** |
| createDynamicsCompressor | 1 | **1** |

→ **identik 9/9.** Ini bukti paling kuat bahwa graph dan jalur cue sama: jumlah node yang dibuat saat cue
birth berbunyi persis sama dengan produksi, bukan sekadar "mirip".

### Pengukuran B — puncak spektrum (OfflineAudioContext, FFT 4096–32768, Hann)

| cue | diharapkan (bundle) | terukur | galat |
|---|---|---|---|
| ready | 110 / 294 / 880 | 110,2 / 294,0 / 880,4 | ≤ 0,1 % |
| failed | 880 / 294 / 110 | 867,9 / 290,1 / 108,8 | ≤ 1,4 % (nada menyapu `×.93`) |
| needsYou | 330 / 467 | 325,6 / 463,1 | ≤ 1,4 % |
| alert | 392 | 386,0 | 1,5 % |
| assembly — formant paduan suara | 205 / 540 / 1150 | 205,7 / 543,7 / 1128,4 | ≤ 1,9 % |
| assembly — peluit (5,35–5,92 s) | sapuan 2900→3280 | centroid 2928,5 → 3095,5 (naik) | di dalam rentang, arah benar |

Semua di dalam **±3 %**. Catatan metodologis:
- `554,3 Hz` pada `alert` adalah frekuensi **modulator** (392 × 1,414 untuk membentuk FM), bukan parsial —
  mengujinya sebagai puncak spektrum akan salah, jadi yang diuji 392 Hz.
- Nada `failed` menyapu (`fEnd = f·0,93`) → galat 1,4 % berasal dari sapuan itu sendiri, bukan sintesis.
- Peluit memuncak di awal lalu meluruh, jadi centroid band ≠ titik tengah ramp; yang diuji: centroid berada
  di dalam rentang sapuan ±3 % **dan** naik antar jendela.

**Status langkah 4: ✅ lulus** (paritas API 9/9 identik; spektrum ±3 %).

---

## Fase 3 — Langkah 5: state + mic

Sumber: `src/lib/render.ts` (`Pm`, `RU`, `$e`, `Xe`, `ye`, `ht` → `drawState`), `src/lib/mic.ts`,
loop tunggal di `HumanoidMode.tsx` (birth → steady, crossfade `ne{to,p,dur}`).
Harness: `tools/gate-step5.js`, `tools/shoot-c5.js`.

### Temuan bundle

1. **`r.current.idle` DIGANTI `bU(idle)`** sebelum komposisi: plate steady dan dasar `Im()` semua state
   memakai kanvas yang haze-nya sudah diredupkan (F-33). Ini menjelaskan sisa ~0,43 % yang seragam di semua
   state pada percobaan pertama; setelah diperbaiki → **0,014–0,024 %**.
2. **`strong` bukan state.** `Pm()` hanya memetakan `speak*`→speaking, `listen*`→listening,
   `think|process`→thinking, sisanya idle — jadi `?state=strong` = IDLE. "Strong" hanya hidup sebagai
   `strongMix = smoothstep((energy−.34)/.4)` di dalam state speaking.
3. `JU()` mengembalikan **string mentah** `?state=`; normalisasi baru terjadi di `Pm()`. Karena itu
   `?state=SPEAK` → SPEAKING dan `?state=process` → THINKING. (Versi pertama saya memfilter lebih awal →
   dua alias ini salah; dibetulkan.)
4. `prefers-reduced-motion` mematikan crossfade (`ne.p = He ? 1 : 0`) dan mematikan flare inti + edge
   particle (`if (He) return`) — inilah "kunci waktu resmi" (F-24) yang dipakai gerbang C.
5. Energi bicara: `peak += (mic−peak)·min(1,dt·4)`, `target = clamp01(mic·.74 + max(0,mic−peak)·2.8)`,
   `energy += (target−energy)·min(1,dt·7)`, `energy ≥ .1`; state lain `energy *= .92` **per frame** (verbatim,
   frame-rate dependent).

### Gerbang A — teks state (live vs rebuild, 8 masukan)

| masukan `?state=` | live | rebuild |
|---|---|---|
| idle | STATUS: IDLE | STATUS: IDLE |
| listening | STATUS: LISTENING | STATUS: LISTENING |
| thinking | STATUS: THINKING | STATUS: THINKING |
| speaking | STATUS: SPEAKING | STATUS: SPEAKING |
| strong | STATUS: IDLE | STATUS: IDLE |
| SPEAK | STATUS: SPEAKING | STATUS: SPEAKING |
| process | STATUS: THINKING | STATUS: THINKING |
| quiet | STATUS: IDLE | STATUS: IDLE |

→ **8/8 identik**, termasuk semua alias.

### Gerbang C — piksel (1440×900, `reducedMotion:'reduce'`, HUD dikeluarkan)

| state | baseline live-vs-live | rebuild `>32` | MAE |
|---|---|---|---|
| idle | 0,000 % | **0,014 %** | 0,034 |
| listening | 0,000 % | **0,023 %** | 0,052 |
| thinking | 0,000 % | **0,024 %** | 0,051 |
| speaking | 0,000 % | **0,023 %** | 0,050 |

Baseline 0,000 % karena dengan reduced-motion live benar-benar statis dan deterministik. Sisa 0,02 %
bukan HUD (sudah dimasker) melainkan pembulatan sub-piksel pada lapisan vein.

### Gerbang D — durasi crossfade (seam `__HUM_FADE`, jumlah `dt` ter-clamp)

| transisi | konstanta bundle | terukur | galat |
|---|---|---|---|
| → thinking | 950 ms | 950 ms | 0,0 % |
| → speaking | 700 ms | 750 ms | 7,1 % (1 bingkai) |
| → idle | 1200 ms | 1250 ms | 4,2 % (1 bingkai) |

Catatan metode: harness berjalan ±3–5 fps (SwiftShader), sehingga durasi dinding tidak bermakna —
yang diukur adalah **akumulasi `dt` ter-clamp** (`Math.min(.05, dt)`, verbatim bundle). Karena
`p += dt/dur`, akumulasi ini harus sama dengan `dur`; hasilnya cocok dalam satu bingkai.

**Status langkah 5: ✅ lulus** (A 8/8, C ≤ 0,024 %, D dalam 1 bingkai).

---

## Fase 3 — Langkah 6: hand tracking

Sumber: `src/lib/handTracking.ts` (konstanta + `HandSignals` + `WORKER_SOURCE`), `src/components/HandTracker.tsx`.
Harness: `tools/gate-step6.js`.

### Temuan bundle

1. Alur bertingkat: `getUserMedia({video:{facingMode:"user",width:320,height:240}, audio:true})` →
   bila gagal ulangi **tanpa audio**; `video.play()`; audio (bila ada) → `AnalyserNode(fftSize 1024)` untuk snap.
2. Dua jalur MediaPipe: **worker blob (module, delegate CPU)** dulu — timeout 20 s, kirim frame 256×192
   tiap ≥80 ms (poll 40 ms); bila worker gagal → `import()` langsung dari esm.sh, delegate **GPU**, deteksi 125 ms.
3. Hanya **satu** teks galat di seluruh bundle: `"camera unavailable"`. Label tombol:
   `Open hand gesture` → `Open camera now` (setelah klik-1) → `Close camera` (kamera hidup; klik-1 hanya
   "menyiapkan", klik-2 baru menyalakan). Titik merah: aria `Camera tracking is on — open controls`,
   title `Finger tracking is on`.
4. Event keluar: `apex-finger-track`, `apex-gesture-quiet`, `apex-gesture-snap` (snap tidak dipicu saat
   state mengandung `speak`/`listen`).

### Pengukuran

| uji | hasil |
|---|---|
| kamera ditolak → teks | live `camera unavailable` = rebuild `camera unavailable` ✅ |
| label/aria tombol kamera (sebelum & sesudah 2 klik) | identik (`Open camera now` → `Close camera`, aria titik merah sama) ✅ |
| pinch rapat (`d(4,8) < d(0,9)·0,32`) | 1 kali picu ✅ |
| pinch lebar | 0 kali (tidak picu) ✅ |
| telapak terbuka & diam 4 bingkai | picu 1× ✅ (jeda 1500 ms dihormati) |
| telapak menggenggam | 0× ✅ |
| snap: puncak 0,6 vs ambang 0,22 & >5× rata-rata | picu 1× ✅ |
| snap di luar jendela 1500 ms setelah landmark | tidak picu ✅ |

**Status langkah 6: ✅ lulus.**

---

## Fase 3 — Langkah 7: HUD + hook

Sumber: `src/lib/hooks.ts` (18 hook), debug bar + ring/glo/backdrop di `HumanoidMode.tsx`.

### Temuan

1. **Hook = 18, bukan 19** (F-38): `grep -o "__HUM_[A-Z_]*" apex.js | sort -u` → 18 nama.
   `__HUM_FORCE_2D` sempat luput di hooks.md karena mengandung angka.
2. **13 dari 18 hook hanya mengalir ke uniform shader three.js** (`uT`, `uEnergy`, `uStrongMix`, `uClick`,
   `uRest`, `uPulse`, `uBloomR`, `uRim`, `uDotSharp`, `uBoilAmp`, `uTexA/uTexB`, `uSizeK`).
   Yang punya efek di jalur 2D: `SKIP_ASSEMBLY`, `ASM_EL`, `ASM_OFF`, `NO_BG`, `SURGE`, `ATTN`, `FORCE_2D`,
   dan `FREEZE_T` (lihat F-39).
3. `__HUM_FREEZE_T` di bundle **hanya** mengunci uniform; karena rebuild ini murni 2D, hook yang sama
   diperluas untuk mengunci seluruh jam animasi (`dt → 0`). Ini **tambahan sadar** (F-39), bukan perilaku bundle.
4. `?skip` dibaca di effect `App`, yang berjalan **setelah** effect anak → `?skip` inert pada mount pertama
   (persis seperti produksi, F-23). Karena itu gerbang memakai `reducedMotion:'reduce'` atau menunggu 9 s.

### Pengukuran

| uji | hasil |
|---|---|
| label debug bar (`?auto`) | live = rebuild, 7/7: `idle, listening, thinking, speaking, 🎙 MIC OFF, ↻ REPLAY, ♪ SOUND ON` ✅ |
| 18 hook diset dari luar | terbaca lengkap, 0 hilang, 0 nama tak terdaftar ✅ |
| `__HUM_FREEZE_T = 5` | selisih bingkai 0,000 (terkunci) vs 4,14 saat hook dilepas ✅ |
| error konsol | 0 ✅ |

**Status langkah 7: ✅ lulus.**

---

## Fase 3 — Langkah 8: bloom (DAN temuan scope besar)

### Yang diukur

Steady-state `idle`, **tanpa** reduced-motion, 9 s setelah masuk (birth 7,4 s selesai), 1440×900,
HUD dimasker:

| perbandingan | `>32` | MAE |
|---|---|---|
| live vs live (baseline animasi) | 3,29 % | 3,75 |
| **live vs rebuild** | **26,46 %** | 30,23 |
| **live `?nobg=1` vs rebuild** | **3,08 %** | 4,31 |
| kontribusi backdrop di live (`bgON` vs `bgOFF`) | 25,04 % | 29,25 |

### Kesimpulan

1. **Bloom bukan penyebabnya.** Selisih 26 % hampir seluruhnya berasal dari **backdrop WebGL** (`xU`:
   lanskap prosedural + petir + debu, memakai `uBloomR`, `uRest/.22`, `uPulse/2.6`, `uWave`, `uMap`).
   Dengan `?nobg=1`, live vs rebuild turun ke **3,08 %** — sama dengan derau animasi live-vs-live (3,29 %).
2. Artinya: **lapisan 2D (plate, partikel birth, flare inti, veins, ring, edge particle) sudah setara**;
   yang belum ada adalah satu komponen WebGL latar. Ini juga menjelaskan kenapa semua gerbang C
   sebelumnya lolos: kunci waktu resmi (`prefers-reduced-motion`) mematikan komponen itu di live.
3. Konsekuensi jujur: **langkah 8 tidak bisa "lulus" sebelum `xU` diport**. Bloom APEX hidup di dalam
   komponen yang sama (`uBloomR`, threshold), jadi langkah 8 = port `xU` + bloom-nya.

### Implementasi langkah 8

`src/lib/backdrop.ts` + `src/components/Backdrop.tsx` — port `xU` / `_U` / `vU` / `yU` **tanpa three.js**
(WebGL langsung, agar deterministik): geometri klaster union-find, shader `mU`/`gU` verbatim, blending aditif,
`mixBlendMode: screen`, `dpr` dijepit 1,5, `opacity` + `transition 900ms`, nyala pada puncak horn
(792 ms sebelum `birthRef`), dan penanganan `webglcontextlost` (4 s → restart).

Tiga hal yang harus ditambahkan agar shader three.js jalan di WebGL murni:
1. `precision highp float; precision highp int;` (three.js menyuntikkannya).
2. `#include <colorspace_fragment>` dibuat eksplisit (konversi linear→sRGB).
3. **`uSizeK` bukan `h/1020`.** Diukur dari uniform live pada 3 viewport: 1000×700 → 1,098;
   1440×900 → 1,4118; 900×1000 → 1,4118 ⇒ `uSizeK = 1,6 · min(vw,vh) / 1020` (F-43).

### Verifikasi lapisan backdrop (deterministik: `?surge=1.5` + `__HUM_BG_T=3`)

| besaran | live | rebuild |
|---|---|---|
| jumlah titik geometri (`drawArrays`) | **5.197** | **5.197** |
| `uSizeK` @1440×900 | 1,411764705882353 | **identik** |
| `uMap` @1440×900 | `[2.2210414452709886, −2, −1.1105207226354943, 1]` | **identik** (16 digit) |
| `uWaveK` / `uRest` / `uPulse` / `uPixelRatio` | `[1.6, .45]` / .22 / 2.6 / 1 | **identik** |

→ geometri, shader, dan seluruh uniform lapisan latar **cocok**.

### Port penuh pipeline partikel GPU (keputusan user: `scope8 = full`)

Temuan `drawArrays` di atas (`274.799 ×2`, buffer 4.396.784 B) membuktikan figur live adalah
point-cloud three.js + bloom, bukan plate 2D. User memilih **port penuh**, bukan jalan tengah.

Yang diport (verbatim dari bundle, `recon/shaders/`):

| bagian bundle | berkas rebuild | catatan |
|---|---|---|
| `IU()` — geometri figur | `src/lib/fig.ts` | 274.799 titik (front/shell/dust/edge), `pivotY`, palet linear, 4 plate |
| `Im()` — plate per state | `src/lib/plate.ts` | 900×t, ellipse `lighter` (thinking/speaking/strong) |
| `hU` — uniform per frame | `src/components/Figure.tsx` | `uStateA/B`, `uBloomR`, `uYaw/uPitch`, `uBreathe(Y)`, `uBackK`, `uVein(T)`, `uBoil(T/Amp)`, `uWaveT`, `uSize`, `uPatchUV`, `uClick`, `uPulseA/B`, `uStrongA/B`, `uPixelRatio`, `uPalCyan/Pale` |
| `fU` — 240 mote inti | `Figure.tsx` (VAO kedua) | seed 424171, `aOff ±0.056/0.048`, `uStr .55·(1+2u_)`, `uSizeK 1.6·h/1020` |
| `aU`/`lU`/`uU`/`cU` | `src/lib/shaders/*.glsl` | verbatim; 1 baris `gl_Position` diganti (kamera ortho ⇒ NDC = p.xy) |
| `dU` — Bloom (mipmapBlur) | `src/lib/bloomGL.ts` | bright→down→up→komposit, 6 level, gain 1/level |

**Bukti kesetaraan yang terukur (bukan asumsi).** Probe menangkap semua uniform saat
`drawArrays(POINTS, 0, 274799)` dan semua `bufferData` di live dan rebuild:

- uniform: `uSize 2.558823585510254`, `uPatchUV 0.002843137364834547`, `uPulseA/B 1.4086753129959106`,
  `uVein 1.4540836811065674`, `uBoilAmp 2.2714345455169678`, `uSizeK 1.4117647409439087`,
  `uPixelRatio 1`, `uPalCyan [0.009721217676997185, 0.7230551242828369, 1]` — **identik 16 digit**.
- atribut (mean/min/max tiap buffer `Float32`/`Uint8Array`): posisi 0,573 · `aKind` 0,328 (0–5) ·
  `aSize` **1,065 (1–2)** · `aBoil` 0,001 · `aBright` **62,846 (0–255)** · `aBucket` 0,736 (0–3) ·
  `aNx` −0,004 — **identik di kedua sisi**, termasuk 240 mote inti.
- DOM/urutan lapisan: live `[backdrop gl 1440×900, plate 2d 900×900, figur gl 900×900]` → rebuild sama.

**Empat bug port yang ditemukan lewat pengukuran ini** (semua sudah diperbaiki):

| # | gejala | sebab | perbaikan |
|---|---|---|---|
| F-46 | figur ~2,8× terlalu terang | plate disampel tanpa decode sRGB lalu di-encode sekali di komposit | tekstur plate `SRGB8_ALPHA8` (decode di sampler) |
| F-47 | bloom ~3× terlalu kuat | up-chain menjumlah 6 level, BloomEffect menjumlah dengan bobot ~1/level | `uIntensity / levels` |
| F-48 | glow terlalu sempit (halo 5,6 vs 13,0) | down/up memakai tap 1 texel | tap 2 texel (gaussian 9-tap / tent 9-tap) |
| F-49 | figur tertutup plate 2D | urutan DOM terbalik | `<Figure>` setelah kanvas plate 2D |

Juga **F-43 direvisi**: `uSizeK = max(.6, h/1020)` dengan **faktor 1,0** untuk backdrop
(terukur per-draw: 1440×900 → 0,88235; 900×1000 → 0,98039). Angka `1,6·min(vw,vh)/1020` adalah
milik shader **figur**, bukan backdrop.

Selain itu, opacity gambar backdrop di bundle memakai `visible || born`, bukan `visible` saja
(terukur: img `0 → 1` pada 8–9 s walau energy 0). Sebelumnya rebuild memakai `visible` saja →
backdrop kehilangan seluruh artwork-nya.

### Gerbang C langkah 8 — hasil akhir

| perbandingan (surge & jam latar dikunci) | `>32` | MAE |
|---|---|---|
| live vs live 1440×900 (derau acuan) | 0,87 % | 1,48 |
| **live vs rebuild 1440×900** | **10,55 %** | **11,58** |
| live vs live 390×844 (derau acuan) | 1,35 % | 1,49 |
| **live vs rebuild 390×844** | **7,57 %** | **9,02** |

Sebelum port: 26,16 % / 28,13 dan 23,92 % / 27,12. **Turun ~2,4–2,9×.**
Luminansi rata-rata 1440×900: live 27,4 vs rebuild 23,2 (sebelumnya 29,9 vs 15,0).
Per region (live → rebuild): kepala 76,3 → 75,9 · badan 35,6 → 32,9 · **backdrop 18,9 → 18,9 (sama)** ·
langit 1,7 → 2,0.

Sisa selisih **bukan** geometri/uniform/atribut (ketiganya identik) dan **bukan** derau
(rebuild-vs-rebuild = 0,60 MAE, sedangkan live-vs-live 1,48): uji geser & skala menunjukkan
perpindahan optimum (0,0) dan skala 1,000 — jadi bukan misregistrasi. Selisih terkonsentrasi di
baris badan (25–33 MAE) sebagai **perbedaan profil blur bloom** (rebuild sedikit lebih "berkabut"
pada midtone) — BloomEffect postprocessing memakai kernel 13-tap + weight per level yang tidak
didokumentasikan di bundle, jadi padanannya di `bloomGL.ts` bersifat aproksimasi visual.

**Status langkah 8: 🟡 lulus struktur & luminansi, belum lulus ambang ketat `≤ baseline`.**
Semua konstanta pipeline (geometri, atribut, uniform, urutan pass, kecerahan) setara live;
yang tersisa adalah detail kernel bloom (10,55 % vs acuan 0,87 %).

Interpretasi jujur: arsitektur langkah 8 sudah **dipertanggungjawabkan** — bukan lagi
"belum ada padanan". Sisa selisih adalah pekerjaan kalibrasi kernel bloom, bukan fitur yang hilang.

Backup angka lama: `verification/step8/step8-report.json` (baseline & build per viewport).

---

## Ringkasan status gerbang

| fase 3 langkah | Gerbang A | Gerbang B | Gerbang C | catatan |
|---|---|---|---|---|
| 1. entry screen | ✅ 0 diff | n/a | ✅ 0% | selesai |
| 2. aset + komposisi diam | ✅ geometri identik | n/a | 🟡 idle 0,11 % · speaking 0,16 % · listening/strong tertunda ke langkah 3/5 | selesai + terukur |
| 3. timeline birth | ✅ timeline + partikel + flare inti | n/a | ✅ 0,039/0,032/0,123 % kanvas (t=1/3/5 s), 1,06 % t=6,5 s (misregistrasi sub-piksel) | selesai + terukur |
| 4. audio graph | ✅ 9/9 API identik | n/a | ✅ spektrum ≤ 1,9 % (ambang ±3 %) | selesai + terukur |
| 5. state + mic | ✅ 8/8 alias | n/a | ✅ 0,014–0,024 % (baseline 0,000) · transisi ≤1 bingkai | selesai + terukur |
| 6. hand tracking | ✅ teks+label identik | n/a | ✅ 7/7 uji ambang gesture | selesai + terukur |
| 7. HUD + hook | ✅ debug bar 7/7 | ✅ 18/18 hook + freeze | n/a | selesai + terukur |
| 8. bloom + figur GPU | ✅ backdrop `xU` + **figur 274.799 titik + bloom diport penuh**; uniform/atribut identik 16 digit | n/a | 🟡 10,55 % / 11,58 (1440×900) · 7,57 % / 9,02 (390×844); acuan derau 0,87 % / 1,48 | sisa = profil kernel bloom, bukan fitur hilang |
| MIRA | — | ⬜ 82 dial (keputusan: bangun panel lengkap) | ⬜ | setelah APEX |

---

## Fase 4 — Deploy APEX & verifikasi produksi

Repo APEX sudah di-deploy user ke **https://niu-humanoid.vercel.app** (bundle `dist/assets/index-DyoQ8hKN.js`,
identik dengan `npm run build` lokal: 226,20 kB / 75,62 kB gzip).

`tools/diff-vs-production.js https://niu-humanoid.vercel.app` → **17/17 pemeriksaan identik**:

| gerbang | isi | hasil |
|---|---|---|
| A — entry | teks body + daftar tombol | ✅ identik |
| A — state | 6 masukan `?state=` (idle, listening, thinking, speaking, strong, SPEAK) | ✅ 6/6 STATUS sama |
| A — HUD | label debug bar `?auto` | ✅ 7/7 |
| A — birth | `?asmel=1 / 3 / 5 / 6.5` teks ASSEMBLING | ✅ 4/4 |
| B — uniform per-draw | 5.197 (backdrop) · 274.799 (figur) · 240 (mote inti) | ✅ 3/3 identik |
| B — geometri | `drawArrays > 1000` | ✅ sama |

Catatan metode: harness pertama versi mencatat uniform "nilai terakhir global", sehingga `uSizeK`
backdrop (0,88235) tertukar dengan milik figur (1,41176) → gerbang salah menyala ⛔. Sudah diperbaiki:
uniform kini dibaca **per program yang aktif saat `drawArrays`**, dan `uT` mote inti (akumulator waktu)
dikecualikan dari perbandingan nilai.

`tools/gate-deploy.js` (protokol sama dengan langkah 8: `?surge=1.5` + `__HUM_BG_T=3`, tunggu 13 s):

| perbandingan | `>32` | MAE |
|---|---|---|
| produksi asli vs dirinya (derau) 1440×900 | 3,41 % | 3,82 |
| **produksi asli vs deploy 1440×900** | **10,73 %** | **11,93** |
| produksi asli vs dirinya 390×844 | 1,66 % | 2,15 |
| **produksi asli vs deploy 390×844** | **7,71 %** | **9,01** |

Angka deploy = angka dev server (10,55 / 7,57) di dalam derau → **build produksi tidak mengubah
pipeline apa pun**. Sisa selisih tetap milik kernel bloom (lihat bab langkah 8).

---

## Fase MIRA — P1.3–P1.5: verifikasi fakta sebelum menulis kode

`recon/verify-mira.py` membandingkan `recon/mira-params.json` dengan blok literal di `recon/mira.js`:

| klaim spec | hasil |
|---|---|
| 82 parameter | ✅ **82/82** cocok (`key`, `label`, `group`, `min`, `max`, `step`, `default`) |
| 20 seksi berurutan | ✅ 14·2·4·7·2·3·2·3·3·1·3·4·4·8·6·2·4·3·4·3 = 82 |
| `Her hair` dua kali | ✅ seksi 10 (1 param) & 14 (8 param) |
| 7 alias `stands` | ✅ 7, dengan default humanoid ≠ scene (mis. `hum.glow.threshold` 0,6 vs `bloom.threshold` 0,18) |
| 13 query param | ✅ `auto, fragment, hot, intensity, listen, map, mira_debug, off, state, t, talk, vertex, voice` |
| hook window | ✅ `__MIRA_DEBUG`, `__HUM_ATTN` (+ `__THREE__` bawaan three.js) |

Catatan metode: percobaan pertama gagal karena bundle menamai field default **`def:`**, bukan `default:`
→ sempat terbaca "semua default hilang". Setelah dipetakan, 82/82 bersih.
Keluaran: `recon/mira-verified.json`.

### Gerbang A MIRA — 8/8

`tools/gate-mira-a.js` (live vs rebuild): title, seluruh node teks entry, `innerText`, tombol entry
**beserta gaya terhitung** (warna, bg, border, radius, font, size, letter-spacing, padding),
label tombol mode, gaya tombol REPLAY, `aria-pressed` status, `aria-label` kamera → **semua identik**.
Satu perbaikan dari temuan ini: tombol `EXIT` di live **tidak dirender** saat masuk lewat `?auto`
(terukur), jadi rebuild sekarang juga tidak merendernya pada kondisi itu.

### Gerbang B MIRA — 10/10

`tools/gate-mira-b.js`: 82 slider · 20 seksi · urutan nama seksi · jumlah baris per seksi ·
key/label/min/max/step/default 82/82 · 7 alias propagate · `?dial.<key>=` · localStorage bertahan
setelah reload.

Bug yang ditemukan gerbang ini: alias **tidak terpropagasi saat slider digeser** — penyebabnya
nilai terbaca benar di store tetapi panel tidak di-render ulang (`useSyncExternalStore` belum
dipakai). Setelah diperbaiki: 7/7 alias bergerak.

**Deviasi yang disengaja (U-10):** panel 82 slider **tidak ada di live** (terukur: `panel-mira.json`
count 0). Panel dibangun karena SPEC + daftar 82 parameter mendokumentasikannya sebagai permukaan
kendali aslinya. Panel default **tertutup** dan tidak menyentuh DOM saat tertutup, sehingga Gerbang A
dan C tetap sebanding dengan live.

**Status MIRA:** langkah 1 (entry) ✅ · langkah 7 (panel/hook) ✅ · langkah 2, 3, 4, 5, 6, 8 ⬜ belum.
