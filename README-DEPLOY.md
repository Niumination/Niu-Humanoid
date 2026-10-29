# Deploy & verifikasi terhadap produksi

## 1. Build lokal (wajib lulus sebelum deploy)

```bash
npm install
npm run build          # tsc -b && vite build
npm run preview        # cek hasil build di http://localhost:4173
```

## 2. Deploy ke Vercel

```bash
npm i -g vercel        # sekali saja
vercel login
vercel deploy          # preview
vercel deploy --prod   # produksi
```

`vercel.json` sudah berisi SPA-fallback (semua rute → `/index.html`) dan cache-header
untuk `/assets` serta `/humanoid`. Framework terdeteksi otomatis sebagai Vite.

## 3. Verifikasi terhadap URL produksimu

```bash
node ../tools/diff-vs-production.js https://<project>.vercel.app
```

Skrip itu membandingkan **deployment kamu** dengan **apex-humanoid.vercel.app** pada
seluruh gerbang yang sudah ada (entry, state, birth, backdrop) dan menulis
`verification/deploy/deploy-diff.json` + screenshot berdampingan.

## 4. Catatan

- Semua aset di `public/humanoid/` harus tersalin byte-for-byte dari `recon/assets/`.
- Debug bar hanya muncul dengan `?auto` (sama seperti produksi aslinya).
- `?skip` inert pada mount pertama (perilaku bundle, lihat F-23); gunakan
  `prefers-reduced-motion` atau tunggu 7,4 s.
