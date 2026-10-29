# PROMPT SIAP-TEMPEL — Rebuild 100% apex-humanoid + mira-humanoid

> **Cara pakai:** salin SEMUA isi file ini ke agent pembangun. Di baris pertama,
> tulis target yang mau dikerjakan lebih dulu (`TARGET = apex-humanoid` atau
> `mira-humanoid`). Bagian `LAMPIRAN A` dan `LAMPIRAN B` adalah spec hasil ekstraksi
> bundle live — jangan dibuang, di situ ada angka-angka yang tidak bisa ditebak.
>
> Sumber: semua fakta di lampiran diekstrak 2026-10-29 dari bundle live dan
> diverifikasi ulang 193/193 klaim oleh `verify-spec.py`.

---

# ROLE

Kamu adalah rebuild engineer spesialis reverse-engineering front-end.
Tugasmu: membangun ulang sebuah live demo Vercel **tanpa source code**, hanya dari
artefak yang bisa diamati (HTML, bundle JS/CSS ter-minify, aset statis, DOM runtime,
network trace, hasil screenshot).

TARGET: {ISI: apex-humanoid | mira-humanoid}
LIVE:   https://{TARGET}.vercel.app/
STANDAR: **kemiripan 100%** — diukur, bukan dikira-kira. Lihat `# DEFINISI 100%`.

Kamu TIDAK punya akses ke repo aslinya. Yang kamu punya: browser, curl, node,
Python, dan kesabaran untuk membaca kode ter-minify. Perlakukan bundle ter-minify
sebagai **spesifikasi yang bisa dibaca**, bukan sebagai sampah.

---

# ATURAN MAIN (non-negotiable)

1. **DILARANG menebak.** Setiap angka (durasi, opacity, warna, min/max slider, radius,
   ambang bloom) harus berasal dari salah satu: (a) ekstraksi langsung dari bundle,
   (b) pengukuran runtime di browser, (c) pengukuran piksel dari screenshot.
   Kalau sebuah angka belum terverifikasi, tandai `// UNVERIFIED` di kode dan catat di
   `REBUILD-LOG.md`. Jangan pernah menulis angka "kira-kira" lalu berpura-pura selesai.
2. **Ekstraksi dulu, baru membangun.** Fase 1 dan 2 wajib selesai dan tersimpan di
   `recon/` sebelum satu baris kode aplikasi ditulis.
3. **Salin, jangan tulis ulang.** Shader GLSL, string UI, label panel, dan nilai default
   yang sudah ada utuh di dalam bundle: **salin apa adanya**, termasuk komentar, ejaan,
   spasi ganda, dan huruf besar/kecil. Ini bukan tempat untuk "merapikan".
4. **Aset di-copy byte-for-byte** dari URL live. Dilarang generate ulang, dilarang
   re-encode, dilarang cari gambar serupa.
5. **Struktur proyek harus match** dengan struktur yang terbukti ada di bundle
   (lihat `# STRUKTUR YANG TERBUKTI`). Nama file boleh berbeda, batas modul tidak boleh.
6. **Setiap perubahan diikuti verifikasi.** Tidak ada klaim "sudah mirip" tanpa angka
   diff piksel yang dilampirkan.
7. Kalau kamu menemukan fakta yang **bertentangan** dengan suplemen spec, bundle live
   yang menang. Catat koreksinya di `REBUILD-LOG.md`.

---

# FASE 0 — SETUP RECON

```bash
mkdir -p recon && cd recon
T={TARGET}
curl -sL -o index.html "https://$T.vercel.app/"
# ambil path bundle dari index.html
JS=$(grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' index.html | head -1)
CSS=$(grep -oE '/assets/index-[A-Za-z0-9_-]+\.css' index.html | head -1)
curl -sL -o bundle.js "https://$T.vercel.app$JS"
curl -sL -o bundle.css "https://$T.vercel.app$CSS"
# seluruh aset yang dirujuk bundle
grep -oE '"/[A-Za-z0-9._/-]+\.(webp|png|jpg|svg|glb|hdr|mp3|wav)"' bundle.js | tr -d '"' | sort -u > asset-list.txt
while read a; do mkdir -p "assets$(dirname $a)"; curl -sL -o "assets$a" "https://$T.vercel.app$a"; done < asset-list.txt
ls -la assets/humanoid/
```

Cek dulu (semua sudah saya verifikasi, tapi konfirmasi ulang di mesinmu):
- tidak ada sourcemap (`*.js.map` → HTTP 404). Jangan buang waktu mencari.
- tidak ada aset audio (`.mp3/.wav/.ogg`). Semua suara **disintesis Web Audio API**.
- tidak ada model 3D (`.glb/.gltf/.hdr`). Semua geometri **prosedural**.

---

# FASE 1 — BEDAH BUNDLE (wajib menghasilkan artefak di `recon/`)

## 1.1 Identifikasi stack
Hitung kemunculan penanda library. Yang sudah terbukti ada di **kedua** target:
`react` + `react-dom` (production build), `@react-three/fiber` (R3F + three.js r1xx),
`@react-three/postprocessing` (`BloomEffect`, `EffectComposer`, `KawaseBlurPass`,
`MipmapBlurPass`), `@mediapipe/tasks-vision@0.10.14` (dimuat runtime dari
`https://esm.sh/@mediapipe/tasks-vision@0.10.14`, WASM dari
`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm`, model dari
`https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`),
dan Google Fonts **Share Tech Mono**.

## 1.2 Ekstrak string UI (urutan DOM)
```bash
grep -oE '"[A-Za-z][A-Za-z0-9 ,.:;!?/()-]{5,70}"' bundle.js | sort -u > strings.txt
```
Buang noise three.js/React (nama Material/Geometry/Helper/Pass/Event). Yang tersisa
adalah copy UI. **Simpan urutan kemunculannya** — urutan di bundle = urutan render.
Hasil wajib: `recon/ui-copy.txt`.

