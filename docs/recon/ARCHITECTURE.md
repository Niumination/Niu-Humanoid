# ARCHITECTURE — Fase 2 (P7)

Dokumen ini **hanya berisi yang punya bukti**: artefak `recon/`, bundle, atau pengukuran runtime
(`ground-truth/`). Nama komponen/modul boleh dipilih bebas; **jumlah, tanggung jawab, dan batas modul**
mengikuti bukti. Semua yang belum terbukti ditandai **UNVERIFIED** dan dikumpulkan di §7.

Sumber utama: `apex.js`, `mira.js`, `shaders/` (26 shader APP), `hooks.md`, `params-verified.md`,
`audio/`, `timings.json`, `ui-copy.*.txt`, `ground-truth/`.

---

## 0. Gerbang Fase 2 — status

Syarat keluar Fase 2: *setiap string UI dari P2 punya pemilik.* **LULUS** —
33/33 string APEX dan 38/38 string MIRA punya komponen pemilik (§5).
Tiga string sengaja **tidak** diberi komponen UI karena bukan milik UI: `running` (enum status audio),
`Face light size` (label skema panel), `dial.` (prefix kunci penyimpanan) — ketiganya diberi pemilik di modul non-UI.

---

## 1. APEX — pohon komponen

Bukti jumlah: 3 canvas, 1 img, 9 tombol, 2 `data-testid`, 1 section, 1 img backdrop, `getContext("2d")` 8×,
`getContext("webgl2")` 1×, 3 shader APP.

```
<App>                                   // entry ⟷ humanoid (state `entered`)
├── <EntryScreen>                       // APEX HUMANOID / subtitle / ENTER / footnote
│   └── <EnterButton>                   // klik = gesture → resume AudioContext + mulai birth
└── <HumanoidMode>                      // data-testid="humanoid-mode"
    ├── <PortraitFrame>                 // data-testid="humanoid-portrait-frame"
    │   ├── <BackdropImage>             // backdrop-v1.webp 1672×941, full-bleed
    │   ├── <ComposeCanvas2D>           // canvas 1440×900 — KOMPOSISI (5 blend mode)
    │   ├── <HumanoidCanvas2D>          // canvas 900×900 — plate/partikel (2 shader APP 2D)
    │   └── <PortraitCanvas>            // canvas 900×900 — frame portrait
    ├── <StatusReadout aria-live=polite>// "STATUS: <STATE>" (+ "INTENSITY: HIGH" — UNVERIFIED)
    ├── <TopLeftControls>
    │   ├── <ExitButton aria-label="Exit humanoid view">      // teks "EXIT"
    │   └── <CameraButton aria-label="Open hand gesture">    // teks: Open hand gesture / Open camera now / Close camera
    │       └── <CameraStatusLine>      // Finger tracking is on / Camera tracking is on — open controls / camera unavailable
    ├── <StateButtons>                  // idle · listening · thinking · speaking (+ strong — UNVERIFIED terlihat)
    ├── <BottomBar>
    │   ├── <MicButton>                 // "🎙 MIC" + ON/OFF
    │   ├── <ReplayButton>              // "↻ REPLAY"  (aria/teks lain: "Run the birth again")
    │   └── <SoundButton>               // "♪ SOUND ON" / "♪ SOUND OFF"
    └── <BirthReadout>                  // "ASSEMBLING... NN%" (hilang saat build selesai)
```

**Hook & driver (bukan komponen visual):**

| modul | tanggung jawab | bukti |
|---|---|---|
| `lib/humState` | state machine `idle/listening/thinking/speaking/strong` + blend `{a,b,r}` → `uStateA/uStateB/uBloomR`, `uTexA/uTexB` | `__HUM_BLEND` 6×, `__HUM_ENERGY` |
| `lib/humTimeline` | timeline birth: `{total:7.4, ignition:6.2, hornPeak:6.2+3.2*.19}` + tabel `{con:.34, chk:1.55, thr:5.35, call:5.92, set:10.1, end:13.1}` | literal `Rs`/`TE` di bundle; `ASSEMBLING... N%` |
| `lib/humPlate` | PRNG deterministik Lehmer (`x = x*16807 % 2147483647`) + 5 seed | seed **424171, 48271, 977231, 51733, 3311** |
| `lib/humAudio` | graph Web Audio: 16 osc / 35 gain / 7 filter / 4 buffer / 4 shaper / 2 convolver / 2 panner / 3 analyser / 1 comp (+1 `createPanner`) | `audio/apex-callsites.txt` |
| `lib/humHands` | MediaPipe HandLandmarker 0.10.14 lazy-load + gesture classes | `apex-finger-track`, `apex-gesture-quiet`, `apex-gesture-snap` |

