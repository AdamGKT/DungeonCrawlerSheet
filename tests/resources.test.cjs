const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html = readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');

// Execute the real self-contained page. Only browser services are stubbed;
// calculations, event handlers, save/import code and markup stay unmodified.
function sheet(t, storage = {}) {
  const errors = [], tasks = new Map();
  let timerId = 0, exported, printState;
  const console = new VirtualConsole();
  console.on('jsdomError', error => errors.push(error.message));
  const dom = new JSDOM(html, {
    url: 'https://sheet.test/', runScripts: 'dangerously', virtualConsole: console,
    beforeParse(w) {
      for (const [key, value] of Object.entries(storage)) w.localStorage.setItem(key, value);
      w.setTimeout = fn => { tasks.set(++timerId, fn); return timerId; };
      w.clearTimeout = id => tasks.delete(id);
      w.confirm = () => true;
      w.alert = message => errors.push(message);
      w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
      w.HTMLDialogElement.prototype.close = function () { this.open = false; };
      w.URL.createObjectURL = blob => { exported = blob; return 'blob:test'; };
      w.URL.revokeObjectURL = () => {};
      w.HTMLAnchorElement.prototype.click = function () {};
      w.print = () => {
        printState = {
          body: w.document.body.className,
          health: w.document.querySelector('[data-k="hp.100.hp"]').value,
          mana: w.document.querySelector('[data-k="mana.max"]').value,
          summary: w.document.querySelector('#healthAdjustmentSummary').textContent,
          expanded: w.document.querySelectorAll('[data-print-open]').length
        };
      };
    }
  });
  const w = dom.window, d = w.document;
  const field = key => d.querySelector(`[data-k="${key}"]`);
  const change = (el, value) => {
    assert.ok(el, 'control exists');
    if (el.type === 'checkbox') el.checked = value;
    else el.value = String(value);
    el.dispatchEvent(new w.Event('input', { bubbles: true }));
    el.dispatchEvent(new w.Event('change', { bubbles: true }));
  };
  const flush = () => {
    for (const [id, fn] of [...tasks]) { tasks.delete(id); fn(); }
  };
  const readBlob = blob => new Promise((resolve, reject) => {
    const reader = new w.FileReader();
    reader.onload = () => resolve(JSON.parse(reader.result));
    reader.onerror = reject;
    reader.readAsText(blob);
  });
  t.after(() => { dom.window.close(); assert.deepEqual(errors, [], 'no page errors'); });
  return {
    w, d, field, change, flush,
    set: (key, value) => change(field(key), value),
    value: key => field(key).value,
    click: selector => { const el = d.querySelector(selector); assert.ok(el, selector); el.click(); },
    storage: () => Object.fromEntries(Object.keys(w.localStorage).map(k => [k, w.localStorage.getItem(k)])),
    export: async () => { d.querySelector('[data-act="export"]').click(); return readBlob(exported); },
    import: async data => {
      const input = d.querySelector('[data-file]');
      const before = d.querySelectorAll('#crawlerSelect option').length;
      Object.defineProperty(input, 'files', { configurable: true, value: [new w.File([JSON.stringify(data)], 'test.json', { type: 'application/json' })] });
      input.dispatchEvent(new w.Event('change', { bubbles: true }));
      await new Promise((resolve, reject) => {
        const started = Date.now();
        const check = () => {
          if (d.querySelectorAll('#crawlerSelect option').length > before) return resolve();
          if (Date.now() - started > 5000) return reject(new Error('import did not finish'));
          setTimeout(check, 10);
        };
        check();
      });
    },
    print: mode => { d.querySelector(`[data-print-mode="${mode}"]`).click(); flush(); return printState; }
  };
}

test('normal defaults and all modifier boundaries remain unchanged', t => {
  const s = sheet(t);
  assert.equal(s.value('hp.100.hp'), '');
  assert.equal(s.value('mana.max'), '0');
  assert.equal(s.d.querySelector('#resourceEditor').hidden, true);
  for (const [score, mod] of [[1,1],[2,1],[3,2],[5,2],[6,3],[9,3],[10,4],[19,4],[20,5],[49,5],[50,6],[99,6],[100,7],[149,7],[150,8],[199,8],[200,9],[299,9],[300,10]]) {
    s.set('stats.CON.enh', score);
    for (let pct = 10; pct <= 100; pct += 10) assert.equal(s.value(`hp.${pct}.hp`), String(mod));
  }
  s.set('stats.INT.enh', 19);
  assert.equal(s.value('mana.max'), '19', 'Mana follows score, not Mod');
  assert.equal(s.d.querySelector('#healthAdjustmentSummary').hidden, true);
});

