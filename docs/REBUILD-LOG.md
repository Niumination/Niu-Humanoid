# REBUILD-LOG — catatan temuan, koreksi, dan deviasi

Semua yang menyimpang dari spec **dicatat di sini**, tidak disembunyikan.
Tanggal kerja: **2026-10-29** (Asia/Jakarta). Target belum dibangun: dokumen ini baru berisi temuan + keputusan.

---

## 1. Status fase

| fase | status | artefak |
|---|---|---|
| P0 normalisasi recon | ✅ selesai | `recon/*-index.clean.html`, `recon/verify-spec.py` (patch), audit checksum |
| P1 Fase 0 audit | ✅ selesai | `recon/asset-list.json`, `recon/asset-dims.json` |
| P2 Fase 1.1–1.2 | ✅ selesai | `recon/ui-copy.{apex,mira}.txt`, `recon/ui-copy.json`, `recon/css-inline.apex.txt` |
| P3 Fase 1.3 shader | ✅ selesai | `recon/shaders/` (26 APP + 124 vendor), `INDEX.md`, `CLASSIFY.json`, `resolve_shaders.py` |
| P4 Fase 1.4–1.5 | ✅ selesai | `recon/params-verified.md`, `recon/hooks.json`, `recon/hooks.md` |
| P5 Fase 1.6–1.7 | ✅ selesai | `recon/audio/`, `recon/timings.json` |
| P6 Fase 1.8–1.9 | ✅ selesai | `recon/ground-truth/` (73 artefak) + `README.md` |
| P7 Fase 2 | ✅ selesai | `recon/ARCHITECTURE.md` |
| P8 Fase 3 implementasi | ⬜ belum | — |
| P9 Fase 4 verifikasi | ⬜ belum | — |
| P10 deliverable | ⬜ belum | — |

---

## 2. Koreksi terhadap spec (bundle/live menang)

| # | Spec bilang | Kenyataan terukur | Sumber |
|---|---|---|---|
| K-1 | HTML live 646 B | arsip Drive 813 B karena **injeksi Cloudflare Rocket Loader** (`type="<hash>-module"` + `/cdn-cgi/scripts/…`) | `diff` arsip vs live |
| K-2 | `verify-spec.py` → 193/193, exit 0 | crash `NameError: sys`; sebenarnya **191/193** (2 gagal = blok HTML akibat K-1) | eksekusi skrip |
| K-3 | SPEC-APEX mendokumentasikan 18 hook | bundle punya **19**: ada `__HUM_BG_T` | regex `window.__` |
| K-4 | SPEC-MIRA mendokumentasikan 3 hook debug | bundle punya **20 query param APP** (termasuk `?off=`, `?t=`, `?dial.*`) + 2 global | `hooks.json` |
| K-5 | Gerbang B = 82 slider di DOM | **panel tidak dirender** di live (0 `input[type=range]`) | `ground-truth/mira/panel-mira.json` |
| K-6 | `?skip` melewati assembly | `?skip` hanya menggeser `t0`; readout `ASSEMBLING... NN%` tetap muncul | 5 shot state APEX |
| K-7 | `?auto` melewati entry | tidak; entry APEX hanya hilang setelah klik | 5 shot state APEX |
| K-8 | `STATUS: SPEAKING  INTENSITY: HIGH` | runtime: `STATUS: SPEAKING` (tanpa INTENSITY) | `S-speaking.json` |
| K-9 | Ambang Gerbang C 0% piksel > 32/255 | live-vs-live pada kondisi beku: **3,06%**, MAE 3,76 | `_repro-a/b.png` |

## 3. Temuan lapangan

**F-1** arsip HTML tercemar (lihat K-1) — diperbaiki: `*-index.clean.html` (646 B) + `verify-spec.py` dinormalisasi → **193/193, exit 0**.

**F-2** `verify-spec.py` crash (lihat K-2) — diperbaiki: `import sys` + normalisasi HTML.

**F-3** tidak ada drift artefak. `sha256` identik arsip vs live:

```
apex.js  5db1866887110e43b6d56212feb873095d5445fb6572917db942ed7ee17dc294   (1.108.884 B)
mira.js  8fe5c2f2bd861d7f0d022bc640cb06c318ed977bcd101bb0786e9a5e56bbe245   (1.185.588 B)
apex.css 5fb4bccac68818da674027ce742cbb54ef6e3807ecd7a7d5300efb917fab0842   (224 B)
mira.css b40f80353cb5a6fc0b07faca5a5d224ed99b10e6c71b9cc2ce8eef20cead4533   (574 B)
assets/*.webp — 10/10 identik dengan live
```