---

## 2. APEX — state machine & timing

**State visual** (5): `idle` · `listening` · `thinking` · `speaking` · `strong`.
**State aplikasi** (dari bundle): `ready` → `assembly` → `needs_you` → `alert` / `failed` (`working` terpisah).

| transisi | durasi | bukti |
|---|---|---|
| crossfade state A→B | `v = {to, p:1, dur: .95}` → **950 ms** | bundle `useRef({to:…,p:1,dur:.95})` |
| fade tombol/HUD | `opacity 140ms` dan `opacity 900ms` | bundle + `css-inline.apex.txt` |
| ring base | `humRingBase 3.4s ease-in-out infinite` (opacity .22↔.32) | `@keyframes` di bundle |
| ring pulse | `humRingPulse 4.55s linear infinite` (scale 1→1.05, opacity 0→.26→0) | idem |
| blink HUD | `fadeInOut 1.6s ease infinite` (opacity .35↔1) | CSS global 224 B |
| birth total | **7,4 s**; ignition **6,2 s**; hornPeak **≈6,81 s** | `Rs={total:7.4,ignition:6.2,hornPeak:6.2+3.2*.19}` |
| update loop | `dt` **dijepit 50 ms** (`Math.min(.05, dt)`) | bundle |
| ambang "strong" | `(energy − 0.34) / 0.4` | bundle |

**Terukur di runtime** (assembly readout): t=0,2 → 3% · t=1 → 14% · t=2 → 27% · t=4 → 65% · selesai ≈7 s.
Kurva bukan linear sempurna → **UNVERIFIED** fungsi persennya (perlu ekstraksi fungsi `Math.round` di bundle).

---

## 3. APEX — komposisi layer

Urutan render (bawah → atas) dan blend mode menurut bundle + runtime:

| z | layer | sumber | blend | ukuran | bukti |
|---|---|---|---|---|---|
| 0 | latar | `backdrop-v1.webp` | `source-over` | 1440×900, full-bleed | runtime `img` 1672×941 |
| 1 | komposisi 2D | canvas 1440×900 | `source-over` → lalu `lighter`/`screen`/`plus-lighter` | `min(100vw,100vh)`, `object-fit: cover` | 5 mode ada di bundle |
| 2 | plate humanoid | canvas 900×900 (x=270) | `lighter` untuk partikel | 900×900 | runtime |
| 3 | potongan portrait | canvas 900×900 | `destination-in` (mask) | 900×900 | bundle |
| 4 | HUD/teks | DOM | `source-over` | overlay `rgba(0,10,14,0.72)` | runtime computed style |

- Properti yang dianimasikan per frame: `width, height, left, top, opacity` (verbatim bundle).
- Tipografi HUD: `clamp(9px, 1.05vmin, 13px)`; tombol state 11px; EXIT 12px, `letter-spacing 0.08em/0.16em`.

---

## 4. APEX — shader APP → sumber nilai uniform

| shader | peran | uniform → sumber |
|---|---|---|
| `01-vert-8504b-aU.glsl` | partikel humanoid (aBoil/aBucket/aBright) | `uStateA/uStateB/uBloomR` ← state blend · `uEnergy` ← RMS audio / `__HUM_ENERGY` · `uStrongMix` ← `(e−.34)/.4` · `uAttn` ← pointer/landmark (`__HUM_ATTN`) · `uClick` ← klik (`__HUM_CLICK`) · `uBoilAmp`/`uRim`/`uDotSharp` ← hook global · `uYaw/uPitch/uBreathe` ← animasi kepala · `uPalCyan/uPalPale` ← palet |
| `11-vert-1727b-mU.glsl` | starfield + vein (`aTw` sebagai MODE) | `uRest` ← `__HUM_BG_REST` (.22) · `uPulse` ← `__HUM_BG_PULSE` (2.6) · `uWave/uWaveK` ← shockwave ignition · `uMap` = `(2,−2,−1,1)` · `uSizeK` ← `min(devicePixelRatio, 1.5)` |
| `17-frag-1357b-lU.glsl` | sprite titik (THE TILE) | `uTexA/uTexB/uTexS` ← tekstur state + strong · `uStrongA/uStrongB` ← blend · `uDotSharp` ← `__HUM_DOT` · `uPatchUV` ← ukuran patch |
| `21-vert-1146b-uU.glsl` | mote ESCAPE-AND-RETURN | `uStr` ← intensitas state · `uSizeK`, `uPixelRatio` |

## 5. APEX — pemilik setiap string UI (gerbang Fase 2)

