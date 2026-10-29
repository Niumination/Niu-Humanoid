/**
 * lib/cues — port VERBATIM dari "hook bus" bundle APEX.
 *
 *   Qv  = Map renderer            → AE({name, onEnter, onExit, onMoment, onCheck})
 *   d1  = Set momen aktif         → CE(moment) / PE(moment)
 *   yy  = saklar suara global     → bE(on) / RE()
 *   id  = level sinyal {input, output} → UE(key,v) / $_(key) / DE(key)
 *
 * Semantik yang dipertahankan:
 *   - `PE()` menolak momen yang tidak dikenal (console warn "unknown moment").
 *   - `bE(false)` memanggil `onExit` untuk semua momen aktif lalu mematikan hook.
 *   - `fireMoment` = m1("onMoment", ...) ke SEMUA renderer terdaftar.
 */

export const WORLD = { WORKING: 'working' } as const

export const MOMENTS = {
  READY: 'ready',
  ASSEMBLY: 'assembly',
  NEEDS_YOU: 'needs_you',
  ALERT: 'alert',
  FAILED: 'failed',
} as const

export type Moment = (typeof MOMENTS)[keyof typeof MOMENTS]

export type HookName = 'onEnter' | 'onExit' | 'onMoment' | 'onCheck'

export interface Renderer {
  name?: string
  onEnter?: (m: string) => void
  onExit?: (m: string) => void
  onMoment?: (m: string, payload?: unknown) => void
  onCheck?: (state: string) => void
}

const renderers = new Map<symbol, Renderer>()
const activeMoments = new Set<string>()
let soundEnabled = true

/** AE(renderer) → fungsi unregister */
export function registerRenderer(r: Renderer): () => void {
  const key = Symbol(r?.name || 'renderer')
  renderers.set(key, r || {})
  return () => {
    renderers.delete(key)
  }
}

/** m1(hook, ...args) */
function callHook(hook: HookName, ...args: unknown[]) {
  if (!soundEnabled) return
  for (const r of renderers.values()) {
    const fn = r[hook] as ((...a: unknown[]) => void) | undefined
    if (!fn) continue
    try {
      fn.apply(r, args)
    } catch (err) {
      // bundle: p1(`${name}.${hook} threw`, err)
      if (typeof console !== 'undefined') console.warn(`${r.name || 'renderer'}.${hook} threw`, err)
    }
  }
}

/** bE(on) / RE() */
export function setSoundEnabled(on: boolean) {
  if (!on) for (const m of [...activeMoments]) exitMoment(m)
  soundEnabled = !!on
}
export const isSoundEnabled = () => soundEnabled

/** CE(moment) */
export function exitMoment(moment: string) {
  if (activeMoments.delete(moment)) callHook('onExit', moment)
}

/** PE(moment, payload) */
export function fireMoment(moment: string, payload: unknown = {}) {
  if (!(Object.values(MOMENTS) as string[]).includes(moment)) {
    if (typeof console !== 'undefined') console.warn('unknown moment', moment)
    return
  }
  // NB: bundle TIDAK menambahkan momen ke d1 di PE(); d1 hanya dikosongkan oleh CE().
  callHook('onMoment', moment, payload)
}

// --- level sinyal (bukan audio node; dipakai untuk HUD/energi) ---
const signals: Record<'input' | 'output', number> = { input: 0, output: 0 }
export const clamp01 = (v: unknown) => Math.max(0, Math.min(1, Number(v) || 0))

/** UE(key, value) */
export function setSignal(key: string, value: unknown) {
  if (key in signals) signals[key as 'input' | 'output'] = clamp01(value)
}
/** $_(key) */
export function getSignal(key: string): number {
  return signals[key as 'input' | 'output'] || 0
}
/** DE(key) */
export function clearSignal(key: string) {
  if (key in signals) signals[key as 'input' | 'output'] = 0
}
