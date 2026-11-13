# P11 — Paritas lapisan latar APEX (sesi 57)

Gerbang ukur: `tools/gate-apex.js` — dua viewport (1440×900, 390×844), `?auto=1&state=idle&surge=1.5`,
`__HUM_BG_T = 3.0`, tunggu 13 s, pelaporan MAE + porsi piksel beda > 32 + pita luma.
Semua angka adalah **rerata luminansi** hasil tangkapan layar, bukan opini visual.

## 1. Angka gerbang

| tahap | 1440 MAE / over32 | 390 MAE / over32 |
|---|---|---|
| awal P11 (build `index-DyoQ8hKN.js`) | 11,35 / 10,39 % (derau 1,39) | 8,58 / 7,29 % (derau 1,38) |
| setelah F-153…F-156 (build `index-Ct4QlgXS.js`) | **7,78 / 7,22 %** · 7,70 / 7,08 % · 7,35 / 6,75 % — rerata **7,61 / 7,02 %** | **7,03 / 6,63 %** |

Perbaikan: **−33 %** MAE di 1440, **−18 %** di 390. Derau gerbang 1440 tetap 0,6–4,2 ⇒ selisih > 2
baru boleh disebut perbaikan; ketiga run konsisten di bawah 7,8.

Pembanding tambahan: build vs **produksi sendiri** (`https://niu-humanoid.vercel.app/`) kini
6,69 / 5,35 % (sebelumnya 0,52 / 0,56 %). Ini **disengaja**: bawaan berubah untuk meniru APEX,
jadi angka 0,0000 bukan lagi kriteria mutu untuk P11.

## 2. Temuan (semua terukur, sebagian membatalkan klaim lama)

| # | Temuan | Bukti terukur | Tindakan |
|---|---|---|---|
| F-152 | Geometri point-cloud latar benar | `__HUM_BG_DBG`: count 5197, aspect 1,7768, dpr 1, rest 0,22, pulse 2,6; gambar 780×439 bright 31 300 / warm 6 567 | tidak diubah (hook diagnostik dicabut lagi) |
| F-153 | `<img backdrop-v1.webp>` **tampak** di live walau `getComputedStyle(img).opacity` = 0 | sembunyikan img: rerata 27,65 → 16,19; sembunyikan kanvas: 27,65 → 16,90 | `opacity: 0` kita → **1** |
| F-154 | Komposit figur menulis alfa **1,0** → seluruh kanvas 900×900 opak | live: alfa 0 pada 62,9 %, 255 pada 33,2 %; kita sebelumnya 255 = **100 %** | `FS_COMPOSITE` & `FS_COMPOSITE_SCREEN` meneruskan `sc.a` → kita 64,2 % / 33,4 % |
| F-155 | Plate 2D di live **tidak** berlatar hitam opak | live plate: alfa 0 48,9 %, 255 45,1 %, rerata alfa 76, luminansi 1,71; kita `fillRect('#000')` ⇒ alfa 100 %, luminansi 11,76 | `clearRect` + mask siluet (rerata alfa 31,6) |
| F-156 | Kanvas titik latar berperilaku **aditif** terhadap gambar diam | sisi kiri: live 17,7 → 19,3 saat ditumpuk; kita 17,7 → **15,8** (source-over menggelapkan) | `mix-blend-mode: plus-lighter` ⇒ gerbang 9,44 → 7,36 |
| F-157 | Scene figur premultiplied, dikodekan ganda | un-premultiply sebelum encode sRGB: 9,64 → 9,40 (kecil, tetap benar secara pipeline) | dipertahankan |
| F-157b | Plate sebagai mask oklusi murni (`?pl=1`) | 7,40 (plus-lighter) · 7,29 (screen) — **di dalam derau** | knob uji, **bawaan mati** |

Isolasi per lapisan setelah perbaikan (rerata luma 1440):

| lapisan | live | kita |
|---|---|---|
| gambar diam (semua kanvas disembunyikan) | 16,90 | 16,89 |
| kanvas backdrop 1440×900 | 2,74 | 2,73 |
| kanvas figur 900×900 | 14,43 | 14,26 |
| gabungan penuh | 27,4–27,8 | 29,0 |

Jadi ketiga lapisan **sendiri-sendiri sudah setara**; sisa selisih lahir dari cara mereka ditumpuk.

## 3. Sisa selisih (belum selesai)

Pita luma 1440: 0–20 Δ**+2,9** · 20–60 Δ+3,7 · 60–120 Δ−4,2 · 120–200 Δ**−15,7** · 200–256 Δ**−22,5**.
Pola: bayangan kita sedikit lebih terang, sorotan kita lebih redup. Di 390 sorotan lebih parah
(120–200 Δ−29,2 · 200–256 Δ−31,5).

