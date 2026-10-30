const { chromium } = require('/home/user/tools/node_modules/playwright')
const LIVE = 'https://apex-humanoid.vercel.app/?auto=1&state=idle&surge=1.5'
const BUILD = 'http://127.0.0.1:5180/?auto=1&state=idle&surge=1.5'
const INIT = () => {
  window.__HUM_BG_T = 3.0
  window.__U = {}
  for (const P of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
    if (!P) continue
    const d = P.drawArrays
    P.drawArrays = function (m, f, n) {
      if ((n === 274799 || n === 240) && !window.__U[n] && this.__p) {
        const p = this.__p, gl = this, out = {}
        const cnt = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS)
        for (let i = 0; i < cnt; i++) {
          const info = gl.getActiveUniform(p, i); if (!info) continue
          const nm = info.name.replace('[0]', '')
          const v = gl.getUniform(p, gl.getUniformLocation(p, nm))
          out[nm] = typeof v === 'object' && v && v.length !== undefined ? Array.from(v) : v
        }
        window.__U[n] = out
      }
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
    console.log(tag, JSON.stringify(await p.evaluate(() => window.__U)))
    await p.close()
  }
  await b.close()
})()
