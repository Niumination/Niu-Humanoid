# PROGRESS — eksekusi berurutan (tanpa melompati fase)

Terakhir diperbarui: **2026-10-29**. Rujukan rencana: `RENCANA-EKSEKUSI.md`.

| fase | isi | status | artefak utama |
|---|---|---|---|
| **P0** | Normalisasi recon: HTML bersih, patch `verify-spec.py`, audit checksum, catat temuan | ✅ | `recon/*-index.clean.html`, `verify-spec.py`, `REBUILD-LOG.md` |
| **P1** | Fase 0 versi audit: daftar aset + konfirmasi negatif + dimensi | ✅ | `recon/asset-list.*`, `asset-dims.json` |
| **P2** | Fase 1.1–1.2: stack + ekstraksi copy UI berurutan | ✅ | `recon/ui-copy.{apex,mira}.txt`, `ui-copy.json` |
| **P3** | Fase 1.3: ekstraksi + rekonstruksi + klasifikasi shader | ✅ | `recon/shaders/` (150 file), `INDEX.md`, `resolve_shaders.py` |
| **P4** | Fase 1.4–1.5: 82 parameter + semua hook/query param | ✅ | `recon/params-verified.md`, `hooks.json`, `hooks.md` |
| **P5** | Fase 1.6–1.7: audio graph + timing | ✅ | `recon/audio/`, `timings.json` |
| **P6** | Fase 1.8–1.9: DOM runtime, computed style, ground truth (browser + WebGL2) | ✅ | `recon/ground-truth/` (73 artefak, 22 MB) |
| **P7** | Fase 2: arsitektur + peta UNVERIFIED | ✅ | `recon/ARCHITECTURE.md` |
| **P8** | Fase 3: implementasi APEX (8 langkah berurutan) | 🟡 langkah 1–7 lulus · langkah 8 backdrop port ✅, sisa = pipeline partikel GPU (butuh keputusan) | `apex-humanoid-rebuild/`, `verification/` |
| **P9** | Fase 4: Gerbang A/B/C/D | ⬜ | — |
| **P10** | Deliverable + deploy | ⬜ | — |

## Yang sudah bisa dipegang sekarang

1. **`recon/verify-spec.py` → 193/193, exit 0** (`python3 verify-spec.py`).
2. **26 shader aplikasi** tersalin verbatim (APEX 4, MIRA 26 termasuk 11 belum bernama) + 124 blok vendor dipisahkan.
3. **20 query param MIRA + 19 hook APEX** terdokumentasi; dua temuan baru: `?dial.<key>=` dan `?t=<detik>`.
4. **73 artefak ground truth** dari live: entry, birth 4 timestamp, selesai-build, 5 state APEX × 2 viewport, 6 state MIRA × 2 viewport, DOM mode humanoid, uji reproduksibilitas.
5. **Arsitektur + pemilik setiap string** (71 string) + 10 item UNVERIFIED yang eksplisit.

## Keputusan interview (2026-10-29) — FINAL

1. **Target**: APEX dulu, MIRA menyusul.
2. **Panel MIRA**: dibangun **lengkap** (20 seksi, 82 slider, 7 alias, `?dial.<key>=`, localStorage).
3. **Gerbang C**: ambang = **baseline terukur live-vs-live per run**, bukan angka mati.
4. **UNVERIFIED**: tutup dulu yang murah → U-1, U-3, U-4, U-7 **TERTUTUP** (`recon/UNVERIFIED-CLOSED.md`).
5. **Deploy**: saya siapkan repo + `vercel.json` + skrip diff; **kamu** yang `vercel deploy`, lalu saya bandingkan dengan URL-mu.

## Empat keputusan lama (sudah terjawab di atas)

1. **Target P8**: APEX dulu (rekomendasi), atau MIRA, atau keduanya berurutan.
2. **Panel MIRA (U-10)**: live **tidak** merender 82 slider. Bangun **dengan** panel (setia pada SPEC + `mira-params.json`)
   atau **tanpa** panel (setia pada perilaku live)?
3. **Ambang Gerbang C APEX**: pakai baseline terukur live-vs-live (3,06% piksel > 32/255) sebagai ambang lulus,
   atau tetap tuntut 0% dan terima bahwa target itu terbukti mustahil bahkan bagi situs aslinya?
4. **Deploy**: siapa menjalankan `vercel deploy` untuk uji Gerbang C melawan URL produksi.

## 2026-10-30 — langkah 8 selesai (port penuh)

