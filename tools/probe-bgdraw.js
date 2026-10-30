const { chromium } = require('playwright')
const INIT = `(() => {
  window.__draws = []
  window.__bufBytes = []
  for (const G of [WebGLRenderingContext, window.WebGL2RenderingContext].filter(Boolean)) {
    const P = G.prototype
    const orig = P.drawArrays
    P.drawArrays = function (mode, first, count) {
      window.__draws.push({ mode, first, count })
      return orig.apply(this, arguments)
    }
    const origSize = P.bufferData
    P.bufferData = function (target, data, usage) {
      if (data && data.byteLength) window.__bufBytes.push(data.byteLength)
      return origSize.apply(this, arguments)
    }
  }
})();`
;(async () => {
  const b = await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--mute-audio']})
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
  for (const [label, url] of [
    ['live', 'https://apex-humanoid.vercel.app/?auto=1&state=idle'],
    ['build', 'http://127.0.0.1:5180/?auto=1&state=idle'],
  ]) {
    const p = await ctx.newPage()
    await p.addInitScript(INIT)
    await p.goto(url, { waitUntil: 'networkidle', timeout: 120000 })
    await p.waitForTimeout(8000)
    const r = await p.evaluate(() => {
      const counts = {}
      for (const d of window.__draws) counts[d.count] = (counts[d.count] || 0) + 1
      const sizes = [...new Set(window.__bufBytes)].sort((a, b) => b - a).slice(0, 8)
      return { drawsTotal: window.__draws.length, uniqueCounts: counts, biggestBuffers: sizes }
    })
    console.log(label, JSON.stringify(r))
    await p.close()
  }
  await b.close()
})()
