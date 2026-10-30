/**
 * verify-mira-lines.mjs — jalankan port mesin garis MIRA pada aset asli dan bandingkan
 * dengan angka TERUKUR dari live (tools/probe-mira-wire.js).
 *
 * Aset di-decode oleh PIL (Python) ke RGBA mentah supaya skrip ini tidak butuh decoder webp.
 *   python3 -c "from PIL import Image; im=Image.open('recon/assets/mira-idle-v1.webp').convert('RGBA'); open('/tmp/mira-idle.rgba','wb').write(im.tobytes()); print(im.size)"
 *   node recon/verify-mira-lines.mjs
 */
import { readFileSync } from 'node:fs'
import { extractLines } from '/tmp/miraLines.mjs'

const W = 1145
const H = 1374
const raw = new Uint8Array(readFileSync('/tmp/mira-idle.rgba'))
if (raw.length !== W * H * 4) throw new Error(`RGBA salah: ${raw.length} vs ${W * H * 4}`)

const t0 = performance.now()
const pic = extractLines({ data: raw, width: W, height: H })
const dt = performance.now() - t0

// mesh lF: 2 verteks/titik, 6 indeks/segmen
let verts = 0
let idx = 0
for (const l of pic.lines) {
  verts += l.pts.length * 2
  idx += (l.pts.length - 1) * 6
}

console.log(`waktu ekstraksi ${dt.toFixed(0)} ms`)
console.log('counts:', pic.counts)
console.log('garis total :', pic.lines.length)
console.log('titik total :', pic.lines.reduce((a, l) => a + l.pts.length, 0))
console.log('verteks     :', verts)
console.log('INDEKS      :', idx, '   ← live: 22248')
console.log('star        :', pic.star.x.toFixed(2), pic.star.y.toFixed(2))
console.log('crown       :', pic.crown.x.toFixed(2), pic.crown.y.toFixed(2))
console.log('width/height:', pic.width, pic.height)
const kinds = {}
for (const l of pic.lines) kinds[l.kind] = (kinds[l.kind] || 0) + 1
console.log('jenis garis :', kinds)
