/** Dump uniform LENGKAP untuk setiap draw wire (index count besar) di MIRA live. */
const { chromium } = require('/home/user/tools/node_modules/playwright')
const fs = require('fs')
const INIT = () => {
  window.__W = []
  const P = WebGL2RenderingContext.prototype
  const up = P.useProgram
  P.useProgram = function (p) { this.__p = p; return up.apply(this, arguments) }
  const de = P.drawElements
  P.drawElements = function (mode, count, type, off) {
    if (count > 5000 && this.__p && window.__W.length < 40) {
      const gl = this, prog = this.__p, out = {}
      const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS)
      for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(prog, i); if (!info) continue
        const nm = info.name.replace('[0]', '')
        const v = gl.getUniform(prog, gl.getUniformLocation(prog, nm))
        out[nm] = (typeof v === 'object' && v && v.length !== undefined) ? Array.from(v) : v
      }
      window.__W.push({ count, uniforms: out })
    }
    return de.apply(this, arguments)
  }
  const da = P.drawArrays
  P.drawArrays = function (mode, first, count) { if (count > 5000 && window.__W.length < 40) window.__W.push({ arrays: count }); return da.apply(this, arguments) }
}
;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--mute-audio'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.addInitScript(INIT)
  await p.goto('https://mira-humanoid.vercel.app/?auto=1&state=idle', { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForTimeout(9000)
  const w = await p.evaluate(() => window.__W)
  fs.writeFileSync('/home/user/Kerja-Arena/recon/mira-wire-draws.json', JSON.stringify(w, null, 1))
  console.log(JSON.stringify(w.slice(0, 3), null, 1).slice(0, 4000))
  console.log('total draws tercatat:', w.length)
  await b.close()
})()
