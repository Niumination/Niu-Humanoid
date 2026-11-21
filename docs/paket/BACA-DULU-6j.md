# BACA-DULU-6j — APEX: timeline beku yang benar + dua alat gerbang baru + gerbang 8/8

tanggal: 2026-11-19 · melanjutkan 6g (APEX) · pasangan dari 6k (MIRA)

## 1. Tiga bug nyata yang ditangkap gerbang baru — semuanya di kode APEX kita

| # | bug | cara tertangkap | akibat sebelum diperbaiki |
|---|---|---|---|
| B-1 | `?t=` hanya memaku **steady-state**, fase kelahiran tetap ikut jam dinding | `gate-paritas-fase` titik t=3 → MAE diri **11,88** | bingkai kelahiran tidak bisa diulang; gerbang apa pun di detik < 7,4 tidak sahih |
| B-2 | `?t=` **melewati** seluruh kelahiran untuk semua nilai | F3 "animasi bergerak" → rentang cakupan **0,0021** | t=1..9 tampak identik → kelahiran tidak bisa diuji sama sekali |
| B-3 | argumen waktu butiran (`renderBirthFrame` arg ke-9) masih jam dinding | F1 t=5 → MAE diri **11,64** | partikel berkedip berbeda tiap tangkapan |

Perbaikan di `src/components/HumanoidMode.tsx`:

```
lewatiKelahiran = reduce || skipFlag || (tPin !== null && tPin >= TIMELINE.total)   // B-2
const t   = tPin !== null ? tPin : …                                                // B-1
const dt  = tPin !== null ? 0 : dtMentah                                            // ikut beku
renderBirthFrame(…, tPin !== null ? tPin : nowMs / 1000)                            // B-3
```

Hasil sesudah perbaikan (1440×900): `?t=3,5,7,9,11` → MAE diri **3,22 · 3,49 · 3,22 · 3,49 · 3,34**,
cakupan bergerak 0,3055 → 0,3625 → 0,3599 → 0,3385 → 0,3383 (rentang 0,0674), **4/4 butir lulus**.
Tanpa `?t=`, tidak satu pun cabang aktif → perilaku lama utuh.

## 2. Dua alat gerbang baru (dan bug keempat yang mereka temukan)

| alat | gunanya |
|---|---|
| `tools/gate-paritas-fase.js` | paritas di **banyak titik waktu** (bukan satu bingkai), sadar-fase (kelahiran vs mantap), menulis kurva ke JSON |
| `tools/uji-gerbang.py` | menguji **alat gerbangnya** dengan 6 kasus (G1–G6), termasuk uji negatif: plate asli harus ditolak |

`uji-gerbang.py` langsung menemukan **bug keempat**: `gate-provenance.py --live` melaporkan **LULUS** ketika
**semua** unduhan gagal (tidak ada satu pun yang dinilai gagal). Diperbaiki: semua-unduhan-gagal = GAGAL.
Ketiga bug alat sebelumnya (0/0 lulus, kriteria S1 salah, tabel sidik terbalik) ditemukan **kebetulan**;
mulai sekarang penangkapannya sengaja.

## 3. Isi paket (34 berkas)

* **Kode APEX (9)**: `src/components/HumanoidMode.tsx` (fix B-1..B-3) + 8 berkas delta yang masih belum ada
  di repo (`a11y.ts`, `main.tsx`, `App.tsx`, `Backdrop.tsx`, `bloomGL.ts`, `render.ts`, `index.css`,
  `package.json`) — **wajib bersama**, kalau tidak build mati (pelajaran 6d).
* **10 plate** → `public/humanoid/` (sha256 milik kita; repo masih menyajikan 10 plate asli).
* **Alat (6)**: `gate-provenance.py` · `gate-paritas-fase.js` · `uji-gerbang.py` · `gerbang-semua.sh` ·
  `gate-paritas.js` · `periksa-penerapan.py`.
* **Bukti (6)**: `verification/p13/{asli-sidik,sidik-tabel}.json` · `verification/gerbang/{kontrak,
  uji-gerbang-2026-11-19,ringkas-2026-11-19-lokal}.json` · `verification/p15/paritas-fase-{apex,mira}.json`.
* **Dokumen (3)**: `AUDIT-PENERAPAN-3.md` · `PETA-KESENJANGAN-P15.md` · dokumen ini.

## 4. Uji terapkan (wajib, sebelum zip dikirim)

Salinan `Niu-Humanoid@49e011dd15` → timpa isi paket → `npm ci` → `tsc -b` → `vite build` → harus lulus dan
menghasilkan `index-DeDMCu_9.js` **`873d3b54ea222267`** (235,18 kB · gzip 78,19 kB).
Sesudah itu `gate-provenance --statis` harus **10/10** (sebelum paket: 0/10).

## 5. Gerbang satu perintah sekarang 8 butir

`lingkaran` · `server` · `uji-alat` · `provenance` · `aset-layout` · `a11y` · `paritas` · `paritas-fase`.
Hasil 2026-11-19 lokal: **8/8 LULUS** (`verification/gerbang/ringkas-2026-11-19-lokal.json`).
Angka tiap butir: aset-layout 34/34 · a11y 16/16 · paritas 24/24 · paritas-fase 4/4 + 4/4 · provenance 10/10 ·
uji-alat 6/6.

## 6. Tiga perbaikan pada alat gerbang-satu-perintah

1. `APEX`/`MIRA` tidak di-`export` → alat jatuh ke port bawaan 8805 dan gagal palsu.
2. `|| true` menelan kegagalan provenance → dihapus; tiap pola aset wajib lulus.
3. folder aset menunjuk `$K/public/humanoid` (tata letak repo MIRA) → dibetulkan ke repo kerja.
