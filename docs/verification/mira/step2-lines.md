# MIRA langkah 2 — mesin garis: hasil verifikasi

**Tanggal** 2026-10-30 · **Viewport** 1440×900, DPR 1 · **state** `?auto=1&state=idle`
**Live** https://mira-humanoid.vercel.app · **Rebuild** http://127.0.0.1:5190

## 1. Ekstraksi garis (gambar → garis)

Sumber acuan: byte RGBA **persis** yang dipakai live (`drawImage` → kanvas 573×687 → `getImageData`),
diambil `tools/probe-mira-pixels.js`; pesan konsol live diambil `tools/probe-mira-console.js`.

| besaran | live | rebuild | hasil |
|---|---|---|---|
| garis outline | 3 | 3 | ✅ |
| garis dalam | 81 | 81 | ✅ |
| putih / violet / emas | 25 / 34 / 25 | 25 / 34 / 25 | ✅ |
| butir debu | 4492–4500 (acak per run) | 4500 (acak per run) | ✅ (rentang sama) |
| bintang | (574, 1008) | (574, 1008) | ✅ |
| titik / garis | 3792 / 84 | 3792 / 84 | ✅ |
| ukuran ekstraksi | 573×687 (`round(w·0,5)`) | 573×687 | ✅ |
| waktu ekstraksi | 337–444 ms | 285–342 ms | ✅ |

## 2. Mesh garis (garis → buffer GPU) — **bukti terkuat**

Live: `tools/probe-mira-buffers2.js` membungkus `gl.bufferData`/`bufferSubData` dan menyimpan **seluruh array
verteks** yang diunggah saat `drawElements(22248)` → `recon/ground-truth/mira/wire-buffers/`.
Rebuild: `recon/verify-mira-wire.mjs` membangun mesh dari port `lF()` lalu membandingkan elemen demi elemen.

| atribut | panjang | maxdiff | elemen berbeda |
|---|---|---|---|
| position | 22752 | **0** | 0 |
| aDir | 22752 | **0** | 0 |
| uv | 15168 | **0** | 0 |
| aT | 7584 | **0** | 0 |
| aCol | 22752 | **0** | 0 |
| aS | 7584 | **0** | 0 |
| aLen | 7584 | **0** | 0 |
| aId | 7584 | **0** | 0 |
| aSketch | 7584 | **0** | 0 |
| aEnd | 7584 | **0** | 0 |
| aF | 7584 | **0** | 0 |
| index | 22248 | **0** | 0 |

**12/12 buffer IDENTIK** — bukan "mirip". `drawElements` rebuild = 22248 = live.

## 3. Uniform yang diset (nilai terukur dari live, `recon/mira-wire-draws.json`)

`uHalfPx 8,2` (= `0,6 + 3·2,2 + 1`), `uCorePx 0,6`, `uSoftLine/uSoftSketch 3`, `uGlowLine/uGlowSketch 1`,
`uRest 0,15`, `uSettle 1`, `uHot 3,2`, `uGain 0,95`, `uIdle 0`, `uPulse 0,7`, `uPulseSpeed 1`,
`uSketchBright 1`, `uFade 1`, `uTaper 26`, `uShockW 9`, `uShock [574,1008,0,0]`,
`uHz [575.292,295.41,22,1]`, `uHzSkull [179.922,274.8,217.092]`, `uHzInner [158.148,302.28,136.026]`,
`uFace [575.292,359.988,112.308,222.588]`, `uFaceA [0,0,0,0]`, `uFaceSize 1`, `uHeadH 1374`,
`uHeadPivot [571,557,23.28]`, `uHeadPose [0,0,0,0]`, kamera `modelViewMatrix` skala 0,002932240255177021
(`ty` 1,7906214, `tz` −4,8), `projectionMatrix` fov 50° near 0,1 far 2000.

## 4. Yang belum (dan karenanya belum diklaim)

- `uHeadRows` masih tekstur nol → lekuk kepala (z per baris) belum ada; garis tetap di bidang datar.
- Lapisan gambar (`06/07`), rambut (`30/31`), ring/orb (`26`), latar (`01`), debu materi, bloom (langkah 8).
- Karena itu **Gerbang C (piksel) belum dijalankan** untuk langkah ini; tangkapan `build-step2.png`
  hanya bukti kualitatif bahwa geometri, warna, dan ketebalan garis sudah benar.