test('tattoo bonus affects only 100% and follows later stat changes', t => {
  const s = sheet(t);
  s.set('stats.CON.enh', 10); // Includes any equipment Stat bonus already.
  s.set('resources.slots.100.bonus', 10);
  assert.equal(s.value('hp.100.hp'), '14');
  assert.equal(s.value('hp.90.hp'), '4');
  assert.equal(s.value('stats.CON.enh'), '10', 'slot bonus does not modify the Stat');
  s.set('stats.CON.enh', 20);
  assert.equal(s.value('hp.100.hp'), '15');
  assert.equal(s.value('hp.90.hp'), '5');
  assert.match(s.d.querySelector('#healthAdjustmentSummary').textContent, /100% Bonus: \+10/);
});

test('alternate Health stat, all-slot bonus and fixed overrides have clear precedence', t => {
  const s = sheet(t);
  s.set('stats.CON.enh', 10);
  s.set('stats.CHA.enh', 6);
  s.set('resources.healthStat', 'CHA');
  s.set('resources.healthBonus', 2);
  s.set('resources.slots.100.bonus', 10);
  assert.equal(s.value('hp.100.hp'), '15');
  assert.equal(s.value('hp.90.hp'), '5');
  assert.equal(s.value('stats.CON.mod'), '+4');
  s.set('resources.slots.100.fixed', 21);
  s.set('stats.CHA.enh', 20);
  assert.equal(s.value('hp.100.hp'), '21');
  assert.equal(s.value('hp.90.hp'), '7');
  s.set('resources.slots.100.fixed', '');
  assert.equal(s.value('hp.100.hp'), '17');
});

test('Mana adjustment, explicit zero, reset and damage marks remain independent', t => {
  const s = sheet(t);
  s.set('stats.CON.enh', 10);
  s.set('stats.INT.enh', 12);
  s.set('mana.current', 8);
  s.set('hp.100.on', true);
  s.set('resources.manaBonus', 5);
  assert.equal(s.value('mana.max'), '17');
  s.set('resources.manaFixed', 0);
  assert.equal(s.value('mana.max'), '0');
  assert.equal(s.value('mana.current'), '8', 'lowering maximum does not silently spend Mana');
  s.set('resources.manaFixed', '');
  s.set('stats.INT.enh', 20);
  assert.equal(s.value('mana.max'), '25');
  s.set('resources.slots.100.bonus', 10);
  s.click('[data-resource-reset]');
  assert.equal(s.value('hp.100.hp'), '4');
  assert.equal(s.value('mana.max'), '20');
  assert.equal(s.value('mana.current'), '8');
  assert.equal(s.field('hp.100.on').checked, true);
  assert.equal(s.d.querySelector('#manaAdjustmentSummary').hidden, true);
});

test('invalid numbers are ignored, negative bonuses bounded and fixed Health needs no Stat', t => {
  const s = sheet(t);
  s.set('resources.slots.100.fixed', 7);
  assert.equal(s.value('hp.100.hp'), '7');
  assert.equal(s.value('hp.90.hp'), '');
  s.set('stats.CON.enh', 10);
  for (const invalid of ['0', '-5', '1.5', '9007199254740992']) {
    s.set('resources.slots.100.fixed', invalid);
    assert.equal(s.value('hp.100.hp'), '4');
    assert.equal(s.field('resources.slots.100.fixed').getAttribute('aria-invalid'), 'true');
  }
  s.set('resources.slots.100.fixed', '');
  s.set('resources.healthBonus', -20);
  assert.equal(s.value('hp.100.hp'), '1');
  s.set('resources.manaBonus', -20);
  assert.equal(s.value('mana.max'), '0');
  s.set('resources.manaFixed', -1);
  assert.equal(s.value('mana.max'), '0');
  assert.equal(s.field('resources.manaFixed').getAttribute('aria-invalid'), 'true');
});

test('autosave reload and JSON round-trip preserve adjustments including zero', async t => {
  const s = sheet(t);
  s.set('stats.CON.enh', 10);
  s.set('resources.slots.100.bonus', 10);
  s.set('resources.manaFixed', 0);
  s.set('hp.100.on', true);
  s.flush();
  const reloaded = sheet(t, s.storage());
  assert.equal(reloaded.value('hp.100.hp'), '14');
  assert.equal(reloaded.value('resources.manaFixed'), '0');
  assert.equal(reloaded.field('hp.100.on').checked, true);
  const payload = await reloaded.export();
  assert.equal(payload.fields['resources.slots.100.bonus'], '10');
  assert.equal(payload.character.resources.manaFixed, '0');
  const imported = sheet(t);
  await imported.import(payload);
  assert.equal(imported.value('hp.100.hp'), '14');
  assert.equal(imported.value('mana.max'), '0');
  delete payload.fields; // Also support the nested-only interchange format.
  await imported.import(payload);
  assert.equal(imported.value('resources.slots.100.bonus'), '10');
});