Langkah berikut P11: (a) uji bloom figur pada bingkai yang sama (fase denyut bloom bisa
menjelaskan sebagian Δ sorotan — perlu kunci fase, bukan satu tangkapan), (b) uji vignette/overlay
gradien, (c) ulang gerbang dengan 3 tangkapan per situs dan median.

## 4. Protokol MEDIAN — dan koreksi besar terhadap angka sebelumnya

Terukur: dua tangkapan **LIVE** berjarak 1,2 s berbeda **MAE 5,41**. Artinya angka "kita vs live"
dari satu tangkapan bercampur derau fase animasi figur (boil/urat/mote), bukan hanya selisih nyata.
`tools/gate-apex.js` sekarang punya `--frames N --gap ms`: N tangkapan per situs, lalu **median
piksel**. Derau turun ke **0,96–2,08**.

| pembanding (median 7 bingkai, `?auto=1&state=idle&surge=1.5`) | 1440 MAE / over32 | 390 MAE / over32 |
|---|---|---|
| produksi **sebelum 5e** (`niu-humanoid.vercel.app`) vs APEX | 8,12 / 5,89 % | — |
| build 5e (`index-Ct4QlgXS.js`) vs APEX | **3,85 / 1,84 %** (band: +2,0 · +1,3 · +0,6 · −1,7 · −0,3) | **4,59 / 2,96 %** (120–200: Δ−12,2) |
| satu tangkapan (protokol lama, untuk perbandingan) | 7,61 / 7,02 % | 7,03 / 6,63 % |

Jadi **perbaikan lapisan latar nyata** (8,12 → 3,85 pada protokol yang sama), dan sebagian besar
"sisa selisih" yang saya laporkan di sesi sebelumnya ternyata **derau fase**, bukan cacat. Ambang
P11 untuk 1440 (**≤ 6,0**) tercapai; ambang 390 (**≤ 2,3**) **belum**.

## 5. Jalan buntu yang sudah dicoba (jangan diulang)

| percobaan | hasil | putusan |
|---|---|---|
| bloom `bpm=1` (rantai live: 8 level, up-mix) | 7,71 (vs 7,70 bawaan, satu tangkapan) | tak berpengaruh — bloom **bukan** penyebab sisa selisih |
| `bpi=0,75 / 1,4 / 1,6` | 7,64 / 7,68 / 4,55 (390) | di dalam derau, kecuali 390 sedikit membaik |
| kanvas latar `uSizeK` × 0,725 (dugaan live memakai `min(vw,vh)`) | rerata c0 2,95 → 2,36, rasio pita 0,41–0,78 | **salah arah**, dibatalkan (knob dicabut, build kembali identik) |
| `?pl=1` plate sebagai mask oklusi murni | 7,40 / 7,29 | di dalam derau, bawaan mati |

## 6. Sisa selisih 390 (pekerjaan berikutnya)

Pita 120–200 Δ−12,2 · 200+ Δ−5,1, sedangkan 1440 nyaris rata. Kanvas latar sendirian di 390:
piksel >120 live 1 562 vs kita 1 199, dan hanya 10,8 % titik terang berimpit — jadi bukan soal
posisi/geser/flip (uji geser ±20 px dan flip UD/LR **tidak** menaikkan impitan), melainkan kerapatan
titik terang. Di 1440 jumlah piksel terang hampir sama (6 692 vs 6 720) — perbedaan khas **390**.
Langkah berikut: uji penskalaan ukuran titik khusus viewport sempit, dan bandingkan geometri
(5197 titik kita vs jumlah titik live) lewat instrumentasi per-draw.

## 7. Berkas yang berubah

- `src/components/Backdrop.tsx` — img `opacity: 0 → 1`; kanvas: `opacity` tetap 1, `mix-blend-mode`
  `screen` → `plus-lighter` (knob `?bgb=`), hook `__HUM_BG_DBG` dicabut.
- `src/lib/bloomGL.ts` — komposit meneruskan alfa adegan; un-premultiply sebelum encode sRGB.
- `src/lib/render.ts` — `drawState` tidak lagi `fillRect('#000')`; mask siluet (`siluetMask`);
  knob `?pl=1` (plate sebagai mask oklusi murni).

Build: `dist/assets/index-Ct4QlgXS.js` (233,72 kB · gzip 77,69 kB)
sha256 `98a11ea3c92358cd0065a18aab71748a20395bb626760713c2d9aa7967611823`;
CSS `index-WDCbnnbD.css` `1b66a34b…` (tidak berubah).
