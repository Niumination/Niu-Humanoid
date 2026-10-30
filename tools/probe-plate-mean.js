const { chromium } = require('/home/user/tools/node_modules/playwright')
;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] })
  for (const [tag,url] of [['live','https://apex-humanoid.vercel.app/?auto=1&state=idle&surge=1.5'],['build','http://127.0.0.1:5180/?auto=1&state=idle&surge=1.5']]) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
    await p.addInitScript(() => { window.__HUM_BG_T = 3.0 })
    await p.goto(url, { waitUntil: 'networkidle', timeout: 120000 })
    await p.waitForTimeout(11000)
    const r = await p.evaluate(() => {
      const out = []
      for (const c of document.querySelectorAll('canvas')) {
        const g = c.getContext('2d')
        if (!g) { out.push({ t: 'gl', px: [c.width, c.height] }); continue }
        const d = g.getImageData(0, 0, c.width, c.height).data
        let sum = 0, over = 0
        for (let i = 0; i < d.length; i += 4) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; sum += v; if (v > 24) over++ }
        out.push({ t: '2d', px: [c.width, c.height], mean: +(sum / (d.length / 4)).toFixed(2), fracOver24: +(over / (d.length / 4) * 100).toFixed(2) })
      }
      return out
    })
    console.log(tag, JSON.stringify(r))
    await p.close()
  }
  await b.close()
})()
