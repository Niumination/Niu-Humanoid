const { chromium } = require('/home/user/tools/node_modules/playwright')
;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.goto('https://apex-humanoid.vercel.app/?auto=1&state=idle', { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForTimeout(9000)
  const out = await p.evaluate(() => [...document.querySelectorAll('canvas')].map((c, i) => ({
    i, px: [c.width, c.height],
    is2d: !!c.getContext('2d'),
    isWebgl2: !!c.getContext('webgl2'),
    isWebgl1: !!c.getContext('webgl'),
    parentOp: getComputedStyle(c.parentElement).opacity,
    parentBlend: getComputedStyle(c.parentElement).mixBlendMode,
  })))
  console.log(JSON.stringify(out))
  await b.close()
})()
