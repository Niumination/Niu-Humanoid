/** shot-build.js — tangkapan layar rebuild (arg1 = nama berkas di verification/mira, arg2 = query). */
const { chromium } = require('/home/user/tools/node_modules/playwright')
;(async () => {
  const name = process.argv[2] || 'build.png'
  const q = process.argv[3] || '?auto=1'
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  p.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 300)))
  p.on('console', (m) => { const t = m.text(); if (/mira|WebGL|stage/i.test(t)) console.log('LOG', t.slice(0, 250)) })
  await p.goto('http://127.0.0.1:5190/' + q, { waitUntil: 'load' })
  await p.waitForTimeout(9000)
  console.log('frames', await p.evaluate(() => window.__MIRA_FRAMES), 'err', await p.evaluate(() => window.__MIRA_ERR))
  console.log('matter', await p.evaluate(() => window.__MIRA_MATTER ? JSON.stringify(window.__MIRA_MATTER) : 'no-matter'))
  console.log('strands', await p.evaluate(() => window.__MIRA_STRANDS ? JSON.stringify(window.__MIRA_STRANDS) : 'no-strands'))
  await p.screenshot({ path: `/home/user/Kerja-Arena/verification/mira/${name}` })
  await b.close()
  console.log('shot', name)
})()