**F-4** gap dokumentasi MIRA: 20 query param APP vs 3 yang didokumentasikan (lihat K-4). **Ditutup** di `hooks.md`.

**F-5** sandbox tidak punya browser saat audit. **Ditutup**: Chromium 1134 + 9 paket apt dipasang (butuh `sudo`),
SwiftShader WebGL2 berjalan (`WebGL 2.0 (OpenGL ES 3.0 Chromium)`), render visual terbukti benar.

**F-6** `__HUM_BG_T` (lihat K-3). **Ditutup** di `hooks.md`.

**F-7** nol drift (lihat F-3).

**F-8** entry APEX wajib klik (lihat K-7).

**F-9** `?skip` bukan skip (lihat K-6).

**F-10** teks status "INTENSITY: HIGH" belum terbukti muncul (lihat K-8) → **U-1**.

**F-11** panel 82 slider tidak dirender (lihat K-5) → **U-10**, keputusan produk diperlukan.

**F-12** `?dial.<key>=<nilai>` + persistensi localStorage ditemukan. Ini **menambah** kemampuan uji Gerbang B
dan tidak ada di spec mana pun. Bukti: `for (const [X,j] of URLSearchParams) X.startsWith("dial.") && rN(X.slice(5), Number(j))`.

**F-13** `__HUM_FREEZE_T` **tidak** membekukan semua gerak APEX. Dua shot identik: `>8/255 = 5,21%`,
`>32/255 = 3,06%`, MAE 3,76, bbox 400..1132 × 34..862. Penyebab paling mungkin: `uT` dibekukan tapi
`__HUM_BG_T`, `uBoilT/uVeinT/uWaveT`, dan animasi CSS (`humRingBase/Pulse`, `fadeInOut`) tetap berjalan;
plus waktu *load* berbeda (backdrop/tekstur siap pada frame berbeda).
→ **Keputusan:** ambang Gerbang C untuk APEX = **baseline terukur live-vs-live** (bukan 0%). Baseline harus
diukur ulang setiap kali Gerbang C dijalankan, karena bergantung pada frame saat shot.

**F-14** state `strong` tidak bisa dipaksa via `?state=strong`.

**F-15** PRNG: APEX **deterministik** — Lehmer `x = x*16807 % 2147483647` dengan seed
`424171`, `48271`, `977231`, `51733`, `3311` (5 titik). MIRA **tidak**: 43 pemanggilan `Math.random()`,
banyak di region aplikasi → posisi partikel/garis MIRA tidak akan pernah bit-identik.

**F-16** Aset MIRA dipakai sebagai **mask**: `<img>` sumber `mira-idle-v1.webp` ber-`filter: brightness(0)` dan
`opacity: 0`; mesh memakai tekstur yang sama. `?off=cutwhite` mengganti filter ke `brightness(0) invert(1)`.

**F-17** Jumlah shader APP jauh lebih besar dari yang diperkirakan spec (yang hanya menampilkan 1 cuplikan):
APEX **4**, MIRA **26** (+ 11 belum bernama peran). Metode ekstraksi "regex satu template literal" di prompt
**gagal** — shader dirakit lewat konkatenasi (`A+B+C+…`) dan sebagian dihasilkan programatik.
Lihat `recon/resolve_shaders.py`.

**F-18** Timing APEX ditemukan sebagai dua tabel literal: `Rs={total:7.4, ignition:6.2, hornPeak:6.2+3.2*.19}`
dan `TE={full:{con:.34, chk:1.55, thr:5.35, call:5.92, set:10.1, end:13.1}}`.
Crossfade state = **950 ms** (`dur:.95`), bukan 140/900 ms saja.

---

## 4. Deviasi yang diterima (akan dibawa ke `VERIFICATION.md` nanti)

| # | deviasi | alasan | bukti |
|---|---|---|---|
| D-1 | Gerbang C APEX tidak bisa 0% | live sendiri tidak reproducible (F-13) | `_repro-a/b.png` |
| D-2 | Area prosedural MIRA tidak bit-identik | `Math.random()` (F-15) | 43 call-site |
| D-3 | Panel MIRA: keputusan belum diambil | live tidak merender panel (F-11) | DOM runtime |