Opsi user: **scope8 = full** + **deploy disiapkan sekarang**. Pipeline figur GPU diport penuh:
`fig.ts` (274.799 titik), `plate.ts`, `bloomGL.ts` (HDR half-float, gain 1/level, tap 2 texel),
`Figure.tsx` (uniform hU + 240 mote fU + bloom dU), shader `aU/lU/uU/cU` verbatim.
Uniform & atribut terbukti identik dengan live; gerbang C 26,16 %/23,92 % → **10,55 %/7,57 %**.
`npm run build` sukses (226 kB / 75,6 kB gzip). Deploy siap: `vercel.json`, `.gitignore`,
`README-DEPLOY.md`, `tools/diff-vs-production.js` — menunggu user menjalankan `vercel deploy`.

**Berikutnya:** (a) kalibrasi kernel bloom (opsional, sisa 10,55 % vs acuan 0,87 %);
(b) mulai fase MIRA (P9): panel 82 slider, 20 seksi, 7 alias, `?dial.<key>=`, localStorage.

## 2026-10-30 (2) — deploy APEX terverifikasi, MIRA dimulai

1. **Deploy APEX** https://niu-humanoid.vercel.app: 17/17 gerbang identik; piksel 10,73 %/11,93 (1440)
   dan 7,71 %/9,01 (390) — sama dengan dev di dalam derau.
2. **MIRA P1.3–P1.5**: `recon/verify-mira.py` → 82/82 param, 20 seksi, 7 alias, 13 query param.
3. **MIRA langkah 1** (entry + baris tombol): Gerbang A **8/8**.
4. **MIRA langkah 7** (panel 82 slider + `?dial.<key>=` + localStorage + alias): Gerbang B **10/10**.
5. Repo `mira-humanoid-rebuild/`, dev server port 5190, `npm run build` sukses (162 kB / 51 kB gzip).

**Berikutnya (MIRA):** langkah 2 aset/mask + ring + mesin garis (wire shader verbatim), 3 ignition,
4 audio, 5 state, 6 hand tracking, 8 bloom + alias hum.glow.*.

## 2026-10-30 (3) — MIRA langkah 2: mesin garis = **IDENTIK LIVE (12/12 buffer)**

1. `src/lib/miraLines.ts` (port `SN`) → `src/lib/miraWire.ts` (port `lF`) → `src/components/LineWeave.tsx`
   (WebGL2 langsung, shader `09-vert`/`10-frag` verbatim di `src/lib/shaders/wire.*.glsl`).
2. `src/lib/miraTimeline.ts`: port `Ud` (mulberry32), `LN`/`DN`/`FN` (jam ignition), palet `Nd` — semua verbatim.
3. **Gerbang angka**: `tools/probe-mira-buffers2.js` menangkap buffer yang diunggah live
   (`recon/ground-truth/mira/wire-buffers/*.bin`), lalu `recon/verify-mira-wire.mjs` membandingkan:
   **position, aDir, uv, aT, aCol, aS, aLen, aId, aSketch, aEnd, aF, index — 12/12 maxdiff 0**.
4. `drawElements` build **22248** = live **22248**; pesan trace (3 outline + 81 garis, 25/34/25) sama.
5. Tiga fakta baru yang dikunci dari bundle (bukan tebakan):
   `aCol = outline ? [.95,.9,1] : palet[kind]·0,6 + col·0,4`;
   `aT = ignite + LN(r)/… − 0,02`, `aF = aT + 0,32` (ignite 6,55; speed = wave·tinggi 1374);
   `aId = Ud(3)()` per garis (deterministik, terbukti sama antar dua tangkapan live).

**Berikutnya (MIRA langkah 2 lanjutan):** `uHeadRows` (rowTexture: centre x, half width, turn weight, depth share),
lapisan gambar `06/07`, rambut `30/31`, ring/orb `26`, latar `01`; lalu langkah 3 (gerak/intensitas).

**Tambahan langkah 2 (masih sesi yang sama):** `src/lib/miraHead.ts` (port `YN`/`ZN`/`QN`) + `uHeadRows`
terpasang nyata di `LineWeave`. `recon/verify-mira-head.mjs`: **rowTexture 1×1374 IDENTIK (maxdiff 0 semua kanal)**,
pivot [571, 557, 23.28] sama. Kunci temuannya: mask kepala dihitung pada 1146×1374 (ukuran `SN.width`), bukan 1145.

## 2026-10-30 (4) — MIRA langkah 2 selesai: gambar jadi tiga lapisan + inventaris draw lengkap

1. **Inventaris draw live** (`tools/probe-mira-draws.js` → `recon/mira-draw-inventory.json`): 19 draw unik,
   tiap draw lengkap (attrib, uniform, blend/depth). Ini peta jalan sisa langkah 2.
