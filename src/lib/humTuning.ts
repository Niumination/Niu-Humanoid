/**
 * lib/humTuning — padanan fungsi JU() di bundle APEX.
 * Semua nama query param & nama global WAJIB persis (lihat recon/hooks.md).
 * Urutan evaluasi mengikuti bundle: skip, nobg, asmoff, asmel, surge, bgrest, bgpulse.
 */

export type HumState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'strong'

export const KNOWN_STATES: HumState[] = ['idle', 'listening', 'thinking', 'speaking', 'strong']

export interface Tuning {
  skill: boolean
  skipAssembly: boolean
  noBg: boolean
  asmOff: number | null
  asmEl: number | null
  surge: number | null
  bgRest: number | null
  bgPulse: number | null
  state: string
  auto: boolean
}

/** JU() — dipanggil sekali, menulis ke window.__HUM_* lalu mengembalikan state awal. */
export function readTuning(search: string = window.location.search): Tuning {
  const i = new URLSearchParams(search)

  // --- global window (nama & nilai verbatim dari bundle) ---
  if (i.get('skip')) (window as any).__HUM_SKIP_ASSEMBLY = true
  if (i.get('nobg')) (window as any).__HUM_NO_BG = true
  if (i.get('asmoff')) (window as any).__HUM_ASM_OFF = Number(i.get('asmoff'))
  if (i.get('asmel') != null && i.get('asmel') !== '') (window as any).__HUM_ASM_EL = Number(i.get('asmel'))
  if (i.get('surge') != null && i.get('surge') !== '') (window as any).__HUM_SURGE = Number(i.get('surge'))
  if (i.get('bgrest') != null && i.get('bgrest') !== '') (window as any).__HUM_BG_REST = Number(i.get('bgrest'))
  if (i.get('bgpulse') != null && i.get('bgpulse') !== '') (window as any).__HUM_BG_PULSE = Number(i.get('bgpulse'))

  // bundle: JU() mengembalikan string mentah; normalisasi baru terjadi di Pm()
  const state = i.get('state') || 'idle'

  return {
    skill: true,
    skipAssembly: !!i.get('skip'),
    noBg: !!i.get('nobg'),
    asmOff: i.get('asmoff') ? Number(i.get('asmoff')) : null,
    asmEl: i.get('asmel') != null && i.get('asmel') !== '' ? Number(i.get('asmel')) : null,
    surge: i.get('surge') != null && i.get('surge') !== '' ? Number(i.get('surge')) : null,
    bgRest: i.get('bgrest') != null && i.get('bgrest') !== '' ? Number(i.get('bgrest')) : null,
    bgPulse: i.get('bgpulse') != null && i.get('bgpulse') !== '' ? Number(i.get('bgpulse')) : null,
    state,
    auto: !!i.get('auto'),
  }
}

/** default terverifikasi: BG_REST .22 · BG_PULSE 2.6 · SPEAK_AMP .55 · surge dijepit 0<x<=4.5 */
export const bgRest = () => (window as any).__HUM_BG_REST ?? 0.22
export const bgPulse = () => (window as any).__HUM_BG_PULSE ?? 2.6
export const speakAmp = () => ((window as any).__HUM_SPEAK_AMP != null ? Number((window as any).__HUM_SPEAK_AMP) : 0.55)
export const surge = () => {
  const Ut = (window as any).__HUM_SURGE
  return Ut != null && (Ut <= 0 || Ut > 4.5) ? null : Ut
}
export const strongMix = (energy: number) => (energy - 0.34) / 0.4
