const { chromium } = require('/home/user/tools/node_modules/playwright')
;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.goto('https://apex-humanoid.vercel.app/?auto=1&state=idle', { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForTimeout(9000)
  const out = await p.evaluate(() => [...document.querySelectorAll('canvas')].map((c) => {
    const s = getComputedStyle(c), r = c.getBoundingClientRect()
    return { px: [c.width, c.height], css: [Math.round(r.width), Math.round(r.height)], box: [Math.round(r.left), Math.round(r.top)], blend: s.mixBlendMode, op: s.opacity, z: s.zIndex, pos: s.position, disp: s.display }
  }))
  console.log(JSON.stringify(out, null, 1))
  await b.close()
})()
