# PENUTUPAN UNVERIFIED (U-1, U-3, U-4, U-7) + koreksi kunci waktu

Dikerjakan sebelum menulis kode aplikasi (keputusan interview: *tutup dulu yang murah*).
Sumber: ekstraksi bundle + uji runtime Chromium headless (SwiftShader).

---

## U-1 — teks `STATUS: SPEAKING  INTENSITY: HIGH` → **TERTUTUP**

Logika verbatim dari `apex.js`:

```js
const Le = Pm(i);                                  // state aktif ('idle'|'listening'|'thinking'|'speaking'|'strong')
const W  = ae || (Le === "speaking" && H)
  ? "STATUS: SPEAKING  INTENSITY: HIGH"            // ← DUA spasi, persis seperti spec
  : `STATUS: ${Le.toUpperCase()}`;
```

dengan `H` di-set oleh timer terpisah:

```js
useEffect(() => { const Q = setInterval(() => le(l.current > .58), 180); return () => clearInterval(Q) }, []);
```

**Jawaban:** teks dua-spasi muncul bila & hanya bila `state === "speaking"` **dan** level energi audio
`l.current > 0.58`, dievaluasi tiap **180 ms**. `l.current` = energi dari AnalyserNode, bukan dari
`window.__HUM_ENERGY`. Jadi ia **tidak bisa** dipaksa lewat query param; perlu audio nyata
(mic atau synth internal saat REPLAY).
Catatan: `?state=speaking` tanpa audio → hanya `STATUS: SPEAKING` (sesuai yang terekam di ground truth).

## U-3 — fungsi persen `ASSEMBLING... N%` → **TERTUTUP**

```js
if (matchMedia("(prefers-reduced-motion: reduce)").matches || window.__HUM_SKIP_ASSEMBLY) { J(""); return }
PE(Yh.ASSEMBLY);
const xe = setInterval(() => {
  const Ue = S.current;                                              // progres 0..1
  J(Ue >= 1 ? "" : `ASSEMBLING... ${Math.min(99, Math.round(Ue * 100))}%`);
  Ue >= 1 && clearInterval(xe);
}, 160);
```

- Teks awal sebelum tick pertama: **`ASSEMBLING... 25%`** (nilai awal state, hard-coded).
- Update tiap **160 ms**; nilai **di-clamp maksimum 99%**; kosong (`""`) saat progres ≥ 1.
- Efek dilewati total bila `prefers-reduced-motion: reduce` **atau** `window.__HUM_SKIP_ASSEMBLY`.

## U-4 — nilai tombol `SPEED` MIRA → **TERTUTUP**

```jsx
<button onClick={() => g(D => D === 1 ? .3 : 1)}>SPEED {m}x</button>
```

Dua nilai saja: **`1`** dan **`0.3`** → label `SPEED 1x` ⇄ `SPEED 0.3x`. Default `1`.

## U-7 — daftar state valid MIRA → **TERTUTUP**

```js
Jw = [["idle","IDLE"],["listening","LISTENING"],["talking","TALKING"]];
```

3 state, masing-masing dengan label readout. `?state=` divalidasi terhadap `Jw`; selain itu → `idle`.

---

## Koreksi penting pada "kunci waktu" (menggantikan F-8/F-9)

| dugaan sebelumnya | hasil uji | konsekuensi |
|---|---|---|
| `?skip` melewati assembly | **`?skip` INERT di build live.** `window.__HUM_SKIP_ASSEMBLY` tetap `undefined` sebelum & sesudah klik, dan `ASSEMBLING…` tetap berjalan 9%→65% | F-9 diperbaiki: **jangan andalkan `?skip`** |
| `?asmel=<t>` memotret detik t | **benar, dan ia MEMBEKUKAN**: `?asmel=0` → tetap `0%` selama 4+ detik | kunci assembly yang sah untuk Gerbang C |
| (belum diketahui) | **`prefers-reduced-motion: reduce` melewati assembly sepenuhnya** → langsung `STATUS: IDLE` | **ini kunci terbersih untuk screenshot state** |
| `?auto` melewati entry | tidak; entry tetap perlu klik | wajib `page.click('button')` |

Bukti runtime (teks readout tiap 0,7 s, 6 sampel):

```
?skip&state=idle            entry=true → ["ASSEMBLING... 9%","…19%","…27%","…36%","…46%","…65%"]
?auto&skip                  entry=true → ["ASSEMBLING... 9%","…19%","…29%","…39%","…46%","…78%"]
?skip + reduced-motion      entry=true → ["STATUS: IDLE" ×6]
?asmel=0                    entry=true → ["ASSEMBLING... 0%" ×6]        ← terbukti beku
```

Query param lain yang terbukti **bekerja** saat dicek langsung: `?bgrest=0.3` → `window.__HUM_BG_REST = 0.3`,
`?surge=1.5` → `window.__HUM_SURGE = 1.5`. Yang **tidak** bekerja: `?skip`.

## Sisa UNVERIFIED

U-2 (state `strong`), U-5 (11 shader MIRA tanpa nama), U-6 (arti numerik `?voice/?talk/?listen`),
U-8 (3 class MIRA tak terpakai), U-9 (PRNG MIRA), U-10 (**sudah diputuskan**: panel dibangun lengkap).
U-3 & U-1 kini tertutup; U-4 & U-7 tertutup.