test('legacy saves ignore cached computed values and default to automatic', async t => {
  const s = sheet(t);
  s.set('resources.slots.100.fixed', 25);
  s.set('resources.manaFixed', 40);
  await s.import({fields:{'stats.CON.enh':'10','stats.INT.enh':'12','hp.100.hp':'99','mana.max':'999','hp.100.on':true}});
  assert.equal(s.value('hp.100.hp'), '4');
  assert.equal(s.value('mana.max'), '12');
  assert.equal(s.value('resources.slots.100.fixed'), '');
  assert.equal(s.field('hp.100.on').checked, true);
});

test('Vault creation, switching and duplication isolate each crawler', t => {
  const s = sheet(t);
  s.set('identity.name', 'Adjusted crawler');
  s.set('stats.CON.enh', 10);
  s.set('resources.slots.100.bonus', 10);
  s.flush();
  const originalId = s.d.querySelector('#crawlerSelect').value;
  s.change(s.d.querySelector('#newCrawlerName'), 'Normal crawler');
  s.click('[data-vault-create]');
  assert.equal(s.value('resources.slots.100.bonus'), '');
  s.set('stats.CON.enh', 6);
  assert.equal(s.value('hp.100.hp'), '3');
  s.change(s.d.querySelector('#crawlerSelect'), originalId);
  assert.equal(s.value('hp.100.hp'), '14');
  s.click(`[data-vault-duplicate="${originalId}"]`);
  assert.equal(s.value('hp.100.hp'), '14');
  s.set('resources.slots.100.bonus', 2);
  s.change(s.d.querySelector('#crawlerSelect'), originalId);
  assert.equal(s.value('hp.100.hp'), '14');
});

test('five languages translate controls and active summaries without changing values', t => {
  const s = sheet(t);
  s.set('stats.CON.enh', 10);
  s.set('resources.slots.100.bonus', 10);
  s.set('resources.manaBonus', 5);
  for (const [locale, word] of [['en','Adjusted'],['fr','Ajusté'],['es','Ajustado'],['de','Angepasst'],['pt','Ajustado']]) {
    s.change(s.d.querySelector('#langSel'), locale);
    assert.ok(s.d.querySelector('#healthAdjustmentSummary').textContent.startsWith(word));
    assert.ok(s.d.querySelector('#manaAdjustmentSummary').textContent.startsWith(word));
    assert.equal(s.value('hp.100.hp'), '14');
    for (const el of s.d.querySelectorAll('[data-i18n^="res."]')) assert.ok(!el.textContent.startsWith('res.'));
  }
});

test('printing includes calculated values and summaries, retains details and cleans up', t => {
  const s = sheet(t);
  s.set('stats.CON.enh', 10);
  s.set('resources.slots.100.bonus', 10);
  s.set('resources.manaFixed', 25);
  s.click('[data-resource-toggle]');
  s.set('skills.0.description', 'Detailed skill effect');
  for (const mode of ['all','current']) {
    const result = s.print(mode);
    assert.ok(result.body.includes(`print-${mode}`));
    assert.equal(result.health, '14');
    assert.equal(result.mana, '25');
    assert.match(result.summary, /100% Bonus: \+10/);
    assert.ok(result.expanded > 0);
    s.w.dispatchEvent(new s.w.Event('afterprint'));
    assert.equal(s.d.body.classList.contains(`print-${mode}`), false);
    assert.equal(s.d.querySelector('#resourceEditor').hidden, false);
  }
  const css = s.d.querySelector('style').textContent;
  assert.match(css, /@media print[\s\S]*\.resource-controls,[\s\S]*display: none !important/);
  assert.match(css, /minmax\(min\(100%, 180px\), 1fr\)/, 'editor grid can shrink on narrow screens');
});

