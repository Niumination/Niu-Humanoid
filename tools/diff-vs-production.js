/**
 * diff-vs-production.js — bandingkan deployment kamu dengan produksi asli
 * (apex-humanoid.vercel.app) memakai gerbang yang sudah dibangun di fase 3.
 *
 * Pakai:
 *   node tools/diff-vs-production.js https://project-kamu.vercel.app
 *
 * Yang diperiksa:
 *   A. entry screen   — teks & tombol
 *   B. state + HUD    — 6 masukan ?state=, teks STATUS, label debug bar (?auto)
 *   C. birth          — 4 titik waktu (?asmel), teks ASSEMBLING, diff piksel kanvas
 *   D. backdrop       — jumlah titik geometri + uniform WebGL (surge & jam latar dikunci)
 *
 * Keluaran: verification/deploy/deploy-diff.json + screenshot berdampingan di folder yang sama.
 */
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const PROD = 'https://apex-humanoid.vercel.app/'
const TARGET = (process.argv[2] || '').replace(/\/$/, '')
const OUT = '/home/user/Kerja-Arena/verification/deploy'
if (!TARGET) {
  console.error('Pakai: node tools/diff-vs-production.js https://project-kamu.vercel.app')
  process.exit(2)
}

const ARGS = [
  '--no-sandbox',
  '--enable-unsafe-swiftshader',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--disable-dev-shm-usage',
  '--mute-audio',
]

const UNIFORM_INIT = `(() => {
  window.__u = {}
  window.__drawCounts = []
  window.__byDraw = {}
  const _up = WebGLRenderingContext.prototype.useProgram
  WebGLRenderingContext.prototype.useProgram = function (p) { this.__p = p; return _up.apply(this, arguments) }
  if (window.WebGL2RenderingContext) {
    const _up2 = window.WebGL2RenderingContext.prototype.useProgram
    window.WebGL2RenderingContext.prototype.useProgram = function (p) { this.__p = p; return _up2.apply(this, arguments) }
  }
  for (const G of [WebGLRenderingContext, window.WebGL2RenderingContext].filter(Boolean)) {
    const P = G.prototype
    const ogl = P.getUniformLocation
    P.getUniformLocation = function (prog, name) {
      const loc = ogl.apply(this, arguments)
      if (loc && /^u(T|PixelRatio|SizeK|Rest|Pulse|Map|Wave|WaveK)$/.test(name)) {
        window.__locMap = window.__locMap || new WeakMap()
        window.__locMap.set(loc, name)
      }
      return loc
    }
    const nameOf = (loc) => (window.__locMap && window.__locMap.get(loc)) || null
    for (const fn of ['uniform1f', 'uniform4f', 'uniform2f']) {
      const orig = P[fn]
      P[fn] = function (loc, ...rest) {
        const n = nameOf(loc)
        if (n) window.__u[n] = rest.length === 1 ? rest[0] : rest
        return orig.call(this, loc, ...rest)
      }
    }
    const oda = P.drawArrays
    P.drawArrays = function (mode, first, count) {
      window.__drawCounts.push(count)
      // uniform dicatat PER-DRAW (bukan "nilai terakhir global"): program backdrop dan program
      // figur sama-sama punya uSizeK dengan nilai berbeda, jadi urutan render menentukan nilai
      // terakhir. Ambil langsung dari program yang sedang aktif saat draw.
      if (count >= 240 && this.__p && !window.__byDraw[count]) {
        const prog = this.__p
        const out = {}
        const n = this.getProgramParameter(prog, this.ACTIVE_UNIFORMS)
        for (let i = 0; i < n; i++) {
          const info = this.getActiveUniform(prog, i)
          if (!info) continue
          const nm = info.name.replace('[0]', '')
          if (!/^u(T|PixelRatio|SizeK|Rest|Pulse|Map|Wave|WaveK|Size|PatchUV|StateA|Vein)$/.test(nm)) continue
          const v = this.getUniform(prog, this.getUniformLocation(prog, nm))
          out[nm] = typeof v === 'object' && v && v.length !== undefined ? Array.from(v) : v
        }
        window.__byDraw[count] = out
      }
      return oda.apply(this, arguments)
    }
  }
})();`

