/**
 * gate-step8.js — langkah 8 (backdrop WebGL + bloom).
 *
 * Karena lapisan ini murni waktu, perbandingan dibuat deterministik:
 *   ?surge=<x>      → mengunci fase shockwave (dibaca bundle maupun rebuild)
 *   window.__HUM_BG_T → mengunci jam latar (uT)
 * Keduanya hook resmi APEX, jadi live dan rebuild memakai mekanisme yang sama.
 *
 * Yang diukur: >32 %, MAE (tanpa area HUD), di 1440×900 dan 390×844, plus baseline
 * live-vs-live untuk menunjukkan derau animasi.
 */
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const LIVE = 'https://apex-humanoid.vercel.app/'
const BUILD = 'http://127.0.0.1:5180/'
const OUT = '/home/user/Kerja-Arena/verification/step8'

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
    args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',
      '--disable-dev-shm-usage','--mute-audio'],
  })
  const cases = []
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const tag = `${vp.width}x${vp.height}`
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 })
    const q = '?auto=1&state=idle&surge=1.5'
    await shot(ctx, `${LIVE}${q}`, path.join(OUT, `${tag}-live.png`))
    await shot(ctx, `${LIVE}${q}`, path.join(OUT, `${tag}-live2.png`))
    await shot(ctx, `${BUILD}${q}`, path.join(OUT, `${tag}-build.png`))
    await shot(ctx, `${BUILD}${q}`, path.join(OUT, `${tag}-build-nobg.png`))
    // pembanding: build tanpa lapisan backdrop WebGL sama sekali
    await shot(ctx, `${BUILD}${q}&nobg=1`, path.join(OUT, `${tag}-build-nobglayer.png`))
    await ctx.close()
    cases.push(tag)
    console.log('ok', tag)
  }
  await browser.close()
  fs.writeFileSync(path.join(OUT, 'cases.json'), JSON.stringify(cases))
})()
