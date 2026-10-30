/**
 * verify-mira-picture.mjs — bandingkan awan titik gambar rebuild (dihitung di browser) dengan live.
 * Ground truth: recon/ground-truth/mira/buffers-all/014..016 (tools/probe-mira-allbufs.js).
 * Prasyarat: dev server :5190 hidup (MiraStage mengisi window.__MIRA_POINTS).
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire('/home/user/tools/')
const { chromium } = require('playwright')

const GT = '/home/user/Kerja-Arena/recon/ground-truth/mira/buffers-all'
const pairs = [
  ['aRest', 'aRest', '014-Float32Array-206734.bin'],
  ['aKind', 'aKind', '015-Float32Array-103367.bin'],
  ['aZ', 'aZ', '016-Float32Array-103367.bin'],
]
const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://127.0.0.1:5190/?auto=1', { waitUntil: 'load' })
await p.waitForFunction(() => window.__MIRA_POINTS, null, { timeout: 90000 })
const mine = await p.evaluate(() => ({
  count: window.__MIRA_POINTS.count,
  aRest: Array.from(window.__MIRA_POINTS.aRest),
  aKind: Array.from(window.__MIRA_POINTS.aKind),
  aZ: Array.from(window.__MIRA_POINTS.aZ),
}))
await b.close()
const ld = (f) => { const bb = readFileSync(`${GT}/${f}`); return new Float32Array(bb.buffer, bb.byteOffset, bb.byteLength / 4) }
console.log('titik rebuild', mine.count)
let pass = 0
for (const [key, , file] of pairs) {
  const live = ld(file)
  const arr = Float32Array.from(mine[key])
  let maxd = 0, neq = 0
  for (let i = 0; i < Math.min(live.length, arr.length); i++) {
    const d = Math.abs(live[i] - arr[i])
    if (d > 0) neq++
    if (d > maxd) maxd = d
  }
  const ok = maxd === 0 && live.length === arr.length
  if (ok) pass++
  console.log(`${key}: len ${arr.length}/${live.length} maxdiff ${maxd} beda ${neq} ${ok ? 'IDENTIK' : 'BEDA'}`)
}
console.log(`${pass}/3 buffer IDENTIK`)
process.exit(pass === 3 ? 0 : 1)
