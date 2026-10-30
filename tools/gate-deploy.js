/**
 * gate-deploy.js — Gerbang C terhadap DEPLOYMENT (bukan dev server).
 * Protokol identik dengan gate-step8.js supaya angkanya sebanding:
 *   kunci `?surge=1.5` + `window.__HUM_BG_T = 3`, tunggu 13 s (breathing fade backdrop 900 ms),
 *   HUD bawah 7 % dikeluarkan dari perbandingan.
 *   node tools/gate-deploy.js https://niu-humanoid.vercel.app
 */
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const LIVE = 'https://apex-humanoid.vercel.app/'
const TARGET = (process.argv[2] || '').replace(/\/$/, '')
const OUT = '/home/user/Kerja-Arena/verification/deploy'
if (!TARGET) { console.error('Pakai: node tools/gate-deploy.js https://project-kamu.vercel.app'); process.exit(2) }

const FREEZE = `(() => { window.__HUM_BG_T = 3.0; })();`
async function shot(ctx, url, file, waitMs = 13000) {
  const p = await ctx.newPage()
  await p.addInitScript(FREEZE)
  await p.goto(url, { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForTimeout(waitMs)
  await p.screenshot({ path: file })
  await p.close()
}
;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({
    args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--mute-audio'],
  })
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const tag = `${vp.width}x${vp.height}`
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 })
    const q = '?auto=1&state=idle&surge=1.5'
    await shot(ctx, `${LIVE}${q}`, path.join(OUT, `${tag}-prod.png`))
    await shot(ctx, `${LIVE}${q}`, path.join(OUT, `${tag}-prod2.png`))
    await shot(ctx, `${TARGET}${q}`, path.join(OUT, `${tag}-deploy.png`))
    await ctx.close()
    console.log('ok', tag)
  }
  await browser.close()
})()