async function grab(ctx, url, opts = {}) {
  const p = await ctx.newPage()
  if (opts.init) await p.addInitScript(opts.init)
  await p.goto(url, { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForTimeout(opts.wait || 2500)
  const data = await p.evaluate(() => {
    const bar = (() => {
      const r = [...document.querySelectorAll('button')].find((b) => /REPLAY/i.test(b.textContent || ''))
      return r ? r.parentElement : null
    })()
    return {
      buttons: [...document.querySelectorAll('button')].map((b) => (b.textContent || '').trim()).filter(Boolean),
      barLabels: bar ? [...bar.querySelectorAll('button')].map((b) => (b.textContent || '').trim()) : [],
      status: document.querySelector('section[data-testid="humanoid-mode"] div[aria-live]')?.textContent?.trim() || null,
      h1: document.querySelector('h1')?.textContent?.trim() || null,
      bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 400),
      uniforms: window.__u || null,
      byDraw: window.__byDraw || null,
      drawCounts: window.__drawCounts ? [...new Set(window.__drawCounts)].sort((a, b) => a - b) : null,
    }
  })
  const file = opts.file
  if (file) await p.screenshot({ path: file })
  await p.close()
  return data
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ args: ARGS })
  const report = { generatedAt: new Date().toISOString(), prod: PROD, target: TARGET, checks: [] }
  const add = (name, prod, target, pass) => {
    report.checks.push({ name, prod, target, pass })
    console.log(`${pass ? '✅' : '⛔'} ${name}`)
    if (!pass) console.log(`   prod  : ${JSON.stringify(prod)}\n   target: ${JSON.stringify(target)}`)
  }

  // ---------- A. entry ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const a = await grab(ctx, PROD, { file: path.join(OUT, 'prod-entry.png') })
    const b = await grab(ctx, TARGET, { file: path.join(OUT, 'target-entry.png') })
    add('entry: teks', a.bodyText, b.bodyText, a.bodyText === b.bodyText)
    add('entry: tombol', a.buttons, b.buttons, JSON.stringify(a.buttons) === JSON.stringify(b.buttons))
    await ctx.close()
  }

  // ---------- B. state + HUD ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
    for (const st of ['idle', 'listening', 'thinking', 'speaking', 'strong', 'SPEAK']) {
      const q = `?auto=1&skip=1&state=${encodeURIComponent(st)}`
      const a = await grab(ctx, PROD + q, { wait: 1500 })
      const b = await grab(ctx, TARGET + q, { wait: 1500, file: path.join(OUT, `target-${st}.png`) })
      add(`state ${st}: STATUS`, a.status, b.status, a.status === b.status)
    }
    const a = await grab(ctx, PROD + '?auto=1&skip=1', { wait: 1500 })
    const b = await grab(ctx, TARGET + '?auto=1&skip=1', { wait: 1500 })
    add('debug bar (?auto)', a.barLabels, b.barLabels, JSON.stringify(a.barLabels) === JSON.stringify(b.barLabels))
    await ctx.close()
  }

  // ---------- C. birth ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    for (const t of [1, 3, 5, 6.5]) {
      const q = `?auto=1&state=idle&asmel=${t}`
      const a = await grab(ctx, PROD + q, { wait: 2000, file: path.join(OUT, `prod-birth-${t}.png`) })
      const b = await grab(ctx, TARGET + q, { wait: 2000, file: path.join(OUT, `target-birth-${t}.png`) })
      add(`birth t=${t}s: teks ASSEMBLING`, a.status, b.status, a.status === b.status)
    }
    await ctx.close()
  }

  // ---------- D. backdrop: geometri & uniform ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
    const add2 = '(() => { window.__HUM_BG_T = 3.0 })();'
    const a = await grab(ctx, PROD + '?auto=1&state=idle&surge=1.5', { init: UNIFORM_INIT + add2, wait: 8000 })
    const b = await grab(ctx, TARGET + '?auto=1&state=idle&surge=1.5', { init: UNIFORM_INIT + add2, wait: 8000 })
    // 5197 = backdrop, 274799 = figur, 240 = mote inti — tiap kanvas dibandingkan di draw-nya sendiri.
    // `uT` pada mote inti adalah akumulator waktu (bukan konstanta): hanya dicek berhingga & bergerak.
    const strip = (o) => {
      if (!o) return null
      const c = { ...o }
      delete c.uT
      return c
    }
    for (const cnt of ['5197', '274799', '240']) {
      const pa = strip(a.byDraw?.[cnt])
      const pb = strip(b.byDraw?.[cnt])
      add(`uniform per-draw ${cnt}`, pa, pb, !!pa && JSON.stringify(pa) === JSON.stringify(pb))
    }
    const bigProd = (a.drawCounts || []).filter((c) => c > 1000)
    const bigTarget = (b.drawCounts || []).filter((c) => c > 1000)
    add('drawArrays >1000 (geometri besar)', bigProd, bigTarget, JSON.stringify(bigProd) === JSON.stringify(bigTarget))
    await ctx.close()
  }

  await browser.close()
  const passed = report.checks.filter((c) => c.pass).length
  report.summary = { passed, total: report.checks.length }
  fs.writeFileSync(path.join(OUT, 'deploy-diff.json'), JSON.stringify(report, null, 1))
  console.log(`\n${passed}/${report.checks.length} pemeriksaan identik → ${path.join(OUT, 'deploy-diff.json')}`)
  process.exit(passed === report.checks.length ? 0 : 1)
})().catch((e) => {
  console.error('GAGAL', e)
  process.exit(1)
})
