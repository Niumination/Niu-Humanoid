# Catatan Temuan — Niu-Humanoid (dari paket APEX-MIRA-REA)

> Catatan saja, BELUM dieksekusi. Dibuat saat onboarding repo, tanpa perubahan kode.

## Temuan untuk ditindaklanjuti (opsional, butuh keputusan)

1. **`tsconfig.tsbuildinfo` ikut ter-commit** — artefak build. Sebaiknya tambahkan ke `.gitignore` dan hapus dari tracking (`git rm --cached tsconfig.tsbuildinfo`).
2. **Dependency CDN eksternal (runtime)** — `src/lib/handTracking.ts` memuat MediaPipe dari `esm.sh`, `cdn.jsdelivr.net`, dan `storage.googleapis.com`. Risiko: ketersediaan/kecepatan tergantung CDN pihak ketiga; pertimbangkan self-host aset WASM + model `.task` ke `public/` kalau mau mandiri.
3. **Folder verifikasi/recon tidak ikut di repo** — paket ZIP berisi `Kerja-Arena/` (recon, manifest, verification) di luar folder repo; hanya `apex-humanoid-rebuild/` yang di-commit. Kalau mau diarsipkan, bisa masuk folder `docs/` terpisah.
4. **`vercel.json` SPA rewrite semua route → index.html** — sudah sesuai untuk SPA; cache immutable hanya untuk `/assets/*` (hash Vite). `public/humanoid/*` diberi cache 7 hari — cek apakah aset humanoid punya nama file hash; kalau tidak, update aset akan butuh cache purge.
5. **Build Vercel sukses** (tsc -b && vite build) tanpa error — kode siap produksi apa adanya.
6. **Deploy kedua (via CLI) berstatus "Blocked"** karena Vercel Deployment Protection (SSO) pada akun hobby — deployment pertama tetap Ready dan ter-alias ke `niu-humanoid.vercel.app` (publik, HTTP 200). Kalau nanti deploy lagi dari CLI, cek status alias setelahnya.

## Status deploy
- Repo: `Niumination/Niu-Humanoid` (private) — commit awal tanpa perubahan kode
- Vercel: project `niu-humanoid`, production Ready
- URL: https://niu-humanoid.vercel.app
