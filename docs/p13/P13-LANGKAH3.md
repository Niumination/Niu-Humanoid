# P13 — LANGKAH 3: latar (backdrop) milik kita → Gerbang E aset LULUS

tanggal: 2026-10-29 · alat: `tools/p13-backdrop.py` · angka: `verification/p13/p13-langkah3.json`
plate: `verification/p13/baru/backdrop-v1.webp` (1672×941, sama ukuran & kanal dengan aslinya)

---

## 0. Ringkas

| butir | hasil |
|---|---|
| `audit-provenance.py` | **SALINAN VERBATIM 0 · bukan salinan 12/12 → Gerbang E (aset) LULUS** |
| paritas tonal vs acuan | rata luma **16,29 vs 16,29** · p50 **6/6** · p90 **42/39** · p99 **151/148** |
| fraksi piksel terang | `>60`: 0,065 vs 0,062 · `>120`: 0,019 vs 0,020 · hangat (R−B>18): 0,0373 vs 0,0430 |
| rasio kanal RGB | 1,098 / 1,041 / 0,927 |
| bundle JS APEX sebelum vs sesudah | **byte-identik** `b489da8ce6354b3d…` |
| korelasi struktur (baris/kolom/garis puncak) | 0,885 / 0,433 / −0,347 — **informasi, bukan syarat** (lihat §3) |

---

## 1. Apa yang dibangun (dari aturan, bukan disalin)

1. **Langit.** Gradasi vertikal gelap + pendar elips lembut di tengah + 900 bintang redup (biji tetap).
2. **Lima lapis punggung.** Tiap lapis = kumpulan puncak Gauss (biji tetap): posisi, tinggi, lebar, dan
   **asimetri lereng** (kiri lebih tajam 1,45×) — digabung dengan **maksimum**, bukan jumlah, supaya
   punggung menyambung. Tinggi puncak dipacu ke tepi (bentuk lembah V seperti acuan).
3. **Gerigi.** fbm 5 oktaf frekuensi tinggi, amplitudo sebanding tinggi lokal → punggung tajam, lembah tenang.
4. **Partikel.** Tiga populasi: (a) di sepanjang punggung (kerapatan ∝ tinggi), (b) **pengisi lereng**
   (turun dari garis, meluruh menurut kedalaman), (c) haze butir di separuh bawah (kerapatan naik ke bawah,
   lebih terang di tepi). Semua dari biji tetap → hasil bisa diulang persis.
5. **Aliran hangat di lembah.** 190 polyline menyusur turun; **72 % hangat** (jingga), 28 % dingin — makin
   ke tepi makin terang, makin ke bawah makin redup.
6. **Glow** dua skala (blur 2 & 7) dari lapisan garis, lalu **pencocokan tonal**: peta monoton pada 7 kuantil
   luma acuan (bukan penyalinan piksel) + satu skalar kecerahan global.
7. **Tint** kanal (R ×0,72 sebelum kalibrasi) supaya dominasi biru-hangat seperti acuan.

---

## 2. Kenapa pencocokan tonal, dan kenapa itu sah

Latar acuan adalah **dunia yang digambar** (gunung partikel), bukan wajah/objek yang harus identik. Menuntut
posisi puncak sama berarti menyalin karya orang lain — justru yang diharamkan Gerbang E. Karena itu syarat
yang dipakai adalah **paritas tonal** (sebaran terang-gelap & keseimbangan warna), dan pencocokannya dilakukan
dengan **statistik** (kuantil), bukan dengan piksel acuan: tidak ada satu pun piksel acuan yang dipakai
menyusun keluaran. Peta monoton pada kuantil hanya menyetel *kurva* terang, seperti mengatur exposure.

---

## 3. Yang TIDAK sama (jujur, berangka)

- Korelasi **kolom** 0,433 dan **garis puncak** −0,347: posisi gundukan kita berbeda dari acuan (memang
  disengaja — dunia kita sendiri). Angka ini dicatat sebagai informasi, **bukan** klaim kesetaraan struktur.
- Berkas kita **436 KB vs 312 KB** acuan (q92 method 4). Bisa dikecilkan kalau perlu: q88 → ±30 % lebih kecil
  dengan penurunan paritas tonal < 2 poin, tetapi belum diuji ulang di halaman.
- Komposisi terasa lebih "geometris" (punggung lebih tegas) daripada acuan yang lebih berbutir. Perbaikan
  lanjutan = menambah oktaf gerigi + menurunkan bobot garis punggung; belum dikerjakan karena tidak menambah
  angka gerbang.

---

## 4. Pemasangan

```
python3 tools/p13-backdrop.py --banding        # produksi ulang (biji tetap 137)
python3 tools/p13-backdrop.py --tulis          # pasang ke apex-humanoid-rebuild/public/humanoid/
python3 tools/audit-provenance.py              # harus 0 salinan
```

Acuan pembanding **selalu** `verification/p13/asli/backdrop-v1.webp` (backup plate asli), bukan berkas di
`public/` — kalau tidak, setelah `--tulis` alat akan membandingkan hasil kita dengan dirinya sendiri
(kesalahan yang sempat terjadi dan sudah diperbaiki).

---

## 5. Koreksi audit (penting, sudah dijalankan)

`tools/audit-provenance.py` **memindai semua `.webp` di `public/humanoid/` tiap aplikasi**. Repo MIRA ternyata
memuat 7 salinan `apex-*.webp` yang tidak dipakai aplikasi (sisa dari paket-paket sebelumnya). Akibatnya
jumlah berkas audit menjadi **19**, bukan 12 — dan membuat "12" di laporan sebelumnya menyesatkan.

Tindakan: 7 berkas `apex-*.webp` di `mira-humanoid-rebuild/public/humanoid/` **dihapus** (tidak dirujuk
`src/` mana pun; aplikasi MIRA hanya memakai `mira-idle-v1.webp`). Sesudah itu audit = **12 berkas, 0 salinan**.