test('resource edits do not change attacks, spells, defense or linked identity', t => {
  const s = sheet(t);
  s.set('identity.race', 'Test race');
  s.set('identity.class', 'Test class');
  s.set('stats.DEX.enh', 10);
  s.set('def.armor', 2);
  s.set('def.drBuffs', 3);
  s.set('attacks.0.name', 'Test weapon');
  s.set('attacks.0.rank', 5);
  s.set('attacks.0.hitStat', 'DEX');
  s.set('spells.0.name', 'Test spell');
  const before = [...s.d.querySelectorAll('[data-k], [data-c], [data-mirror]')]
    .filter(el => !/^(resources\.|hp\.|mana\.)/.test(el.getAttribute('data-k') || ''))
    .map(el => [el, el.value]);
  s.set('resources.healthStat', 'CHA');
  s.set('resources.healthBonus', 3);
  s.set('resources.manaBonus', 10);
  for (const [el, value] of before) assert.equal(el.value, value, el.getAttribute('data-k') || el.getAttribute('data-c'));
});

test('Companions support pets, rideable profiles, mounts, persistence and printing', async t => {
  const s = sheet(t);
  const rows = () => s.d.querySelectorAll('.companion-entry');
  assert.equal(rows().length, 1);
  assert.equal(s.value('companions.0.type'), 'pet');
  assert.equal(rows()[0].querySelector('[data-companion-section="pet"]').hidden, false);
  assert.equal(rows()[0].querySelector('[data-companion-section="mount"]').hidden, true);

  s.set('companions.0.name', 'Mordecai');
  s.set('companions.0.bonded', true);
  s.set('companions.0.rideable', true);
  s.set('companions.0.hbValue', 6);
  s.set('companions.0.stats.INT', 18);
  s.set('companions.0.mount.riderEffects', 'Carries one crawler');
  assert.equal(rows()[0].querySelector('[data-companion-section="mount"]').hidden, false);

  s.click('[data-add="companions"]');
  assert.equal(rows().length, 2);
  s.set('companions.1.name', 'Crawler van');
  s.set('companions.1.type', 'vehicle');
  s.set('companions.1.mount.occupants', 4);
  assert.equal(rows()[1].querySelector('[data-companion-section="pet"]').hidden, true);
  assert.equal(rows()[1].querySelector('[data-companion-section="mount"]').hidden, false);

  rows()[1].querySelector('.drag-handle').dispatchEvent(
    new s.w.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
  );
  assert.equal(s.value('companions.0.name'), 'Crawler van');
  assert.equal(s.value('companions.1.name'), 'Mordecai');
  rows()[0].querySelector('.drag-handle').dispatchEvent(
    new s.w.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
  );
  assert.equal(s.value('companions.0.name'), 'Mordecai');
  assert.equal(s.value('companions.1.name'), 'Crawler van');

  for (const locale of ['en', 'fr', 'es', 'de', 'pt']) {
    s.change(s.d.querySelector('#langSel'), locale);
    assert.ok(!s.d.querySelector('[data-tab="companions"]').textContent.startsWith('tab.'));
    assert.ok(!s.d.querySelector('[data-companion-type] option').textContent.startsWith('companion.'));
  }

  s.flush();
  const reloaded = sheet(t, s.storage());
  assert.equal(reloaded.d.querySelectorAll('.companion-entry').length, 2);
  assert.equal(reloaded.value('companions.0.name'), 'Mordecai');
  assert.equal(reloaded.field('companions.0.bonded').checked, true);
  assert.equal(reloaded.value('companions.1.type'), 'vehicle');
  assert.equal(reloaded.value('companions.1.mount.occupants'), '4');

  const payload = await reloaded.export();
  assert.equal(payload.counts.companions, 2);
  assert.equal(payload.character.companions[0].name, 'Mordecai');
  assert.equal(payload.character.companions[1].mount.occupants, '4');
  const printed = reloaded.print('all');
  assert.ok(printed.body.includes('print-all'));
  assert.equal(
    reloaded.d.querySelectorAll('.companion-details[data-print-open="true"]').length,
    2,
  );
});

test('Companion removal compacts records and old saves receive one blank pet row', async t => {
  const s = sheet(t);
  s.set('companions.0.name', 'First');
  s.click('[data-add="companions"]');
  s.set('companions.1.name', 'Second');
  s.click('[data-add="companions"]');
  s.set('companions.2.name', 'Third');
  s.click('[data-companion-remove="1"]');
  assert.equal(s.d.querySelectorAll('.companion-entry').length, 2);
  assert.equal(s.value('companions.0.name'), 'First');
  assert.equal(s.value('companions.1.name'), 'Third');

  await s.import({ fields: { 'identity.name': 'Legacy crawler' } });
  assert.equal(s.d.querySelectorAll('.companion-entry').length, 1);
  assert.equal(s.value('companions.0.type'), 'pet');
  assert.equal(s.value('companions.0.name'), '');
});
