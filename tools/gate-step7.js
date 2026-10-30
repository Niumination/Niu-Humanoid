/**
 * gate-step7.js — Gerbang A/B langkah 7 (HUD + hook).
 *
 * A. Perbandingan kontrol HUD: live (`?auto`) vs rebuild (`?auto`) — label, urutan,
 *    aria-label, title. Termasuk tombol kamera & teks status.
 * B. Hook: setiapa dari 18 `window.__HUM_*` diset dari luar; app harus tetap hidup
 *    (tidak ada error konsol), `readHooks()` harus melihat nilainya, dan
 *    `__HUM_FREEZE_T` harus benar-benar mengunci waktu (canvas identik antar frame).
 */
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const LIVE = 'https://apex-humanoid.vercel.app/'
const BUILD = 'http://127.0.0.1:5180/'
const OUT = '/home/user/Kerja-Arena/verification/step7'

const DOM = `() => {
  // live tidak punya testid: cari bar debug lewat tombol REPLAY lalu induknya
  const replayBtn = [...document.querySelectorAll('button')].find((b) => /REPLAY/i.test(b.textContent || ''))
  const bar = document.querySelector('[data-testid="debug-bar"]') || (replayBtn ? replayBtn.parentElement : null)
  const buttons = [...document.querySelectorAll('button')].map((b) => ({
    label: (b.textContent || '').trim(),
    aria: b.getAttribute('aria-label'),
    title: b.getAttribute('title'),
  }))
  const live = document.querySelector('section[data-testid="humanoid-mode"] div[aria-live]')
  return {
    hasDebugBar: !!bar,
    barLabels: bar ? [...bar.querySelectorAll('button')].map((b) => (b.textContent || '').trim()) : [],
    buttons,
    status: live ? (live.textContent || '').trim() : null,
  }
}`

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({
    args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',
      '--disable-dev-shm-usage','--mute-audio'],
  })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const out = {}
  for (const [name, base] of [['live', LIVE], ['build', BUILD]]) {
    const page = await ctx.newPage()
    await page.goto(`${base}?auto=1&skip=1&state=idle`, { waitUntil: 'networkidle', timeout: 90000 })
    await page.waitForTimeout(1500)
    out[name] = await page.evaluate(eval(DOM))
    await page.screenshot({ path: path.join(OUT, `${name}-hud.png`) })
    await page.close()
  }

  // ---- B. hook ---- (butuh gerak penuh: reduced-motion membuat kanvas statis)
  const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })
  const page = await ctx3.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
  await page.goto(`${BUILD}?auto=1&skip=1&state=idle`, { waitUntil: 'networkidle' })
  // ?skip dibaca di effect App yang berjalan SETELAH effect anak (F-23) → tunggu birth selesai
  await page.waitForTimeout(9000)
  const hookResult = await page.evaluate(async () => {
    const mod = await import('/src/lib/hooks.ts')
    const set = {
      __HUM_ASM_EL: 3, __HUM_ASM_OFF: 0, __HUM_ATTN: true, __HUM_BG_PULSE: 2.6,
      __HUM_BG_REST: 0.22, __HUM_BG_T: 1.5, __HUM_BLEND: { a: 1, b: 2, r: 0.5 },
      __HUM_BOIL_AMP: 0.02, __HUM_CLICK: { t: 1 }, __HUM_DOT: 0.9, __HUM_ENERGY: 0.7,
      __HUM_FORCE_2D: true, __HUM_FREEZE_T: 5, __HUM_NO_BG: true, __HUM_RIM: 0.8,
      __HUM_SKIP_ASSEMBLY: true, __HUM_SPEAK_AMP: 0.55, __HUM_SURGE: 1,
    }
    Object.assign(window, set)
    const seen = mod.readHooks()
    const missing = Object.keys(set).filter((k) => seen[k] === undefined || seen[k] === null)
    const notListed = Object.keys(set).filter((k) => !mod.HOOK_NAMES.includes(k))
    const freeze = mod.frozenTime()

    // kunci waktu: dua tangkapan kanvas berjarak 700 ms harus identik
    const cv = document.querySelector('canvas[aria-label^="Animated cyan"]')
    const snap = () => {
      const c = document.createElement('canvas')
      c.width = 128; c.height = 128
      c.getContext('2d').drawImage(cv, 0, 0, 128, 128)
      return c.getContext('2d').getImageData(0, 0, 128, 128).data
    }
    // beri waktu hook "visual" (mis. __HUM_NO_BG) diterapkan sebelum mengukur
    await new Promise((r) => setTimeout(r, 900))
    const a = snap()
    await new Promise((r) => setTimeout(r, 700))
    const b = snap()
    let diff = 0
    for (let i = 0; i < a.length; i += 4) diff += Math.abs(a[i] - b[i])
    const frozenStable = diff / (a.length / 4) < 0.6
    delete window.__HUM_FREEZE_T
    await new Promise((r) => setTimeout(r, 900))
    const c2 = snap()
    let diff2 = 0
    for (let i = 0; i < a.length; i += 4) diff2 += Math.abs(a[i] - c2[i])
    const freeMoves = diff2 / (a.length / 4) > Math.max(0.6, diff / (a.length / 4) * 2)
    return {
      count: mod.HOOK_NAMES.length,
      names: mod.HOOK_NAMES,
      missing,
      notListed,
      freeze,
      frozenDelta: +(diff / (a.length / 4)).toFixed(3),
      freeDelta: +(diff2 / (a.length / 4)).toFixed(3),
      frozenStable,
      freeMoves,
    }
  })

  const normLive = out.live.barLabels
  const normBuild = out.build.barLabels
  const report = {
    generatedAt: new Date().toISOString(),
    dom: out,
    hooks: hookResult,
    consoleErrors: errors,
    pass: {
      bar: JSON.stringify(normLive) === JSON.stringify(normBuild) && normBuild.length === 7,
      hookCount: hookResult.count === 18 && hookResult.missing.length === 0 && hookResult.notListed.length === 0,
      freeze: hookResult.frozenStable && hookResult.freeMoves,
      noErrors: errors.length === 0,
    },
  }
  fs.writeFileSync(path.join(OUT, 'step7-report.json'), JSON.stringify(report, null, 1))
  console.log('debug bar live :', JSON.stringify(normLive))
  console.log('debug bar build:', JSON.stringify(normBuild))
  console.log('hooks ditemukan:', hookResult.count, '| hilang:', hookResult.missing.length, '| freeze:', hookResult.freeze)
  console.log('freeze: delta terkunci', hookResult.frozenDelta, '→ bebas', hookResult.freeDelta)
  console.log('error konsol:', errors.length)
  console.log('\nPASS bar =', report.pass.bar, '| hook =', report.pass.hookCount, '| freeze =', report.pass.freeze, '| bersih =', report.pass.noErrors)
  await ctx3.close()
  await browser.close()
})().catch((e) => { console.error('GAGAL', e); process.exit(1) })