| string (persis) | pemilik |
|---|---|
| `APEX HUMANOID` · `a figure of light that assembles itself` · `ENTER` · `the click opens the audio - the birth has a sound` | `<EntryScreen>` |
| `STATUS: <STATE>` | `<StatusReadout>` |
| `STATUS: SPEAKING  INTENSITY: HIGH` | `<StatusReadout>` — **UNVERIFIED** (lihat F-10) |
| `ASSEMBLING... 25%` (format `ASSEMBLING... %d%%`) | `<BirthReadout>` |
| `EXIT` · aria `Exit humanoid view` | `<ExitButton>` |
| `Open hand gesture` · `Open camera now` · `Close camera` · aria `Open hand gesture` | `<CameraButton>` |
| `Finger tracking is on` · `Camera tracking is on — open controls` · `camera unavailable` | `<CameraStatusLine>` |
| `idle` `listening` `thinking` `speaking` (+`strong` UNVERIFIED) | `<StateButtons>` |
| `🎙 MIC ` + `ON`/`OFF` | `<MicButton>` |
| `↻ REPLAY` · `Run the birth again` | `<ReplayButton>` |
| `♪ SOUND ON` · `♪ SOUND OFF` | `<SoundButton>` |
| `Drive the speaking face from your microphone` | tooltip `<MicButton>` |
| `Apex cinematic humanoid` · `Animated cyan and gold Apex humanoid` · `humanoid-mode` · `humanoid-portrait-frame` · `aria-live="polite"` | a11y: `<HumanoidMode>`, `<PortraitCanvas>`, `<StatusReadout>` |
| `[vdiag] humanoid3d: WebGL context lost — pausing` / `restored — resuming` · `[vdiag] humanoid analysis FAILED (2D fallback):` | `lib/humDiag` (console, bukan UI) |

---

## 6. MIRA — pohon komponen

Bukti jumlah: 2 canvas, 1 img mask, 8 tombol, 2 `data-testid`, 3 class runtime, `getContext("2d")` 6×,
26 shader APP, 8 modul `lib/`.

```
<App>
├── <EntryScreen>                          // MIRA HUMANOID / subtitle / ENTER / footnote
└── <HumanoidMode>                         // className "mira-body" (di bundle)
    ├── <FieldCanvas>                      // canvas 1007×630, position:fixed; z-index:0 → shader field
    ├── <SceneCanvas>                      // canvas 1440×900 → WebGL: garis + ring + gambar + rambut
    │   ├── <PictureLayer>                 // mesh plane ← mira-idle-v1.webp sebagai MASK (brightness(0))
    │   ├── <WireLines>                    // 1 BufferGeometry ter-index, strip segitiga
    │   ├── <RibbonNearOrb>                // shader ribbon (sections 12-13)
    │   ├── <HairShell>                    // soft shell kepala 3D
    │   ├── <MatterBuild>                  // partikel ignition + trail
    │   └── <BoltLayer>                    // kilat
    ├── <TopLeft><CameraButton data-testid="mira-humanoid-camera" aria-label="Turn the camera (hand tracking) on or off">
    │            // teks: ENABLE CAMERA ⇄ CAMERA OFF
    │   └── <CameraStatusLine>             // 8 pesan persis (§5)
    ├── <BottomRow className="mira-page-row">
    │   ├── <StateButtons>                 // IDLE LISTENING TALKING (aria-pressed)
    │   ├── <MicButton>                    // MIC OFF/ON → "MIC " prefix readout
    │   ├── <ReplayButton>                 // REPLAY
    │   ├── <SpeedButton>                  // "SPEED 1x"
    │   └── <SoundButton data-testid="mira-humanoid-sound">  // SOUND ON/OFF (aria-pressed)
    └── <OwnRow className="mira-own-row">  // baris tombol milik halaman (posisi kanan-bawah di <720px)
```

**8 modul `lib/` wajib terpisah** (bukti: komentar bundle merujuk namanya):

| modul | isi terbukti |
|---|---|
| `lib/orbScreen` | proyeksi pusat+radius ring ke piksel canvas, **sumbu y ke atas** (`uOrbPx`, `uOrbR`) |
| `lib/miraHairPic` | `HAIR_ZONE_GLSL`, `underHair(pos)` |
| `lib/figureHead3d` | kepala 3D: `uHeadPose` (z, turn weight, facing u), `uHeadPivot`, `uHeadRows`, `uHz/uHzSkull/uHzInner`, `hairSource`, `lift` px |
| `lib/miraBuild` | timeline ignition: `flicker`, `touchWave`, `revealAt` (`uReveal`, `uShock`, `uShockW`) |
| `lib/miraFace` | debu/garis wajah menangkap cahaya saat bicara (`uFace`, `uFaceA`, `uFaceSize`) |
| `lib/miraDebug` | `HOT_THRESHOLD_DEFAULT = .5` + 9 mode (`""`,`orb`,`mask`,`breakup`,`near`,`hot`,`nearhot`,`core`,`corehot`) |
| `lib/miraDial` | skema 82 dial + alias `stands:` + `zt()/rN()` + persistensi + **`?dial.<key>=`** |
| `lib/miraPace` | pace clock → `uLiveT` (pulse sepanjang garis) |

