/**
 * probe-mira-draws.js — inventaris LENGKAP tiap draw di halaman MIRA live.
 * Untuk setiap draw: jumlah, mode, shader (panjang sumber), atribut (nama + ukuran buffer + layout),
 * semua uniform aktif, dan state blend/depth. Disimpan ke recon/mira-draw-inventory.json.
 */
const { chromium } = require('/home/user/tools/node_modules/playwright')
const fs = require('fs')
const INIT = () => {
  const P = WebGL2RenderingContext.prototype
  const progInfo = new Map()   // program -> {v, f, name}
  const bufLen = new Map()     // buffer -> byteLength
  const bufHdr = new Map()
  const locName = new Map()    // program -> Map(loc -> name)
  const attribs = new Map()    // loc -> {name, size, type, stride, buf}
  const out = []
  const cur = () => progInfo.get(state.prog)
  const state = { prog: null }

  const oAttach = P.attachShader
  P.attachShader = function (p, s) {
    const src = this.getShaderSource(s) || ''
    const inf = progInfo.get(p) || {}
    if (this.getShaderParameter(s, this.SHADER_TYPE) === this.VERTEX_SHADER) inf.v = src
    else inf.f = src
    progInfo.set(p, inf)
    return oAttach.apply(this, arguments)
  }
  const oUse = P.useProgram
  P.useProgram = function (p) { state.prog = p; return oUse.apply(this, arguments) }
  const oLoc = P.getAttribLocation
  P.getAttribLocation = function (p, n) {
    const l = oLoc.apply(this, arguments)
    if (l >= 0) { if (!locName.has(p)) locName.set(p, new Map()); locName.get(p).set(l, n) }
    return l
  }
  const oBufData = P.bufferData
  P.bufferData = function (tgt, src, usage) {
    if (tgt === this.ARRAY_BUFFER || tgt === this.ELEMENT_ARRAY_BUFFER) {
      const b = this.getParameter(tgt === this.ARRAY_BUFFER ? this.ARRAY_BUFFER_BINDING : this.ELEMENT_ARRAY_BUFFER_BINDING)
      const n = src && src.byteLength ? src.byteLength : (typeof src === 'number' ? src : 0)
      bufLen.set(b, n)
    }
    return oBufData.apply(this, arguments)
  }
  const oVP = P.vertexAttribPointer
  P.vertexAttribPointer = function (loc, size, type, norm, stride, off) {
    const b = this.getParameter(this.ARRAY_BUFFER_BINDING)
    attribs.set(loc, { size, type, stride, off, buf: b })
    return oVP.apply(this, arguments)
  }
  const oDrawE = P.drawElements, oDrawA = P.drawArrays
  const oGet = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (t, o) {
    const c = oGet.apply(this, arguments)
    if (c && (t === 'webgl2' || t === 'webgl') && !window.__GL) window.__GL = c
    return c
  }
  let G = null
  const rec = (kind, mode, count, ctx) => { try {
    const gl = ctx || window.__GL
    if (!gl) return
    const p = state.prog
    if (!p) return
    const info = progInfo.get(p) || {}
    const v = info.v || ''
    const f = info.f || ''
    const names = locName.get(p) || new Map()
    const at = []
    for (const [loc, a] of attribs) {
      const nm = names.get(loc)
      if (!nm) continue
      at.push({ name: nm, size: a.size, type: a.type, stride: a.stride, bytes: bufLen.get(a.buf) || 0 })
    }
    const uniforms = {}
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS)
    for (let i = 0; i < n; i++) {
      const u = gl.getActiveUniform(p, i)
      const loc = gl.getUniformLocation(p, u.name)
      if (!loc) continue
      const t = u.type
      let val
      try {
        if (t === gl.FLOAT) val = gl.getUniform(p, loc)
        else if (t === gl.FLOAT_VEC2) val = Array.from(gl.getUniform(p, loc))
        else if (t === gl.FLOAT_VEC3) val = Array.from(gl.getUniform(p, loc))
        else if (t === gl.FLOAT_VEC4) val = Array.from(gl.getUniform(p, loc))
        else if (t === gl.FLOAT_MAT4) val = Array.from(gl.getUniform(p, loc))
        else if (t === gl.INT || t === gl.BOOL || t === gl.SAMPLER_2D) val = gl.getUniform(p, loc)
        else val = 'type' + t
      } catch (e) { val = 'err' }
      uniforms[u.name] = val
    }
    const st = {
      blend: gl.isEnabled(gl.BLEND), depthTest: gl.isEnabled(gl.DEPTH_TEST), cull: gl.isEnabled(gl.CULL_FACE),
      srcRGB: gl.getParameter(gl.BLEND_SRC_RGB), dstRGB: gl.getParameter(gl.BLEND_DST_RGB),
      srcA: gl.getParameter(gl.BLEND_SRC_ALPHA), dstA: gl.getParameter(gl.BLEND_DST_ALPHA),
      eqRGB: gl.getParameter(gl.BLEND_EQUATION_RGB), depthMask: gl.getParameter(gl.DEPTH_WRITEMASK),
      depthFunc: gl.getParameter(gl.DEPTH_FUNC),
    }
    out.push({ kind, mode, count, vLen: v.length, fLen: f.length, attribs: at, uniforms, st })
    } catch (e) { window.__ERR = (window.__ERR || []).concat(String(e && e.stack || e).slice(0, 200)) }
  }
  P.drawElements = function (mode, count) { rec('elements', mode, count, this); return oDrawE.apply(this, arguments) }
  P.drawArrays = function (mode, first, count) { rec('arrays', mode, count, this); return oDrawA.apply(this, arguments) }
  window.__DRAWS = out
}
;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--mute-audio'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.addInitScript(INIT)
  await p.goto('https://mira-humanoid.vercel.app/?auto=1&state=idle', { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForTimeout(9000)
  const draws = await p.evaluate(() => window.__DRAWS.slice(0, 400))
  console.log('err', await p.evaluate(() => (window.__ERR || []).slice(0, 3)))
  await b.close()
  fs.writeFileSync('/home/user/Kerja-Arena/recon/mira-draw-inventory.json', JSON.stringify(draws, null, 1))
  // ringkas: satu baris per draw unik
  const seen = new Set()
  for (const d of draws) {
    const k = `${d.vLen}/${d.fLen}/${d.count}`
    if (seen.has(k)) continue
    seen.add(k)
    console.log(`${k}  attribs=${d.attribs.map(a => `${a.name}:${a.size}x${a.type}${a.stride ? '@' + a.stride : ''}/b${a.bytes}`).join(' ')}`)
  }
  console.log('total draw', draws.length, 'unik', seen.size)
})()
