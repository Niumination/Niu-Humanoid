/**
 * lib/hooks — 18 global `window.__HUM_*` APEX.
 *
 * Sumber: recon/hooks.md (P4). SEMUA nama di bawah wajib ada & terbaca.
 * Catatan F-38: `grep -o "__HUM_[A-Z_]*" apex.js | sort -u` menghasilkan **18** nama
 * (bukan 19 seperti tertulis di hooks.md). `__HUM_FORCE_2D` sempat tak terhitung karena
 * mengandung angka ("2D"). Rebuild memakai daftar 18 yang terukur ini.
 *
 * PENTING — hasil audit bundle: 13 dari 19 hook hanya dibaca oleh lapisan
 * three.js/WebGL (uniform shader) yang pada build produksi tidak menyumbang
 * piksel terukur (lihat VERIFICATION.md langkah 5: 0,014–0,024 % tanpa layer itu).
 * Karena rebuild ini murni 2D-canvas, hook tersebut tetap **dibaca dan dicatat**
 * (bisa diinspeksi lewat `readHooks()`), tetapi tidak mengubah gambar.
 *
 * Hook yang PUNYA efek di jalur 2D:
 *   __HUM_SKIP_ASSEMBLY  → lompati birth
 *   __HUM_ASM_EL         → beku waktu birth (detik)
 *   __HUM_ASM_OFF        → offset mulai birth
 *   __HUM_NO_BG          → matikan backdrop
 *   __HUM_SURGE          → fase surge untuk glow "horn" (overlay DOM)
 *   __HUM_ATTN           → matikan umpan-balik attention dari kamera
 *   __HUM_FORCE_2D       → paksa jalur 2D (sudah selalu 2D di sini)
 *   __HUM_FREEZE_T       → kunci waktu render (Gerbang C)
 *
 * Shader-only (dicatat, tanpa efek visual 2D):
 *   __HUM_BLEND, __HUM_BOIL_AMP, __HUM_CLICK, __HUM_DOT, __HUM_ENERGY,
 *   __HUM_RIM, __HUM_BG_REST, __HUM_BG_PULSE, __HUM_BG_T, __HUM_SPEAK_AMP
 */

export const HOOK_NAMES = [
  '__HUM_ASM_EL',
  '__HUM_ASM_OFF',
  '__HUM_ATTN',
  '__HUM_BG_PULSE',
  '__HUM_BG_REST',
  '__HUM_BG_T',
  '__HUM_BLEND',
  '__HUM_BOIL_AMP',
  '__HUM_CLICK',
  '__HUM_DOT',
  '__HUM_ENERGY',
  '__HUM_FORCE_2D',
  '__HUM_FREEZE_T',
  '__HUM_NO_BG',
  '__HUM_RIM',
  '__HUM_SKIP_ASSEMBLY',
  '__HUM_SPEAK_AMP',
  '__HUM_SURGE',
] as const

export type HookName = (typeof HOOK_NAMES)[number]

/** Hook yang benar-benar memengaruhi jalur 2D. */
export const HOOKS_2D: HookName[] = [
  '__HUM_SKIP_ASSEMBLY',
  '__HUM_ASM_EL',
  '__HUM_ASM_OFF',
  '__HUM_NO_BG',
  '__HUM_SURGE',
  '__HUM_ATTN',
  '__HUM_FORCE_2D',
  '__HUM_FREEZE_T',
]

export const w = (): any => (typeof window === 'undefined' ? {} : window)

export const getHook = (name: HookName) => w()[name]
export const hasHook = (name: HookName) => getHook(name) != null

export function numHook(name: HookName, fallback: number | null = null): number | null {
  const v = getHook(name)
  return v == null ? fallback : Number(v)
}

/** Kunci waktu render: `__HUM_FREEZE_T` mengalahkan jam dinding (seperti uniform `uT`). */
export function frozenTime(): number | null {
  const v = numHook('__HUM_FREEZE_T')
  return v == null || Number.isNaN(v) ? null : v
}

/** Peta lengkap untuk laporan/inspeksi (Gerbang B langkah 7). */
export function readHooks(): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const n of HOOK_NAMES) out[n] = getHook(n)
  return out
}