## 1.3 Ekstrak shader GLSL
Shader disimpan sebagai template literal. Ekstrak dengan Python:
```python
import re
s = open('bundle.js', encoding='utf-8', errors='ignore').read()
for m in re.finditer(r'`[^`]{200,20000}`', s):
    t = m.group(0)
    if 'void main' in t or 'gl_FragColor' in t or 'gl_Position' in t:
        open(f'recon/shaders/block-{abs(hash(t))%99999}.glsl','w').write(t)
```
Pisahkan shader three.js bawaan (PMREM/cubeUV) dari shader custom aplikasi.
Shader custom **WAJIB disalin verbatim** ke `src/shaders/*.glsl` — termasuk komentar
aslinya. Komentar di shader itu memuat niat desain penulis asli; jangan dibuang.

## 1.4 Ekstrak skema parameter UI (khusus MIRA — 82 parameter)
Panel kontrol MIRA dibangun dari satu array skema. Ambil dengan:
```python
s = open('recon/bundle.js', encoding='utf-8', errors='ignore').read()
k = s.find('{key:"lines.count"'); start = s.rindex('[', 0, k)
d = 0; j = start
while True:
    c = s[j]
    if c == '[': d += 1
    elif c == ']':
        d -= 1
        if d == 0: break
    j += 1
open('recon/params-raw.txt','w').write(s[start:j+1])
```
Lalu parse tiap entri `{key, scope?, stands?, group, label, min, max, step, def}`.
Hasil wajib: `recon/params.json` dengan **tepat 82 entri**. Cross-check jumlahnya;
kalau kurang, berarti regex-mu melewatkan entri ber-field `stands:` — perbaiki, jangan diterima.

## 1.5 Ekstrak hook tuning (khusus APEX)
APEX tidak punya panel slider; ia punya **query param** dan **global window**:
```bash
grep -oE 'window\.__[A-Za-z0-9_]+' bundle.js | sort -u
grep -oE '\.get\("[a-z]+"\)' bundle.js | sort -u
```
Semua yang muncul harus kamu implementasikan dengan nama yang sama persis.

## 1.6 Ekstrak audio graph
```bash
grep -oE 'create(Oscillator|Gain|BiquadFilter|BufferSource|WaveShaper|Convolver|StereoPanner|Analyser|DynamicsCompressor)|\.type="[a-z]+"' bundle.js | sort | uniq -c
```
Lalu buka konteks tiap pemanggilan untuk membaca: bentuk gelombang, frekuensi,
Q, cutoff, curve waveshaper, envelope (attack/decay/release), urutan koneksi, dan
bagaimana `AnalyserNode` menggerakkan visual (RMS → uniform).

## 1.7 Ekstrak timing
Cari semua angka durasi: `transition`, `setTimeout(...,N)`, `animation ... Ns`,
durasi phase mesin state. Simpan sebagai `recon/timings.json`. Ini bagian yang paling
sering merusak kemiripan kalau ditebak.

## 1.8 Snapshot DOM & gaya runtime
Jalankan situs di headless browser, lalu dump:
- `document.documentElement.outerHTML` pada 5 momen: layar entry, t=0, t=1s, t=3s, pasca-selesai.
- `getComputedStyle` untuk setiap node teks + setiap tombol (font, size, letter-spacing,
  color, padding, border, background, opacity, transform, transition).
- Daftar `class` yang muncul (mis. `mira-btn`, `mira-page-row`, `mira-own-row`,
  `apex-finger-track`, `apex-gesture-quiet`, `apex-gesture-snap`, `humanoid-portrait-frame`).

## 1.9 Rekam ground truth
- Screenshot 1440×900 dan 390×844 pada **timestamp terkunci** (lihat trik di Fase 4).
- Rekaman video 30 fps, 20 detik, dari klik ENTER sampai idle stabil. Ini referensi
  gerak — tonton frame per frame, jangan hanya lihat thumbnail.
- Simpan semua di `recon/ground-truth/`.

---

# FASE 2 — ARSITEKTUR (tulis dulu, jangan langsung coding)

Hasilkan `recon/ARCHITECTURE.md` berisi, minimal:
1. Pohon komponen React (nama boleh kamu pilih, tapi **jumlah dan tanggung jawab**
   harus sesuai bukti di bundle).
2. Daftar state machine + transisi + durasi tiap transisi.
3. Daftar layer komposisi (urutan z, blend mode, opacity) — untuk APEX ini kritis
   karena ia mengomposisi gambar webp + canvas 2D dengan `globalCompositeOperation`
   (`source-over`, `lighter`, `screen`, `plus-lighter`, `destination-in`).
4. Daftar uniform shader → sumber nilainya (state, audio RMS, hand landmark, waktu).
5. Daftar aset → di mana dipakai → blend mode & ukuran render.
6. Peta "apa yang belum terverifikasi".

**Stop di sini kalau arsitekturnya belum menjelaskan semua string UI dari 1.2.**
Setiap string harus punya pemilik.

---

# FASE 3 — IMPLEMENTASI

## 3.1 Proyek
Vite + React + TypeScript. Struktur yang terbukti dari bundle:
```
src/
  lib/            # orbScreen (proyeksi ring ke piksel layar), miraHairPic (HAIR_ZONE_GLSL), noise/hash
  shaders/        # *.glsl verbatim dari Fase 1.3
  audio/          # graph Web Audio + analyser → RMS
  hand/           # HandLandmarker (lazy-load dari esm.sh, fallback bila gagal)
  ui/             # entry screen, panel, readout, tombol
  scene/          # R3F Canvas, instanced geometry, uniform driver
public/
  humanoid/*.webp # byte-identical copy dari Fase 0
```
`index.html` harus **identik secara struktur** dengan aslinya: `<title>`, urutan
`preconnect`, link Google Fonts `Share Tech Mono`, `<div id="root">`, script module
dengan `crossorigin`.

## 3.2 CSS global — salin persis (sudah diekstrak, jangan tulis ulang)
```css
:root { --font-ui: "Share Tech Mono", monospace }
html, body { margin: 0; padding: 0; background: #000; font-family: var(--font-ui) }
#root { position: fixed; top: 0; right: 0; bottom: 0; left: 0 }
@keyframes fadeInOut { 0%, to { opacity: .35 } 50% { opacity: 1 } }
```
MIRA punya tambahan media query `@media (max-width: 720px)` untuk `.mira-btn`,
`.mira-page-row`, `.mira-own-row` — salin dari `recon/bundle.css`.

## 3.3 Urutan pengerjaan (jangan diacak)
1. Entry screen statis → cocokkan tipografi & posisi **sampai diff piksel < 0.5%**.
2. Aset + komposisi 2D (APEX) / ring + garis (MIRA) dalam kondisi diam.
3. Timeline "birth/build" dengan durasi terverifikasi.
4. Audio graph.
5. State machine IDLE / LISTENING / TALKING + driving mic.
6. Hand tracking (MediaPipe) + gesture.
7. Panel kontrol (MIRA) / hook query param (APEX).
8. Post-processing (bloom) — **paling akhir**, karena ia menutupi kesalahan lain.

---

# FASE 4 — VERIFIKASI (bagian yang membuat 100% itu nyata, bukan klaim)

## 4.1 Kunci waktu
Visual keduanya prosedural dan bergantung waktu. Untuk bisa dibandingkan, gunakan
hook yang **sudah ada di bundle asli**:
- APEX: `?skip` (lompati assembly), `?state=...`, `window.__HUM_FREEZE_T`,
  `window.__HUM_SKIP_ASSEMBLY`, `window.__HUM_FORCE_2D`, `window.__HUM_NO_BG`.
- MIRA: `?mira_debug=orb|mask|breakup|near|hot|nearhot|core|corehot`, `?hot=<0..1>`,
  `window.__MIRA_DEBUG`.
Set `window.__HUM_FREEZE_T` (APEX) dan freeze clock MIRA, lalu screenshot kedua situs
pada nilai t yang sama. Tanpa penguncian ini, diff piksel tidak berarti apa-apa.

## 4.2 Tiga gerbang yang harus lolos semua
**Gerbang A — DOM & copy.** Skrip yang membandingkan `outerHTML` (dinormalisasi:
buang atribut hash/acak) + semua teks + `getComputedStyle` per node.
Target: **0 perbedaan** pada teks, class, dan properti gaya yang terlihat.

**Gerbang B — Panel kontrol (MIRA).** Baca 82 entri panel dari DOM kedua situs,
bandingkan `key | group | label | min | max | step | nilai default`.
Target: **82/82 cocok**, termasuk urutan grup.

**Gerbang C — Diff piksel.** Screenshot pada 1440×900 dan 390×844, posisi sama,
t terkunci, font sudah loaded (`document.fonts.ready`).
```python
from PIL import Image, ImageChops
import numpy as np
a = np.asarray(Image.open('recon/ground-truth/x.png').convert('RGB'), float)
b = np.asarray(Image.open('recon/build/x.png').convert('RGB'), float)
d = np.abs(a-b).max(axis=2)
print('piksel beda >8/255 :', (d>8).mean()*100, '%')
print('piksel beda >32/255:', (d>32).mean()*100, '%')
print('mean abs err       :', d.mean())
```
Ambang kelulusan:
| Metrik | Ambang lulus |
|---|---|
| piksel beda > 32/255 | **0.00 %** |
| piksel beda > 8/255  | **≤ 0.10 %** (dan hanya di tepi antialias/prosedural) |
| mean abs error | **≤ 1.5 / 255** |
| posisi tiap elemen UI (bbox) | **≤ 1 px** |
| durasi tiap fase timeline | **≤ 30 ms** |

Lakukan untuk **10 timestamp**: entry, t+0.2s, t+1s, t+2s, t+4s, selesai-build,
idle, listening, talking, talking-strong.

## 4.3 Gerbang gerak
Bandingkan video frame-per-frame pada 3 fps sampel: selisih posisi elemen bergerak
≤ 3 px. Kalau lewat, yang salah hampir pasti **timing**, bukan warna.

## 4.4 Gerbang audio
Bandingkan spektrum: rekam output kedua situs (loopback / `OfflineAudioContext`),
buat spectrogram, bandingkan puncak frekuensi & bentuk envelope. Target: puncak
frekuensi dominan sama dalam ±3%, urutan peristiwa envelope sama.

## 4.5 Gerbang fungsi
Uji manual dan catat hasilnya satu per satu di `VERIFICATION.md`:
- klik ENTER → audio mulai (autoplay policy: AudioContext harus di-resume di gesture).
- reload → kembali ke entry screen.
- REPLAY / "Run the birth again" → timeline ulang penuh.
- izinkan mic → state berpindah ke LISTENING, amplitudo mic menggerakkan visual.
- izinkan kamera → hand tracking load, gesture point/pinch/open mengubah visual.
- tolak kamera → pesan error yang **tepat sama** (`no camera found`,
  `camera blocked - allow it in the browser settings`, `this browser has no camera access here`).
- resize + rotate → komposisi tetap benar; breakpoint 720px (MIRA) berlaku.
- `prefers-reduced-motion: reduce` → perilaku sesuai aslinya (APEX membacanya).
- WebGL context lost → fallback (`context lost`).
- semua query param / global `window.__*` berfungsi.

---

# DEFINISI 100% (baca sebelum mengklaim selesai)

**Bisa 100% identik — wajib dicapai:**
struktur DOM, seluruh teks & ejaan, seluruh CSS & tipografi, palet warna, seluruh
nilai parameter (82 entri MIRA termasuk min/max/step/default dan urutan grup),
matematika shader (salin verbatim), aset gambar (byte-identical), urutan & durasi
timeline, struktur graph audio, perilaku error, breakpoint responsif, seluruh hook
query param & global window, dan urutan komposisi layer + blend mode.

**Bisa 100% setara secara visual, tapi bukan bit-identik — dan itu wajar:**
posisi partikel/prosedural yang bergantung PRNG. Kalau kamu **juga** mengekstrak
seed dan algoritma PRNG dari bundle (cari `Math.random`, `hash(`, `fract(`, `* 123.34`,
`12345.6789`, dsb.), ini pun bisa jadi identik. Lakukan bila memungkinkan; kalau
tidak, nyatakan eksplisit sebagai deviasi yang diterima di `REBUILD-LOG.md` dan
buktikan dengan diff piksel yang tetap lolos Gerbang C.

**Jangan pernah** menyebut "100%" tanpa menempelkan keluaran skrip Gerbang A/B/C.

---

# DELIVERABLE

1. Repo siap deploy ke Vercel (Vite + React + TS), `vercel.json` bila perlu
   (SPA fallback untuk rute klien, cache header untuk `/assets`).
2. `recon/` — semua artefak ekstraksi Fase 1 (bundle, shaders, params.json,
   ui-copy.txt, timings.json, ground-truth/).
3. `VERIFICATION.md` — keluaran mentah Gerbang A–D, per timestamp, plus tabel
   pass/fail dan screenshot perbandingan berdampingan.
4. `REBUILD-LOG.md` — daftar deviasi yang disengaja + alasan + bukti, dan daftar
   `// UNVERIFIED` yang tersisa (ideal: kosong).
5. Deploy preview URL, lalu jalankan Gerbang C **melawan URL live asli** dari
   deployment-mu sendiri, bukan dari localhost.

---

# ATURAN MAIN (ringkas, tempel di kepala)

- Fakta dari bundle > intuisi. Bundle ter-minify adalah spesifikasi.
- Tidak ada angka karangan. Tidak ada warna karangan. Tidak ada durasi karangan.
- Salin shader dan string apa adanya, termasuk komentarnya.
- Aset di-copy, tidak di-generate.
- Klaim "mirip" tanpa angka diff = belum dikerjakan.
- Setiap temuan yang bertentangan dengan spec: bundle menang, catat koreksinya.

---

# LAMPIRAN A — SPEC APEX (suplemen wajib untuk TARGET = apex-humanoid)

# SUPLEMEN WAJIB — SPEC APEX (https://apex-humanoid.vercel.app/)

> Lampirkan file ini bersama `PROMPT-MASTER-REBUILD.md`.
> Semua fakta di bawah diekstrak langsung dari bundle live
> `/assets/index-BD7VNgkM.js` (1.108.884 byte) dan `/assets/index-CvOJNoLF.css` (224 byte)
> pada 2026-10-29. Verifikasi ulang di mesinmu; bundle bisa berubah.

---

## 1. Identitas halaman

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Apex Humanoid</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap" rel="stylesheet" />
    <script type="module" crossorigin src="/assets/index-BD7VNgkM.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-CvOJNoLF.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

CSS global — **verbatim, hanya 224 byte**. Barisnya saya pecah di bawah ini supaya
terbaca; **file aslinya satu baris penuh tanpa enter**. Saat menulis `src/index.css`,
salin isi satu baris dari `recon/apex.css`, jangan salin dari sini:
```css
:root{--font-ui: "Share Tech Mono", monospace}
html,body{margin:0;padding:0;background:#000;font-family:var(--font-ui)}
#root{position:fixed;top:0;right:0;bottom:0;left:0}
@keyframes fadeInOut{0%,to{opacity:.35}50%{opacity:1}}
```
Tidak ada media query. Semua gaya lain di-inject dari JS.

## 2. Copy UI (teks persis)

**Entry screen:**
- `APEX HUMANOID`
- `a figure of light that assembles itself`
- `ENTER`
- `the click opens the audio - the birth has a sound`

**Mode humanoid:**
- `STATUS: SPEAKING  INTENSITY: HIGH` ← **dua spasi** di antaranya, jangan dirapikan
- `Run the birth again`
- `Exit humanoid view`
- `Open camera now`
- `Close camera`
- `Open hand gesture`
- `Finger tracking is on`
- `Drive the speaking face from your microphone`

**Accessibility (verbatim dari bundle):**
- `data-testid="humanoid-mode"`
- `data-testid="humanoid-portrait-frame"`
- `aria-live="polite"`, role `section`, `Apex cinematic humanoid` (label section)
- `Animated cyan and gold Apex humanoid` (label gambar)

## 3. Aset — copy byte-for-byte, jangan generate ulang

Peta state → aset (verbatim dari bundle):
```js
{
  idle:      "/humanoid/apex-idle-v1.webp",
  listening: "/humanoid/apex-listening-v1.webp",
  thinking:  "/humanoid/apex-thinking-v1.webp",
  speaking:  "/humanoid/apex-speaking-v1.webp",
  strong:    "/humanoid/apex-speaking-strong-v1.webp",
}
```

| File | Dimensi | Byte | Peran |
|---|---|---|---|
| `/humanoid/backdrop-v1.webp` | 1672 × 941 | 312.166 | latar |
| `/humanoid/apex-assembly-25-v1.webp` | 1254 × 1254 | 312.814 | frame assembly 25% |
| `/humanoid/apex-assembly-60-v1.webp` | 1254 × 1254 | 322.748 | frame assembly 60% |
| `/humanoid/apex-idle-v1.webp` | 1215 × 1295 | 300.084 | state `idle` |
| `/humanoid/apex-listening-v1.webp` | 1214 × 1295 | 350.160 | state `listening` |
| `/humanoid/apex-thinking-v1.webp` | 1215 × 1295 | 275.616 | state `thinking` |
| `/humanoid/apex-speaking-v1.webp` | 1213 × 1296 | 286.100 | state `speaking` |
| `/humanoid/apex-speaking-strong-v1.webp` | 1216 × 1293 | 327.680 | state `strong` |

Catatan: dimensi tiap state **tidak sama** (1213–1216 × 1293–1296). Jangan dinormalisasi —
perbedaan 1–3 px ini bagian dari feel aslinya.

## 4. Mesin state + crossfade (inti APEX)

State kunci: **`idle` · `listening` · `thinking` · `speaking` · `strong`**
(plus 2 frame assembly untuk timeline "birth").

Crossfade antar state memakai uniform:
`uTexA`, `uTexB` (tekstur state A dan B), `uStateA`, `uStateB` (bobot),
`uBloomR`. Fallback bila key tidak dikenal: `p.idle`.

Transisi CSS yang terbukti: `opacity 140ms` dan `opacity 900ms`.

Animasi ring (durasi persis):
- `humRingBase 3.4s ease-in-out infinite`
- `humRingPulse 4.55s linear infinite`

## 5. Komposisi lapisan

APEX mengomposisi **canvas 2D + gambar + video** lewat `globalCompositeOperation`.
Mode yang terbukti dipakai (wajib ada semuanya):
`source-over` · `lighter` · `screen` · `plus-lighter` · `destination-in`

Ukuran portrait: `min(100vw, 100vh)` dengan `object-fit: cover`.
Clamp tipografi: `clamp(9px, 1.05vmin, 13px)`.
Overlay: `rgba(0, 10, 14, 0.72)`.
Properti yang dianimasikan: `width, height, left, top, opacity`.

Jumlah kemunculan nama elemen di dalam bundle (indikator beratnya pemakaian DOM —
bandingkan dengan rebuild-mu; APEX vs MIRA dalam kurung):
`div` 19 (17) · `canvas` 19 (16) · `button` 14 (11) · `img` 9 (6) · `p` 5 (5) ·
`video` 3 (3) · `span` 1 (2) · `section` 1 (0).

## 6. Hook tuning — wajib diimplementasikan dengan nama persis

APEX **tidak punya panel slider**. Tuning lewat query param + global window.

| Query param | Global window | Default |
|---|---|---|
| `?skip` | `window.__HUM_SKIP_ASSEMBLY` | `false` (true → assembly dilewati, t = 99000) |
| `?asmoff=<detik>` | `window.__HUM_ASM_OFF` | `0` (× 1000 ms) |
| `?asmel=<detik>` | `window.__HUM_ASM_EL` | `(now - t0)/1000` |
| `?nobg` | `window.__HUM_NO_BG` | `false` |
| `?bgrest=<0..1>` | `window.__HUM_BG_REST` | **`0.22`** |
| `?bgpulse=<n>` | `window.__HUM_BG_PULSE` | **`2.6`** |
| `?surge=<n>` | `window.__HUM_SURGE` | — (dijepit ke `0 < x ≤ 4.5`) |
| `?state=<state>` | `window.__HUM_BLEND` | `{a, b, r}` → `uStateA/uStateB/uBloomR` + `uTexA/uTexB` |

Global lain (tanpa query param):
`__HUM_ENERGY` (ambang "strong" dihitung `(energy - 0.34) / 0.4`),
`__HUM_SPEAK_AMP` (default **`0.55`**),
`__HUM_BOIL_AMP` → `uBoilAmp`,
`__HUM_RIM` → `uRim`,
`__HUM_DOT` → `uDotSharp`,
`__HUM_ATTN` (`{x, y}`, dijepit `-1..1`, dikali `1.6`),
`__HUM_CLICK` (`{t}`),
`__HUM_FREEZE_T` (bekukan `uT` — **ini kuncimu untuk diff piksel**),
`__HUM_FORCE_2D`.

Contoh pemakaian di bundle:
```js
// background
uRest:  { value: window.__HUM_BG_REST ?? 0.22 },
uPulse: { value: window.__HUM_BG_PULSE ?? 2.6 },
uMap:   { value: new Vector4(2, -2, -1, 1) },
uWave:  { value: new Vector4(0, 0, 0, 0) },
// clock
uT.value = window.__HUM_BG_T ?? (uT.value + Math.min(0.05, dt || 0.016))
// assembly
window.__HUM_SKIP_ASSEMBLY ? 99000 : (window.__HUM_ASM_OFF ? window.__HUM_ASM_OFF * 1000 : 0)
```
Perhatikan `Math.min(0.05, dt)` — **dt dijepit 50 ms**. Kalau kamu tidak menjepitnya,
timeline akan melompat setelah tab di-background dan diff gerak-mu gagal.

## 7. Aturan visual dari komentar bundle

Hanya sedikit komentar niat desain yang lolos minifier di APEX, tapi keduanya mengikat:
- *"ESCAPE-AND-RETURN, the same species as the edge boil (round 8: an in-place wobble made …)"*
- *"at pulse peak the color brightens **IN ITS OWN HUE** - never lifted toward white"*

Aturan kedua itu penting dan kebalikan dari kebiasaan umum: saat puncak pulse,
warna **tidak boleh** didorong ke putih. Naikkan saturasi di hue-nya sendiri.

## 8. Shader — atribut geometri

Atribut custom yang terbukti (partikel/procedural):
`aSize`, `aTw`, `aPh`, `aSp`, `aBr`, `aSz`, `aNx`, `aBase`, `aBoil`, `aBright`,
`aBucket`, `aOff`, `aRate`, `aWeight`, `aKind`, `aCol`, `aUv`.

Uniform yang terbukti: `uT`, `uEnergy`, `uStrongMix`, `uBoilAmp`, `uRim`, `uDotSharp`,
`uStateA`, `uStateB`, `uBloomR`, `uTexA`, `uTexB`, `uRest`, `uPulse`, `uMap`, `uWave`,
`uWaveK`, `uSizeK` (`= devicePixelRatio` dijepit maks `1.5`).

`getContext("2d")` muncul **8×** di bundle APEX (MIRA hanya 6×) dan `getContext("webgl2")`
1× — APEX jauh lebih 2D-canvas-sentris daripada MIRA.

## 9. Audio & hand tracking

Sama persis polanya dengan MIRA (kemungkinan besar dari basis kode yang sama):
`16× createOscillator` (`sine` dominan, `triangle`, `sawtooth`), `35× createGain`,
`7× createBiquadFilter` (`lowpass`, `bandpass`), `4× createBufferSource`,
`4× createWaveShaper`, `2× createConvolver`, `2× createStereoPanner`,
`3× createAnalyser`, `1× createDynamicsCompressor`.
**Tidak ada file audio** — semua disintesis Web Audio API.

MediaPipe `HandLandmarker` `@mediapipe/tasks-vision@0.10.14`,
model `hand_landmarker.task` (float16), WASM dari jsDelivr, ESM dari esm.sh.
Class gesture: `apex-finger-track`, `apex-gesture-quiet`, `apex-gesture-snap`.

## 10. Perbedaan kunci APEX vs MIRA (jangan tertukar)

| | APEX | MIRA |
|---|---|---|
| Panel kontrol | **tidak ada** (query param + `window.__HUM_*`) | **82 slider, 20 seksi** |
| Visual utama | gambar webp state + komposisi canvas 2D | garis prosedural + ring + shader ribbon |
| Aset | **8 webp** (7 state + backdrop) | **2 webp** (idle + hair, dipakai sebagai mask) |
| State | `idle/listening/thinking/speaking/strong` | `IDLE/LISTENING/TALKING` |
| Aksen warna | cyan & gold | lilac/violet & gold |
| Modul `lib/` | tidak ada jejak | 8 modul (`orbScreen`, `miraBuild`, …) |
| Breakpoint | tidak ada | `max-width: 720px` |
| CSS | 224 byte | 574 byte |
| Bundle | 1.108.884 byte | 1.185.588 byte |


---

# LAMPIRAN B — SPEC MIRA (suplemen wajib untuk TARGET = mira-humanoid)

# SUPLEMEN WAJIB — SPEC MIRA (https://mira-humanoid.vercel.app/)

> Lampirkan file ini bersama `PROMPT-MASTER-REBUILD.md`.
> Semua fakta di bawah diekstrak langsung dari bundle live
> `/assets/index-1PiDnpcG.js` (1.185.588 byte) dan `/assets/index-BlszmC9G.css` (574 byte)
> pada 2026-10-29. Verifikasi ulang di mesinmu; bundle bisa berubah.

---

## 1. Identitas halaman

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MIRA Humanoid</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap" rel="stylesheet" />
    <script type="module" crossorigin src="/assets/index-1PiDnpcG.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-BlszmC9G.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

CSS global (574 byte). Barisnya saya pecah di bawah supaya terbaca — **file aslinya
satu baris penuh tanpa enter**; saat menulis `src/index.css`, salin isi satu baris dari
`recon/mira.css`, jangan salin dari sini:

```css
:root{--font-ui: "Share Tech Mono", monospace}
html,body{margin:0;padding:0;background:#000;font-family:var(--font-ui)}
#root{position:fixed;top:0;right:0;bottom:0;left:0}
@keyframes fadeInOut{0%,to{opacity:.35}50%{opacity:1}}
@media(max-width:720px){
  .mira-btn{padding:7px 9px!important;font-size:11px!important;letter-spacing:.08em!important}
  .mira-page-row{left:12px!important;right:12px;bottom:calc(12px + env(safe-area-inset-bottom))!important;gap:6px!important}
  .mira-own-row{right:12px!important;bottom:calc(60px + env(safe-area-inset-bottom))!important;gap:6px!important}
}
```

## 2. Copy UI (teks persis — jangan diperbaiki ejaannya)

**Entry screen:**
- `MIRA HUMANOID`
- `a figure of light that weaves herself out of her own heart`
- `ENTER`
- `the click opens the audio - her build has a sound`

**Readout status:** `IDLE` · `LISTENING` · `TALKING`
**Readout kamera/mic:** `MIC ` · `SOUND ` · `SPEED ` (ada spasi trailing sebelum nilainya)
**Tombol:** `REPLAY` · `Exit` · `ENABLE CAMERA` · `CAMERA OFF` · `The camera is on`
**Pesan kamera/hand tracking (persis, termasuk tanda bacanya):**
- `loading hand tracking`
- `starting the camera`
- `camera on - show your hand`
- `hand found - point, pinch to touch her`
- `no camera found`
- `camera blocked - allow it in the browser settings`
- `this browser has no camera access here`
- `context lost`
- `no log`
- `running`

**Accessibility:** ada `aria-pressed`, `aria-live`, dan selector fokus
`button, input, select, textarea` — pertahankan.

## 3. Class CSS aplikasi (harus ada dengan nama sama)

`mira-btn` · `mira-page-row` · `mira-own-row` · `mira-body` ·
`mira-humanoid-camera` · `mira-humanoid-sound` · `miraEnter` · `miraExit`

Palet rgba yang terbukti ada di bundle (untuk panel/overlay — verifikasi pemakaian runtime):
`rgba(16, 6, 30, 0.72)` · `rgba(110,50,230,0.08)` · `rgba(90,30,200,0)` ·
`rgba(140,80,255,0)` · `rgba(150,80,255,0.32)` · `rgba(200,150,255,0.8)` ·
`rgba(230,205,255,0.55)`

Transisi yang terbukti: `opacity .25s linear`.

## 4. Aset (copy byte-for-byte, jangan generate ulang)

| File | Dimensi | Byte |
|---|---|---|
| `/humanoid/mira-idle-v1.webp` | 1145 × 1374 | 364.544 |
| `/humanoid/mira-hair-v1.webp` | 1385 × 1422 | 159.716 |

Filter yang terbukti dipakai pada gambar: `brightness(0) invert(1)` dan `brightness(0)`
— artinya gambar dipakai sebagai **mask/silhouette**, bukan ditampilkan apa adanya.

## Tabel parameter panel MIRA — 82 entri, 20 seksi berurutan

> Urutan seksi dan urutan baris **wajib sama**. Header grup boleh muncul dua kali
> (lihat `Her hair` seksi 10 dan 14) — itu memang dua seksi terpisah di panel asli.


### Seksi 1 — Centre lines  (scope `scene`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `lines.count` | How many lines | 2 | 28 | 1 | **9** |
| `lines.width` | Line thickness (px) | 0.5 | 4 | 0.1 | **1.4** |
| `lines.glow` | Line brightness | 0 | 2.5 | 0.05 | **2.5** |
| `lines.glowVar` | Bright and dark stretches | 0 | 1 | 0.05 | **1** |
| `lines.hot` | White hot spots | 0 | 2.5 | 0.05 | **1.6** |
| `lines.gold` | Share of warm gold lines | 0 | 0.6 | 0.05 | **0.6** |
| `lines.rMin` | Closest orbit (ring = 1) | 0.85 | 1.6 | 0.05 | **0.95** |
| `lines.rMax` | Farthest orbit (ring = 1) | 1.2 | 3.2 | 0.05 | **2.05** |
| `lines.stretch` | Oval stretch | 0 | 1 | 0.05 | **0** |
| `lines.chaos` | Chaos of the shape | 0 | 1 | 0.05 | **0.6** |
| `lines.tilt` | Tilt of the orbits (deg) | 0 | 75 | 1 | **22** |
| `lines.speed` | Speed of the movement | 0 | 3 | 0.05 | **3** |
| `lines.cross` | How deep lines cross the ring | 0.55 | 1 | 0.01 | **0.86** |
| `lines.follow` | How softly they follow the ring size | 0.3 | 6 | 0.1 | **2.9** |

### Seksi 2 — Smoke  (scope `scene`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `smoke.amount` | Smoke strength | 0 | 2 | 0.05 | **0.95** |
| `smoke.width` | Smoke width (ring = 1) | 0.04 | 0.6 | 0.01 | **0.27** |

### Seksi 3 — Star dust  (scope `scene`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `dust.amount` | Grains per line | 0 | 40 | 1 | **15** |
| `dust.size` | Grain size | 0.4 | 3 | 0.05 | **1.05** |
| `dust.bright` | Grain brightness | 0 | 2.5 | 0.05 | **2.5** |
| `dust.spread` | How far grains sit from the line | 0 | 0.5 | 0.01 | **0.5** |

### Seksi 4 — Ring and centre light  (scope `scene`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `ring.diameter` | Ring diameter (px) | 220 | 420 | 2 | **310** |
| `ring.neon` | White neon on the ring | 0 | 2.5 | 0.05 | **0.1** |
| `ring.neonWidth` | Neon thickness (px) | 0.6 | 5 | 0.1 | **1.8** |
| `ring.spill` | Violet glow outside the ring | 0 | 3 | 0.05 | **1.65** |
| `light.bright` | Centre light brightness | 0 | 2.5 | 0.05 | **2** |
| `light.size` | Centre light size | 0.6 | 3 | 0.05 | **2.2** |
| `ring.listenWaves` | Bright expanding circles while she listens (0 off, 1 on) | 0 | 1 | 1 | **0** |

### Seksi 5 — Her voice  (scope `scene`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `voice.ring` | Ring flare per syllable | 0 | 2.5 | 0.05 | **2** |
| `voice.lines` | Lines react to her voice | 0 | 2.5 | 0.05 | **1.95** |

### Seksi 6 — Far waves  (scope `scene`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `waves.opacity` | Far waves strength | 0 | 1 | 0.01 | **0.36** |
| `waves.width` | Far waves width | 0.2 | 3 | 0.05 | **1.6** |
| `waves.speed` | Far waves speed | 0 | 3 | 0.05 | **3** |

### Seksi 7 — Floating particles  (scope `scene`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `motes.opacity` | Particle brightness | 0 | 2 | 0.05 | **2** |
| `motes.size` | Particle size | 0.4 | 3 | 0.05 | **1** |

### Seksi 8 — Background  (scope `scene`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `field.alpha` | Background field strength | 0 | 1 | 0.01 | **1** |
| `field.near` | Background haze near the ring | 0 | 3 | 0.05 | **1.45** |
| `field.spread` | Fog across the whole screen (0 = only near the ring) | 0 | 1 | 0.01 | **0** |

### Seksi 9 — Glow (whole picture)  (scope `scene`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `bloom.strength` | Glow strength | 0 | 3 | 0.05 | **1.3** |
| `bloom.threshold` | Only brighter than this glows | 0 | 1 | 0.01 | **0.18** |
| `bloom.radius` | Glow reach | 0.1 | 1 | 0.01 | **0.62** |

### Seksi 10 — Her hair  (scope `humanoid`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `hum.hair.light` | Hair brightness | 0 | 2.5 | 0.05 | **1** |

### Seksi 11 — Her head  (scope `humanoid`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `hum.head.follow` | How far she turns toward you | 0 | 2 | 0.05 | **1** |
| `hum.head.life` | How much she moves on her own | 0 | 2 | 0.05 | **1** |
| `hum.head.speed` | How quickly she turns | 0.3 | 3 | 0.05 | **1** |

### Seksi 12 — Her states  (scope `humanoid`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `hum.state.talkSpeed` | How much faster everything moves while she talks | 1 | 4 | 0.05 | **2** |
| `hum.state.talkBright` | How much brighter she is while she talks | 1 | 2.5 | 0.05 | **1.35** |
| `hum.state.listenSpeed` | How much faster everything moves while she listens | 1 | 4 | 0.05 | **1.5** |
| `hum.state.listenBright` | How much brighter she is while she listens | 1 | 2.5 | 0.05 | **1.15** |

### Seksi 13 — Her face  (scope `humanoid`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `hum.face.glow` | Face light while she speaks | 0 | 3 | 0.05 | **1** |
| `hum.face.warmth` | Face light edge colour (0 her lilac, 1 her gold) | 0 | 1 | 0.05 | **0** |
| `hum.face.size` | Face light size | 0.3 | 2.5 | 0.05 | **1** |
| `hum.face.move` | Face movement while she speaks | 0 | 3 | 0.05 | **1** |

### Seksi 14 — Her hair  (scope `humanoid`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `hum.hair.glow` | Hair glow when she listens or speaks | 0 | 4 | 0.05 | **1.5** |
| `hum.hair.moving` | How many strands move on their own | 0 | 60 | 1 | **60** |
| `hum.hair.mass` | How much the whole hair sways | 0 | 2 | 0.05 | **0.7** |
| `hum.hair.top` | How much the hair over her head moves | 0 | 2 | 0.05 | **0.6** |
| `hum.hair.swayAmt` | How far they sway | 0 | 1.5 | 0.01 | **0.6** |
| `hum.hair.swaySpeed` | How fast they sway | 0 | 2 | 0.05 | **0.45** |
| `hum.hair.pulse` | Light running down the moving strands | 0 | 2 | 0.05 | **0.6** |
| `hum.hair.twinkle` | Sparkles twinkling in the hair | 0 | 2 | 0.05 | **0.6** |

### Seksi 15 — Her lines at rest  (scope `humanoid`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `hum.lines.bright` | Her lines over the picture | 0 | 1.5 | 0.05 | **0.15** |
| `hum.lines.glow` | Soft glow around her lines | 0 | 3 | 0.05 | **1** |
| `hum.lines.pulse` | Light travelling along her lines | 0 | 2 | 0.05 | **0.7** |
| `hum.lines.pulseSpeed` | Speed of that light | 0.1 | 3 | 0.05 | **1** |
| `hum.body.bright` | Her picture brightness | 0.5 | 1.6 | 0.05 | **1** |
| `hum.aura` | Violet light behind her head | 0 | 2 | 0.05 | **0.8** |

### Seksi 16 — Her breathing  (scope `humanoid`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `hum.breath.depth` | How deep she breathes | 0 | 3 | 0.05 | **1** |
| `hum.breath.speed` | How fast she breathes | 0.3 | 2.5 | 0.05 | **1** |

### Seksi 17 — The build  (scope `humanoid`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `hum.build.core` | The core at her heart (brightness) | 0 | 3 | 0.05 | **1** |
| `hum.build.matter` | Her matter in flight (brightness) | 0 | 3 | 0.05 | **1** |
| `hum.build.shock` | The wave at her ignition | 0 | 3 | 0.05 | **1** |
| `hum.build.surge` | How bright she burns at ignition | 0 | 3 | 0.05 | **1** |

### Seksi 18 — Lightning  (scope `humanoid`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `hum.strike.flash` | How much a strike lights the room | 0 | 1.5 | 0.01 | **0.38** |
| `hum.strike.bright` | Bolt brightness | 0.2 | 2 | 0.05 | **1** |
| `hum.touch.wave` | Current through her when you touch or pinch | 0 | 3 | 0.05 | **1** |

### Seksi 19 — Fog and far waves  (scope `humanoid`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `hum.fog.spread` | Fog across the whole screen *(alias scene `field.spread`)* | 0 | 1 | 0.01 | **0.85** |
| `hum.fog.amount` | Fog strength *(alias scene `field.alpha`)* | 0 | 1 | 0.01 | **1** |
| `hum.waves.opacity` | Far waves strength *(alias scene `waves.opacity`)* | 0 | 1 | 0.01 | **0.3** |
| `hum.waves.speed` | Far waves speed *(alias scene `waves.speed`)* | 0 | 3 | 0.05 | **0.6** |

### Seksi 20 — Glow (her whole picture)  (scope `humanoid`)

| key | label (teks persis) | min | max | step | default |
|---|---|---|---|---|---|
| `hum.glow.strength` | Glow strength *(alias scene `bloom.strength`)* | 0 | 3 | 0.05 | **0.9** |
| `hum.glow.threshold` | Only brighter than this glows *(alias scene `bloom.threshold`)* | 0 | 1 | 0.01 | **0.6** |
| `hum.glow.radius` | Glow reach *(alias scene `bloom.radius`)* | 0.1 | 1 | 0.01 | **0.62** |

## 6. Mesin garis (inti visual MIRA)

Shader "wire" custom dibangun dari **satu BufferGeometry ter-index** yang memuat semua
garis sebagai strip segitiga (2 verteks per titik, 6 indeks per segmen). Atribut
per-verteks yang terbukti:

| atribut | isi |
|---|---|
| `position` | posisi titik |
| `aDir` | arah (selisih titik ±2) — dipakai untuk orientasi strip |
| `uv` | `x = t` sepanjang garis, `y = ±1` sisi strip |
| `aT` | waktu kemunculan titik (untuk efek menggambar) |
| `aCol` | warna garis |
| `aS` | jarak kumulatif sepanjang garis |
| `aLen` | panjang total garis |
| `aId` | indeks garis |
| `aSketch` | 0 = garis bersih, 1 = garis sketsa |
| `aEnd` | `min(cum, len - cum)` — jarak ke ujung terdekat |
| `aF` | waktu warna garis itu "jadi" |

Atribut lain yang terbukti ada di bundle (layer berbeda): `aPhase`, `aRest`, `aFly`,
`aStay`, `aStr`, `aSeed`, `aTurns`, `aTArr`, `aTRev`, `aSize`, `aTw`, `aKind`,
`aU`, `aW`, `aZ`, `aKind`.

**Default material wire (verbatim dari bundle):**
```js
{
  transparent: true, depthWrite: false, depthTest: true, side: DoubleSide,
  blending: /* additive */,
  uniforms: {
    uTime: 0, uRes: Vector2(1,1), uHalfPx: 4, uCorePx: 0.6,
    uSoftLine: 3, uSoftSketch: 3, uGlowLine: 1, uGlowSketch: 1,
    uRest: 1, uSettle: 0, uHot: 3.2, uGain: 0.95, uIdle: 0,
    uPulse: 0.7, uPulseSpeed: 1, uLiveT: 0, uSketchBright: 0.55,
    uFade: 1, uTaper: 26,
  }
}
```
Plus uniform muka: `uFace: Vector4`, `uFaceA: Vector4`, `uFaceSize: 1`.

## 7. Shader — salin verbatim, termasuk komentarnya

Komentar di dalam shader asli memuat niat desain penulisnya. **Contoh nyata dari
bundle** (shader "ribbon" dekat orb) — perhatikan komentar `sections 12-13` dan
aturan `ONE bright folding edge ... never two clean edges with a uniform fill`:

```glsl
precision highp float;
uniform float uTime, uOpacity, uEnergy, uSeed;
uniform vec2 uOrbPx;      // the ring's centre in this canvas's pixels (lib/orbScreen, y up)
uniform float uOrbR;      // its radius in the same pixels
varying vec2 vUv;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm3(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; } return v; }
```
> Blok di atas saya salin apa adanya dari bundle, tetapi **jangan berhenti di sini**.
> Ambil shader utuh (vertex + fragment, semua pass) langsung dari bundle dengan skrip
> Fase 1.3, lalu salin verbatim. Yang boleh kamu andalkan dari file spec ini hanya:
> keberadaan shader itu, bentuk fungsinya (`hash`/`noise`/`fbm3`), paletnya, dan
> konstanta-konstanta di bawah.

**Palet ribbon (dari bundle):**
```glsl
vec3 dark    = vec3(0.24, 0.08, 0.52);
vec3 violet  = vec3(0.48, 0.20, 1.00);
vec3 brightV = vec3(0.72, 0.38, 1.00);
vec3 lav     = vec3(0.88, 0.72, 1.00);
vec3 white   = vec3(1.00, 0.92, 1.00);
```
Konstanta penting: `smoothstep(0.0, 0.16, vUv.y)` untuk sisi terang,
`smoothstep(0.10, 0.95, vUv.y) * 0.55 + 0.10` untuk badan,
`endFade` pada `0.0–0.14` dan `0.86–1.0`,
`fold = pow(1.0 - abs(f * 2.0 - 1.0), 8.0)`,
`hot = pow(smoothstep(0.66, 0.84, light), 1.5)`,
dan **mask belakang orb**: `smoothstep(uOrbR * 0.92, uOrbR * 1.28, distance(gl_FragCoord.xy, uOrbPx))`
— tidak ada ribbon yang boleh terlihat di dalam ring emas.

**Shader wire fragment** — aturan yang tertulis di komentarnya dan wajib ditaati:
- `NO BLUNT CUTS (round 6)`: garis menipis & memudar di ujungnya, ujung gambar fade in.
- `HOT, then its own colour (vF)`: flare mengikut warna garis sendiri,
  **tidak pernah sketsa putih** (kutipan asli di komentar: *"the build of white lines look bad"*).
- Ada `shockAt(vPos)` (gelombang ignition), `faceColor(vPos)`/`faceGlow(vPos)`,
  `underHair(vPos)` dari `lib/miraHairPic` (`HAIR_ZONE_GLSL`).
- Pulse saat diam: `head = mod(uLiveT * (120.0 + vId * 160.0) * uPulseSpeed + vId * 3000.0, vLen + 900.0)`,
  panjang ekor `150.0`.

**Uniform shader lain yang terbukti:**
`uBT`, `uClock`, `uFaceSize`, `uFill`, `uGain`, `uHalfPx`, `uHead`, `uHeadH`, `uHeadOn`,
`uOn`, `uOpacity`, `uOrbR`, `uRest`, `uShockW`, `uStep`, `uTime`, `uHairOff` (vec2),
`uOrbPx` (vec2), `uRes` (vec2), `uSize` (vec2), `uCol`/`uColor` (vec3), `uCore` (vec3),
`uHeadPivot` (vec3), `uHzSkull` (vec3), `uCoreT` (vec4), `uFace` (vec4), `uFaceA` (vec4),
`uHeadPose` (vec4), `uHz` (vec4), `uReveal` (vec4), `uShock` (vec4).

**Uniform pas-efek layar penuh:** `iAlpha`, `iClear`, `iDebug`, `iEnergy`, `iField`,
`iHotLo`, `iMatter`, `iNear`, `iRes`, `iRing`, `iSpread`, `iState`, `iTime`.

**Mode debug internal** (array verbatim):
`["", "orb", "mask", "breakup", "near", "hot", "nearhot", "core", "corehot"]`
diaktifkan lewat `?mira_debug=<mode>` atau `window.__MIRA_DEBUG`;
`?hot=<0..1>` menimpa ambang `hotLo` (default `0.5`).

## 8. Modul internal yang terbukti (nama diambil dari komentar di dalam bundle)

Bundle aslinya merujuk **8 modul** dengan nama `lib/...`. Rebuild-mu harus punya
8 modul terpisah dengan tanggung jawab yang sama:

| Modul | Bukti / isi |
|---|---|
| `lib/orbScreen` | proyeksi pusat & radius ring ke piksel canvas, **sumbu y ke atas** |
| `lib/miraHairPic` | `HAIR_ZONE_GLSL`, `underHair(pos)` — zona rambut di atas gambar |
| `lib/figureHead3d` | kepala 3D: rambut & garis menumpang "soft shell" kepala; `hairSource` = titik layar berasal dari mana; ada konsep `z`, `turn weight`, `facing direction u`, `lift` (px) |
| `lib/miraBuild` | timeline ignition: `flicker`, `touchWave`, `revealAt` |
| `lib/miraFace` | debu/garis di wajah menangkap cahaya saat dia bicara |
| `lib/miraDebug` | `HOT_THRESHOLD_DEFAULT` + 9 mode debug view |
| `lib/miraDial` | widget slider panel (nama class `dial.` ada di bundle) |
| `lib/miraPace` | "pace clock" — `uLiveT` yang menggerakkan pulse di sepanjang garis |

## 8b. Komentar niat desain — harta paling berharga di bundle ini

Bundle MIRA memuat komentar shader yang **menjelaskan aturan visual penulis aslinya**.
Ini yang membedakan "mirip" dari "sama". Salin komentar-komentar ini ke dalam shader
rebuild-mu dan **patuhi aturannya**. Daftar lengkap ada di `mira-design-comments.txt`
(19 baris). Yang paling mengikat:

- *"a MIRA ribbon (the near-orb correction, sections 12-13): ONE bright folding edge,
  a fading translucent body, broken secondary detail - never two clean edges with a
  uniform fill"*
- *"NO BLUNT CUTS (round 6): a line thins and fades into its ends, and the drawing
  front fades in"*
- *"HOT, then its own colour (vF): the flare carries the line's own colour - never a
  white sketch (Ruben: "the build of white lines look bad")"*
- *"THE TURNED HEAD'S LIGHT (Apex rounds 20-22): the far side is a shadow not a smear,
  the edge glows as the profile …"*
- *"background 20% in the hierarchy … pulled back again to ~25% for the core-matter
  round (section 22): faint atmosphere only"*
- *"measured in the lab (debug view 5): this field crosses 0.48 in 2-4 places at a
  time and almost never 0.56, so the working threshold is ~0.50
  (lib/miraDebug HOT_THRESHOLD_DEFAULT), not the 0.64 the note started from"*
- *"a real strike flashes, drops out, re-strikes, then fades (the same beats as
  lib/miraBuild flicker)"*
- *"a seat holds her shape until her ignition's wave reaches it, then melts into her
  picture - lib/miraBuild revealAt"*

Perhatikan: spesifikasi aslinya punya **penomoran seksi** (terlihat: 12, 13, 20, 21, 22)
dan **penomoran ronde revisi** (round 4, 6, 8, 20-22). Artinya visual ini hasil iterasi
puluhan ronde. Jangan "memperbaiki" apa pun yang terlihat aneh — keanehan itu disengaja.

## 8c. Palet background field (dari shader field, terpisah dari palet ribbon)

```glsl
vec3 violetDeep   = vec3(0.18, 0.05, 0.38);
vec3 violetMain   = vec3(0.48, 0.20, 1.00);
vec3 violetBright = vec3(0.72, 0.38, 1.00);
vec3 lavender     = vec3(0.88, 0.72, 1.00);
vec3 baseViolet   = vec3(0.40, 0.12, 0.92);
vec3 whiteViolet  = vec3(1.00, 0.95, 1.00);
```
Komposisi alpha field (verbatim, perhatikan bobot tiap lapisan):
```glsl
float alpha = iAlpha * (membraneL * 0.5  * iField + membrane * 0.26 * iMatter
                      + ridgeL    * 0.07 * iField + ridgeA   * 0.30 * iMatter
                      + ridgeB    * 0.42 * iField);