## 5. Model kepala + `uHeadRows` (rowTexture) — **IDENTIK**

Ground truth: `tools/probe-mira-rows.js` membungkus `texSubImage2D` di halaman live dan menyimpan
isi tekstur `1×1374 RGBA32F` (`recon/ground-truth/mira/rows-1x1374.f32`, 5496 float).
Rebuild menghitungnya dari port `YN`/`ZN`/`QN` (`src/lib/miraHead.ts`) **di dalam browser**.

| kanal | arti | maxdiff |
|---|---|---|
| r | centre x per baris | **0** |
| g | half width per baris | **0** |
| b | turn weight | **0** |
| a | depth share | **0** |

`uHeadPivot` rebuild **[571, 557, 23.279999999999998]** = live **[571, 557, 23.28]**.
Runner: `recon/verify-mira-head.mjs`.

### Temuan yang menentukan kecocokan ini (F-59)

Bundle menyiapkan mask kepala di kanvas berukuran **`SN.width × SN.height` = 1146×1374**, bukan ukuran
gambar asli 1145×1374:

```js
g.width = m.width; g.height = m.height;         // 1146 × 1374
v.drawImage(r, 0, 0, m.width, m.height);        // gambar 1145 diperlebar 1 px
px = v.getImageData(0, 0, m.width, m.height).data
```

Memakai gambar asli 1145 px memberi cx/hw meleset 0,59 px dan `neckY` 565 (live 557). Memakai 1146 px
memberi **maxdiff 0**. Sumber 1146: `SN` mengembalikan `width = lebar_kanvas/scale = 573/0,5`.

## 6. Lapisan gambar (kuad isi + kuad warna + awan titik) — terpasang, geometri identik

| lapisan | shader | status |
|---|---|---|
| sprite cahaya latar/asap | `02/03` (SpriteMaterial) | terpasang; saat idle warnanya hitam/dim → tidak menyumbang |
| kuad ISI gambar | `04-vert` + `05-frag` | terpasang; blend `ZERO / ONE_MINUS_SRC_ALPHA` |
| kuad WARNA gambar | `04-vert` + `06-frag` | terpasang; blend `ONE / ONE` |
| awan titik gambar 103.367 | `07-vert` + `08-frag` | terpasang; `aRest/aKind/aZ` **maxdiff 0** vs live |
| garis 22.248 indeks | `09-vert` + `10-frag` | terpasang; 12/12 buffer identik (bagian 2) |

Koreksi render yang ditemukan lewat tangkapan layar (bukan tebakan):
1. `UNPACK_FLIP_Y_WEBGL = true` (three default) — tanpa ini seluruh gambar terbalik.
2. Kanvas panggung live **1007×630** (rasio 0,7) sementara kanvas latar 1440×900; `uRes` = ukuran jendela.

**Selisih piksel sekarang (1 frame, 1440×900): 39,7 % > 32/255, MAE 36,8/255.**
Angka ini **belum** gerbang C dan memang diharapkan besar: latar (shader `01`), rambut (`30/31`),
materi 54.492 titik, busur inti/mahkota, orb, dan bloom belum ada. Tangkapan: `build-stage2.png`,
`build-stage3.png` vs `live-step2.png`.

## 7. Latar medan nebula (`00-vert` + `01-frag`)

| hal | terukur di live | rebuild |
|---|---|---|
| kanvas | 1007×630 (resolusi kerja 0,7) | FBO 0,7 di dalam kanvas figur, di-blit LINEAR |
| `iField` / `iMatter` | ramp 0→1 selesai ~0,35 s lalu tetap 1 | 1 (fase ignition lewat; ramp masuk langkah 3) |
| `iCenter` / `iRing` | `[0,500938, 0,691200]` / `0,123858` | sama |
| `iSpread` / `iAlpha` / `iNear` / `iHotLo` | 0,85 / 1 / 1,45 / 0,5 | sama |
| `iClear` / `iState` / `iEnergy` / `iDebug` | 0 / 0 / 0 / 0 | sama |
| blend / depth | blend **false**, depth false | sama |

## 8. Tiga cacat render yang ditemukan & diperbaiki (semua lewat perbandingan potongan 8×)

1. **Warna gambar terlalu terang & pinggiran merah/magenta** → tekstur harus `SRGB8_ALPHA8` (live memakainya),
   bukan `RGBA8`.
