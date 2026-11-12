#!/usr/bin/env node
/**
 * gate-apex.js — ukur paritas piksel APEX: LIVE (produk asli) vs BUILD kita, dua viewport.
 *
 * Protokol identik dengan tools/gate-deploy.js supaya angkanya sebanding:
 *   `?auto=1&state=idle&surge=1.5` + `window.__HUM_BG_T = 3.0`, tunggu 13 s.
 * Derau live diukur dengan menangkap LIVE DUA KALI pada sesi yang sama.
 *
 * Pakai:
 *   node tools/gate-apex.js --ours http://127.0.0.1:8805/ [--q "bpl=8&bpk=1"] \
 *        [--vp 1440x900] [--vp 390x844] [--json out.json] [--wait 13000]
 *
 * Keluaran per viewport: MAE, % piksel >32, rerata, derau live-vs-live, bias per pita luma.
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright')

const ARG = process.argv.slice(2)
const getArg = (n, d) => (ARG.indexOf(n) >= 0 ? ARG[ARG.indexOf(n) + 1] : d)
const LIVE = getArg('--live', 'https://apex-humanoid.vercel.app/')
const OURS = getArg('--ours', 'http://127.0.0.1:8805/')
const Q = getArg('--q', '')
const WAIT = Number(getArg('--wait', '13000'))
const JSON_OUT = getArg('--json', '')
const VPS = (() => {
  const v = []
  ARG.forEach((a, i) => { if (a === '--vp') v.push(ARG[i + 1]) })
  return (v.length ? v : ['1440x900', '390x844']).map((s) => {
    const [w, h] = s.split('x').map(Number)
    return { w, h, tag: s }
  })
})()
const SHOTS = '/tmp/gateapex'

const ARGS = [
  '--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
  '--disable-dev-shm-usage', '--mute-audio',
]
const FREEZE = `(() => { window.__HUM_BG_T = 3.0; })();`

const py = `
import sys, json
import numpy as np
from PIL import Image
A = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float)
B = np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(float)
band = []
for lo, hi in [(0,20),(20,60),(60,120),(120,200),(200,256)]:
    m = (B.mean(2) >= lo) & (B.mean(2) < hi)
    if m.sum() < 200: band.append([lo, hi, 0, 0.0, 0.0]); continue
    band.append([lo, hi, int(m.sum()), float((A.mean(2)-B.mean(2))[m].mean()), float(np.abs(A.mean(2)-B.mean(2))[m].mean())])
print(json.dumps({'mae': float(np.abs(A-B).mean()), 'over32': float((np.abs(A-B).mean(2) > 32).mean()*100),
 'meanA': float(A.mean()), 'meanB': float(B.mean()), 'band': band}))
`

;(async () => {
  fs.mkdirSync(SHOTS, { recursive: true })
  const browser = await chromium.launch({ args: ARGS })
  const out = { when: new Date().toISOString(), ours: OURS, q: Q, viewports: [] }
  for (const vp of VPS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 })
    const shoot = async (base, extra, tag) => {
      const p = await ctx.newPage()
      await p.addInitScript(FREEZE)
      await p.goto(base + '?auto=1&state=idle&surge=1.5' + extra, { waitUntil: 'networkidle', timeout: 120000 })
      await p.waitForTimeout(WAIT)
      const f = path.join(SHOTS, `${vp.tag}-${tag}.png`)
      await p.screenshot({ path: f })
      await p.close()
      return f
    }
    const liveA = await shoot(LIVE, '', 'live')
    const liveB = await shoot(LIVE, '', 'live2')
    const ours = await shoot(OURS, Q ? '&' + Q : '', 'ours')
    const noise = JSON.parse(execFileSync('python3', ['-c', py, liveA, liveB]).toString())
    const r = JSON.parse(execFileSync('python3', ['-c', py, ours, liveA]).toString())
    out.viewports.push({ vp: vp.tag, noise, ours: r })
    console.log(`\n== ${vp.tag}`)
    console.log(`derau live-vs-live : MAE ${noise.mae.toFixed(2)} · over32 ${noise.over32.toFixed(2)} %`)
    console.log(`deploy vs live     : MAE ${r.mae.toFixed(2)} · over32 ${r.over32.toFixed(2)} % · rerata ${r.meanA.toFixed(1)} vs ${r.meanB.toFixed(1)}`)
    console.log('pita luma (live)   : ' + r.band.map((b) => `${b[0]}-${b[1]}: Δ${b[3].toFixed(1)} (n=${b[2]})`).join(' · '))
    await ctx.close()
  }
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 1))
  await browser.close()
})()
