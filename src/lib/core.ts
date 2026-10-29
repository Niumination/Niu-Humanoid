/**
 * lib/core — port VERBATIM dua potongan bundle APEX:
 *   LU()  → 240 mote inti (Lehmer seed 424171)
 *   F()   → flare inti: dua radial gradient + mote, composite "lighter", di (w*.5, h*.94)
 *
 * F(fe, Ye, _e, Te, nt, Pe=1, Ke=1):
 *   xt = Te*Pe            (waktu berskala)
 *   dt = Ye*.5            (x pusat)
 *   Ge = _e*.94           (y pusat)
 *   pt = min(Ye,_e)*.034  (radius dasar)
 *   gradient stops: rgba(235,255,255,.85·nt·Ke) / rgba(90,228,255,.55·nt·Ke)
 *                   rgba(25,130,200,.22·nt·Ke) / rgba(0,0,0,0)
 *   radius gradient = pt*4.2 ; fill kotak pt*8.8
 *   mote: x+wobble .004/.0035, alpha nt*(bright?.9:.5), warna #d8fbff / no(#19ddff)
 */
export const ACCENT = '#19ddff'

export interface Mote { ox: number; oy: number; ph: number; sp: number; size: number; bright: boolean }

/** LU() — verbatim */
export function buildMotes(): Mote[] {
  let i = 424171
  const e = () => ((i = (i * 16807) % 2147483647), (i - 1) / 2147483646)
  const t = () => (e() + e() + e() - 1.5) / 1.5
  return Array.from({ length: 240 }, () => ({
    ox: t() * 0.028,
    oy: t() * 0.024,
    ph: e() * Math.PI * 2,
    sp: 0.6 + e() * 1.8,
    size: 0.7 + e() * 1.4,
    bright: e() < 0.2,
  }))
}

/** F() — verbatim */
export function drawCore(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  intensity: number,
  scale = 1,
  ringAlpha = 1,
  motes: Mote[] = []
) {
  if (intensity <= 0.01) return
  const xt = t * scale
  const cx = W * 0.5
  const cy = H * 0.94
  const pt = Math.min(W, H) * 0.034
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  if (ringAlpha > 0.01) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, pt * 4.2)
    g.addColorStop(0, `rgba(235,255,255,${0.85 * intensity * ringAlpha})`)
    g.addColorStop(0.16, `rgba(90,228,255,${0.55 * intensity * ringAlpha})`)
    g.addColorStop(0.45, `rgba(25,130,200,${0.22 * intensity * ringAlpha})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(cx - pt * 4.4, cy - pt * 4.4, pt * 8.8, pt * 8.8)
  }
  const vt = Math.min(W, H) / 1000
  const Ot = 1 + (scale - 1) * 0.25
  for (const m of motes) {
    const ox = Math.sin(xt * m.sp + m.ph) * 0.004 * Ot
    const oy = Math.cos(xt * m.sp * 0.8 + m.ph) * 0.0035 * Ot
    ctx.globalAlpha = intensity * (m.bright ? 0.9 : 0.5)
    ctx.fillStyle = m.bright ? '#d8fbff' : ACCENT
    const s = m.size * vt
    ctx.fillRect(cx + (m.ox + ox) * W - s / 2, cy + (m.oy + oy) * H - s / 2, s, s)
  }
  ctx.restore()
  ctx.globalAlpha = 1
}
