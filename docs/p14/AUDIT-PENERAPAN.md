# AUDIT PENERAPAN 5s–5y — hasil pemeriksaan mandiri, 2026-11-18

Ditulis setelah klaim "semua paket sudah diterapkan". Klaim itu **saya uji, tidak saya percaya**.
Alat: `tools/periksa-penerapan.py` (baru, 4 lapis). Bukti mentah:
`verification/penerapan/penerapan-2026-11-18.json`.

## 1. Putusan

| aplikasi | putusan | dasar |
|---|---|---|
| **MIRA** (`Niumination/mira-humanoid` @ `b5110a3c`) | **SELESAI — 45/45 butir lulus** | 42/42 berkas paket byte-identik · 2/2 plate milik kita (`mira-idle-v1` `8409aa77647e`, `mira-hair-v1` `6c5e6791e3a5`) · build bersih dari tarikan upstream = `index-BiuEEVDg.js` `17fc09d82f4fd52c` = **aset produksi** |
| **APEX** (`Niumination/Niu-Humanoid` @ `49e011dd`) | **BELUM SELESAI — 41/54 butir** | 10/10 plate masih **salinan asli produksi** · `src/main.tsx`, `src/index.css` **tidak** memuat perubahan 5x · `src/lib/a11y.ts` **tidak ada** · `HumanoidMode.tsx` hanya sebagian (F-164, bukan perbaikan bar debug) |

Bukti bahwa ini bukan soal cache: build bersih dari tarikan upstream APEX menghasilkan
`index-DyoQ8hKN.js` `8dac8dada237a264` (226 278 B) — **persis** yang disajikan `https://niu-humanoid.vercel.app`
sekarang. Jadi produksi APEX memang masih P11, bukan P13/P14.

## 2. Angka per lapis

### L1 — berkas paket (workspace vs upstream)

| aplikasi | identik | catatan |
|---|---|---|
| MIRA | **42/42** | termasuk `src/main.tsx`, `src/index.css`, `src/lib/a11y.ts`, `tools/*`, `docs/p14/*`, `verification/*` |
| APEX | 41/43 | `src/lib/a11y.ts` **hilang**; `src/components/HumanoidMode.tsx` beda (upstream belum punya `maxWidth/flexWrap` bar debug) |

### L2 — provenance plate (siapa pemilik aset yang disajikan)

| aplikasi | milik kita | salinan asli produksi |
|---|---|---|
| MIRA | **2/2** | 0 |
| APEX | **0/10** | 10 (`apex-*` 7 plate + `backdrop-v1` + `mira-idle-v1` + `mira-hair-v1`) |

`apex-idle-v1.webp` upstream `ba1a6d93f39c` = **identik** dengan `verification/p13/asli/apex-idle-v1.webp`
(produksi asli). Plate milik kita `9f7ee35b7a61` **tidak** ada di upstream.

### L3 — build bersih dari upstream

| aplikasi | aset upstream | sha256 | vs workspace | vs produksi |
|---|---|---|---|---|
| MIRA | `index-BiuEEVDg.js` | `17fc09d82f4fd52c` | SAMA | **SAMA** |
| APEX | `index-DyoQ8hKN.js` | `8dac8dada237a264` | BEDA | **SAMA** |

## 3. Yang saya lakukan karena audit ini

1. **Workspace dipulihkan ke keadaan upstream** (sumber kebenaran = upstream), supaya verifikasi
   berikutnya tidak memakai acuan usang:
   - APEX: `public/humanoid/*` (10 berkas) ← upstream, `src/main.tsx`, `src/index.css` ← upstream
   - `src/lib/a11y.ts` **dihapus** dari workspace APEX (memang tidak ada di upstream)
   - Build ulang: APEX `index-Crb4yBDw.js` `015740c83e878389` · MIRA `index-BiuEEVDg.js` `17fc09d82f4fd52c`
2. **Paket 5z** (paket ini) menyertakan berkas yang **hilang/beda** itu, ditambah plate kita, sehingga
   penerapan ulang APEX bisa diselesaikan tanpa menebak.
3. Catatan jujur: plate kita `verification/p13/baru/` berukuran total **1,7 MB** (≈170 KB berkas);
   APEX di upstream masih memakai plate asli, jadi tidak ada risiko kuota — tetapi paket ini saya batasi
   supaya tidak menggelembung (hanya `apex-idle-v1` sebagai bukti, sisanya lewat alat `p13-*.py`
   yang sudah ada di repo upstream sejak 5s/5t).

## 4. Konsekuensi untuk rencana

- P13 (aset milik sendiri) **lulus di MIRA, belum di APEX** → ini yang harus ditutup lebih dulu sebelum
  P14/P15 diklaim. Karena itu paket berikutnya (5aa) memprioritaskan **penerapan APEX yang benar**.
- Gerbang P14 (`gate-aset-layout` S1) akan **gagal** di APEX yang sekarang, karena S1 membandingkan SHA-256
  halaman dengan **berkas workspace**; setelah pemulihan workspace ini, hasilnya akan cocok dengan upstream
  (bukan dengan plate P13). Artinya: gerbang P14 harus dijalankan **setelah** plate P13 masuk ke APEX.
