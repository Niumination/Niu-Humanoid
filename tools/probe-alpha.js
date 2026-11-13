#!/usr/bin/env node
/**
 * probe-alpha.js — ukur sebaran ALFA sebuah lapisan (tangkapan omitBackground).
 * Dipakai P11 untuk membuktikan siluet plate: live plate alpha 0 pada 48,9 % piksel.
 *
 * Pakai: node tools/probe-alpha.js <W> <H> <mode> <tag>   (mode: all|img|c0|c1|c2)
 * Env: PW, LIVE, OURS, OUT
 */
const fs = require('fs')
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright')
const W = Number(process.argv[2] || 390)
const H = Number(process.argv[3] || 844)
const MODE = process.argv[4] || 'c1'
const TAG = process.argv[5] || MODE
const LIVE = process.env.LIVE || 'https://apex-humanoid.vercel.app/'
const OURS = process.env.OURS || 'http://127.0.0.1:8805/'
const OUT = process.env.OUT || '/tmp/probe-alpha'
fs.mkdirSync(OUT, { recursive: true })

const apply = (mode) => {
  document.querySelectorAll('canvas').forEach((c, i) => {
    c.style.display = mode === 'img' ? 'none' : /^c[0-9]$/.test(mode) ? (i === Number(mode.slice(1)) ? 'block' : 'none') : 'block'
  })
  document.querySelectorAll('img').forEach((im) => (im.style.display = mode === 'img' || mode === 'all' ? 'block' : 'none'))
  document.querySelectorAll('*').forEach((d) => {
    const s = getComputedStyle(d)
    if (s.backgroundColor !== 'rgba(0, 0, 0, 0)') d.style.background = 'transparent'
  })
}

;(async () => {
  const b = await chromium.launch({
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage', '--mute-audio'],
  })
  for (const [name, url] of [['LIVE', LIVE], ['OURS', OURS]]) {
    const p = await b.newPage({ viewport: { width: W, height: H } })
    await p.addInitScript(`(() => { window.__HUM_BG_T = 3.0; })();`)
    await p.goto(url + '?auto=1&state=idle&surge=1.5', { waitUntil: 'networkidle', timeout: 120000 })
    await p.waitForTimeout(8500)
    await p.evaluate(apply, MODE)
    await p.waitForTimeout(450)
    await p.screenshot({ path: `${OUT}/${name}-${TAG}.png`, omitBackground: true, timeout: 120000 })
    await p.close()
  }
  await b.close()
  console.log('ok', TAG)
})()
