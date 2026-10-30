const { chromium } = require('/home/user/tools/node_modules/playwright')
;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] })
  for (const [tag,url] of [['live','https://apex-humanoid.vercel.app/?auto=1&state=idle&surge=1.5'],['build','http://127.0.0.1:5180/?auto=1&state=idle&surge=1.5']]) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
    await p.addInitScript(() => { window.__HUM_BG_T = 3.0 })
    await p.goto(url, { waitUntil: 'networkidle', timeout: 120000 })
    await p.waitForTimeout(13000)
    const s = await p.evaluate(() => {
      const img = document.querySelector('img[src*="backdrop"]')
      const c = document.querySelector('canvas')
      return { imgOp: img ? getComputedStyle(img).opacity : 'none', imgBlend: img ? getComputedStyle(img).mixBlendMode : '', canvasOp: c ? getComputedStyle(c).opacity : '' }
    })
    console.log(tag, JSON.stringify(s))
    await p.close()
  }
  await b.close()
})()
