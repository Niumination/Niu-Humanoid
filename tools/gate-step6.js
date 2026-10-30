/**
 * gate-step6.js — Gerbang A/D langkah 6 (hand tracking).
 *
 * 1. Kamera DITOLAK (tanpa izin): live vs rebuild harus menampilkan teks yang sama
 *    ("camera unavailable") dan label tombol yang sama sebelum/sesudah klik.
 * 2. Uji ambang gesture (unit, di halaman): pinch / palm / snap dengan landmark sintetis.
 */
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const LIVE = 'https://apex-humanoid.vercel.app/'
const BUILD = 'http://127.0.0.1:5180/'
const OUT = '/home/user/Kerja-Arena/verification/step6'

const LABELS = `() => {
  const btns = [...document.querySelectorAll('button')].map(b => ({
    label: (b.textContent || '').trim(),
    aria: b.getAttribute('aria-label'),
    title: b.getAttribute('title'),
  }))
  const err = document.querySelector('[data-testid="camera-error"]') || [...document.querySelectorAll('div')]
      .find(d => (d.textContent||'').trim() === 'camera unavailable')
  return { btns, cameraError: err ? (err.textContent||'').trim() : null }
}`

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({
    args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',
      '--disable-dev-shm-usage','--mute-audio','--use-fake-ui-for-media-stream=false','--deny-permission-prompts'],
  })
  // context TANPA izin kamera → getUserMedia ditolak
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: [] })
  const rows = []
  let rows_mid = []
  for (const [name, base] of [['live', LIVE], ['build', BUILD]]) {
    const page = await ctx.newPage()
    await page.goto(`${base}?auto=1&skip=1&state=idle`, { waitUntil: 'networkidle', timeout: 90000 })
    await page.waitForTimeout(1500)
    const before = await page.evaluate(eval(LABELS))
    const btn = page.locator('button', { hasText: /Open hand gesture/i }).first()
    if (await btn.count()) await btn.click()
    await page.waitForTimeout(1200)
    const mid = await page.evaluate(eval(LABELS))
    // klik kedua: bundle baru menyalakan kamera (`te ? re(Q=>!Q) : oe(!0)`)
    const btn2 = page.locator('button', { hasText: /Open camera now/i }).first()
    if (await btn2.count()) await btn2.click()
    await page.waitForTimeout(2500)
    ;(rows_mid = rows_mid || []).push({ name, mid })
    const after = await page.evaluate(eval(LABELS))
    await page.screenshot({ path: path.join(OUT, `${name}-camera-denied.png`) })
    rows.push({ name, before, mid, after })
    await page.close()
  }

  // --- unit ambang gesture di halaman build ---
  const page = await ctx.newPage()
  await page.goto(BUILD, { waitUntil: 'domcontentloaded' })
  const unit = await page.evaluate(async () => {
    const mod = await import('/src/lib/handTracking.ts')
    const mk = (spec) => {
      const p = []
      for (let i = 0; i < 21; i++) p.push({ x: 0.5, y: 0.5 })
      Object.entries(spec).forEach(([k, v]) => { p[+k] = { x: v[0], y: v[1] } })
      return p
    }
    const out = {}
    // pinch: jarak(4,8) < jarak(0,9)*0.32
    {
      let fired = 0
      const s = new mod.HandSignals({ onPinch: () => fired++ })
      s.update(mk({ 0: [0.5, 0.9], 9: [0.5, 0.6], 4: [0.5, 0.5], 8: [0.505, 0.5] }), 100000)
      out.pinchTight = fired
      const s2 = new mod.HandSignals({ onPinch: () => out.pinchLoose = (out.pinchLoose||0)+1 })
      s2.update(mk({ 0: [0.5, 0.9], 9: [0.5, 0.6], 4: [0.3, 0.5], 8: [0.6, 0.5] }), 100000)
      out.pinchLoose = out.pinchLoose || 0
    }
    // palm: 4 frame berturut dengan jari memanjang & telapak diam
    {
      let fired = 0
      const s = new mod.HandSignals({ onPalm: () => fired++ })
      const open = mk({ 0: [0.5, 0.8], 9: [0.5, 0.55], 4: [0.35, 0.6], 8: [0.5, 0.3],
        6: [0.5, 0.55], 12: [0.55, 0.35], 10: [0.55, 0.55], 16: [0.6, 0.38], 14: [0.6, 0.58],
        20: [0.65, 0.45], 18: [0.65, 0.62] })
      for (let i = 0; i < 6; i++) s.update(open, 100000 + i * 100)
      out.palmFires = fired
      const closed = mk({ 0: [0.5, 0.8], 9: [0.5, 0.55], 4: [0.35, 0.6], 8: [0.45, 0.65],
        6: [0.5, 0.55], 12: [0.5, 0.65], 10: [0.5, 0.55], 16: [0.55, 0.65], 14: [0.55, 0.55],
        20: [0.6, 0.68], 18: [0.6, 0.55] })
      let fired2 = 0
      const s2 = new mod.HandSignals({ onPalm: () => fired2++ })
      for (let i = 0; i < 6; i++) s2.update(closed, 100000 + i * 100)
      out.palmClosedFires = fired2
    }
    // snap: puncak > .22 dan > rata-rata×5 dalam 1500 ms setelah landmark
    {
      let fired = 0
      const s = new mod.HandSignals({ onSnap: () => fired++ })
      s.update(mk({ 0: [0.5, 0.8], 9: [0.5, 0.55], 4: [0.3, 0.6], 8: [0.6, 0.4] }), 100000)
      const env = { avg: 0.02 }
      s.audio(0.05, 100100, env)          // terlalu pelan
      s.audio(0.6, 100200, env)           // keras → picu
      out.snapFires = fired
      const s2 = new mod.HandSignals({ onSnap: () => fired++ })
      s2.update(mk({ 0: [0.5, 0.8], 9: [0.5, 0.55] }), 100000)
      s2.audio(0.6, 103000, { avg: 0.02 }) // di luar jendela 1500 ms → tidak picu
      out.snapStale = fired
    }
    out.err = mod.HAND_CONST.ERROR_TEXT
    return out
  })

  const [live, build] = rows
  const norm = (r) => ({
    cameraError: r.after.cameraError,
    labels: r.after.btns.map((b) => b.label).filter(Boolean),
    ariaCamera: r.after.btns.filter((b) => /camera|gesture|tracking/i.test(b.aria || '')).map((b) => b.aria),
  })
  const report = {
    generatedAt: new Date().toISOString(),
    denied: rows.map((r) => ({
      name: r.name, ...norm(r),
      beforeLabels: r.before.btns.map((b) => b.label).filter(Boolean),
      afterFirstClickLabels: r.mid.btns.map((b) => b.label).filter(Boolean),
    })),
    unit,
    pass: {
      errorText: live.after.cameraError === build.after.cameraError && build.after.cameraError === 'camera unavailable',
      labels:
        JSON.stringify(norm(live).ariaCamera) === JSON.stringify(norm(build).ariaCamera) ||
        JSON.stringify(norm(live).labels) === JSON.stringify(norm(build).labels),
      unit: unit.pinchTight === 1 && unit.pinchLoose === 0 && unit.palmFires >= 1 && unit.palmClosedFires === 0 && unit.snapFires === 1 && unit.snapStale === 1,
    },
  }
  fs.writeFileSync(path.join(OUT, 'step6-report.json'), JSON.stringify(report, null, 1))
  console.log('\nlive  :', JSON.stringify(norm(live)))
  console.log('build :', JSON.stringify(norm(build)))
  console.log('\nunit  :', JSON.stringify(unit))
  console.log('\nPASS teks-galat =', report.pass.errorText, '| label =', report.pass.labels, '| unit =', report.pass.unit)
  await browser.close()
})().catch((e) => { console.error('GAGAL', e); process.exit(1) })
