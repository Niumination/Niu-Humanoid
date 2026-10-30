/** Ambil byte RGBA yang PERSIS dipakai live: drawImage ke kanvas 572×687 lalu getImageData. */
const { chromium } = require('/home/user/tools/node_modules/playwright')
const fs = require('fs')
;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--mute-audio'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.goto('https://mira-humanoid.vercel.app/?auto=1', { waitUntil: 'domcontentloaded', timeout: 120000 })
  const out = await p.evaluate(async () => {
    const img = new Image()
    img.src = '/humanoid/mira-idle-v1.webp'
    await img.decode()
    const s = 0.5
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * s)
    c.height = Math.round(img.height * s)
    const g = c.getContext('2d', { willReadFrequently: true })
    g.drawImage(img, 0, 0, c.width, c.height)
    const d = g.getImageData(0, 0, c.width, c.height)
    let bin = ''
    const u8 = new Uint8Array(d.data.buffer)
    for (let i = 0; i < u8.length; i += 8192) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 8192))
    return { w: c.width, h: c.height, b64: btoa(bin) }
  })
  const DIR = '/home/user/Kerja-Arena/recon/ground-truth/mira/pixels'
  fs.mkdirSync(DIR, { recursive: true })
  fs.writeFileSync(`${DIR}/live-573x687.rgba`, Buffer.from(out.b64, 'base64'))
  fs.writeFileSync(`${DIR}/live-573x687.json`, JSON.stringify({ w: out.w, h: out.h }))
  console.log('dumped', out.w, out.h, Buffer.from(out.b64, 'base64').length, 'byte')
  await b.close()
})()
