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
