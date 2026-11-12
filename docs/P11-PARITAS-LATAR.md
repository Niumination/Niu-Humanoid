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

## 4. Berkas yang berubah

- `src/components/Backdrop.tsx` — img `opacity: 0 → 1`; kanvas: `opacity` tetap 1, `mix-blend-mode`
  `screen` → `plus-lighter` (knob `?bgb=`), hook `__HUM_BG_DBG` dicabut.
- `src/lib/bloomGL.ts` — komposit meneruskan alfa adegan; un-premultiply sebelum encode sRGB.
- `src/lib/render.ts` — `drawState` tidak lagi `fillRect('#000')`; mask siluet (`siluetMask`);
  knob `?pl=1` (plate sebagai mask oklusi murni).

Build: `dist/assets/index-Ct4QlgXS.js` (233,72 kB · gzip 77,69 kB)
sha256 `98a11ea3c92358cd0065a18aab71748a20395bb626760713c2d9aa7967611823`;
CSS `index-WDCbnnbD.css` `1b66a34b…` (tidak berubah).
