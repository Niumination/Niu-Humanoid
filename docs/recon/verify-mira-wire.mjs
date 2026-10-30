/**
 * verify-mira-wire.mjs — bandingkan mesh garis rebuild dengan buffer yang DIUNGGAH live.
 *
 * Ground truth: recon/ground-truth/mira/wire-buffers/*.bin (hasil tools/probe-mira-buffers2.js,
 * ditangkap dengan membungkus gl.bufferData di halaman live ?auto=1&state=idle 1440×900).
 * Input gambar: byte piksel live 573×687 (/home/user/Kerja-Arena/recon/ground-truth/mira/pixels/live-573x687.rgba) atau file arg ke-1.
 *
 * Jalankan: node recon/verify-mira-wire.mjs [rgba] [json]
 */
import { readFileSync, existsSync } from 'node:fs'
import { extractLines } from '/tmp/miraLines.mjs'
import { buildWireMesh, pictureToWire } from '/tmp/miraWire.mjs'

const GT = '/home/user/Kerja-Arena/recon/ground-truth/mira/wire-buffers'
const rgbaPath = process.argv[2] || '/home/user/Kerja-Arena/recon/ground-truth/mira/pixels/live-573x687.rgba'
const jsonPath = process.argv[3] || '/home/user/Kerja-Arena/recon/ground-truth/mira/pixels/live-573x687.json'
if (!existsSync(rgbaPath)) { console.error('input piksel tidak ada:', rgbaPath); process.exit(1) }
const { w, h } = JSON.parse(readFileSync(jsonPath, 'utf8'))
const pic = extractLines({ data: new Uint8Array(readFileSync(rgbaPath)), width: w, height: h })
const mesh = buildWireMesh(pictureToWire(pic))

const LD = (i, t, n) => readFileSync(`${GT}/mira-wire-buf-${t}-${n}-${i}.bin`)
const F32 = (b) => new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4)
const U32 = (b) => new Uint32Array(b.buffer, b.byteOffset, b.byteLength / 4)

const pairs = [
  ['position', 0, 'Float32Array', 22752],
  ['aDir', 1, 'Float32Array', 22752],
  ['uv', 2, 'Float32Array', 15168],
  ['aT', 3, 'Float32Array', 7584],
  ['aCol', 4, 'Float32Array', 22752],
  ['aS', 5, 'Float32Array', 7584],
  ['aLen', 6, 'Float32Array', 7584],
  ['aId', 7, 'Float32Array', 7584],
  ['aSketch', 8, 'Float32Array', 7584],
  ['aEnd', 9, 'Float32Array', 7584],
  ['aF', 10, 'Float32Array', 7584],
  ['index', 11, 'Uint32Array', 22248],
]

let pass = 0
const rows = []
for (const [name, i, t, n] of pairs) {
  const live = t === 'Uint32Array' ? U32(LD(i, t, n)) : F32(LD(i, t, n))
  const mine = mesh[name]
  let maxdiff = 0
  let neq = 0
  if (live.length !== mine.length) { maxdiff = Infinity }
  else for (let k = 0; k < live.length; k++) {
    const d = Math.abs(live[k] - mine[k])
    if (d > 0) neq++
    if (d > maxdiff) maxdiff = d
  }
  const ok = maxdiff === 0
  if (ok) pass++
  rows.push({ name, len: live.length, maxdiff, neq, ok })
}

console.log('garis:', pic.lines.length, '· titik:', pic.lines.reduce((a, l) => a + l.pts.length, 0), '· indeks:', mesh.indexCount)
console.log(pad('atribut', 10), pad('len', 8), pad('maxdiff', 12), pad('beda', 8), 'hasil')
for (const r of rows) console.log(pad(r.name, 10), pad(r.len, 8), pad(r.maxdiff, 12), pad(r.neq, 8), r.ok ? 'IDENTIK' : 'BEDA')
console.log(`\n${pass}/${pairs.length} buffer IDENTIK dengan live`)
process.exit(pass === pairs.length ? 0 : 1)

function pad(v, n) { const s = String(v); return s + ' '.repeat(Math.max(0, n - s.length)) }
