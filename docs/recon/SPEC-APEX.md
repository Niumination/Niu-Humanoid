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
