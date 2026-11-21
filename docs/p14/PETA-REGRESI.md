# Peta regresi: riwayat bersama + anggaran per aplikasi (P14-B)

Masalah: selama ini verifikasi memakai **satu** riwayat build per aplikasi. Begitu workspace dipulihkan ke
keadaan upstream (audit 5z), acuan lama **hilang** — padahal justru acuan itu yang bisa menunjukkan regresi.
Akibatnya kita hanya bisa bilang "sekarang begini", tidak bisa bilang "dulu begini, sekarang begitu".

Solusi: **riwayat per aplikasi** (bukan per workspace) + **anggaran mutlak** yang tidak bergantung pada acuan
mana pun, sehingga verifikasi tetap tajam walau workspace berubah.

## 1. Tata letak

```
verification/riwayat/
  apex/
    indeks.json                 # daftar semua build APEX yang pernah terukur, terbaru di atas
    <tgl>-<sha8>/               # satu build = satu sampel, tidak pernah ditimpa
      meta.json                 # aset, sha256, ukuran, gzip, commit repo, sumber, provenance
      ukur-1440x900.json        # metrik viewport
      ukur-414x896.json
      ukur-390x844.json
      ukur.json                 # gabungan + angka turunan
  mira/
    …
```

Satu build **tidak** ditimpa: kalau sha256 sama, sampel lama dipertahankan dan hanya `meta.json` yang
ditambah rujukan. Jadi riwayat hanya bertambah.

## 2. Anggaran mutlak (tidak butuh acuan)

| ukuran | ambang | alasan |
|---|---|---|
| gzip JS APEX | ≤ 90 kB | sekarang ± 78 kB (P11) → ruang untuk P13/P14 ± 12 kB |
| gzip JS MIRA | ≤ 150 kB | sekarang ± 130 kB |
| JS APEX mentah | ≤ 280 kB | sekarang 226–235 kB |
| JS MIRA mentah | ≤ 620 kB | sekarang 534 kB |
| jumlah berkas aset JS | **1** | aplikasi ini satu bundel; pecah bundel = perubahan arsitektur, harus diputuskan sadar |
| waktu build | ≤ 60 s | sekarang ± 1 detik (Vite), jadi ambang ini hanya menangkap kemacetan |

Ambang ini **bukan** target mutu; ia menangkap "ada yang membengkak" pada build yang tetap lulus gerbang.

## 3. Turunan antar build (yang dicatat, bukan digerbang)

* Δ ukuran (mentah & gzip) terhadap build sebelumnya pada aplikasi yang sama.
* Δ cakupan, Δ cx, Δ MAE diri per viewport (`gate-paritas` v2).
* Δ jumlah aset plate & Δ provenance (milik kita vs salinan asli) — ini yang akan **bergerak** saat 5z
  diterapkan di APEX: 0/10 → 10/10 milik kita.

## 4. Aturan pemakaian

1. Setiap kali build baru diukur, **selalu** tambah sampel — jangan ganti.
2. Gerbang yang membandingkan dengan "acuan" harus menyebut **dari sampel mana** angka acuannya.
3. Kalau build melewati anggaran mutlak, gerbang **gagal** dan menyebut ukurannya; kalau hanya naik tapi
   masih di dalam anggaran, cukup dicatat sebagai Δ.
4. Saat merek berganti (P15), sampel tetap dipertahankan: riwayat tidak ikut berubah nama.
