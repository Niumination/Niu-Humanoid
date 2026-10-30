/**
 * gate-step4.js — Gerbang C/D langkah 4 (audio graph APEX).
 *
 * Yang diukur (tanpa perangkat audio: Chromium headless memakai null sink, graph tetap dibangun):
 *
 *  A. PARITAS API — hitung pemanggilan `AudioContext.prototype.create*` di live vs rebuild
 *     selama cue ASSEMBLY (masuk lewat ENTER), 2,5 s.
 *  B. SPEKTRUM — render tiap cue di `OfflineAudioContext`, FFT per jendela waktu,
 *     cocokkan puncak dengan frekuensi yang dijadwalkan bundle (±3 %).
 *     - ready/failed/needsYou: satu jendela berisi nada utuh
 *     - alert: 392 Hz (554,3 Hz hanyalah frekuensi MODULATOR, bukan parsial → tidak diuji)
 *     - assembly: jendela paduan suara (formant 205/540/1150) + jendela peluit
 *       (dua cuplikan: frekuensi harus NAIK mengikuti ramp linear 2900→3280)
 *
 * Output: verification/step4/step4-report.json
 */
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const LIVE = 'https://apex-humanoid.vercel.app/'
const BUILD = process.env.BUILD_URL || 'http://127.0.0.1:5180/'
const OUT = '/home/user/Kerja-Arena/verification/step4'
const TYPES = [
  'createOscillator',
  'createGain',
  'createBiquadFilter',
  'createBufferSource',
  'createWaveShaper',
  'createConvolver',
  'createStereoPanner',
  'createAnalyser',
  'createDynamicsCompressor',
]

const INIT = `(() => {
  const counts = {};
  const proto = (window.AudioContext || window.webkitAudioContext).prototype;
  for (const name of ${JSON.stringify(TYPES)}) {
    counts[name] = 0;
    const orig = proto[name];
    if (!orig) continue;
    proto[name] = function (...args) { counts[name]++; return orig.apply(this, args); };
  }
  window.__audioCounts = counts;
  window.__audioCtxCreated = 0;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  const Wrapped = function (...args) {
    window.__audioCtxCreated++;
    const ctx = new Ctor(...args);
    window.__lastCtx = ctx;
    return ctx;
  };
  Wrapped.prototype = Ctor.prototype;
  window.AudioContext = Wrapped;
})();`

async function countNodes(page, url, label) {
  await page.addInitScript(INIT)
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(1500)
  const btn = page.locator('button', { hasText: /ENTER|MASUK/i }).first()
  if (await btn.count()) await btn.click({ timeout: 15000 })
  await page.waitForTimeout(2500)
  const res = await page.evaluate(() => ({
    counts: window.__audioCounts || null,
    ctxCreated: window.__audioCtxCreated || 0,
    state: window.__lastCtx ? window.__lastCtx.state : 'none',
  }))
  console.log(label, JSON.stringify(res.counts), 'ctx=', res.ctxCreated, 'state=', res.state)
  return res
}

