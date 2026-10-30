/**
 * probe-mira-shaders.js — dump GLSL FINAL yang benar-benar dikompilasi MIRA live.
 * Shader MIRA dirakit dari konkat + interpolasi JS bertingkat, jadi satu-satunya sumber
 * yang bisa dipercaya adalah hasil shaderSource() saat runtime.
 * Keluaran: recon/shaders/mira-live/NN-{vert,frag}-<hash>.glsl + INDEX.json
 */
const { chromium } = require('/home/user/tools/node_modules/playwright')
const fs = require('fs')
const path = require('path')
const LIVE = process.argv[2] || 'https://mira-humanoid.vercel.app/?auto=1&state=idle'
const OUT = '/home/user/Kerja-Arena/recon/shaders/mira-live'

const INIT = () => {
  window.__sh = []
  for (const P of [WebGLRenderingContext.prototype, window.WebGL2RenderingContext?.prototype].filter(Boolean)) {
    const ss = P.shaderSource
    P.shaderSource = function (sh, src) {
      window.__sh.push({ type: this.getShaderParameter(sh, this.SHADER_TYPE), src })
      return ss.apply(this, arguments)
    }
  }
}
;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--mute-audio'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.addInitScript(INIT)
  await p.goto(LIVE, { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForTimeout(9000)
  const sh = await p.evaluate(() => window.__sh)
  await b.close()

  const seen = new Set()
  const idx = []
  let n = 0
  for (const { type, src } of sh) {
    const kind = type === 35633 ? 'vert' : 'frag'
    const hash = require('crypto').createHash('sha1').update(src).digest('hex').slice(0, 6)
    const key = kind + hash
    if (seen.has(key)) continue
    seen.add(key)
    const file = `${String(n).padStart(2, '0')}-${kind}-${src.length}b-${hash}.glsl`
    fs.writeFileSync(path.join(OUT, file), src)
    idx.push({ file, kind, bytes: src.length, hash })
    n++
  }
  fs.writeFileSync(path.join(OUT, 'INDEX.json'), JSON.stringify(idx, null, 1))
  console.log(`${sh.length} shaderSource call, ${idx.length} unik → ${OUT}`)
  for (const r of idx) console.log(`  ${r.file}`)
})()
