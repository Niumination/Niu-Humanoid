/**
 * gate-step8.js — langkah 8 (bloom).
 *
 * Bloom APEX hanya ada di lapisan three.js (`uBloomR`, `uThreshold`), tidak ada di
 * jalur canvas-2D. Gerbang ini mengukur apakah lapisan itu menyumbang piksel:
 *   live vs rebuild, steady-state, TANPA reduced-motion (jadi semua animasi hidup),
 *   setelah birth selesai (9 s). Bila selisih kecil dan tidak terpusat di tepi
 *   siluet (ciri halo bloom), berarti bloom tidak terlihat pada tampilan produksi.
 *
 * Metrik:
 *   - >32 % dan MAE penuh / tanpa HUD
 *   - rasio tepi: selisih pada piksel "gradien tinggi" (tepi) vs "area datar"
 *   - uji blur 1px: halo bloom akan hilang dengan blur, cacat struktur tidak
 */
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const LIVE = 'https://apex-humanoid.vercel.app/'
const BUILD = 'http://127.0.0.1:5180/'
const OUT = '/home/user/Kerja-Arena/verification/step8'

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({
    args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',
      '--disable-dev-shm-usage','--mute-audio'],
  })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const shots = {}
  for (const [name, base] of [['live', LIVE], ['build', BUILD], ['live2', LIVE]]) {
    const page = await ctx.newPage()
    await page.goto(`${base}?auto=1&state=idle&nobg=1`, { waitUntil: 'networkidle', timeout: 120000 })
    await page.waitForTimeout(9000)      // birth 7,4 s + margin
    const file = path.join(OUT, `${name}-steady.png`)
    await page.screenshot({ path: file })
    shots[name] = file
    await page.close()
    console.log('shot', name)
  }
  await browser.close()
  console.log(JSON.stringify(shots))
})()