---

## 5. `// UNVERIFIED` yang masih terbuka

Daftar lengkap: `recon/ARCHITECTURE.md` §11 (U-1 … U-10).
Ringkas: U-1 teks INTENSITY · U-2 state strong · U-3 fungsi persen assembly · U-4 nilai SPEED ·
U-5 11 shader tanpa nama · U-6 arti `?voice/?talk/?listen` · U-7 daftar state valid MIRA ·
U-8 3 class CSS tak terpakai · U-9 PRNG MIRA · U-10 keputusan panel.

---

## 6. Sesi lanjutan — penutupan UNVERIFIED + Fase 3 langkah 1

**U-1, U-3, U-4, U-7 TERTUTUP** (detail: `recon/UNVERIFIED-CLOSED.md`):

- U-1: `STATUS: SPEAKING  INTENSITY: HIGH` muncul hanya bila `state === "speaking"` **dan** energi audio `> 0.58`
  (dipoll tiap 180 ms). Bukan dari `__HUM_ENERGY` → perlu audio nyata.
- U-3: readout awal `ASSEMBLING... 25%`, update tiap **160 ms**, `Math.min(99, Math.round(p*100))`,
  kosong saat p≥1; efek dilewati bila `prefers-reduced-motion: reduce` **atau** `__HUM_SKIP_ASSEMBLY`.
- U-4: `SPEED` hanya dua nilai, **1** ⇄ **0.3**.
- U-7: `Jw = [["idle","IDLE"],["listening","LISTENING"],["talking","TALKING"]]` → 3 state.

**Koreksi kunci waktu (menggantikan F-8/F-9):**

- **F-19** `?skip` **INERT** di build live: `window.__HUM_SKIP_ASSEMBLY` tetap `undefined` sebelum & sesudah klik,
  walaupun baris `i.get("skip")&&(window.__HUM_SKIP_ASSEMBLY=!0)` ada di bundle. `?bgrest` & `?surge` bekerja normal.
  → Rebuild tetap mengimplementasikan perilaku *kode* (bukan bug runtime), dicatat sebagai deviasi perilaku.
- **F-20** `prefers-reduced-motion: reduce` **melewati assembly sepenuhnya** → `STATUS: IDLE` langsung.
  Ini kunci terbersih untuk screenshot state; `?asmel=<t>` terbukti **membekukan** timeline (bukan sekadar memotret).

**Fase 3 langkah 1 (entry screen) — LULUS:**

- Gerbang A: 0 diff teks, 0 diff gaya, 0 diff bbox (>1 px), di 1440×900 dan 390×844.
- Gerbang C: **0% piksel beda > 8/255** dan **MAE 0,0000** di kedua viewport; baseline live-vs-live juga 0.
- Repo: `apex-humanoid-rebuild/` (Vite + React 18.3.1 + TS), `tsc --noEmit` bersih, dev server port 5180.
- Bukti mentah: `verification/entry-report.json`, `verification/entry/<viewport>/{live-a,live-b,live-c,local}.png`.

---

## 7. Sesi lanjutan — Fase 3 langkah 2 (aset + komposisi statis)

**F-21 — geometri komposisi APEX (terukur, bukan asumsi):**
kanvas komposisi live = **900×900 device px** di rect `x=270,y=0,w=900,h=900`, `object-fit: fill`.
Plate internal = **900 × 959** (`round(900 · 1295/1215)`), lalu **di-stretch** ke 900×900.
Uji hipotesis: stretch → `>32 = 0,30 %`; center → 17,15 %; top → 21,96 %; bottom → 22,11 %.
Kode `Im()` hasil ekstraksi cocok dengan pengukuran ini.

**F-22 — backdrop `opacity` = 0 pada state idle/thinking.**
`<img backdrop-v1.webp>` ada di DOM (rect penuh, `object-fit: cover`) tapi transparan; ia menyala hanya
saat energi audio > 0,58 (timer 180 ms yang sama dengan teks `INTENSITY: HIGH`).
Akibat penting: **seluruh HUD APEX tidak tampil** di screenshot live manapun yang kami rekam
(tidak ada `Open hand gesture`, baris state, `MIC/REPLAY/SOUND`, `STATUS`) — termasuk tombol
`Open camera now`/`Close camera`/`Finger tracking is on` yang belum pernah muncul di runtime.

