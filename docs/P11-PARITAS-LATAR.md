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

## 7. F-159 / F-160 — dua percobaan tonal (satu ditolak, satu diterima)

**F-159 — rantai bloom live (`?bpm=1`, 8 level, up-mix, komposit SCREEN) — DITOLAK sebagai bawaan.**
Pada lapisan figur saja ia lebih dekat (1440 4,29 → 4,14 · 390 4,42 → 3,53), tetapi pada **gambar
penuh** hasilnya bertentangan: 1440 4,51 → **5,75** (buruk), 390 5,51 → **4,93** (baik). Karena
kriteria P11 adalah paritas gambar penuh, bawaan tetap rantai lama; `?bpm=1` tetap tersedia.

**F-160 — tipe render target composer — DITERIMA.**
Composer live memakai `frameBufferType` = **UnsignedByteType (1009)** ⇒ render target **8-bit**,
bukan HalfFloat (1016). Kita dulu memilih half-float bila tersedia, jadi ambang bloom kita bekerja
pada nilai >1 yang di live sudah di-clamp. Diukur pada lapisan figur saja (median 5 bingkai):

| | 1440 MAE | 390 MAE |
|---|---|---|
| half-float (perilaku lama) | 4,29 | 4,42 |
| **8-bit (seperti live)** | **3,95** | **3,30** |

Bawaan kini 8-bit; `?bf16=1` mengembalikan half-float. Di gambar penuh selisihnya **tidak bisa
dipisahkan dari derau** (lihat §8) — dasar penerimaannya adalah angka lapisan figur yang konsisten
di kedua viewport plus kesesuaian dengan tipe buffer live.

## 8. Lantai derau gerbang (penting untuk sesi berikutnya)

| protokol | derau live-vs-live (1440) | derau (390) |
|---|---|---|
| 7 bingkai, jarak 350 ms | 0,98 – 2,45 | 1,21 – 2,45 |
| **11 bingkai, jarak 400 ms** | **1,19** | 1,99 |
| 1 bingkai (protokol lama) | 1,4 – 5,4 | 1,4 |

**Aturan baru:** selisih < 2,5 MAE tidak boleh disebut perbaikan/kemunduran pada 1440; < 3,0 pada 390.
Angka gerbang 1440 dari beberapa run dengan build berbeda (3,58 · 3,85 · 4,27 · 4,32) karena itu
**setara secara statistik** — jangan saling dituning.

**Angka resmi terakhir (median 11 bingkai, build `index-euagY5AQ.js`):**
1440 **3,58 / 1,63 %** · 390 **4,70 / 2,84 %** ⇒ target 1440 (≤ 6,0) **tercapai**; target 390 (≤ 2,3)
**belum** (selisih tersisa terkonsentrasi di pita 120–200 = Δ−13,5, yaitu sorotan kanvas figur).

## 9. Investasi 390 — tujuh dugaan diuji, semuanya gugur (jangan diulang)

Sisa 390 terkonsentrasi di pita 120–200 (Δ−12,7) sementara 1440 rata (−2,5). Diuji satu per satu
pada lapisan figur saja (median 5 bingkai, `?auto=1&state=idle&surge=1.5`):

| dugaan | angka | putusan |
|---|---|---|
| intensitas bloom (`__HUM_BLOOM_K` 1,0 / 1,25 / 1,3) | MAE 3,15 / 3,30 / — · rasio 120–150 tetap 0,86–0,87 | gugur (di dalam derau) |
| ketajaman titik (`__HUM_DOT` 0,18 / 0,45) | MAE 3,00 · rasio 0,87 / 0,89 | gugur (derau) |
| un-premultiply komposit (`?bun=0`) | 3,53 → 3,67 | gugur (lebih buruk) |
| alfa ikut pendar bloom (`?bal=1`) | 3,53 → 3,48 · rasio tak berubah | gugur |
| rantai bloom live sebagai bawaan | lihat §7 (F-159) | ditolak |
| render target 8-bit | lihat §7 (F-160) | diterima (bukan untuk 390 spesifik) |
| `uSizeK` kanvas latar = lebar/1020 | **1440: MAE 0,43 → 3,52** (rerata 6,14 vs live 2,74) · 390: 0,43 → 0,99 | gugur — tinggi/1020 (bawaan) benar |

**Bukti kunci (instrumentasi uniform WebGL di halaman live, `prototype.getUniformLocation` +
`uniform1f/2f/4f` dibungkus):** seluruh uniform **shader figur** identik di kedua situs dan kedua
viewport — `uSize` 1,74 (390) / 2,5588 (1440) · `uPatchUV` 0,0044615 / 0,0028431 · `uDotSharp` 0,32 ·
`uRim` 0,9 · `uBloomR` 9 · `uPulseA/B` 1,4087 · `uBoilAmp` 2,2714 · `uVein` 1,4541.
⇒ Sisa 390 **bukan** dari geometri, ukuran titik, atau parameter shader figur. Kandidat yang tersisa:
komposit bloom (area halo) dan/atau lapisan plate di 390.

## 10. Lantai derau (dipakai sebagai aturan)

| protokol | derau 1440 | 390 |
|---|---|---|
| 1 bingkai (lama) | 1,4 – 5,4 | 1,4 |
| 7 bingkai / 350 ms | 0,98 – 2,45 | 1,21 – 2,45 |
| **11 bingkai / 400 ms** | **1,15 – 1,19** | **1,36 – 1,99** |

⇒ selisih < 2,5 MAE (1440) / < 3,0 (390) bukan bukti. Run 3,58 · 3,65 · 3,85 · 4,27 · 4,32 (1440)
karena itu **setara**; 390 4,54 · 4,70 · 4,88 juga setara.

## 11. Berkas yang berubah

- `src/components/Backdrop.tsx` — img `opacity: 0 → 1`; kanvas: `opacity` tetap 1, `mix-blend-mode`
  `screen` → `plus-lighter` (knob `?bgb=`), hook `__HUM_BG_DBG` dicabut.
- `src/lib/bloomGL.ts` — komposit meneruskan alfa adegan; un-premultiply sebelum encode sRGB.
- `src/lib/render.ts` — `drawState` tidak lagi `fillRect('#000')`; mask siluet (`siluetMask`);
  knob `?pl=1` (plate sebagai mask oklusi murni).

- `src/lib/bloomGL.ts` (sesi 57 lanjutan, F-160) — render target composer **8-bit** (meniru
  `frameBufferType: UnsignedByteType` di live); `?bf16=1` mengembalikan half-float.

Build: `dist/assets/index-euagY5AQ.js` (233,78 kB · gzip 77,70 kB)
sha256 `c2dc850e78f9019bd01b74edf2359b65aad510b3b75aad0eb229d4fb6b0c10fe`;
CSS `index-WDCbnnbD.css` `1b66a34b…` (tidak berubah). Build sebelumnya (5e/5f, tanpa F-160):
`index-Ct4QlgXS.js` `98a11ea3…`.