**Modul non-`lib` yang terbukti dari pesan/string:** `lib/miraSound` (status `ready`/`failed`/`running`/`unavailable`, `apex_sound_off`), `lib/miraField` (pesan `[mira] field: …`), `lib/miraCamera` (8 pesan kamera).

---

## 7. MIRA — state machine & timing

- State: `IDLE` → `LISTENING` → `TALKING`; validasi terhadap daftar internal (`Jw`), fallback `idle`.
- Penguat state (dari 82 dial): `talkSpeed 2.0` · `talkBright 1.35` · `listenSpeed 1.5` · `listenBright 1.15`.
- `The build`: `core`, `matter`, `shock`, `surge` = 1.0.
- Transisi CSS: **`opacity .25s linear`** (satu-satunya di bundle MIRA).
- Blink: `fadeInOut 1.6s ease infinite`.
- Clock: `uLiveT` dari `lib/miraPace`; **bisa dipatok `?t=<detik>`** (bukti runtime).
- Pace/SPEED: tombol `SPEED 1x` → mengubah `speed` yang dipakai `lib/miraPace` (**UNVERIFIED**: daftar nilai).

---

## 8. MIRA — shader APP → sumber nilai

| shader | peran | uniform → sumber |
|---|---|---|
| `00-frag-14287b-cN` | FIELD layar penuh | `iAlpha`←`field.alpha` · `iField/iMatter`←`field.*`/`hum.fog.*` · `iSpread`←`field.spread`/`hum.fog.spread` · `iRing`←`ring.*` · `iNear`←`field.near` · `iHotLo`←`?hot`/`HOT_THRESHOLD_DEFAULT` · `iEnergy`←RMS · `iState`←state |
| `05-frag-4333b-Qk` | WIRE line frag | `uTaper 26` · `uHot 3.2` · `uSketchBright .55` · `uCorePx .6` · `uRest/uSettle/uGain/uIdle/uPulse/uPulseSpeed` ← `hum.lines.*` · `uLiveT`←`lib/miraPace` · `uShock/uShockW`←`lib/miraBuild` |
| `08-frag-3007b-Nk` | RIBBON near-orb | `uOrbPx/uOrbR`←`lib/orbScreen` · `uEnergy`←RMS · `uSeed`←konstan per instance |
| `21-vert-1360b-Zk` | WIRE line vertex | atribut `aCol/aDir/aS/aLen/aId/aSketch/aEnd/aF` ← generator garis; `uHalfPx`, `uRes` |
| `03-vert-5061b-Jk` + trail | matter build | `uCore,uCoreT,uShock,uShockW,uSettle,uLiveT,uMatter,uCoreA,uLag,uTrail,uDense` ← `hum.build.*` |
| `09/55-frag`, `72-vert` | gambar + reveal | `uReveal`←`lib/miraBuild revealAt` · `uHz*`←`lib/figureHead3d` · `uMap/uFill/uSize` |
| `24/52-vert`, `46-frag` | rambut | `uStep,uPxPerPic,uZRef,uBackK,uRim,uOn,uLifted,uPulse,uPulseSpeed` ← `hum.hair.*` |
| `38-frag`, `36-frag`, `67-vert` | kilat + gelombang | `uBright`←`hum.strike.bright` · `uShock/uShockW`←`hum.touch.wave`/build |
| 11 shader APP tanpa nama peran | tercatat di `shaders/INDEX.md` §"belum diberi nama" | — |

---

## 9. MIRA — aset & UI terukur

| aset | peran | bukti runtime |
|---|---|---|
| `mira-idle-v1.webp` 1145×1374 | **mask** siluet (`filter: brightness(0)`, `opacity: 0` di <img> sumber; mesh memakai tekstur yang sama) | `entered-1440x900.json` |
| `mira-hair-v1.webp` 1385×1422 | zona rambut (`HAIR_ZONE_GLSL`) | bundle |

