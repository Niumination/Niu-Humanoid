const { chromium } = require('/home/user/tools/node_modules/playwright')
const INIT = () => {
  window.__HUM_BG_T = 3.0
  window.__B = []
  for (const P of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
    if (!P) continue
    const bd = P.bufferData
    P.bufferData = function (t, data, u) {
      try {
        if (data && data.length) {
          const n = data.length
          let mn = Infinity, mx = -Infinity, sum = 0
          const step = Math.max(1, Math.floor(n / 60000))
          let c = 0
          for (let i = 0; i < n; i += step) { const v = data[i]; sum += v; if (v < mn) mn = v; if (v > mx) mx = v; c++ }
          window.__B.push({ n, ctor: data.constructor.name, mn: +mn.toFixed(3), mx: +mx.toFixed(3), mean: +(sum / c).toFixed(3) })
        }
      } catch (e) {}
      return bd.apply(this, arguments)
    }
  }
}
;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] })
  for (const [tag,url] of [['live','https://apex-humanoid.vercel.app/?auto=1&state=idle&surge=1.5'],['build','http://127.0.0.1:5180/?auto=1&state=idle&surge=1.5']]) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
    await p.addInitScript(INIT)
    await p.goto(url, { waitUntil: 'networkidle', timeout: 120000 })
    await p.waitForTimeout(9000)
    const r = await p.evaluate(() => window.__B.filter(x => x.n >= 240).map(x => x))
    console.log(tag, JSON.stringify(r))
    await p.close()
  }
  await b.close()
})()
