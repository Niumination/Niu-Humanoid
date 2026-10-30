const { chromium } = require('/home/user/tools/node_modules/playwright')
;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--mute-audio'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  const logs = []
  p.on('console', m => logs.push(m.text()))
  await p.goto('https://mira-humanoid.vercel.app/?auto=1&state=idle', { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForTimeout(9000)
  console.log(logs.filter(l => /mira|traced|line|dust/i.test(l)).join('\n'))
  await b.close()
})()
