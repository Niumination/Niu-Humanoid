const { chromium } = require('playwright')
const INIT = `(() => {
  window.__u = {}
  const names = ['uT','uPixelRatio','uSizeK','uRest','uPulse']
  for (const G of [WebGLRenderingContext, window.WebGL2RenderingContext].filter(Boolean)) {
    const P = G.prototype
    const o1 = P.uniform1f
    P.uniform1f = function (loc, v) {
      const n = window.__nameOf && window.__nameOf(this, loc)
      if (n) window.__u[n] = v
      return o1.apply(this, arguments)
    }
    const o4 = P.uniform4f
    P.uniform4f = function (loc, a, b, c, d) {
      const n = window.__nameOf && window.__nameOf(this, loc)
      if (n) window.__u[n] = [a,b,c,d]
      return o4.apply(this, arguments)
    }
    const o2 = P.uniform2f
    P.uniform2f = function (loc, a, b) {
      const n = window.__nameOf && window.__nameOf(this, loc)
      if (n) window.__u[n] = [a,b]
      return o2.apply(this, arguments)
    }
    const ogl = P.getUniformLocation
    P.getUniformLocation = function (prog, name) {
      const loc = ogl.apply(this, arguments)
      if (loc && /^u(T|PixelRatio|SizeK|Rest|Pulse|Map|Wave|WaveK)$/.test(name)) {
        window.__locMap = window.__locMap || new WeakMap()
        window.__locMap.set(loc, name)
      }
      return loc
    }
  }
  window.__nameOf = (gl, loc) => (window.__locMap && window.__locMap.get(loc)) || null
})();`
;(async () => {
  const b = await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--mute-audio']})
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  for (const [label,url] of [['live','https://apex-humanoid.vercel.app/?auto=1&state=idle'],['build','http://127.0.0.1:5180/?auto=1&state=idle']]) {
    const p = await ctx.newPage()
    await p.addInitScript(INIT)
    await p.goto(url,{waitUntil:'networkidle',timeout:120000}); await p.waitForTimeout(8000)
    const r = await p.evaluate(() => window.__u)
    console.log(label, JSON.stringify(r))
    await p.close()
  }
  await b.close()
})()