UI: font `12px 'Share Tech Mono'`, `letter-spacing 0.14em` (terukur 1.68px), padding `8px 13px`,
bg `rgba(16, 6, 30, 0.72)`, aktif `rgba(196, 168, 255, 0.2)`, radius 9px, shadow `0 0 18px <warna>14`,
`aria-pressed` untuk SOUND / IDLE / CAMERA; breakpoint `max-width: 720px` untuk `mira-btn`, `mira-page-row`, `mira-own-row`.

## 10. MIRA — pemilik setiap string UI

| string | pemilik |
|---|---|
| `MIRA HUMANOID` · `a figure of light that weaves herself out of her own heart` · `ENTER` · `the click opens the audio - her build has a sound` | `<EntryScreen>` |
| `IDLE` `LISTENING` `TALKING` | `<StateButtons>` (+ readout) |
| `MIC ` · `SOUND ` · `SPEED ` (spasi trailing) | `<MicButton>`/`<SoundButton>`/`<SpeedButton>` readout |
| `REPLAY` · `Exit` | `<ReplayButton>` · `<ExitButton>` |
| `ENABLE CAMERA` · `CAMERA OFF` · `The camera is on` · aria `Turn the camera (hand tracking) on or off` | `<CameraButton>` |
| `loading hand tracking` · `starting the camera` · `camera on - show your hand` · `hand found - point, pinch to touch her` · `no camera found` · `camera blocked - allow it in the browser settings` · `this browser has no camera access here` · `camera unavailable` | `<CameraStatusLine>` (`lib/miraCamera`) |
| `context lost` · `no log` | `lib/miraField` (overlay status) |
| `running` | `lib/miraSound` (enum, bukan UI) |
| `While she talks, her voice follows your microphone's loudness` | tooltip `<MicButton>` |
| `mira humanoid` | nama renderer/scene (`renderer.name`) |
| `Face light size` | `lib/miraDial` (label dial `hum.face.size`) |
| `dial.` | `lib/miraDial` (prefix URL/localStorage) |
| `mira-btn` `mira-page-row` `mira-own-row` `mira-body` `mira-humanoid-camera` `mira-humanoid-sound` `miraEnter` `miraExit` | class CSS di komponen masing-masing |

---

## 11. Peta UNVERIFIED (harus ditutup di P8/P9)

| # | item | kenapa belum pasti | cara menutup |
|---|---|---|---|
| U-1 | `STATUS: SPEAKING  INTENSITY: HIGH` (dua spasi) | runtime hanya memperlihatkan `STATUS: SPEAKING` | uji dengan mic nyata / `__HUM_ENERGY` tinggi |
| U-2 | state `strong` di UI | `?state=strong` jatuh ke IDLE | picu via `?surge=` + energy |
| U-3 | fungsi persen `ASSEMBLING... N%` | kurva tidak linear, fungsi belum diekstrak | ekstraksi `Math.round(...)` di bundle |
| U-4 | nilai `SPEED 1x` (daftar percepatan MIRA) | tombol siklik, nilai belum dibaca | klik berulang + baca label |
| U-5 | 11 shader APP MIRA tanpa nama peran | hanya uniform yang terbaca | tinjauan silang dengan pemanggil di bundle |
| U-6 | arti numerik `?voice/?talk/?listen` | hanya nama yang terbukti | uji runtime + readout |
| U-7 | daftar state valid MIRA (`Jw`) | literal belum diekstrak | ekstraksi di Fase 1 lanjutan |
| U-8 | `miraEnter`/`miraExit`/`mira-body` dipakai di mana | tidak muncul di runtime | cari pemakaian di bundle |
| U-9 | PRNG MIRA | `Math.random()` dipakai (43×, banyak di region app) → **tidak deterministik** | akui sebagai deviasi Gerbang C |
| U-10 | panel 82 slider tidak dirender | hanya array + `?dial.` yang ada | putuskan: rebuild **dengan** panel (setia pada spec) atau **tanpa** (setia pada perilaku live) |

---

## 12. Konsekuensi untuk Fase 3–4 (koreksi rencana)

1. **APEX dulu** — masih valid, tapi entry tidak bisa dilewati; semua uji Gerbang A/C harus mensimulasikan klik.
2. **Gerbang B berubah objek ukurnya**: dari DOM slider → array 82 dial + `?dial.<key>=` + persistensi localStorage.
3. **Gerbang C APEX butuh ambang terukur**, bukan 0%: baseline live-vs-live = `>32/255: 3,06%`, `MAE 3,76`.
4. **PRNG APEX deterministik** (5 seed Lehmer diketahui) → area partikel APEX **bisa** bit-identik;
   **PRNG MIRA tidak** (Math.random) → deviasi resmi, wajib dicatat di `REBUILD-LOG.md`.