**F-23 — `?skip` di rebuild vs live.** Rebuild mengimplementasikan perilaku *kode* (`__HUM_SKIP_ASSEMBLY`
di-set, assembly dilewati), sedangkan live tidak bereaksi (F-19). Ini deviasi yang **disengaja**:
kita setia pada kode sumber yang terbaca, bukan pada bug runtime. Dicatat di `VERIFICATION.md`.

**F-24 — kunci waktu resmi Gerbang C = `prefers-reduced-motion: reduce` + klik ENTER.**
Bukan `?skip`, bukan `?asmel`. Dipakai di semua shot langkah 2.

**Hasil langkah 2:** geometri identik; `idle` 0,111 % dan `speaking` 0,164 % piksel beda > 32/255
(setelah area HUD dikeluarkan); sisa selisih teratribusi: HUD (langkah 7), animasi partikel (langkah 3),
layer `listeningRings`+`surge` (langkah 3/5).

---

## 8. Langkah 3 — timeline birth (7,4 s)

**File baru:** `src/lib/birth.ts` (sebelumnya; timeline + `CU()`), `src/lib/veins.ts` (`bU()`),
`src/lib/core.ts` (`LU()` + `F()`), `src/lib/edge.ts` (`AU()` + `PU()` + `at()`).

| # | temuan | dampak |
|---|---|---|
| F-25 | `F()` adalah **flare inti dada** (`(W·.5, H·.94)`, radius `min(W,H)·.034`, `lighter`, 240 mote) dan dipanggil **hanya di cabang birth** — bukan saat idle. | t=1 s 1,45 % → 0,56 % |
| F-26 | `CU()` diberi **`bU(idle)`**, bukan webp. `bU()` meredupkan haze (`×.24`) → jumlah piksel `>95` berubah → `m=l.length/f` berubah → deret LCG (seed 977231) bergeser seluruhnya. | t=3 s 5,03 % → 0,88 % |
| F-27 | Napas plate (`1+sin(Pe·.95)·.0035`) + goyangan mote memakai **waktu nyata `Pe`**, tidak ikut beku oleh `__HUM_ASM_EL`. Parameter `t` dan `phase` harus dipisah. | t=6,5 s 3,75 % → 1,43 % |
| F-28 | Edge particles `at()` aktif sejak 60 % timeline (`AU()` 384×384 + `PU()` seed 51733, 380 partikel). Loop build harus tetap menggambar tiap frame saat waktu dibekukan. | paritas fase |
| F-29 | Sisa t=6,5 s (1,06 %) = misregistrasi sub-piksel (blur 1 px → 0,59 %), bukan cacat struktur. | dicatat, bukan disembunyikan |

**Hasil langkah 3:** teks `ASSEMBLING... 14/41/94/99 %` identik di semua titik; kanvas-only `>32` = 0,039 / 0,032 /
0,123 / 1,056 % untuk t = 1 / 3 / 5 / 6,5 s (baseline live-vs-live 0,036 / 0,034 / 0,037 / 0,220 %).

---

## 9. Langkah 4 — audio graph

**File baru:** `src/lib/audio.ts`, `src/lib/cues.ts`. **Deviasi sadar:** `React.StrictMode` dilepas di `main.tsx`.

| # | temuan | dampak |
|---|---|---|
| F-30 | Hook bus APEX setengah mati: `PE()` tidak memasukkan momen ke `d1`, `onEnter` tak pernah dipanggil → `working` loop tak pernah mulai, `bE(false)` tak bisa menghentikan loop. | port setia; bukan "diperbaiki" |
| F-31 | StrictMode (dev-only) menjalankan effect 2× → 2 AudioContext + cue ganda (250 vs 125 osilator). | StrictMode dilepas |
| F-32 | Cue birth dijadwalkan terhadap `TE.full` (`thr 5.35`, `call 5.92`), bukan `Rs.total` (7,4 s). Peluit 2900→3280 berada di 5,35–5,92 s. | jadwal cue benar |

**Hasil langkah 4:** paritas API runtime live vs rebuild **9/9 identik** (125 osilator, 272 gain, 7 filter,
2 buffer, 18 waveshaper, 2 convolver, 3 panner, 0 analyser, 1 compressor); puncak spektrum semua cue
di dalam ±3 % (terbesar 1,9 % pada formant 1150 Hz).

---

## 10. Langkah 5 — state + mic

**File baru:** `src/lib/render.ts`, `src/lib/mic.ts`. **Loop tunggal** di `HumanoidMode` (birth → steady).