2. **Awan titik gambar** (`src/lib/miraPicture.ts`, port `ie`): 103.367 titik, **aRest/aKind/aZ maxdiff 0**.
3. **`MiraStage.tsx`**: satu kanvas WebGL2, urutan lapisan = urutan live; shader `02/03` (sprite),
   `04/05` (isi), `04/06` (warna), `07/08` (titik), `09/10` (garis) — semua verbatim.
4. Dua koreksi render terukur: `UNPACK_FLIP_Y_WEBGL=true` (three default) dan kanvas panggung **rasio 0,7**
   (1007×630) dengan `uRes` = ukuran jendela.

**Selisih frame sekarang 39,7 % > 32/255 (MAE 36,8)** — besar karena latar (`01`), rambut (`30/31`),
materi 54.492 titik, busur, orb, bloom belum ada. **Berikutnya:** materi (`11/12`), rambut (`30/31` + gambar rambut),
latar (`01`), orb (`26`), busur (`15/16`), lalu langkah 3 (jam build) dan 8 (bloom).

**Tambahan:** latar medan nebula (`00/01`) terpasang lewat FBO 0,7 + blit. Tiga cacat render ditemukan lewat
perbandingan potongan 8× dan diperbaiki: tekstur gambar harus `SRGB8_ALPHA8`, harus di-premultiply
(`UNPACK_PREMULTIPLY_ALPHA_WEBGL`), dan kanvas figur `alpha:false`. Selisih piksel turun 39,7 % → **16,4 %**
(MAE 36,8 → 17,3). Berikutnya: rambut `30/31` + gambar rambut, materi `11/12`, busur `15/16`, orb `26`, lalu langkah 3 & 8.

## 2026-10-30 (5) — MIRA: bloom penuh dengan shader live (langkah 8 versi MIRA)

1. `tools/probe-mira-allsrc.js` menangkap **37 sumber shader** live (36 lama + pass komposit `24-frag`).
   Bloom MIRA = `postprocessing` `BloomEffect`: luminansi (0,6/0,9) → 8 mip turun (12 tap) → 8 mip naik
   (radius 0,62) → komposit (`ENCODE_OUTPUT`, `e0Intensity` 0,9 — nilai `hum.glow.strength`, bukan `bloom.strength`).
2. Empat pasang shader itu disalin verbatim ke `src/lib/shaders/{hp,down,up,comp}.*.glsl` dan dirangkai di `MiraStage`:
   latar → kanvas, figur → RT RGBA16F, bloom atas RT, komposit ke kanvas dengan `(ONE, ONE_MINUS_SRC_ALPHA)`.
3. Kecerahan rata-rata 29,2 → **36,6** (live 41,7); glow menyebar di garis seperti live.

**Berikutnya:** rambut (`30-frag`/`31-vert` + gambar rambut 1385×1422 + 2 lapis helai), materi 54.492 titik
(`11-vert`/`12-frag`, `uLifted`), busur inti & mahkota (`13/16`, `15/16`), orb (`25/26`), percikan (`27/28`),
lalu langkah 3 (jam build: `iField/iMatter` ramp, ignition) dan gerbang C.

## 2026-10-30 (6) — MIRA: rambut + koreksi blend → MAE 14,2 (terbaik sejauh ini)

1. **Rambut** (`29-vert` + `30-frag`, citra `mira-hair-v1.webp` 1385×1422) terpasang dengan seluruh uniform terukur
   (`uUp 48`, `uSide 120`, `uMass 0,7`, `uEarY 343,41`, `uTop 0,6`, `uHead [694,79, 322,80]`, `uHairOff [120,48]`).
2. **Koreksi blend penting:** live memakai `srcRGB ONE · dstRGB ONE · srcAlpha ZERO · dstAlpha ONE`
   (`blendFuncSeparate`), bukan `(ONE, ONE)`. Dengan cara lama, alpha ikut menumpuk → kotak hitam besar menutupi latar.
3. Hasil: kecerahan 42,9 (live 36,8) · > 32/255 **20,1 %** · > 8/255 **29,9 %** · **MAE 14,2** (sebelumnya 19,4).

**Catatan terbuka (diukur, bukan ditebak):** kecerahan kini sedikit DI ATAS live. Kandidat: bloom mengenai lapisan
yang di live ada di kanvas terpisah, atau intensitas komposit harus dikalikan `bloom.strength`.
**Berikutnya:** materi 54.492 titik (`11/12` + `uLifted`), 2 lapis helai rambut (`31/32`), busur (`13/16`, `15/16`),
orb (`25/26`), percikan (`33/34`); lalu langkah 3 (jam build) dan gerbang C.

