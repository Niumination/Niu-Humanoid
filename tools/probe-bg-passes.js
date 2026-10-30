const { chromium } = require('/home/user/tools/node_modules/playwright')
const LIVE = 'https://apex-humanoid.vercel.app/?auto=1&state=idle&surge=1.5'
const BUILD = 'http://127.0.0.1:5180/?auto=1&state=idle&surge=1.5'
const INIT = () => {
  window.__HUM_BG_T = 3.0
  window.__L = []
  for (const P of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
    if (!P) continue
    const d = P.drawArrays
    P.drawArrays = function (m, f, n) {
      try {
        const c = this.canvas
        const u = (nm) => { const l = this.getUniformLocation(this.__p || null, nm); return l ? this.getUniform(this.__p, l) : null }
        window.__L.push({ c: c.width + 'x' + c.height, n, m })
      } catch (e) {}
      return d.apply(this, arguments)
    }
    const up = P.useProgram
    P.useProgram = function (p) { this.__p = p; return up.apply(this, arguments) }
  }
}
;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] })
  for (const [tag, url] of [['live', LIVE], ['build', BUILD]]) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
    await p.addInitScript(INIT)
    await p.goto(url, { waitUntil: 'networkidle', timeout: 120000 })
    await p.waitForTimeout(9000)
    const r = await p.evaluate(() => {
      const L = window.__L.slice(-400)
      const per = {}
      for (const e of L) { const k = e.c + '|' + e.n; per[k] = (per[k] || 0) + 1 }
      return { per, tail: L.slice(-14) }
    })
    console.log(tag, JSON.stringify(r))
    await p.close()
  }
  await b.close()
})()
