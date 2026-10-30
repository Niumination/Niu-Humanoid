/**
 * P6b — snapshot APEX setelah ENTER (entry di APEX TIDAK bisa dilewati ?auto),
 * plus uji reproduksibilitas waktu-terkunci dan dump localStorage/dial state.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = '/home/user/Kerja-Arena/recon/ground-truth';
const VIEWS = [{ w: 1440, h: 900, tag: '1440x900' }, { w: 390, h: 844, tag: '390x844' }];

function css(el) {
  return {
    font: el.fontFamily, size: el.fontSize, weight: el.fontWeight, ls: el.letterSpacing, color: el.color,
    bg: el.backgroundColor, opacity: el.opacity, transition: el.transition, padding: el.padding,
    border: el.border, position: el.position, mixBlendMode: el.mixBlendMode, animation: el.animation,
    zIndex: el.zIndex, rect: el.rect
  };
}

async function dump(page) {
  return await page.evaluate(() => {
    const g = e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return {
      font: s.fontFamily, size: s.fontSize, weight: s.fontWeight, ls: s.letterSpacing, color: s.color,
      bg: s.backgroundColor, opacity: s.opacity, transition: s.transition, padding: s.padding,
      border: s.borderWidth + ' ' + s.borderStyle + ' ' + s.borderColor, position: s.position,
      mixBlendMode: s.mixBlendMode, animation: s.animation, zIndex: s.zIndex,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }; };
    const texts = [];
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n; while ((n = tw.nextNode())) { const t = n.textContent.trim(); if (t) texts.push(t); }
    const nodes = [...document.querySelectorAll('button,p,span,section,img,canvas,div')].filter(e => e.children.length === 0 || e.tagName === 'BUTTON' || e.tagName === 'SECTION');
    return {
      html: document.documentElement.outerHTML,
      texts, classes: [...new Set([...document.querySelectorAll('*')].flatMap(e => [...e.classList]))].sort(),
      testids: [...document.querySelectorAll('[data-testid]')].map(e => e.getAttribute('data-testid')),
      arias: [...document.querySelectorAll('[aria-label],[aria-live],[role]')].map(e => ({ tag: e.tagName, label: e.getAttribute('aria-label'), live: e.getAttribute('aria-live'), role: e.getAttribute('role') })),
      canvases: [...document.querySelectorAll('canvas')].map(c => ({ w: c.width, h: c.height, styleW: c.style.width, styleH: c.style.height, blend: getComputedStyle(c).mixBlendMode })),
      imgs: [...document.querySelectorAll('img')].map(i => ({ src: i.currentSrc.split('/').pop(), nw: i.naturalWidth, nh: i.naturalHeight, blend: getComputedStyle(i).mixBlendMode, filter: getComputedStyle(i).filter })),
      styles: nodes.slice(0, 250).map(e => ({ tag: e.tagName, cls: e.className, ...g(e) })),
      storage: Object.fromEntries(Object.entries(localStorage))
    };
  });
}

(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'] });
  const out = { generatedAt: new Date().toISOString(), shots: [], repro: null };

  for (const v of VIEWS) {
    const dir = path.join(ROOT, 'apex', v.tag);
    fs.mkdirSync(dir, { recursive: true });
    const ctx = await b.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const log = [];
    page.on('pageerror', e => log.push(String(e).slice(0, 200)));

    const shot = async (name, url, { click = true, wait = 1200, freeze = null } = {}) => {
      if (freeze !== null) await page.addInitScript(`window.__HUM_FREEZE_T=${freeze};`);
      await page.goto(url, { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(900);
      if (click) { try { await page.click('button'); } catch (e) {} }
      await page.waitForTimeout(wait);
      await page.evaluate(() => document.fonts.ready);
      const png = path.join(dir, `${name}.png`);
      await page.screenshot({ path: png });
      const d = await dump(page);
      fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(d, null, 1));
      fs.writeFileSync(path.join(dir, `${name}.html`), d.html);
      out.shots.push({ view: v.tag, name, url, wait, freeze, texts: d.texts.slice(0, 12), canvases: d.canvases.length, imgs: d.imgs.length });
      console.log(`OK apex ${v.tag} ${name}  texts=${JSON.stringify(d.texts.slice(0, 6))}`);
      return d;
    };

    // 1. entry
    await shot('entry', 'https://apex-humanoid.vercel.app/', { click: false, wait: 1500 });
    // 2..5 assembly pada detik terkunci
    for (const t of [0.2, 1, 2, 4]) await shot(`birth-t${t}`, `https://apex-humanoid.vercel.app/?auto&asmel=${t}`, { wait: 1500 });
    // 6. build selesai (tunggu sampai status berubah)
    await page.goto('https://apex-humanoid.vercel.app/?auto', { waitUntil: 'load' });
    await page.waitForTimeout(800); await page.click('button');
    await page.waitForFunction(() => document.body.innerText.includes('STATUS'), { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(500);
    { const png = path.join(dir, 'birth-done.png'); await page.screenshot({ path: png });
      const d = await dump(page); fs.writeFileSync(path.join(dir, 'birth-done.json'), JSON.stringify(d, null, 1));
      fs.writeFileSync(path.join(dir, 'birth-done.html'), d.html);
      out.shots.push({ view: v.tag, name: 'birth-done', url: '?auto', texts: d.texts.slice(0, 12), canvases: d.canvases.length });
      console.log(`OK apex ${v.tag} birth-done texts=${JSON.stringify(d.texts.slice(0, 6))}`); }
    // 7..11 state via ?skip&state=
    for (const s of ['idle', 'listening', 'thinking', 'speaking', 'strong']) {
      await shot(`state-${s}`, `https://apex-humanoid.vercel.app/?auto&skip&state=${s}`, { wait: 2500, freeze: 0 });
    }
    // 12. uji reproduksibilitas: shot identik dua kali
    const a1 = path.join(dir, '_repro-a.png'), a2 = path.join(dir, '_repro-b.png');
    for (const f of [a1, a2]) {
      await page.addInitScript(`window.__HUM_FREEZE_T=3.5;`);
      await page.goto('https://apex-humanoid.vercel.app/?skip&state=idle', { waitUntil: 'load' });
      await page.waitForTimeout(700); try { await page.click('button'); } catch (e) {}
      await page.waitForTimeout(2200); await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: f });
    }
    await ctx.close();
    if (v.tag === '1440x900') { out.repro = { a: a1, b: a2 }; }
  }
  fs.writeFileSync(path.join(ROOT, 'REPORT-APEX.json'), JSON.stringify(out, null, 1));
  await b.close();
  console.log('DONE');
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
