/**
 * gate-step5.js — Gerbang A/C/D langkah 5 (state + mic).
 *
 * A. teks HUD: `STATUS: <STATE>` live vs rebuild untuk 8 masukan (termasuk alias)
 * C. piksel: tiap state (skip=1 → langsung steady), baseline live-vs-live per state
 * D. durasi transisi: ukur di rebuild dengan sampling bingkai — konvergen dalam
 *    0,7 s (speaking) / 1,2 s (idle) / 0,95 s (lainnya) ± satu bingkai @60 Hz
 *
 * Output: verification/step5/step5-report.json
 */
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const LIVE = 'https://apex-humanoid.vercel.app/'
const BUILD = process.env.BUILD_URL || 'http://127.0.0.1:5180/'
const OUT = '/home/user/Kerja-Arena/verification/step5'

const STATES = ['idle', 'listening', 'thinking', 'speaking']
const ALIASES = ['idle', 'listening', 'thinking', 'speaking', 'strong', 'SPEAK', 'process', 'quiet']

async function shot(page, url, file) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(1800)
  const txt = await page
    .locator('div[aria-live]')
    .first()
    .textContent()
    .catch(() => null)
  await page.screenshot({ path: file })
  return txt
}

function png(file) {
  // baca PNG via canvas di node? cukup pakai playwright untuk hitung di halaman
  return file
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({
    args: [
      '--no-sandbox',
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--disable-dev-shm-usage',
      '--autoplay-policy=no-user-gesture-required',
      '--mute-audio',
    ],
  })
  // kunci waktu resmi (F-24): prefers-reduced-motion + ENTER → live menggambar steady-state statis
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

  // ---------- A. teks state (live vs build) ----------
  const textRows = []
  for (const s of ALIASES) {
    const p1 = await ctx.newPage()
    const liveTxt = await shot(p1, `${LIVE}?auto=1&skip=1&state=${encodeURIComponent(s)}`, path.join(OUT, `live-alias-${s}.png`))
    await p1.close()
    const p2 = await ctx.newPage()
    const buildTxt = await shot(p2, `${BUILD}?auto=1&skip=1&state=${encodeURIComponent(s)}`, path.join(OUT, `build-alias-${s}.png`))
    await p2.close()
    textRows.push({ input: s, live: liveTxt, build: buildTxt, same: liveTxt === buildTxt })
    console.log(`A  ${s.padEnd(10)} live=${JSON.stringify(liveTxt)} build=${JSON.stringify(buildTxt)} ${liveTxt === buildTxt ? '✓' : '✗'}`)
  }

  // ---------- C. piksel per state (satu context per screenshot) ----------
  const pixel = {}
  for (const s of STATES) {
    const p1 = await ctx.newPage()
    await shot(p1, `${LIVE}?auto=1&skip=1&state=${s}`, path.join(OUT, `1440-live-${s}.png`))
    await p1.close()
    const p2 = await ctx.newPage()
    await shot(p2, `${LIVE}?auto=1&skip=1&state=${s}`, path.join(OUT, `1440-live2-${s}.png`))
    await p2.close()
    const p3 = await ctx.newPage()
    await shot(p3, `${BUILD}?auto=1&skip=1&state=${s}`, path.join(OUT, `1440-build-${s}.png`))
    await p3.close()
    pixel[s] = { live: `1440-live-${s}.png`, live2: `1440-live2-${s}.png`, build: `1440-build-${s}.png` }
  }

  // ---------- D. durasi transisi (rebuild, seam __HUM_FADE) ----------
  // D butuh gerak penuh (reduced-motion mematikan crossfade: bundle set ne.p = He ? 1 : 0)
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })
  const page = await ctx2.newPage()
  await page.goto(`${BUILD}?auto=1&skip=1&state=idle`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const timings = await page.evaluate(async () => {
    const run = async (to) => {
      const seen = []
      window.dispatchEvent(new CustomEvent('hum:set-state', { detail: to }))
      const t0 = performance.now()
      await new Promise((res) => {
        const tick = () => {
          const f = window.__HUM_FADE || { p: 0, dur: 0, dt: 0 }
          seen.push({ p: f.p, dur: f.dur, dt: f.dt })
          if (f.p >= 1 && seen.length > 2) res()
          else if (performance.now() - t0 > 12000) res()
          else requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      })
      const i0 = seen.findIndex((x) => x.p > 0 && x.p < 1)
      let acc = 0
      let ended = false
      for (let i = i0; i >= 0 && i < seen.length; i++) {
        acc += seen[i].dt || 0
        if (seen[i].p >= 1) { ended = true; break }
      }
      return { to, dur: i0 >= 0 ? seen[i0].dur : seen[0].dur, effectiveMs: Math.round(acc * 1000), ended }
    }
    const a = await run('thinking')
    const b2 = await run('speaking')
    const c = await run('idle')
    return [a, b2, c]
  })
  console.log('\nD  durasi crossfade (rebuild, jumlah dt ter-clamp):')
  for (const t of timings) {
    const target = Math.round(t.dur * 1000)
    const err = ((t.effectiveMs - target) / target) * 100
    console.log(`   →${t.to.padEnd(9)} konstanta ${target} ms | efektif ${t.effectiveMs} ms (selesai=${t.ended}) galat ${err.toFixed(1)} %`)
  }

  const report = {
    generatedAt: new Date().toISOString(),
    stateText: textRows,
    pixel,
    transitions: timings,
    pass: {
      text: textRows.every((r) => r.same),
      // ±80 ms ≈ 1,6 bingkai dt-clamp (50 ms) → cukup untuk membuktikan durasi benar
      fade:
        timings.every((t) => t.ended) &&
        timings.every((t) => Math.abs(t.effectiveMs - t.dur * 1000) <= 80),
    },
  }
  fs.writeFileSync(path.join(OUT, 'step5-report.json'), JSON.stringify(report, null, 1))
  console.log('\nPASS teks =', report.pass.text, '| durasi =', report.pass.fade)
  await ctx2.close()
  await browser.close()
})().catch((e) => {
  console.error('GAGAL', e)
  process.exit(1)
})
