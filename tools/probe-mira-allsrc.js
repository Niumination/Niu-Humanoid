/** probe-mira-allsrc.js — simpan SEMUA sumber shader yang dikompilasi live (termasuk pass bloom postprocessing). */
const { chromium } = require('/home/user/tools/node_modules/playwright')
const fs = require('fs')
const OUT = '/home/user/Kerja-Arena/recon/shaders/mira-allsrc'
const INIT = () => {
  window.__SH = []
  const wrap = (P) => {
    const oCreate = P.createShader
    P.createShader = function (t) {
      const s = oCreate.apply(this, arguments)
      const oSrc = this.shaderSource.bind(this)
      this.shaderSource = (sh, src) => { if (sh === s) window.__SH.push({ t, src }); return oSrc(sh, src) }
      return s
    }
  }
  wrap(WebGL2RenderingContext.prototype)
  wrap(WebGLRenderingContext.prototype)
}
;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--mute-audio'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.addInitScript(INIT)
  await p.goto('https://mira-humanoid.vercel.app/?auto=1&state=idle', { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForTimeout(9000)
  const sh = await p.evaluate(() => window.__SH)
  await b.close()
  const seen = new Set()
  let i = 0
  for (const s of sh) {
    if (seen.has(s.src)) continue
    seen.add(s.src)
    const kind = s.t === 35633 ? 'vert' : 'frag'
    const f = `${OUT}/${String(i).padStart(2, '0')}-${kind}-${s.src.length}.glsl`
    fs.writeFileSync(f, s.src)
    i++
  }
  console.log('shader unik:', seen.size)
})()
