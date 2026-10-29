# GROUND TRUTH — hasil P6 (Fase 1.8 + 1.9)

Direkam **2026-10-29** dari situs live dengan Chromium headless (SwiftShader WebGL2),
viewport 1440×900 dan 390×844, `deviceScaleFactor 1`, waktu dikunci per-shot.

- Skrip: `../../../tools/snapshot.js`, `snapshot-apex.js`, `snapshot-apex-states.js`, `snapshot-mira-dom.js`
- Total: **36 shot** (API lama) + **24 shot** APEX setelah-klik + **12 shot** state APEX + 1 DOM MIRA masuk = **73 artefak**
- Setiap shot menghasilkan `.png` + `.json` (DOM, teks, computed style, canvas, img, storage) + `.html`

---

## 1. Cara mereproduksi

```bash
cd tools && PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 node snapshot.js
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 node snapshot-apex.js
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 node snapshot-apex-states.js
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 node snapshot-mira-dom.js
```

### Kunci waktu yang **terbukti bekerja**

| target | hook | cara | bukti |
|---|---|---|---|
| APEX | `?auto&asmel=<detik>` | assembly dipatok ke detik itu | persen konsisten lintas run: t0.2→3%, t1→14%, t2→27%, t4→65% |
| APEX | `?skip&state=<s>` + `window.__HUM_FREEZE_T=<t>` (init script) | state beku, `uT` dipatok | 5 state terekam dengan status yang benar |
| MIRA | `?t=<detik>` | clock dipaksa, entry dilewati | `?t=6` langsung masuk mode humanoid |

### Kunci waktu yang **TIDAK** bekerja (koreksi rencana)

- `?auto` **tidak** melewati entry screen APEX. `?auto&skip&state=idle` tetap menampilkan `ENTER`.
  Entry hanya hilang setelah klik tombol. Karena itu wajib klik: `page.click('button')`.
- `?skip` **tidak** melewati timeline birth — ia hanya menggeser `t0`, jadi UI tetap menampilkan
  `ASSEMBLING... 96%`. Untuk menangkap state, tunggu sampai teks `ASSEMBLING` hilang (≈7 s), baru screenshot.

---

## 2. Inventaris artefak

### APEX — `apex/1440x900/` dan `apex/390x844/`

| file | isi |
|---|---|
| `entry.png` + `.json` | entry screen (sebelum klik) |
| `birth-t0.2 / t1 / t2 / t4 .png` | timeline birth pada detik terkunci |
| `birth-done.png` | build selesai (`STATUS: IDLE`), tombol + canvas lengkap |
| `S-<state>.png/.json` | 5 state: idle, listening, thinking, speaking, strong |
| `_repro-a/b.png` | dua shot identik untuk uji reproduksibilitas |

### MIRA — `mira/1440x900/` dan `mira/390x844/`

| file | isi |
|---|---|
| `entry.png` | entry screen |
| `state-<idle\|listening\|talking>-t<2\|6>.png` | 6 kombinasi state × waktu |
| `entered-1440x900.json/.html` | DOM lengkap mode humanoid (tombol, class, canvas, mask) |
| `panel-mira.json` | hasil pencarian panel slider → **0 input** (lihat temuan F-11) |

---

## 3. Temuan baru (F-7 … F-14)

| ID | Temuan | Bukti | Dampak pada rencana |
|---|---|---|---|
| **F-7** | **Tidak ada drift** pada semua artefak: bundle, CSS, dan 10 aset identik `sha256` dengan live | `checksums` di `REBUILD-LOG.md` | P0 tetap sah; Fase 0 cukup audit |
| **F-8** | **Entry APEX tidak bisa dilewati** `?auto` | 5 shot state tetap menampilkan ENTER sampai diklik | P6/P9 wajib mensimulasikan klik; skrip ground truth diperbaiki |
| **F-9** | **`?skip` bukan "lewati timeline"** — hanya menggeser `t0`, persen assembly tetap muncul | `state-*` shot menampilkan `ASSEMBLING... 93–99%` | Gerbang A/C harus menunggu `ASSEMBLING` hilang, bukan memakai `?skip` sebagai jaminan |
| **F-10** | **Status runtime `STATUS: SPEAKING` tanpa `INTENSITY: HIGH`**; SPEC-APEX menulis `STATUS: SPEAKING  INTENSITY: HIGH` (dua spasi) | `S-speaking.json` teks persis `STATUS: SPEAKING` | Varian dua-spasi kemungkinan hanya saat energy tinggi (mic) → **UNVERIFIED**, harus diuji dengan mic nyata |
| **F-11** | **Panel 82 slider MIRA TIDAK dirender di build live** | `panel-mira.json`: 0 `input[type=range]`; DOM hanya 8 tombol; class `mira-btn/mira-page-row/mira-own-row` | **Gerbang B harus diubah**: verifikasi 82 entri lewat array bundle + `?dial.<key>=` + localStorage, bukan lewat DOM slider |
| **F-12** | **`?dial.<key>=<nilai>` + persists di localStorage** | bundle: loop `URLSearchParams` → `startsWith("dial.")` → `rN(key,value)`; `sN()` menulis ke storage; localStorage runtime kosong saat default | Uji panel jadi deterministik & otomatis tanpa UI |
| **F-13** | **`__HUM_FREEZE_T` tidak membekukan seluruh APEX**: dua shot identik masih beda **3,06% > 32/255**, MAE 3,76 | `_repro-a/b.png` | Ambang Gerbang C (0% > 32/255) **tidak mungkin** dicapai untuk APEX; perlu ambang khusus APEX (diukur empiris) — lihat REBUILD-LOG F-13 |
| **F-14** | State `strong` tidak bisa dipaksa lewat `?state=strong` (jatuh kembali ke `STATUS: IDLE`) | `S-strong.json` | `strong` bergantung energy (mic); uji harus pakai `?surge=` / `__HUM_ENERGY` |

