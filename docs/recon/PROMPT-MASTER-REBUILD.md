# MASTER PROMPT — Rebuild Ulang Live Demo Vercel Tanpa Source Code

> Cara pakai: salin **SELURUH** isi blok di bawah ini (dari `# ROLE` sampai `# ATURAN MAIN`)
> ke agent pembangun (Claude Code / Cursor / Codex / Arena). Tambahkan di bagian atas:
> **TARGET = apex-humanoid** atau **TARGET = mira-humanoid**, dan lampirkan file
> `SPEC-APEX.md` / `SPEC-MIRA.md` sebagai suplemen wajib.

---

```markdown
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
```