## 2026-10-30 (7) — MIRA langkah 2 lanjut: materi, helai, pita; verifikasi fase-terkunci

1. **Cara ukur baru (penting):** live menerima `?t=` (jam dibekukan) dan `?off=`. Dua tangkapan live pada `t=9,5`
   identik (MAE 0,10–0,12) → semua penilaian sekarang piksel-per-piksel pada fase yang sama, bukan "mirip".
2. **Materi** (`11/12`): 54.500 butir vs live 54.492; `aCol` maxdiff 1/255, `aTurns`/`aSeed` 3·10⁻⁸ (`src/lib/miraMatter.ts`).
3. **Helai rambut** (`31/32`) + **bintik** (`33/34`): 47 helai · 260 bintik · 10.888 verteks · 10.794 segitiga —
   **sama persis** dengan log & buffer live (`src/lib/miraHair.ts`).
4. **Pita `waves`** (25/26 + 27/28): 3 pita × 65 ruas + 168 percikan — inilah garis panjang di latar live
   (`src/lib/miraWaves.ts`). Ditemukan lewat `?off=waves`, bukan tebakan.
5. **Terbuka, dengan angka:** gambar dasar rebuild 2,4× terlalu terang (92,7 vs 38,8) dan bloom rebuild menambah
   8,5 sementara live +41,4. Intensitas bloom live di `t=9,5` ≈ 1,21 (bukan 0,9) — akan dikalibrasi bersama
   penyebab gambar dasar yang terlalu terang.
6. Skor fase-terkunci terakhir: **MAE 12,53** · > 8/255 57,28 % · kecerahan 44,8 vs live 39,6 (`build-stage21.png`).

**Berikutnya:** (a) kalibrasi bloom vs gambar dasar + selidiki garis yang 2,8× terlalu terang; (b) lapisan yang
belum ada: garis glide kepala `13/14` (12 draw, `uTail 150`, `uCol` emas), cincin kejut `35/36` (`uShock`), kuad
"still" rambut `uOn 0`; (c) jam build untuk lapisan figur (sekarang garis/rambut penuh sejak frame pertama,
padahal live baru menggambar setelah `ignite 6,55 s`); (d) gerbang C.

## 2026-10-30 (8) — Backup Drive + rekonsiliasi repo upstream + workspace dirampingkan

1. **Backup penuh** ke Google Drive, folder **niu-humanoid** (dibuat 13:47 UTC): 4 zip = 173 MB
   (`01-Kerja-Arena-recon` 32 MB · `02-…verification-a` 65 MB · `03-…verification-b` 72 MB ·
   `04-apps-tools-docs` 3,9 MB) + `BACKUP-README.txt`. `node_modules/dist/.vite` sengaja tidak disertakan.
2. **Repo upstream ditemukan & diperiksa:** `Niumination/Niu-Humanoid` (commit terakhir `a66f5ad`, 30 Okt 2026,
   "docs: update catatan temuan item 3 (Kerja-Arena → docs/)"). Isi penting: `src/` = aplikasi APEX kita
   (identik dengan `apex-humanoid-rebuild/`), `docs/` = `recon` + `verification` kita, `public/humanoid/` termasuk
   aset MIRA. Repo `mira-humanoid` **belum ada**.
3. **Rekonsiliasi sha256:** 599 berkas (106 MB) **identik** → dihapus dari workspace; 3 berkas **beda**
   (`PROGRESS.md`, `REBUILD-LOG.md`, `verification/VERIFICATION.md` versi lebih baru); 460 berkas **baru**.
   Seluruh `apex-humanoid-rebuild/` (48 berkas) ikut terhapus karena sudah jadi `src/` repo.
4. **Dihapus sesuai pilihan:** `recon/ground-truth/**` (23 MB, buffer mentah live) — ada di zip Drive 01.
   Screenshot lama juga dipangkas: `verification` 61 MB → 11 MB (10 tangkapan kunci dipertahankan).
5. **Ukuran workspace: 267 MB → 78 MB** (Kerja-Arena 184 → 12 MB).
6. **Paket update** `niu-humanoid-belum-terpasang.zip` (64 MB, 370 berkas): `docs/` (md versi baru + recon +
   verification terbaru), `mira-humanoid-rebuild/`, `tools/`, `sync-upstream.sh`, `README-UPDATE.md`,
   `PENGHAPUSAN-2026-10-30.md`. Skrip `sync-upstream.sh` membandingkan sha256 dan bisa menghapus otomatis
   berkas yang sudah masuk repo setelah push.