| # | temuan | dampak |
|---|---|---|
| F-33 | `r.current.idle` DIGANTI `bU(idle)` → plate steady + dasar `Im()` semua state memakai kanvas haze-redup. | 0,433 % → **0,014–0,024 %** |
| F-34 | `strong` bukan state: `Pm()` memetakannya ke idle; strong hidup hanya lewat `strongMix`. | `?state=strong` = IDLE di kedua sisi |
| F-35 | reduced-motion: `ne.p=1` (tanpa crossfade) + `if (He) return` pada core/edge particle. | dipakai sebagai kunci waktu gerbang C |
| F-36 | `energy *= .92` per frame (bukan per detik) — verbatim, frame-rate dependent. | dipertahankan apa adanya |
| F-37 | `JU()` mengembalikan string mentah; normalisasi di `Pm()`. | alias SPEAK/process benar |

**Hasil langkah 5:** teks state 8/8 identik (termasuk 3 alias); piksel 0,014/0,023/0,024/0,023 %
(baseline live-vs-live 0,000 %); durasi crossfade 950/750/1250 ms vs konstanta 950/700/1200 ms
(semua dalam satu bingkai `dt`-clamp 50 ms).

---

## 11. Langkah 6 — hand tracking

**File baru:** `src/lib/handTracking.ts`, `src/components/HandTracker.tsx`.

| # | temuan | dampak |
|---|---|---|
| F-40 | Dua jalur MediaPipe: worker blob (CPU, frame 256×192, ≥80 ms) lalu fallback `import()` (GPU, 125 ms). Satu-satunya teks galat: `camera unavailable`. | port apa adanya |
| F-41 | Klik kamera bertingkat: klik-1 `oe(!0)` = "menyiapkan" (label → `Open camera now`), klik-2 `re(Q=>!Q)` baru menyalakan. | sempat salah (langsung menyalakan) → dibetulkan |

**Hasil langkah 6:** teks galat identik saat kamera ditolak; label/aria tombol identik;
7/7 uji ambang gesture lulus (pinch rapat/lebar, telapak buka/tutup + jeda 1500 ms, snap dalam/ luar jendela).

## 12. Langkah 7 — HUD + hook

**File baru:** `src/lib/hooks.ts`. **Tambahan HUD:** ring image (`toBlob` listeningRings), glow "horn",
backdrop visibility, debug bar 7 tombol.

| # | temuan | dampak |
|---|---|---|
| F-38 | Hook `__HUM_*` = **18**, bukan 19 (hooks.md salah hitung; `__HUM_FORCE_2D` luput karena angka). | daftar hook = 18, semua terbaca |
| F-39 | `__HUM_FREEZE_T` di bundle hanya mengunci uniform shader. Diperluas (sadar) untuk mengunci seluruh jam animasi 2D. | gerbang C mendapat kunci waktu yang benar-benar deterministik |
| F-42 | 13 dari 18 hook shader-only (tidak punya sasaran di jalur 2D). | didokumentasikan, bukan diabaikan |

**Hasil langkah 7:** label debug bar 7/7 identik dengan live; 18/18 hook terbaca; freeze: selisih bingkai
0,000 vs 4,14 saat dilepas; 0 error konsol.

## 13. Langkah 8 — bloom: scope sebenarnya (temuan besar)

Pengukuran steady-state tanpa reduced-motion: **live vs rebuild 26,46 %**, tetapi **live `?nobg=1` vs
rebuild 3,08 %** (baseline animasi live-vs-live 3,29 %). Jadi 25 % dari selisih itu = **komponen backdrop
WebGL `xU`** (lanskap prosedural + petir + debu; di sanalah `uBloomR`, `uRest/.22`, `uPulse/2.6`,
`uWave`, `uMap` hidup). Bloom **tidak** terpisah dari komponen itu.

Konsekuensi: langkah 8 = port `xU` + bloom-nya. Semua gerbang C sebelumnya lolos karena kunci waktu resmi
(`prefers-reduced-motion`) mematikan komponen itu di live — bukan karena kebetulan.

---

## 14. Langkah 8 — backdrop xU diport; sisa selisih = pipeline partikel GPU

**File baru:** `src/lib/backdrop.ts` (`vU` geometri + shader `mU`/`gU`), `src/components/Backdrop.tsx` (`xU`/`_U`/`yU`).

