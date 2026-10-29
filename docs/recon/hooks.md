# HOOK TUNING — hasil P4 (Fase 1.5)

Semua nama di bawah **wajib diimplementasikan persis**. Sumber: `hooks.json` (offset + konteks tiap kemunculan).
Status: **P4 selesai** — setiap query param milik aplikasi sudah diberi arti dari konteks pemakaiannya.

---

## APEX — 18 global `window.__HUM_*`

| global | kemunculan | catatan |
|---|---|---|
| `__HUM_ASM_EL` | 3× | elemen waktu assembly (detik) |
| `__HUM_ASM_OFF` | 3× | offset assembly × 1000 ms |
| `__HUM_ATTN` | 4× | `{x,y}` perhatian, dijepit −1..1, ×1.6 |
| `__HUM_BG_PULSE` | 3× | default 2.6 |
| `__HUM_BG_REST` | 3× | default 0.22 |
| `__HUM_BG_T` | 2× | **jam latar** — tidak ada di tabel SPEC-APEX §6, ada di bundle |
| `__HUM_BLEND` | 6× | `{a,b,r}` → `uStateA/uStateB/uBloomR` + `uTexA/uTexB` |
| `__HUM_BOIL_AMP` | 2× | → `uBoilAmp` |
| `__HUM_CLICK` | 4× | `{t}` |
| `__HUM_DOT` | 2× | → `uDotSharp` |
| `__HUM_ENERGY` | 4× | ambang "strong" = `(energy − 0.34) / 0.4` |
| `__HUM_FORCE_2D` | 1× | paksa jalur canvas 2D |
| `__HUM_FREEZE_T` | 4× | **kunci waktu** untuk Gerbang C |
| `__HUM_NO_BG` | 2× | matikan latar |
| `__HUM_RIM` | 2× | → `uRim` |
| `__HUM_SKIP_ASSEMBLY` | 3× | true → t = 99000 |
| `__HUM_SPEAK_AMP` | 2× | default 0.55 |
| `__HUM_SURGE` | 7× | dijepit `0 < x ≤ 4.5` |

> SPEC-APEX menyebut "18 hook"; hitungan bundle = **18 + `__HUM_BG_T` = 19 nama** (selisih ini sebelumnya tercatat sebagai temuan F-6).

## APEX — query param

| param | jenis | arti (dari konteks) |
|---|---|---|
| `?skip` | APP | set `__HUM_SKIP_ASSEMBLY` |
| `?asmoff=<dtk>` | APP | `__HUM_ASM_OFF = dtk` |
| `?asmel=<dtk>` | APP | `__HUM_ASM_EL = dtk` |
| `?nobg` | APP | `__HUM_NO_BG` |
| `?bgrest=<0..1>` | APP | `__HUM_BG_REST` (default .22) |
| `?bgpulse=<n>` | APP | `__HUM_BG_PULSE` (default 2.6) |
| `?surge=<n>` | APP | `__HUM_SURGE` (≤ 4.5) |
| `?state=<state>` | APP | state awal; fallback `"idle"` |
| `?auto` | APP | `useState(!!get("auto"))` → lewati entry, langsung jalan |
| `?map`, `?intensity`, `?vertex`, `?fragment` | **vendor three.js/postprocessing** | bukan milik aplikasi — jangan diimplementasikan |

## MIRA — global window

| nama | arti |
|---|---|
| `window.__MIRA_DEBUG` | nilai awal mode debug (fallback untuk `?mira_debug`) |
| `window.__HUM_ATTN` | perhatian (dipakai bersama basis kode APEX) |

## MIRA — query param (semantik sudah dipastikan dari kode)

| param | arti (verbatim dari perilaku bundle) |
|---|---|
| `?off=a,b,c` | `Ur = new Set((get("off")\|\|"").split(","))` → **daftar layer yang dimatikan** |
| `?arcs` / `?bloom` / `?core` / `?figure` / `?fog` / `?hair` / `?lines` / `?matter` / `?pic` / `?waves` / `?lights` / `?cutwhite` | **bukan param mandiri** — semuanya dibaca sebagai `Ur.has("<nama>")`, jadi hanya berlaku bila nama itu ada di `?off=…` |
| `?cutwhite` (via `?off=cutwhite`) | mengubah filter mask dari `brightness(0)` → `brightness(0) invert(1)` |
| `?state=<idle\|listening\|talking\|…>` | state awal; divalidasi terhadap daftar `Jw`, fallback `"idle"` |
| `?auto` | lewati entry screen |
| `?t=<detik>` | **kunci waktu** — `h = has("t") ? Number(get("t")) : null`; clock dipaksa ke nilai ini (padanan `__HUM_FREEZE_T` di APEX) |
| `?listen=<n>` / `?talk=<n>` / `?voice=<n>` | memaksa level audio tanpa mikrofon (`Ew({voice,talk,listen})`) — dipakai untuk uji state tanpa mic |
| `?mira_debug=<mode>` | 9 mode: `""`, `orb`, `mask`, `breakup`, `near`, `hot`, `nearhot`, `core`, `corehot` |
| `?hot=<0..1>` | menimpa `hotLo`, hanya bila `0 < t < 1` (default 0.5) |
| `?dial.<key>=<nilai>` | **menulis nilai slider panel dari URL**: `for (const [k,v] of searchParams) if (k.startsWith("dial.")) set(k.slice(5), Number(v))` |
| `?auto`, `?map`, `?intensity`, `?vertex`, `?fragment` | **vendor three.js** — bukan milik aplikasi |

### Dua temuan besar dari P4

1. **`?dial.<key>=<v>` (MIRA)** — seluruh 82 parameter bisa di-set via URL. Ini membuat Gerbang B/C bisa diotomasi
   tanpa menyentuh slider, dan membuat uji panel deterministik. Spec sebelumnya tidak menyebut ini sama sekali.
2. **`?t=<detik>` (MIRA) = padanan `__HUM_FREEZE_T` (APEX)** — Gerbang C untuk MIRA tidak perlu "freeze clock buatan";
   hook-nya sudah ada di bundle. Rencana P9 harus memakai `?t=` (bukan menambah hook baru).

### Yang masih terbuka

- Arti `?voice` vs `?listen` vs `?talk` sebagai *nilai* (bukan flag) belum dipetakan ke rentang numeriknya —
  perlu uji runtime di P6 (jalankan `?t=2&listen=1` dan lihat readout `MIC `/`SOUND `/`SPEED `).
- `Jw` (daftar state MIRA yang valid) belum diekstrak literalnya; perlu diambil di P6 saat snapshot DOM.