2. **Pinggiran masih ada di tepi siluet** → `UNPACK_PREMULTIPLY_ALPHA_WEBGL = true` + kanvas `alpha:false`.
   64.335 piksel asset menyimpan warna terang pada alpha < 40; blend `ONE/ONE` menampilkannya.
3. **Pita magenta pada ujung garis** → bukan cacat garis: sisa (1) dan (2) di kuad gambar, yang di live tertutup
   materi/rambut/bloom.

## 9. Selisih piksel sesudah lapisan latar + gambar (1 frame, 1440×900, jam ~60 s)

| tahap | > 32/255 | > 8/255 | MAE |
|---|---|---|---|
| garis saja (langkah 2 awal) | 71,6 % | — | — |
| + kuad gambar (salah: RGBA8, tanpa premultiply) | 39,7 % | 87,4 % | 36,8 |
| + medan nebula | 20,5 % | 32,1 % | 26,5 |
| + sRGB + premultiply + blit 0,7 (**sekarang**) | **16,4 %** | **31,2 %** | **17,3** |

Sisa selisih terkonsentrasi pada: cahaya/bloom (langkah 8), rambut (`30/31` + gambar rambut), materi 54.492 titik,
busur inti/mahkota, orb. **Gerbang C tetap belum dijalankan** — ia baru bermakna setelah lapisan-lapisan itu ada.

## 10. Bloom (langkah 8 versi MIRA) — terpasang dengan shader live

`postprocessing` di live memakai `BloomEffect`: luminansi (`THRESHOLD`/`COLOR`) → 8 mip turun (12 tap) →
8 mip naik (9 tap, `radius` 0,62) → komposit (`ENCODE_OUTPUT`, `e0Intensity` 0,9). Keempat pasang shader
disalin apa adanya dari `recon/shaders/mira-allsrc/` (ditangkap dengan membungkus `shaderSource`, karena
pass ini dulu tidak masuk daftar 36 shader aplikasi).

Pipeline rebuild sekarang:
1. medan `01-frag` → FBO 1007×630 → blit ke kanvas (opaque, tidak ikut bloom)
2. figur (sprite · kuad isi · kuad warna · titik · garis) → render target RGBA16F penuh
3. luminansi → 8 mip turun → 8 mip naik → komposit ke kanvas (`ONE, ONE_MINUS_SRC_ALPHA`)

| metrik (1 frame 1440×900) | tanpa bloom | dengan bloom | live |
|---|---|---|---|
| rata-rata kecerahan | 29,2 | **36,6** | 41,7 |
| piksel > 32/255 vs live | 16,4 % | 23,9 % | — |
| MAE vs live | 17,3 | 19,4 | — |

Angka MAE naik karena cahaya sekarang ada di tempat yang di live juga ada (sebelumnya gelap); sisa selisih
didominasi dua lapisan yang belum dibuat: **rambut** (`30/31` + gambar rambut 1385×1422) dan **materi**
(54.492 titik, `11/12` + `uLifted`), lalu busur inti/mahkota (`13/16`, `15/16`), orb (`25/26`), percikan (`27/28`).

## 11. Rambut (`29-vert` + `30-frag`) dan koreksi blend

| hal | terukur live | rebuild |
|---|---|---|
| geometri | 1 kuad, 4 verteks, 6 indeks | sama (`[0,0] … [1385,1422]`) |
| `uSize` | `[1385, 1422]` | sama |
| `uUp` / `uSide` / `uMass` | 48 / 120 / 0,7 | sama |
| `uEarY` / `uTop` / `uHead` / `uHairOff` | 343,41 / 0,6 / `[694,79, 322,80]` / `[120,48]` | sama |
| modelView | geser `(-2,0320425, 1,9313689)` | sama |
| blend | `ONE, ONE / ZERO, ONE` | `blendFuncSeparate` (lihat §12) |

**§12 — cacat kotak hitam & perbaikannya.** Semua lapisan figur kini memakai
`blendFuncSeparate(ONE, ONE, ZERO, ONE)` seperti live; sebelumnya `blendFunc(ONE, ONE)` menaikkan alpha sehingga
komposit menganggap seluruh kotak kuad sebagai figur dan menutup latar dengan hitam.
Bukti: `build-stage14.png` (kotak hitam) → `build-stage15.png` (latar menembus, rambut menyatu).
