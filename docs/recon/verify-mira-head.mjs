/**
 * verify-mira-head.mjs — bandingkan rowTexture rebuild (dihitung di browser) dengan live.
 *
 * Ground truth: recon/ground-truth/mira/rows-1x1374.f32 (tools/probe-mira-rows.js)
 * Pemanggil: dev server harus hidup di :5190 (window.__MIRA_ROWS diisi LineWeave).
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire('/home/user/tools/')
const { chromium } = require('playwright')

const live = new Float32Array(
  readFileSync('/home/user/Kerja-Arena/recon/ground-truth/mira/rows-1x1374.f32').buffer.slice(0)
)
const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://127.0.0.1:5190/?auto=1', { waitUntil: 'load' })
await p.waitForFunction(() => window.__MIRA_ROWS, null, { timeout: 60000 })
const out = await p.evaluate(() => ({ head: window.__MIRA_HEAD, rows: Array.from(window.__MIRA_ROWS) }))
await b.close()

const mine = Float32Array.from(out.rows)
let maxdiff = 0, neq = 0
for (let i = 0; i < live.length; i++) {
  const d = Math.abs(live[i] - mine[i])
  if (d > 0) neq++
  if (d > maxdiff) maxdiff = d
}
const chan = ['cx', 'hw', 'weight', 'k']
const rows = chan.map((c, k) => {
  let m = 0
  for (let y = 0; y < 1374; y++) m = Math.max(m, Math.abs(live[y * 4 + k] - mine[y * 4 + k]))
  return `${c}=${m}`
})
console.log('panjang', mine.length, '/', live.length)
console.log('pivot rebuild', out.head.pivot, '· live [571, 557, 23.28]')
console.log('maxdiff total', maxdiff, '· per kanal', rows.join(' '))
console.log(maxdiff === 0 ? '✅ rowTexture IDENTIK dengan live' : '⛔ rowTexture BEDA')
process.exit(maxdiff === 0 ? 0 : 1)