---

## 4. Fakta runtime terukur (bahan Fase 2)

### APEX — mode humanoid (1440×900)

- Teks: `STATUS: IDLE` · `EXIT` · `Open hand gesture` · `idle` `listening` `thinking` `speaking` · `🎙 MIC`+`OFF` · `↻ REPLAY` · `♪ SOUND ON`
- `data-testid`: `humanoid-mode`, `humanoid-portrait-frame`
- `aria-label`: section `Apex cinematic humanoid`; canvas `Animated cyan and gold Apex humanoid`; tombol `Exit humanoid view`, `Open hand gesture`; ada `aria-live="polite"` pada satu div
- **3 canvas**: 1440×900 (layer komposisi), 900×900 (skala internal), 900×900 (portrait) — semuanya `mix-blend-mode: normal`, posisi mengikuti frame 900×900 di x=270
- **1 img**: `backdrop-v1.webp` (1672×941) full-bleed
- Warna dominan UI: `rgb(25, 221, 255)` (cyan), overlay tombol `rgba(0, 10, 14, 0.72)`, state aktif `rgba(34, 211, 238, 0.2)`, teks sekunder `rgb(159, 216, 232)`
- Tombol state: font 11px, padding `5px 11px`, tinggi 25px; tombol EXIT 12px padding `5px 10px` tinggi 44px
- **Tidak ada class CSS** pada elemen APEX (styling 100% inline) — konsisten dengan CSS 224 byte

### MIRA — mode humanoid (1440×900)

- Teks: `REPLAY` · `SPEED 1x` · `SOUND ON` · `ENABLE CAMERA` · `IDLE` `LISTENING` `TALKING` · `MIC OFF`
- Class runtime: `mira-btn`, `mira-own-row`, `mira-page-row` (dari 8 class di bundle; `mira-body`, `miraEnter`, `miraExit`, `mira-humanoid-*` hanya sebagian terpakai)
- `data-testid`: `mira-humanoid-sound`, `mira-humanoid-camera`
- Scroll horizontal: 0; **tidak ada `aria-live`** di mode humanoid
- **2 canvas**: 1007×630 (`position:fixed; z-index:0` — field shader) dan 1440×900 (WebGL)
- **1 img**: `mira-idle-v1.webp` 1145×1374, `filter: brightness(0)`, `opacity: 0` → **mask**, bukan gambar tampil
- Tombol: font 12px, `letter-spacing 1.68px` (= 0.14em), padding `8px 13px`, bg `rgba(16, 6, 30, 0.72)`, aktif `rgba(196, 168, 255, 0.2)`, `aria-pressed` dipakai (`SOUND ON`=true, `IDLE`=true)

---

## 5. Catatan teknis untuk Fase 4

1. **Background tab dibekukan Chromium.** `window.__HUM_BG_T` tidak menolong; satu-satunya jalan adalah
   menjalankan tiap shot di context baru + membawa tab ke depan (sudah dilakukan).
2. **SwiftShader cukup** untuk render WebGL2 — hasil visual identik dengan yang diharapkan (lihat `S-speaking.png`),
   tapi frame rate rendah (~3–8 fps), jadi semua wait harus ≥1,5 s.
3. **Ambang piksel harus diturunkan per-target** berdasarkan uji live-vs-live (F-13), bukan angka absolut dari prompt.
   Baseline terukur APEX: `>32/255 = 3,06%`, `MAE = 3,76` pada kondisi beku → ambang rebuild harus ≥ nilai ini.
