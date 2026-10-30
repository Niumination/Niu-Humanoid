/** shot-live-multi.js — beberapa tangkapan live sekaligus (arg: pasangan nama=query) */
const { chromium } = require('/home/user/tools/node_modules/playwright')
;(async () => {
  const jobs = process.argv.slice(2).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)] })
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] })
  await Promise.all(jobs.map(async ([name, q]) => {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
    await p.goto('https://mira-humanoid.vercel.app/' + q, { waitUntil: 'load' })
    await p.waitForTimeout(6000)
    await p.screenshot({ path: `/home/user/Kerja-Arena/verification/mira/${name}` })
    await p.close()
    console.log('shot', name, q)
  }))
  await b.close()
})()
