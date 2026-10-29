# Prompt Rebuild 100% — apex-humanoid & mira-humanoid

Dua live demo Vercel, tanpa source code, dibedah langsung dari bundle produksinya.
Folder ini berisi **prompt** untuk menyuruh agent lain membangun ulangnya, plus
**bukti ekstraksi** yang membuat prompt itu tidak bisa dibantah.

## Pakai yang mana?

| File | Untuk |
|---|---|
| **`PROMPT-SIAP-TEMPEL.md`** | **Pakai ini.** Satu file, ~7.200 kata: master prompt + spec APEX + spec MIRA. Salin seluruhnya ke agent pembangun. |
| `PROMPT-MASTER-REBUILD.md` | Master prompt saja (metodologi + 5 fase + gerbang verifikasi). Pakai kalau agent-mu bisa membaca file lampiran. |
| `SPEC-APEX.md` | Suplemen APEX: aset, state, 18 hook `window.__HUM_*`, blend mode, timing. |
| `SPEC-MIRA.md` | Suplemen MIRA: 82 slider dalam 20 seksi, shader, 8 modul `lib/`, palet. |
| `verify-spec.py` | Skrip yang mengecek ulang **193 klaim** di kedua spec terhadap bundle. Hasil terakhir: **193/193 lolos**. |

## Cara menjalankan

```bash
# 1. Buka agent pembangun (Claude Code / Cursor / Codex / Arena), target = salah satu situs
# 2. Tempel seluruh isi PROMPT-SIAP-TEMPEL.md
# 3. Tulis di baris pertama:  TARGET = mira-humanoid
# 4. Agent akan menjalankan Fase 0 → 4. Jangan izinkan dia melompat ke Fase 3.
```

Kalau agent-mu bisa membaca file, cukup berikan tiga file:
`PROMPT-MASTER-REBUILD.md` + `SPEC-<TARGET>.md` + folder `recon/` ini apa adanya.

## Apa yang sudah saya ekstrak (bukan tebakan)

| | apex-humanoid | mira-humanoid |
|---|---|---|
| Bundle JS | `index-BD7VNgkM.js` — 1.108.884 byte | `index-1PiDnpcG.js` — 1.185.588 byte |
| CSS | 224 byte | 574 byte (ada breakpoint 720px) |
| Stack | React + @react-three/fiber + postprocessing | sama |
| Aset | 8 webp (7 state + backdrop) | 2 webp (dipakai sebagai mask) |
| State | idle / listening / thinking / speaking / strong | IDLE / LISTENING / TALKING |
| Kontrol | query param + 18 global `window.__HUM_*` | panel 82 slider, 20 seksi |
| Modul internal | — | 8 modul `lib/…` |
| Hand tracking | MediaPipe tasks-vision 0.10.14 | sama |
| Audio | 100% disintesis Web Audio (tanpa file) | sama |
| Sourcemap | tidak ada (404) | tidak ada (404) |

Sudah di-download ke sini: `apex.js`, `mira.js`, `apex.css`, `mira.css`,
`apex-index.html`, `mira-index.html`, `assets/` (10 webp, 2.9 MB),
`mira-params.json` (82 entri), `mira-design-comments.txt` (19 baris niat desain),
`apex-design-comments.txt` (2 baris).

## Soal "100%" — baca ini dulu

**Yang bisa 100% identik, dan prompt ini menuntut itu:**
struktur DOM, semua teks & ejaan, semua CSS & tipografi, palet, 82 nilai slider
(min/max/step/default + urutan), matematika shader (disalin verbatim, komentarnya ikut),
aset gambar (byte-identical), urutan & durasi timeline, struktur graph audio,
pesan error, breakpoint, semua hook `?param` dan `window.__*`.

**Yang tidak bisa bit-identik:** posisi partikel dan garis yang lahir dari PRNG.
Bisa jadi identik kalau seed & algoritma PRNG-nya ikut diekstrak dari bundle —
prompt ini menyuruh agent mencobanya. Kalau tidak berhasil, itu dicatat sebagai
deviasi yang diterima, **bukan** disembunyikan.

**100% di sini artinya terukur.** Prompt ini mewajibkan 4 gerbang dengan angka:
diff DOM (0 beda), panel (82/82), diff piksel (0% piksel beda > 32/255,
≤ 0.10% beda > 8/255, MAE ≤ 1.5/255, bbox ≤ 1 px, durasi ≤ 30 ms), dan uji fungsi.
Agent dilarang menulis "sudah mirip" tanpa menempelkan keluaran skripnya.

## Kenapa prompt-nya panjang

Karena bundle aslinya **menyimpan spesifikasi desainnya di dalam komentar shader**.
Contoh nyata dari `mira.js`:

> *"a MIRA ribbon (the near-orb correction, sections 12-13): ONE bright folding edge,
> a fading translucent body, broken secondary detail — never two clean edges with a
> uniform fill"*

> *"HOT, then its own colour (vF): the flare carries the line's own colour — never a
> white sketch (Ruben: "the build of white lines look bad")"*

> *"measured in the lab (debug view 5): this field crosses 0.48 in 2-4 places at a
> time and almost never 0.56, so the working threshold is ~0.50"*

Ada penomoran seksi (12, 13, 20, 21, 22) dan penomoran ronde revisi (round 4, 6, 8,
20-22). Visual ini hasil iterasi puluhan ronde. Prompt ini melarang agent
"merapikan" apa pun yang terlihat aneh — keanehan itu disengaja.

## Cek ulang sendiri

```bash
cd recon && python3 verify-spec.py
# >>> 193/193 klaim di file spec cocok dengan bundle live.
```

Ekstraksi dilakukan 2026-10-29. Kalau Vercel-nya di-redeploy dengan bundle baru,
nama file `index-*.js` berubah dan beberapa angka bisa bergeser — jalankan Fase 0
di master prompt untuk menarik ulang, lalu jalankan `verify-spec.py` lagi.