| # | temuan | dampak |
|---|---|---|
| F-43 | `uSizeK` di bundle `max(.6, r.height/1020)` — `r.height` r3f **bukan** tinggi CSS. Diukur dari uniform live di 3 viewport ⇒ `1,6·min(vw,vh)/1020`. | ukuran titik latar kini identik |
| F-44 | three.js menyuntik `precision` + `<colorspace_fragment>`; di WebGL murni keduanya harus ditulis manual. | shader identik secara numerik |
| F-45 | Figur humanoid di live = **point cloud GPU 274.799 titik** (`drawArrays` 274799) + bloom pass; bukan bagian dari langkah "bloom". | sisa selisih 23–26 % tidak bisa ditutup oleh langkah 8 saja |

**Hasil langkah 8 (backdrop):** jumlah titik live = rebuild = **5.197**; `uSizeK`, `uMap`, `uWaveK`,
`uRest`, `uPulse`, `uPixelRatio` identik; selisih 26,16 % (1440×900) / 23,92 % (390×844) tersebar
merata termasuk area langit → milik lapisan glow/partikel GPU, bukan backdrop.

---

## 15. Langkah 8 lanjutan — port penuh pipeline partikel GPU + bloom (keputusan user `scope8=full`)

User memilih **port penuh** (bukan bloom-2D jalan tengah, bukan berhenti di paritas backdrop).

**File baru:** `src/lib/fig.ts` (port `IU()`), `src/lib/plate.ts` (`Im()`), `src/lib/bloomGL.ts` (WebGL2),
`src/lib/shaders/{aU,lU,uU,cU}.glsl` (verbatim), `src/components/Figure.tsx` (port `pU`+`hU`+`fU`+`dU`).
**File yang diubah:** `HumanoidMode.tsx` (mount `<Figure>` setelah plate 2D), `Backdrop.tsx` (uSizeK + opacity img).

| # | temuan | dampak |
|---|---|---|
| F-43 (revisi) | `uSizeK` backdrop = `max(.6, h/1020)` **faktor 1,0** (1440×900 → 0,88235; 900×1000 → 0,98039). Angka `1,6·min(vw,vh)/1020` adalah milik shader **figur**. | ukuran titik backdrop akhirnya tepat |
| F-46 | Tekstur plate harus **sRGB-decode** (`SRGB8_ALPHA8`); tanpa itu encode tunggal di komposit membuat figur 2,8× terang | luminansi kepala 168,6 → 91,7 |
| F-47 | Up-chain bloom menjumlah 6 level; BloomEffect menjumlah dengan bobot ~1/level ⇒ gain `1/levels` | glow wajar |
| F-48 | Down/up pass 1 texel terlalu sempit (halo 5,6 vs 13,0) ⇒ tap 2 texel, gaussian 9-tap / tent 9-tap | halo 14,3 vs 13,0 |
| F-49 | Urutan DOM: di bundle kanvas WebGL figur **setelah** kanvas 2D dan opak. Salah urutan = figur tertutup plate | struktur DOM 1:1 (`[backdrop gl, plate 2d, figur gl]`) |
| F-50 | `img` backdrop memakai `opacity = (visible || born) ? 1 : 0` — terukur 0 → 1 pada 8–9 s walau energy 0. Sebelumnya rebuild memakai `visible` saja | artwork backdrop muncul |

**Bukti kesetaraan (probe, bukan asumsi):** seluruh uniform saat `drawArrays(n=274799)` identik 16 digit
(`uSize 2.5588235`, `uPatchUV 0.0028431374`, `uPulse 1.4086753`, `uVein 1.4540837`, `uBoilAmp 2.2714345`,
`uSizeK 1.4117647`, palet linear); seluruh `bufferData` identik statistiknya
(`aSize` 1–2 mean 1,065 · `aBright` 0–255 mean 62,846 · `aBucket` 0–3 mean 0,736 · `aKind` 0–5 mean 0,328).

**Hasil:** gerbang C langkah 8 turun dari 26,16 %/28,13 (1440×900) dan 23,92 %/27,12 (390×844) menjadi
**10,55 % / 11,58** dan **7,57 % / 9,02**; acuan derau live-vs-live 0,87 % / 1,48 dan 1,35 % / 1,49.
Backdrop identik (18,9 vs 18,9), kepala 76,3 vs 75,9, badan 35,6 vs 32,9.
Sisa selisih = profil kernel bloom (dikuantifikasi, bukan fitur hilang).