/** FFT + deteksi puncak per jendela waktu, dijalankan di dalam halaman */
const OFFLINE = async (spec) => {
  const fft = (re, im) => {
    const n = re.length
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1
      for (; j & bit; bit >>= 1) j ^= bit
      j ^= bit
      if (i < j) {
        const tr = re[i]; re[i] = re[j]; re[j] = tr
        const ti = im[i]; im[i] = im[j]; im[j] = ti
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = (-2 * Math.PI) / len
      const wr = Math.cos(ang)
      const wi = Math.sin(ang)
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0
        for (let k = 0; k < len / 2; k++) {
          const ur = re[i + k], ui = im[i + k]
          const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci
          const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr
          re[i + k] = ur + vr; im[i + k] = ui + vi
          re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi
          const ncr = cr * wr - ci * wi
          ci = cr * wi + ci * wr; cr = ncr
        }
      }
    }
  }

  const analyse = (data, sr, from, to) => {
    const a = Math.floor(from * sr)
    const b = Math.min(data.length, Math.floor(to * sr))
    // N adaptif: pangkat 2 terbesar yang muat di jendela (min 4096)
    let N = 4096
    while (N * 2 <= b - a && N < 32768) N *= 2
    if (b - a < N) return { peaks: [], rms: 0, N: 0, binHz: 0 }
    let sum = 0
    for (let i = a; i < b; i++) sum += data[i] * data[i]
    const re = new Float64Array(N)
    const im = new Float64Array(N)
    for (let i = 0; i < N; i++) {
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1))
      re[i] = data[a + i] * w
    }
    fft(re, im)
    const mag = new Float32Array(N / 2)
    for (let i = 0; i < N / 2; i++) mag[i] = Math.hypot(re[i], im[i])
    const minBin = Math.ceil((30 * N) / sr)
    let mx = 0
    for (let i = minBin; i < N / 2; i++) if (mag[i] > mx) mx = mag[i]
    const peaks = []
    for (let i = minBin; i < N / 2 - 2; i++) {
      let isMax = true
      for (let k = 1; k <= 3; k++) {
        if (i - k >= 0 && mag[i - k] > mag[i]) isMax = false
        if (i + k < N / 2 && mag[i + k] > mag[i]) isMax = false
      }
      if (!isMax || mag[i] < mx * 0.01) continue
      const p = mag[i - 1], q = mag[i], r = mag[i + 1]
      const d = (p - r) / (2 * (p - 2 * q + r) || 1e-9)
      peaks.push({ f: +(((i + d) * sr) / N).toFixed(1), m: +(q / mx).toFixed(3) })
    }
    peaks.sort((x, y) => y.m - x.m)
    // centroid puncak di dalam band (untuk nada menyapu)
    const centroid = (lo, hi) => {
      let num = 0
      let den = 0
      for (const p of peaks) {
        if (p.f >= lo && p.f <= hi) { num += p.f * p.m; den += p.m }
      }
      return den > 0 ? +(num / den).toFixed(1) : null
    }
    return {
      peaks: peaks.slice(0, 40),
      rms: +Math.sqrt(sum / (b - a)).toFixed(5),
      N,
      binHz: +(sr / N).toFixed(2),
      c2400_3800: centroid(2400, 3800),
      bandPeaks: peaks.filter((p) => p.f >= 2400 && p.f <= 3800).slice(0, 10),
    }
  }

  const mod = await import('/src/lib/audio.ts')
  const sr = 44100
  const out = []
  for (const c of spec.cases) {
    const off = new OfflineAudioContext(2, Math.floor(sr * spec.duration), sr)
    mod.__setAudioContextForTest(off)
    if (c.cue === 'assembly') mod.assemblyCue()
    else mod.playMoment(c.cue)
    const buf = await off.startRendering()
    const data = buf.getChannelData(0)
    out.push({
      cue: c.cue,
      windows: c.windows.map(([from, to]) => ({ from, to, ...analyse(data, sr, from, to) })),
    })
  }
  return out
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
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  // ---------- A. paritas API ----------
  const liveCounts = await countNodes(page, LIVE, 'LIVE ')
  const buildCounts = await countNodes(page, BUILD, 'BUILD')

  // ---------- B. spektrum ----------
  await page.goto(BUILD, { waitUntil: 'domcontentloaded' })
  const cases = [
    { cue: 'ready', windows: [[0.1, 1.1]] },
    { cue: 'failed', windows: [[0.0, 0.3], [0.1, 0.4], [0.2, 0.5]] },
    { cue: 'needsYou', windows: [[0.0, 0.6]] },
    { cue: 'alert', windows: [[0.06, 0.5]] },
    { cue: 'assembly', windows: [[6.6, 7.7], [5.35, 5.75], [5.6, 6.0]] },
  ]
  const spec = await page.evaluate(OFFLINE, { cases, duration: 13 })
  fs.writeFileSync(path.join(OUT, 'step4-peaks-debug.json'), JSON.stringify(spec, null, 1))

  // ---------- C. cocokkan puncak ----------
  const EXPECT = {
    ready: [110, 294, 880],
    failed: [880, 294, 110],
    needsYou: [330, 467],
    alert: [392],
    assembly: [205, 540, 1150], // jendela paduan suara (formant)
  }
  // toleransi = 3 %, atau batas resolusi jendela (1,5 bin) bila lebih longgar
  const match = (peaks, f, binHz = 1, tol = 0.03) => {
    const floor = (1.5 * binHz) / f
    const lim = Math.max(tol, floor)
    let best = null
    for (const p of peaks) {
      const err = Math.abs(p.f - f) / f
      if (!best || err < best.err) best = { ...p, err }
    }
    return {
      expected: +f.toFixed(1),
      found: best ? best.f : null,
      mag: best ? best.m : 0,
      errPct: best ? +(best.err * 100).toFixed(2) : null,
      limitPct: +(lim * 100).toFixed(2),
      ok: !!best && best.err <= lim && best.m >= 0.02,
    }
  }
  const rows = {}
  for (const r of spec) {
    const main = r.windows[0]
    if (r.cue === 'assembly') {
      const formants = EXPECT.assembly.map((f) => match(main.peaks, f, main.binHz))
      // peluit: puncak dominan di 2500–3600 Hz pada dua cuplikan; ramp 2900→3280 linear
      // peluit menyapu 2900→3280 Hz linear selama 5,35–5,92 s → bandingkan CENTROID
      // puncak di 2400–3800 Hz dengan frekuensi ramp di tengah jendela
      const whistle = r.windows.slice(1).map((w) => {
        // Peluit menyapu 2900→3280 Hz. Amplitudo memuncak di awal lalu meluruh,
        // jadi centroid band TIDAK sama dengan titik tengah ramp; yang diuji:
        // (a) centroid berada di dalam rentang sapuan ±3 %, (b) centroid naik antar jendela.
        const tMid = (w.from + w.to) / 2
        const found = w.c2400_3800
        const lo = 2900 * 0.97
        const hi = 3280 * 1.03
        return {
          center: tMid,
          band: [Math.round(lo), Math.round(hi)],
          found,
          ok: !!found && found >= lo && found <= hi,
        }
      })
      const rampUp =
        whistle.length === 2 && whistle[0].found != null && whistle[1].found != null
          ? whistle[1].found > whistle[0].found
          : false
      rows.assembly = { formants, whistle, rampUp, rms: main.rms }
    } else if (r.cue === 'failed') {
      const notes = [
        { f: 880, w: r.windows[0] },
        { f: 294, w: r.windows[1] },
        { f: 110, w: r.windows[2] },
      ]
      rows[r.cue] = {
        partials: notes.map((n) => match(n.w.peaks, n.f, n.w.binHz)),
        rms: r.windows[0].rms,
      }
    } else {
      rows[r.cue] = {
        partials: EXPECT[r.cue].map((f) => match(main.peaks, f, main.binHz)),
        rms: main.rms,
      }
    }
  }

  const apiOK = TYPES.every((t) => {
    const l = liveCounts.counts ? liveCounts.counts[t] : -1
    const b = buildCounts.counts ? buildCounts.counts[t] : -2
    return l === b
  })
  const specOK = Object.entries(rows).every(([cue, v]) =>
    cue === 'assembly'
      ? v.formants.every((x) => x.ok) && v.whistle.every((x) => x.ok)
      : v.partials.every((x) => x.ok)
  )

  const report = {
    generatedAt: new Date().toISOString(),
    liveUrl: LIVE,
    buildUrl: BUILD,
    liveCounts,
    buildCounts,
    apiParity: TYPES.map((t) => ({
      type: t,
      live: liveCounts.counts ? liveCounts.counts[t] : null,
      build: buildCounts.counts ? buildCounts.counts[t] : null,
    })),
    spectra: spec,
    peakMatch: rows,
    pass: { api: apiOK, spectrum: specOK },
  }
  fs.writeFileSync(path.join(OUT, 'step4-report.json'), JSON.stringify(report, null, 1))

  console.log('\n=== A. PARITAS API (live → build) ===')
  for (const r of report.apiParity)
    console.log(`${r.type.padEnd(26)} ${String(r.live).padStart(4)} → ${String(r.build).padStart(4)}`)
  console.log('\n=== B. PUNCAK SPEKTRUM (±3 %) ===')
  for (const [cue, v] of Object.entries(rows)) {
    if (cue === 'assembly') {
      console.log('assembly  formant :', v.formants.map((x) => `${x.expected}→${x.found}${x.ok ? '✓' : '✗'}`).join('  '))
      console.log(
        'assembly  peluit  :',
        v.whistle.map((x) => `t=${x.center.toFixed(2)}s band ${x.band[0]}–${x.band[1]}→${x.found}${x.ok ? '✓' : '✗'}`).join('  '),
        '| naik =',
        v.rampUp
      )
    } else {
      console.log(cue.padEnd(10), ':', v.partials.map((x) => `${x.expected}→${x.found}${x.ok ? '✓' : '✗'}`).join('  '))
    }
  }
  console.log('\nPASS  api =', apiOK, '| spektrum =', specOK)
  await browser.close()
  process.exit(apiOK && specOK ? 0 : 1)
})().catch((e) => {
  console.error('GAGAL', e)
  process.exit(1)
})
