# Pemeriksaan hasil penerapan (Hermes) — 2026-10-30

Dasar pemeriksaan: klaim di balasan Hermes, dicek ulang ke GitHub API + klon repo + build lokal +
tangkapan Playwright dari URL publik. Semua angka di bawah hasil ukur, bukan kesan.

## Ringkasan: 6 klaim, 4 terbukti, 2 tidak

| # | Klaim Hermes | Hasil pemeriksaan | Bukti |
|---|---|---|---|
| 1 | `Niumination/Niu-Humanoid` public, main | **BENAR** | API: `private=false`, `default_branch=main`, push terakhir `1f2f997` 30 Okt 14:24 UTC |
| 2 | `Niumination/mira-humanoid` public, main | **BENAR** | API: `private=false`, `main`, commit `1c4a0af` 14:34 UTC |
| 3 | Semua isi paket update diterapkan | **BENAR** | 279/279 berkas paket ada di repo, **277 identik sha256**, 0 hilang |
| 4 | Build kedua app lulus (`tsc` + `vite build`) | **BENAR** | klon bersih: MIRA `81 modules → index-CgepBFsa.js 395,39 kB`; Niu `index-DyoQ8hKN.js 226,20 kB`, tanpa error |
| 5 | `niu-humanoid.vercel.app` → 200, "Apex Humanoid" | **BENAR, tapi…** | 200 + judul benar, **dan** bundle-nya sah dari repo (sha256 sama). Lihat catatan di bawah |
| 6 | `mira-humanoid.vercel.app` → 200, "MIRA Humanoid" | **TIDAK TERBUKTI / keliru** | URL itu menyajikan **app MIRA asli** (ground truth), bukan rebuild kita. Bukti di §3 |

## 1. Repo — isi paket yang masuk

Commit baru di Niu: **`1f2f997` — "mira: update docs (recon MIRA, verifikasi terbaru) + tools verifikasi"**,
283 berkas, 49.113 baris. Isinya `docs/recon/**` (skrip + `mira-fn/*.js` + 73 GLSL), `docs/verification/**`
(236 berkas), `docs/PROGRESS.md` + `docs/REBUILD-LOG.md` versi baru, `tools/**` (79 berkas).

Repo MIRA: commit awal `25fdce58` = **65 berkas aplikasi** (seluruh `src/`, `src/lib/shaders/*` 30 GLSL,
`public/humanoid/mira-*.webp`, `vercel.json`, `package*.json`), lalu `1c4a0af` menambah `CATATAN-TEMUAN.md`.

Perbandingan paket ↔ repo (sha256, di luar node_modules/dist):

```
identik di repo : 277
beda isi        :   0   (2 berkas yang sempat "beda" ternyata artefak pembanding saya: .gitignore &
                         README-DEPLOY.md milik Niu memang berbeda dari milik MIRA — keduanya utuh di repo masing-masing)
hilang          :   0
```

Versi dokumen yang masuk juga versi terakhir: `docs/PROGRESS.md` memuat sesi **(6) (7) (8)**,
`docs/REBUILD-LOG.md` memuat sampai **F-76**.

## 2. Repo — higiene

| periksa | Niu-Humanoid | mira-humanoid |
|---|---|---|
| secret-scan (`sk-`, `ghp_`, `AKIA`, `xox*`, private key, `.env*`) | bersih | bersih |
| `node_modules/`, `dist/`, `.vercel/` ter-commit | tidak | tidak |
| artefak build ter-commit | **`tsconfig.tsbuildinfo` (598 B)** | tidak |
| berkas dilacak | 883 | 66 |
| ukuran objek git | 135 MB (docs/recon + verification) | 744 KB |

`tsconfig.tsbuildinfo` memang **sudah tercatat** di `CATATAN-TEMUAN.md` item 1 — belum dieksekusi (sesuai
sifat catatan). Perbaikan 1 baris: `echo '*.tsbuildinfo' >> .gitignore && git rm --cached tsconfig.tsbuildinfo`.

## 3. Deploy — yang terbukti dan yang tidak

### APEX (`niu-humanoid.vercel.app`) — sah

```
GET /assets/index-DyoQ8hKN.js   → 226.278 B
sha256 berkas tersaji            = sha256 dist/ hasil build repo HEAD  (8dac8dada237a264…)
```
Artinya yang tayang benar-benar kode repo. Tangkapan layar 1440×900:

| banding | >8/255 | >32/255 | MAE | kecerahan |
|---|---|---|---|---|
| entry: deploy vs produksi asli | 0,00 % | 0,00 % | **0,00** | 0,2 vs 0,2 |
| idle 9 s: deploy vs produksi asli | 36,61 % | 13,75 % | **10,92** | 19,3 vs 26,0 |

