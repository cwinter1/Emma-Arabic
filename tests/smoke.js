// Smoke test: opens every game in headless Chromium (phone size), plays it with real clicks.
//   node tests/smoke.js            (needs playwright)
const path = require('path');
const { chromium } = require('playwright');
const URL = process.env.SMOKE_URL || 'file://' + path.resolve(__dirname, '..', 'index.html');
let fails = 0;
const ck = (n, ok, d) => { console.log((ok ? '  ok   ' : '  FAIL ') + n + (ok ? '' : '  -> ' + d)); if (!ok) fails++; };

(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 390, height: 800 } })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL);

  // every spoken text has a recorded clip, and the clip file loads
  const miss = await page.evaluate(async () => {
    const t = new Set();
    WORDS.forEach(w => t.add(w.say));
    HEADS.forEach(h => { t.add(h.ar); h.t.forEach(x => t.add(x[0])); });
    const bad = [];
    for (const x of t) {
      const f = AUDIO[norm(x)];
      if (!f) { bad.push(x); continue; }
      const r = await fetch('audio/' + f + '.mp3');
      if (!r.ok) bad.push(x);
    }
    return bad;
  });
  ck('every word/headline has audio', miss.length === 0, miss.join(' | '));

  const games = await page.$$eval('[data-g]', e => e.map(x => x.dataset.g));
  ck('12 games on home', games.length === 12, games.length);

  // multiple-choice games: click options until one turns green, repeat until the end screen
  async function playChoice(id) {
    await page.click(`[data-g=${id}]`);
    for (let n = 0; n < 40; n++) {
      if (await page.$('#ag')) return true;
      for (const o of await page.$$('.opt:not(.bad)')) {
        await o.click();
        if (await page.$('.opt.ok')) break;
      }
      await page.waitForTimeout(1250);
    }
    return !!(await page.$('#ag'));
  }
  for (const id of ['hl', 'ht', 'hc', 'hq', 'wq', 'lw']) {
    ck('game ' + id + ' completes', await playChoice(id), 'did not finish');
    await page.click('#hm');
  }

  // reading
  await page.click('[data-g=rd]');
  await page.click('.tok');
  ck('reading: gloss shown', (await page.textContent('#g0')).length > 0, '');
  await page.click('[data-t="0"]');
  ck('reading: translation shown', await page.isVisible('#t0'), '');
  await page.click('#bk');

  // headline build: solve in the correct order
  await page.click('[data-g=hb]');
  for (let r = 0; r < 5; r++) {
    const order = await page.evaluate(() => {
      const he = document.querySelector('.prompt.he').textContent;
      return HEADS.find(h => h.he === he).t.map(t => t[0]);
    });
    for (const w of order) {
      for (const bt of await page.$$('#tl .wd:not([disabled])')) {
        if ((await bt.textContent()) === w) { await bt.click(); break; }
      }
    }
    await page.waitForTimeout(2800);
  }
  ck('build headline completes', !!(await page.$('#ag')), '');
  await page.click('#hm');

  // spelling
  await page.click('[data-g=sp]');
  for (let r = 0; r < 8; r++) {
    const word = await page.evaluate(() => {
      const he = document.querySelector('.prompt.he').textContent;
      return norm(WORDS.find(w => w.he === he).say);
    });
    for (const ch of [...word]) {
      for (const bt of await page.$$('.lt:not([disabled])')) {
        if ((await bt.textContent()) === ch) { await bt.click(); break; }
      }
    }
    await page.waitForTimeout(1400);
  }
  ck('spelling completes', !!(await page.$('#ag')), '');
  await page.click('#hm');

  // memory
  await page.click('[data-g=mem]');
  const cards = await page.$$eval('.mc', e => e.length);
  ck('memory has 12 cards', cards === 12, cards);
  await page.click('#bk');

  // flashcards
  await page.click('[data-g=fc]');
  for (let n = 0; n < 15; n++) await page.click('#yes');
  ck('flashcards complete', !!(await page.$('#ag')), '');
  await page.click('#hm');

  // dictionary + category chip
  await page.click('[data-g=dc]');
  ck('dictionary lists all words', (await page.$$('table .spk')).length === 45, '');
  await page.click('#bk');
  await page.click('[data-c=v]');
  await page.click('[data-g=wq]');
  ck('category quiz opens', !!(await page.$('.opt')), '');

  ck('stars saved', (await page.evaluate(() => +localStorage.getItem('emma_stars'))) > 10, '');
  ck('no JS errors', errs.length === 0, errs.join(' | '));
  await page.screenshot({ path: process.env.SHOT || '/tmp/emma-quiz.png' });
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
