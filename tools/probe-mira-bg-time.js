/** probe-mira-bg-time.js — nilai uniform latar (01-frag) pada beberapa waktu + state blend/depth. */
const { chromium } = require('/home/user/tools/node_modules/playwright')
const INIT = () => {
  window.__BG = []
  const progs = new Map()
  const wrap = (P) => {
  const oAttach = P.attachShader
  P.attachShader = function (p, s) {
    const src = this.getShaderSource(s) || ''
    const inf = progs.get(p) || {}
    if (this.getShaderParameter(s, this.SHADER_TYPE) === this.VERTEX_SHADER) inf.v = src; else inf.f = src
    progs.set(p, inf)
    return oAttach.apply(this, arguments)
  }
  const oUse = P.useProgram; P.useProgram = function (p) { if (p) this.__cur = p; return oUse.apply(this, arguments) }
  const oA = P.drawArrays
  P.drawArrays = function (m, f, c) {
    const p = this.__cur
    if (p && progs.has(p) && (progs.get(p).f || '').length === 14287) {
      const gl = this
      const u = {}
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS)
      for (let i = 0; i < n; i++) {
        const a = gl.getActiveUniform(p, i)
        const loc = gl.getUniformLocation(p, a.name)
        if (!loc) continue
        u[a.name] = a.type === gl.FLOAT ? gl.getUniform(p, loc) : Array.from(gl.getUniform(p, loc))
      }
      const st = { blend: gl.isEnabled(gl.BLEND), src: gl.getParameter(gl.BLEND_SRC_RGB), dst: gl.getParameter(gl.BLEND_DST_RGB), depth: gl.isEnabled(gl.DEPTH_TEST), cull: gl.isEnabled(gl.CULL_FACE), count: c }
      window.__BG.push({ u, st })
    }
    return oA.apply(this, arguments)
  }
  }
  wrap(WebGL2RenderingContext.prototype)
  wrap(WebGLRenderingContext.prototype)
}
;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--mute-audio'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.addInitScript(INIT)
  await p.goto('https://mira-humanoid.vercel.app/?auto=1&state=idle', { waitUntil: 'networkidle', timeout: 120000 })
  for (const w of [1500, 3000, 5000, 5000]) {
    await p.waitForTimeout(w)
    const last = await p.evaluate(() => window.__BG[window.__BG.length - 1])
    console.log(JSON.stringify(last))
  }
  await b.close()
})()