float visibility = smoothstep(0.32, 0.70, fbm(warped * 0.6 + 12.0 + vec2(slowT * 0.3, -slowT * 0.2)));
visibility = mix(visibility, 0.55 + 0.45 * visibility, iSpread);   // fog seluruh layar
```
Hotspot: `energyHot = smoothstep(iHotLo, iHotLo + 0.07, energyField)` dengan
`energyField = fbm3(warped * 1.5 + vec2(hotT * 0.28, -hotT * 0.21))`.

## 9. State machine

`IDLE` → `LISTENING` → `TALKING`, dengan parameter penguat dari seksi **Her states**:
`talkSpeed` (def 2.0), `talkBright` (1.35), `listenSpeed` (1.5), `listenBright` (1.15).
`The build` adalah timeline ignition: `hum.build.core`, `hum.build.matter`,
`hum.build.shock`, `hum.build.surge` — keempatnya default 1.0.

## 10. Hand tracking & audio

- MediaPipe `HandLandmarker.createFromOptions`, WASM `@0.10.14`,
  model `hand_landmarker.task` (float16).
- Gesture yang dipakai: **point** dan **pinch** (pinch = "menyentuh" dia →
  `hum.touch.wave`).
- Audio: `16× createOscillator` (`sine` dominan, ada `triangle` & `sawtooth`),
  `36× createGain`, `8× createBiquadFilter` (`lowpass`, `bandpass`),
  `5× createBufferSource`, `4× createWaveShaper`, `2× createConvolver` (reverb),
  `4× createStereoPanner`, `3× createAnalyser`, `1× createDynamicsCompressor`.
  Tidak ada file audio — semua disintesis.
- `AnalyserNode` → RMS → uniform (`uEnergy`, `iEnergy`) dan flare ring per suku kata
  (`voice.ring`, def 2.0).

## 11. Yang HARUS lolos Gerbang B

Panel harus punya **tepat 82 slider** dalam **20 seksi berurutan** seperti tabel di atas,
dengan `key`, `label`, `min`, `max`, `step`, dan nilai default yang identik.
Perhatikan jebakan:
- Grup `Her hair` muncul **dua kali** (seksi 10: 1 param; seksi 14: 8 param).
- 7 param `humanoid` punya alias ke param `scene` lewat field `stands:` —
  menggerakkan slider humanoid harus mengubah nilai scene pasangannya.
- Default `hum.*` sering **berbeda** dari pasangan scene-nya
  (mis. `hum.glow.threshold` 0.6 vs `bloom.threshold` 0.18;
  `hum.fog.spread` 0.85 vs `field.spread` 0;
  `hum.waves.speed` 0.6 vs `waves.speed` 3). Jangan disamakan.
