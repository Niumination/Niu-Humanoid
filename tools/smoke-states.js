const { chromium } = require('/home/user/tools/node_modules/playwright')
;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  const errs = []
  p.on('pageerror', e => errs.push(String(e).slice(0, 200)))
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)) })
  await p.goto('http://127.0.0.1:5180/?auto=1', { waitUntil: 'load' })
  await p.waitForTimeout(11000)
  await p.screenshot({ path: '/home/user/Kerja-Arena/verification/step8/smoke-idle.png' })
  for (const s of ['thinking', 'speaking', 'listening']) {
    await p.evaluate((st) => window.dispatchEvent(new CustomEvent('hum:set-state', { detail: st })), s)
    await p.waitForTimeout(2500)
    await p.screenshot({ path: `/home/user/Kerja-Arena/verification/step8/smoke-${s}.png` })
  }
  console.log('errors:', JSON.stringify(errs.slice(0, 6)))
  await b.close()
})()
