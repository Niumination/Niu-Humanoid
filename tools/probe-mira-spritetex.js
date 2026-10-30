/** probe-mira-spritetex.js — tekstur mana yang dipakai tiap draw (khusus sprite). */
const { chromium } = require('/home/user/tools/node_modules/playwright')
const fs = require('fs')
const INIT = () => {
  const P = WebGL2RenderingContext.prototype
  let unit = 0
  const bound = new Map()      // unit -> texture
  const texKind = new Map()    // texture -> label
  let prog = null, state = { prog: null }
  const oUse = P.useProgram; P.useProgram = function (p) { state.prog = p; return oUse.apply(this, arguments) }
  const oAct = P.activeTexture; P.activeTexture = function (u) { unit = u - 33984; return oAct.apply(this, arguments) }
  const oBind = P.bindTexture; P.bindTexture = function (t, tex) { bound.set(unit, tex); return oBind.apply(this, arguments) }
  const oSub = P.texSubImage2D; P.texSubImage2D = function (...a) {
    const src = a[6] ?? a[8]
    const t = bound.get(unit)
    if (t && src && src.width) {
      const i = src instanceof HTMLCanvasElement ? 'canvas' : 'image'
      texKind.set(t, `${i}:${src.width}x${src.height}`)
    }
    return oSub.apply(this, arguments)
  }
  const oSub2 = P.texImage2D; P.texImage2D = function (...a) {
    const src = a[5] ?? a[8]
    const t = bound.get(unit)
    if (t && src && src.width) texKind.set(t, `${src instanceof HTMLCanvasElement ? 'canvas' : 'image'}:${src.width}x${src.height}`)
    return oSub2.apply(this, arguments)
  }
  const oDrawE = P.drawElements
  P.drawElements = function (mode, count) {
    const gl = this
    const n = gl.getProgramParameter(state.prog, gl.ACTIVE_UNIFORMS)
    const tex = []
    for (let i = 0; i < n; i++) {
      const u = gl.getActiveUniform(state.prog, i)
      if (u.type !== gl.SAMPLER_2D) continue
      const loc = gl.getUniformLocation(state.prog, u.name)
      const u2 = gl.getUniform(state.prog, loc)
      tex.push(`${u.name}=unit${u2}:${texKind.get(bound.get(u2)) || '?'}`)
    }
    if (tex.length) (window.__DT = window.__DT || []).push({ count, tex: tex.join(' ') })
    return oDrawE.apply(this, arguments)
  }
}
;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--mute-audio'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.addInitScript(INIT)
  await p.goto('https://mira-humanoid.vercel.app/?auto=1&state=idle', { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForTimeout(8000)
  const dt = await p.evaluate(() => window.__DT || [])
  await b.close()
  const seen = new Set()
  for (const x of dt) { const k = x.count + ' ' + x.tex; if (seen.has(k)) continue; seen.add(k); console.log(x.count, '|', x.tex) }
})()