Entry identik piksel; idle masih selisih — **konsisten dengan gerbang D sebelumnya** (`gate-deploy.json`:
MAE 11,93 · kecerahan 19,2 vs 27,5). Jadi penerapan tidak mengubah apa pun di APEX, tapi juga tidak
memperbaiki selisih idle itu (masih item terbuka, bukan regresi baru).

### MIRA (`mira-humanoid.vercel.app`) — **bukan hasil rebuild kita**

Tiga bukti independen:

1. **Bundle yang tersaji** = `index-1PiDnpcG.js`, 1.185.588 B — persis app asli (yang kita jadikan ground
   truth), bukan hasil build kita `index-CgepBFsa.js` (395.461 B).
2. **Penanda kode**: bundle tersaji **tidak** memuat `__MIRA_MATTER`, `__MIRA_STRANDS`, `__MIRA_WAVES`
   (0 kemunculan), tetapi memuat `mediapipe` + `hand_landmarker` + log `"hair picture: 47 strands…"` —
   semuanya ciri app asli. Rebuild kita tidak memakai MediaPipe.
3. **Log konsol di browser**:
   - `mira-humanoid.vercel.app` → `[mira] hair picture: 47 strands can move, 260 twinkles` (asli)
   - build repo kita (vite preview lokal) → `[mira] humanoid: 47 strands can move, 260 twinkles` +
     `__MIRA_MATTER/__MIRA_WAVES/__MIRA_STRANDS = true` (rebuild)
4. **Piksel**: `mira-humanoid.vercel.app` pada `?auto=1&t=9.5` vs tangkapan ground truth kita
   `live-t95.png` → **MAE 0,61**, kecerahan 39,6 vs 39,6 (praktis app yang sama). Sedangkan build repo kita
   vs ground truth → **MAE 12,52**, kecerahan 44,8 vs 39,6.

Kesimpulan: klaim “mira-humanoid.vercel.app → 200, judul MIRA Humanoid ✅” benar sebagai fakta HTTP, tetapi
URL itu **milik app asli** (subdomain sudah dipakai proyek lain). Rebuild MIRA dari repo **belum bisa
diakses publik**; kemungkinan deploy Hermes berstatus *Blocked* (Deployment Protection) atau ter-alias ke
hostname lain (`mira-humanoid-<acak>.vercel.app`, tidak bisa ditebak — 10 kandidat saya coba, semua 404).

Kabar baik: app asli di URL itu **utuh dan tidak tertimpa** — ground truth masih bisa dipakai.

### Kode repo = kode workspace (diverifikasi, bukan diasumsikan)

Build repo MIRA dipreview lokal, ditangkap pada fase yang sama (`?auto=1&t=9.5`), lalu dibandingkan dengan
tangkapan workspace `build-stage21.png`:

| banding | >8/255 | >32/255 | MAE | kecerahan |
|---|---|---|---|---|
| build repo vs `build-stage21.png` | 0,16 % | 0,06 % | **0,16** | 44,8 vs 44,8 |

→ yang di-push Hermes benar-benar kondisi kerja terakhir (MAE 12,52 vs live, sesuai catatan 12,53).

## 4. Yang perlu ditindaklanjuti

1. **MIRA belum tayang.** Butuh: (a) URL deployment yang sebenarnya dari dashboard Vercel, atau
   (b) deploy ulang dengan project name berbeda (mis. `mira-humanoid-niu`) karena
   `mira-humanoid.vercel.app` sudah dipakai app asli. Matikan Deployment Protection untuk production
   supaya publik.
2. **`tsconfig.tsbuildinfo`** — `git rm --cached` + tambah `*.tsbuildinfo` ke `.gitignore`.
3. **Cache aset `public/humanoid/*` 7 hari** (catatan Hermes item 4): nama berkas tidak ber-hash, jadi
   penggantian aset butuh purge. Untuk MIRA ini relevan karena dua webp itu inti render.
4. **Selisih idle APEX (MAE 10,9; kecerahan 19,3 vs 26,0)** tetap terbuka — perlu sesi tuning terpisah,
   bukan bagian dari pekerjaan penerapan ini.
5. **MIRA**: pekerjaan langkah 2 juga masih terbuka (kalibrasi bloom vs gambar dasar: live 38,8→80,2,
   rebuild 92,7→101,2; lapisan `13/14`, `35/36`, jam build) — lihat `REBUILD-LOG.md` F-76.

