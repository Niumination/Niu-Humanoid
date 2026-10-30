const { chromium } = require('/home/user/tools/node_modules/playwright')
;(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 } })
  const logs = []
  pg.on('console', m => logs.push(m.type() + ': ' + m.text().slice(0, 300)))
  pg.on('pageerror', e => logs.push('PAGEERROR: ' + String(e).slice(0, 400)))
  await pg.addInitScript(() => {
    window.__HUM_SURGE = 1.5; window.__HUM_BG_T = 3
    window.__dbg = { draws: [], progs: [] }
    for (const P of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
      if (!P) continue
      const d = P.drawArrays, c = P.compileShader
      P.drawArrays = function (m, f, n) { window.__dbg.draws.push([m, n]); return d.apply(this, arguments) }
      P.compileShader = function (s) {
        const r = c.apply(this, arguments)
        if (!this.getShaderParameter(s, this.COMPILE_STATUS)) window.__dbg.progs.push('CFAIL ' + this.getShaderInfoLog(s))
        return r
      }
    }
  })
  await pg.goto('http://127.0.0.1:5180/?auto=1&figonly=1&state=idle', { waitUntil: 'load' })
  await pg.waitForTimeout(9000)
  const info = await pg.evaluate(() => {
    const cs = [...document.querySelectorAll('canvas')].map(c => ({ w: c.width, h: c.height }))
    return { canvases: cs, draws: window.__dbg.draws.slice(-12), errs: window.__dbg.progs }
  })
  console.log(JSON.stringify(info, null, 1))
  await pg.screenshot({ path: '/home/user/Kerja-Arena/verification/step8/fig-gpu-1440.png' })
  console.log(logs.slice(0, 20).join('\n'))
  await b.close()
})()
