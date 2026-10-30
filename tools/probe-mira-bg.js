/** probe-mira-bg.js — tangkap draw di kanvas LATAR (WebGL1/2 apa pun) + uniform darinya. */
const { chromium } = require('/home/user/tools/node_modules/playwright')
const fs = require('fs')
const INIT = () => {
  const out = []
  const progs = new Map()
  const wrap = (P, name) => {
    if (!P || !P.drawElements) return
    const oAttach = P.attachShader
    P.attachShader = function (p, s) {
      const src = this.getShaderSource(s) || ''
      const inf = progs.get(p) || {}
      if (this.getShaderParameter(s, this.SHADER_TYPE) === this.VERTEX_SHADER) inf.v = src
      else inf.f = src
      progs.set(p, inf)
      return oAttach.apply(this, arguments)
    }
    let cur = null
    const oUse = P.useProgram; P.useProgram = function (p) { cur = p; if (p) this.__cur = p; return oUse.apply(this, arguments) }
    const rec = (ctx, kind, count) => {
      const p = ctx.__cur
      if (!p || !progs.has(p)) return
      const inf = progs.get(p)
      const u = {}
      const n = ctx.getProgramParameter(p, ctx.ACTIVE_UNIFORMS)
      for (let i = 0; i < n; i++) {
        const a = ctx.getActiveUniform(p, i)
        const loc = ctx.getUniformLocation(p, a.name)
        if (!loc) continue
        try {
          if (a.type === ctx.FLOAT) u[a.name] = ctx.getUniform(p, loc)
          else if (a.type === ctx.FLOAT_VEC2) u[a.name] = Array.from(ctx.getUniform(p, loc))
          else if (a.type === ctx.FLOAT_VEC3) u[a.name] = Array.from(ctx.getUniform(p, loc))
          else if (a.type === ctx.FLOAT_VEC4) u[a.name] = Array.from(ctx.getUniform(p, loc))
          else if (a.type === ctx.FLOAT_MAT4) u[a.name] = Array.from(ctx.getUniform(p, loc))
          else u[a.name] = 'sampler/int'
        } catch (e) {}
      }
      out.push({ kind, count, vLen: (inf.v || '').length, fLen: (inf.f || '').length, uniforms: u, canvas: [ctx.canvas.width, ctx.canvas.height] })
    }
    const oE = P.drawElements; P.drawElements = function (m, c) { rec(this, 'elements', c); return oE.apply(this, arguments) }
    const oA = P.drawArrays; P.drawArrays = function (m, f, c) { rec(this, 'arrays', c); return oA.apply(this, arguments) }
  }
  wrap(WebGLRenderingContext.prototype)
  wrap(WebGL2RenderingContext.prototype)
  window.__BG = out
}
;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--mute-audio'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.addInitScript(INIT)
  await p.goto('https://mira-humanoid.vercel.app/?auto=1&state=idle', { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForTimeout(8000)
  const all = await p.evaluate(() => window.__BG)
  await b.close()
  fs.writeFileSync('/home/user/Kerja-Arena/recon/mira-bg-draws.json', JSON.stringify(all, null, 1))
  const seen = new Set()
  for (const x of all) {
    const k = `${x.vLen}/${x.fLen}/${x.canvas}`
    if (seen.has(k)) continue
    seen.add(k)
    console.log(k, x.kind, x.count, JSON.stringify(x.uniforms).slice(0, 400))
  }
})()