## 5. Berkas tangkapan

`verification/terapan-2026-10-30/`
`apex-entry.png` · `apex-idle.png` · `apexdeploy-entry2.png` · `apexdeploy-idle.png` ·
`apexprod-entry.png` · `apexprod-idle.png` · `mira-deploy-t95.png` (URL klaim = app asli) ·
`mira-local-t95.png` (rebuild dari repo, preview lokal)

---

# Tindak lanjut Hermes — URL baru diperiksa (2026-10-30, susulan)

Hermes memperbaiki: deploy ulang ke project **`mira-humanoid-niu`** + memindahkan klaim URL.
Pemeriksaan ulang penuh di bawah; **klaimnya terbukti kali ini**.

| periksa | hasil |
|---|---|
| `https://mira-humanoid-niu.vercel.app/` | **HTTP 200**, judul `MIRA Humanoid`, tanpa Deployment Protection |
| bundle tersaji | `/assets/index-CgepBFsa.js` · 395.461 B · sha256 `cbecb4dad826122e…` |
| build ulang dari repo HEAD (`36b6263`) | `index-CgepBFsa.js` · **sha256 sama** → build reproducible, isi = repo |
| penanda rebuild | `__MIRA_MATTER` ✓ `__MIRA_STRANDS` ✓ `__MIRA_WAVES` ✓ · `mediapipe` ✗ `hand_landmarker` ✗ |
| runtime di browser | `matter 54.500 titik / 28 busur` · `strands 47 / 10.888 verteks / 10.794 segitiga / 260 bintik` · `waves 3 pita / 64 ruas / 168 percikan` · `err null` |
| aset `public/humanoid/*.webp` | 200 (mira-idle 364.544 B, mira-hair 159.716 B) |
| CSS | `/assets/index-DGzJsMHS.css` 575 B (sha256 `083dceb2158ef0…`, sama dengan build lokal) |

## Gerbang piksel pada URL produksi (1440×900)

| banding | >8/255 | >32/255 | MAE | kecerahan |
|---|---|---|---|---|
| produksi `?auto=1&t=9.5` vs `live-t95.png` (GT) | 57,23 % | 17,24 % | **12,53** | 44,8 vs 39,6 |
| produksi vs `build-stage21.png` (workspace) | 0,14 % | 0,05 % | **0,14** | 44,8 vs 44,8 |
| produksi vs preview lokal repo | 0,11 % | 0,03 % | **0,09** | 44,8 vs 44,8 |
| produksi `t=1,89` vs `live-t189.png` | 93,23 % | 31,82 % | 31,61 | 45,3 vs 21,7 |
| produksi idle vs `live-idle-a.png` | 31,75 % | 20,62 % | 9,84 | 44,9 vs 38,1 |

Kesimpulan: **deploy MIRA kini sah dan identik dengan repo** (MAE 0,14 terhadap tangkapan kerja).
Selisih terhadap app asli (12,53) bukan soal deploy, melainkan pekerjaan langkah 2/3 yang masih terbuka.

## Langkah 3 mulai: jam build (bagian 1)

Sebab `t=1,89` meleset sudah ditemukan dan diperbaiki: rambut/helai/bintik memakai `uBT = 100`
(selalu tampil), padahal live baru menampilkannya setelah gelombang ignition. Sekarang `uBT` = jam build.

Ukur 6 fase vs app asli (tangkap berpasangan, `?auto=1&t=…`, 1440×900):

| t | MAE sebelum | MAE sesudah | kecerahan build / live |
|---|---|---|---|
| 0,3 | — | 34,55 | 37,5 / **3,0** |
| 1,89 | 31,61 | **25,14** | 38,1 / 21,7 |
| 3,5 | — | 25,12 | 40,6 / 23,0 |
| 5,5 | — | 27,16 | 40,2 / 22,5 |
| 6,8 | — | 36,52 | 45,4 / **61,2** |
| 9,5 | 12,53 | 12,53 | 44,8 / 39,6 |

Dua sisa yang terukur (jadi pekerjaan berikutnya, bukan tebakan):
1. **t < 6,55 live praktis gelap** (mean 3,0 pada t=0,3) sementara rebuild 37,5 → latar medan (`field`)
   belum punya ramp build (`iField`).
2. **t = 6,8 live lebih terang** (61,2 vs 45,4) → kilatan ignition + cincin kejut (`35/36`, `uShock`)
   belum ada di rebuild.

Berkas: `verification/mira/gate-deploy-niu.json`, `verification/terapan-2026-10-30/miraprod-*.png`,
`verification/langkah3/{live,build}-t*.png`.
