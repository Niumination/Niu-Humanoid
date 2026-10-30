/**
 * P6 / Fase 1.8–1.9 — snapshot DOM, computed style, panel, dan ground-truth screenshot.
 * Menjalankan situs live di Chromium headless (SwiftShader) dengan WAKTU DIKUNCI.
 *
 * APEX : ?auto + ?asmel=<detik> (assembly) · ?skip&state=<s> + window.__HUM_FREEZE_T (state)
 * MIRA : ?t=<detik> (kunci clock, sekaligus melewati entry) + ?state=<s>
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = '/home/user/Kerja-Arena/recon/ground-truth';
const VIEWS = [{ w: 1440, h: 900, tag: '1440x900' }, { w: 390, h: 844, tag: '390x844' }];

const APEX_STATES = ['idle', 'listening', 'thinking', 'speaking', 'strong'];
const APEX_ASM = [1, 3, 5, 6.2, 7.4];
const MIRA_STATES = ['idle', 'listening', 'talking'];

fs.mkdirSync(ROOT, { recursive: true });

async function dumpDOM(page) {
  return await page.evaluate(() => {
    const texts = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walk.nextNode())) {
      const t = n.textContent.trim();
      if (t) texts.push({ text: t, parent: n.parentElement ? n.parentElement.tagName + '.' + (n.parentElement.className || '') : null });
    }
    const css = el => {
      const s = getComputedStyle(el);
      return {
        font: s.fontFamily, size: s.fontSize, weight: s.fontWeight, ls: s.letterSpacing,
        color: s.color, bg: s.backgroundColor, opacity: s.opacity, transition: s.transition,
        padding: s.padding, border: s.border, transform: s.transform, position: s.position,
        zIndex: s.zIndex, mixBlendMode: s.mixBlendMode, animation: s.animation
      };
    };
    const interested = [...document.querySelectorAll('button,input,select,textarea,p,span,section,img,canvas,h1,h2,h3,a')];
    return {
      html: document.documentElement.outerHTML,
      title: document.title,
      texts,
      classes: [...new Set([...document.querySelectorAll('*')].flatMap(e => [...e.classList]))].sort(),
      testids: [...document.querySelectorAll('[data-testid]')].map(e => e.getAttribute('data-testid')),
      arias: [...document.querySelectorAll('[aria-label],[aria-live],[aria-pressed],[role]')]
        .map(e => ({ tag: e.tagName, label: e.getAttribute('aria-label'), live: e.getAttribute('aria-live'), pressed: e.getAttribute('aria-pressed'), role: e.getAttribute('role') })),
      styles: interested.slice(0, 400).map(e => ({ tag: e.tagName, cls: e.className, id: e.id, css: css(e), rect: (r => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }))(e.getBoundingClientRect()) })),
      canvasCount: document.querySelectorAll('canvas').length,
      imgCount: document.querySelectorAll('img').length
    };
  });
}

async function miraPanel(page) {
  return await page.evaluate(() => {
    const rows = [];
    const headers = [];
    // panel MIRA: cari semua input[type=range] dan label terdekat
    const ranges = [...document.querySelectorAll('input[type=range]')];
    for (const r of ranges) {
      const row = r.closest('div');
      rows.push({
        min: r.min, max: r.max, step: r.step, value: r.value,
        name: r.name || null, aria: r.getAttribute('aria-label'),
        text: row ? row.textContent.trim().slice(0, 120) : null
      });
    }
    // header seksi: elemen yang bukan input dan berisi teks pendek
    return { count: ranges.length, rows, headers };
  });
}

(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage']
  });
  const report = { generatedAt: new Date().toISOString(), targets: {} };

  for (const target of ['apex', 'mira']) {
    const base = `https://${target}-humanoid.vercel.app/`;
    const tReport = { base, shots: [], diagnostics: [], console: [] };
    report.targets[target] = tReport;

    for (const view of VIEWS) {
      const dir = path.join(ROOT, target, view.tag);
      fs.mkdirSync(dir, { recursive: true });

      const ctx = await browser.newContext({
        viewport: { width: view.w, height: view.h },
        deviceScaleFactor: 1,
        reducedMotion: 'no-preference'
      });
      const page = await ctx.newPage();
      page.on('console', m => { if (tReport.console.length < 200) tReport.console.push({ type: m.type(), text: m.text().slice(0, 300) }); });
      page.on('pageerror', e => tReport.diagnostics.push({ kind: 'pageerror', text: String(e).slice(0, 300) }));
      page.on('requestfailed', r => tReport.diagnostics.push({ kind: 'requestfailed', url: r.url().slice(0, 200), err: r.failure() && r.failure().errorText }));

      const shots = [];
      if (target === 'apex') {
        shots.push({ name: 'entry', url: base, init: null, wait: 2500 });
        for (const s of APEX_STATES) shots.push({ name: `state-${s}`, url: `${base}?auto&skip&state=${s}`, init: 0, wait: 3000 });
        for (const t of APEX_ASM) shots.push({ name: `assembly-t${t}`, url: `${base}?auto&asmel=${t}`, init: 0, wait: 3000 });
      } else {
        shots.push({ name: 'entry', url: base, init: null, wait: 3000 });
        for (const s of MIRA_STATES) for (const t of [2, 6]) shots.push({ name: `state-${s}-t${t}`, url: `${base}?t=${t}&state=${s}`, init: null, wait: 3500 });
      }

      for (const shot of shots) {
        try {
          if (shot.init !== null) await page.addInitScript(`window.__HUM_FREEZE_T=${shot.init};`);
          await page.goto(shot.url, { waitUntil: 'load', timeout: 45000 });
          await page.waitForTimeout(shot.wait);
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(300);
          const file = path.join(dir, `${shot.name}.png`);
          await page.screenshot({ path: file });
          const dom = await dumpDOM(page);
          fs.writeFileSync(path.join(dir, `${shot.name}.html`), dom.html);
          fs.writeFileSync(path.join(dir, `${shot.name}.json`), JSON.stringify(dom, null, 1));
          if (shot.name === 'entry') {
            fs.writeFileSync(path.join(ROOT, target, `styles-${view.tag}.json`), JSON.stringify(dom.styles, null, 1));
            fs.writeFileSync(path.join(ROOT, target, `texts-${view.tag}.json`), JSON.stringify(dom.texts, null, 1));
          }
          // panel MIRA: hanya ada setelah masuk (bukan entry)
          if (target === 'mira' && shot.name === 'state-idle-t6') {
            const panel = await miraPanel(page);
            fs.writeFileSync(path.join(ROOT, target, 'panel-mira.json'), JSON.stringify(panel, null, 1));
            tReport.panelInputCount = panel.count;
          }
          tReport.shots.push({ target, view: view.tag, name: shot.name, url: shot.url, file: path.relative(ROOT, file), classes: dom.classes.length, canvas: dom.canvasCount, img: dom.imgCount });
          console.log(`OK ${target} ${view.tag} ${shot.name}`);
        } catch (e) {
          tReport.diagnostics.push({ kind: 'shot-failed', shot: shot.name, view: view.tag, err: String(e).slice(0, 300) });
          console.log(`FAIL ${target} ${view.tag} ${shot.name}: ${String(e).split('\n')[0]}`);
        }
      }
      await ctx.close();
    }
  }

  fs.writeFileSync(path.join(ROOT, 'REPORT.json'), JSON.stringify(report, null, 1));
  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
