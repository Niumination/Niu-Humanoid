#!/usr/bin/env node
/**
 * probe-shot.js — tangkap satu bingkai penuh untuk keadaan tertentu (sanity visual).
 * Pakai: node tools/probe-shot.js <W> <H> <state> <outfile> [query]
 */
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright')
const W = Number(process.argv[2] || 1440)
const H = Number(process.argv[3] || 900)
const STATE = process.argv[4] || 'idle'
const OUT = process.argv[5] || '/tmp/probe-shot.png'
const Q = process.argv[6] || ''
const OURS = process.env.OURS || 'http://127.0.0.1:8805/'
;(async () => {
  const b = await chromium.launch({
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage', '--mute-audio'],
  })
  const p = await b.newPage({ viewport: { width: W, height: H } })
  await p.addInitScript(`(() => { window.__HUM_BG_T = 3.0; })();`)
  await p.goto(OURS + `?auto=1&state=${STATE}&surge=1.5` + (Q ? '&' + Q : ''), { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForTimeout(9000)
  await p.screenshot({ path: OUT, timeout: 120000 })
  await p.close()
  await b.close()
  console.log('ok', OUT)
})()
