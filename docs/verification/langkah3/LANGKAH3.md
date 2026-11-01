# Langkah 3 — jam build MIRA (bagian 1–2)

Tanggal: 2026-10-30. Semua angka = `?auto=1&t=<detik>` 1440×900, dibandingkan dengan **app MIRA asli**
(`https://mira-humanoid.vercel.app`, dipakai sebagai ground truth karena itu yang direkam di `recon/`).

## Yang dikerjakan

| # | perubahan | bukti/asal |
|---|---|---|
| 1 | `uBT` rambut/helai/bintik = **jam build** (dulu konstanta 100) | uniform live `uBT 0,9071` pada t≈1,89 |
| 2 | ramp build `iField`/`iMatter` (dulu konstanta 1) | `Tw({waves, matter, orb})` di bundle live |
| 3 | opacity kanvas latar = `min(1, waves·1,6)` | DOM live: 0,064 / 0,604 / 1,0 pada t 0,3 / 1,89 / 9,5 |
| 4 | warna lapisan gambar dikali `filled` (mask reveal) | lihat “akar masalah” |
| 5 | cincin kejut ignition `35/36` + `qN(t)` | uniform live `uShock [574,1008,2204·,0,115]` |

### Akar masalah “figur tampil sejak frame pertama”
Di live, `06-frag` (lapisan gambar) hanya mengalikan **alpha** dengan `filled`; warna tetap keluar. Yang
membuatnya tak terlihat sebelum gelombang reveal adalah **komposisi kanvas ber-alpha (premultiplied)** oleh
browser. Rebuild memakai satu kanvas opaque → warna additive tetap menyembur sejak frame pertama.
Eksperimen yang membuktikan: membaca alpha RT figur lewat `?dbgalpha=1` → alpha ≈ 0 di semua fase
(2/255), jadi meniru premultiply di kanvas tidak menolong (`t=9,5` malah jadi 18,3). Perbaikan yang dipakai:
kalikan **rgb** dengan `filled` di `picColor.frag`.

## Hasil terukur per fase

| t (s) | MAE sebelum | MAE sesudah | >8/255 sesudah | kecerahan build / live |
|---|---|---|---|---|
| 0,3 | 18,05 | **3,19** | 3,6 % | 2,0 / 3,0 |
| 1,89 | 31,61 | **20,06** | 21,4 % | 3,2 / 21,7 |
| 3,5 | 25,12 | **15,27** | 17,9 % | 10,2 / 23,0 |
| 5,5 | 27,16 | **18,46** | 20,3 % | 8,0 / 22,5 |
| 6,8 | 36,52 | **37,25** | 43,1 % | 32,4 / 61,2 |
| 9,5 | **12,53** | **12,53** | 57,2 % | 44,8 / 39,6 |

Tidak ada fase yang memburuk; kondisi mapan (9,5) tidak berubah.

## Sisa yang terukur (pekerjaan berikutnya)

1. **Orb `25/26` (15 kuad) belum ada** — pada 1,89–5,5 live terang (21,7–23,0) sementara rebuild 3–10.
   Ini benda terang yang berpusar sebelum ignition; tanpa lapisan ini fase build selalu gelap.
2. **Kilatan ignition** pada 6,8: live 61,2 vs rebuild 32,4. `qN` sudah masuk; yang belum: `hum.strike.flash`
   pada garis glide `13/14` + percikan orb `33/34`.
3. Sesudah itu: gerbang C (baseline terukur per run).

Berkas gambar: `live-t*.png` (app asli) dan `build6-t*.png` (rebuild) di folder ini.

## Verifikasi di produksi (`mira-humanoid-niu.vercel.app`) — 1 Nov

Bundle produksi `index-DZGcjv2t.js` 401.882 B, sha256 `68b1b5e0a7e7b567…` = build repo HEAD `6829d6a`.

| t (s) | produksi vs live (GT) | produksi vs `build6` (lokal) |
|---|---|---|
| 0,3 | 3,19 (2,0 / 3,0) | **0,00** |
| 5,5 | 18,46 (8,0 / 22,5) | 0,08 |
| 6,8 | 37,24 (32,4 / 61,2) | 0,18 |
| 9,5 | 12,53 (44,8 / 39,6) | 0,14 |

Jadi produksi = kode repo = kondisi kerja (selisih ≤ 0,18 dari tangkapan lokal). Angka terhadap app asli
sama dengan tabel di atas.
