#!/usr/bin/env node
/**
 * probe-layers.js — sembunyikan lapisan lalu tangkap N bingkai (median) untuk tiap situs.
 *
 * Lapisan: 0 = kanvas latar (backdrop), 1 = plate 2D, 2 = kanvas figur, img = gambar diam.
 * Mode: all | img | c0 | c1 | c2   (c1 = hanya plate, dst.)
 *
 * Pakai: node tools/probe-layers.js <W> <H> <mode> <tag> ["query"] ["{hook:json}"]
 * Contoh: node tools/probe-layers.js 390 844 c1 p390
 * Env:   PW=/tmp/pw/node_modules/playwright · LIVE=<url> · OURS=<url>
 */
const fs = require('fs')
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright')
const W = Number(process.argv[2] || 390)
const H = Number(process.argv[3] || 844)
const MODE = process.argv[4] || 'all'
const TAG = process.argv[5] || MODE
const Q = process.argv[6] || ''
const HOOKS = process.argv[7] || ''
const LIVE = process.env.LIVE || 'https://apex-humanoid.vercel.app/'
const OURS = process.env.OURS || 'http://127.0.0.1:8805/'
const N = Number(process.env.N || 5)
const GAP = Number(process.env.GAP || 320)
const OUT = process.env.OUT || '/tmp/probe-layers'
fs.mkdirSync(OUT, { recursive: true })

const apply = (mode) => {
  document.querySelectorAll('canvas').forEach((c, i) => {
    c.style.display = mode === 'img' ? 'none' : /^c[0-9]$/.test(mode) ? (i === Number(mode.slice(1)) ? 'block' : 'none') : 'block'
  })
  document.querySelectorAll('img').forEach((im) => (im.style.display = mode === 'img' || mode === 'all' ? 'block' : 'none'))
}

;(async () => {
  const b = await chromium.launch({
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage', '--mute-audio'],
  })
  for (const [name, url] of [['LIVE', LIVE], ['OURS', OURS]]) {
    const p = await b.newPage({ viewport: { width: W, height: H } })
    await p.addInitScript(`(() => { window.__HUM_BG_T = 3.0; ${name === 'OURS' && HOOKS ? `Object.assign(window, ${HOOKS});` : ''} })();`)
    const STATE = process.env.STATE || 'idle'
    const q = `?auto=1&state=${STATE}&surge=1.5` + (name === 'OURS' && Q ? '&' + Q : '')
    await p.goto(url + q, { waitUntil: 'networkidle', timeout: 120000 })
    await p.waitForTimeout(8500)
    await p.evaluate(apply, MODE)
    await p.waitForTimeout(450)
    for (let i = 0; i < N; i++) {
      await p.screenshot({ path: `${OUT}/${name}-${TAG}-${i}.png`, timeout: 120000 })
      if (i < N - 1) await p.waitForTimeout(GAP)
    }
    await p.close()
    console.log('ok', name, TAG)
  }
  await b.close()
})()
