/** shot-live.js — tangkap layar situs live (arg1 = nama berkas, arg2 = query, arg3 = tunggu ms) */
const { chromium } = require('/home/user/tools/node_modules/playwright')
;(async () => {
  const name = process.argv[2] || 'live.png'
  const q = process.argv[3] || '?auto=1'
  const wait = +(process.argv[4] || 9000)
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  p.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 200)))
  p.on('console', (m) => { const t = m.text(); if (/mira/i.test(t)) console.log('LOG', t.slice(0, 160)) })
  await p.goto('https://mira-humanoid.vercel.app/' + q, { waitUntil: 'load' })
  await p.waitForTimeout(wait)
  await p.screenshot({ path: `/home/user/Kerja-Arena/verification/mira/${name}` })
  await b.close()
  console.log('shot', name, 'wait', wait)
})()
