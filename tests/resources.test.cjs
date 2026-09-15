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
        w.dispatchEvent(new w.Event('beforeprint'));
        printState = {
          body: w.document.body.className,
          health: w.document.querySelector('[data-k="hp.100.hp"]').value,
          mana: w.document.querySelector('[data-k="mana.max"]').value,
          summary: w.document.querySelector('#healthAdjustmentSummary').textContent,
          expanded: w.document.querySelectorAll('[data-print-open]').length,
          theme: w.document.documentElement.getAttribute('data-theme'),
          skillDescription: w.document.querySelector('[data-k="skills.0.description"]').value,
          visibleRows: Object.fromEntries(['attacks', 'skills', 'spells'].map(prefix => [
            prefix,
            [...w.document.querySelectorAll(`[data-row^="${prefix}."]`)]
              .filter(row => row.getAttribute('data-print-hide') !== 'true').length,
          ])),
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
  assert.equal(rows()[1].querySelector('[data-companion-bonded]').hidden, false);
  assert.equal(rows()[1].querySelector('[data-companion-bonded]').dataset.companionInactive, 'true');
  assert.equal(rows()[1].querySelector('[data-companion-rideable]').dataset.companionInactive, 'true');
  const css = s.d.querySelector('style').textContent;
  assert.match(css, /\.companion-flag\[data-companion-inactive="true"\][\s\S]*visibility: hidden/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.companion-flag\[data-companion-inactive="true"\][\s\S]*display: none/);

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

test('Grinding waits for an equal-or-higher Skill Advancement result without double-counting', t => {
  const s = sheet(t);
  s.set('identity.level', 10);
  s.set('skills.0.name', 'Test Skill');
  s.set('skills.0.rank', 2);

  s.click('[data-grind="skills.0."] [data-grind-step="1"]');
  assert.equal(s.value('skills.0.grind'), '1');
  assert.equal(s.value('identity.grind'), '1');
  assert.equal(s.d.querySelector('#advDialog').open, false);

  s.click('[data-grind="skills.0."] [data-grind-step="1"]');
  assert.equal(s.value('skills.0.grind'), '2');
  assert.equal(s.value('identity.grind'), '2');
  assert.equal(s.value('skills.0.rank'), '2');
  assert.equal(s.d.querySelector('#advDialog').open, true);
  assert.match(s.d.querySelector('#advDialogMsg').textContent, /equal to or higher than 2/);

  const dialog = s.d.querySelector('#advDialog');
  dialog.close();
  dialog.dispatchEvent(new s.w.Event('close'));
  s.click('[data-grind="skills.0."] [data-grind-step="1"]');
  assert.equal(s.value('skills.0.grind'), '2', 'full Skill track remains capped');
  assert.equal(s.value('identity.grind'), '2', 'reopening does not count another hour');
  assert.equal(dialog.open, true);

  s.click('[data-adv-result="success"]');
  assert.equal(s.value('skills.0.rank'), '3');
  assert.equal(s.value('skills.0.grind'), '0');
  assert.equal(s.value('identity.grind'), '2', 'Skill outcome does not erase Level progress');
});

test('Grinding queues simultaneous milestones and blocks hours while Level resolution is pending', t => {
  const s = sheet(t);
  s.set('identity.level', 1);
  s.set('skills.0.rank', 1);

  s.click('[data-grind="skills.0."] [data-grind-step="1"]');
  assert.equal(s.d.querySelector('#advDialog').open, true);
  assert.equal(s.d.querySelector('#levelUpDialog').open, false, 'only one modal opens at a time');

  s.click('[data-adv-result="failure"]');
  assert.equal(s.value('skills.0.rank'), '1');
  assert.equal(s.value('skills.0.grind'), '0');
  assert.equal(s.d.querySelector('#levelUpDialog').open, true, 'Level prompt follows Skill resolution');

  s.click('[data-levelup-result="no"]');
  s.click('[data-grind="skills.0."] [data-grind-step="1"]');
  assert.equal(s.value('skills.0.grind'), '0', 'new row hour is not accepted while Level is pending');
  assert.equal(s.value('identity.grind'), '1', 'full Level meter does not discard or invent hours');
  assert.equal(s.d.querySelector('#levelUpDialog').open, true, 'pending Level prompt reopens');

  s.w.Math.random = () => 0.999;
  s.click('[data-levelup-result="solo"]');
  assert.equal(s.value('identity.level'), '3');
  assert.equal(s.value('identity.grind'), '0');
});

test('Grinding decrement, Passive Skills and the Rank 15 cap remain bounded', t => {
  const s = sheet(t);
  s.set('identity.level', 10);
  s.set('skills.0.rank', 2);
  s.click('[data-grind="skills.0."] [data-grind-step="1"]');
  s.click('[data-grind="skills.0."] [data-grind-step="-1"]');
  assert.equal(s.value('skills.0.grind'), '0');
  assert.equal(s.value('identity.grind'), '0');

  s.set('skills.0.checkType', 'Passive');
  assert.equal(s.d.querySelector('[data-grind="skills.0."]').hidden, true);

  s.set('attacks.0.rank', 15);
  s.click('[data-grind="attacks.0."] [data-grind-step="1"]');
  assert.equal(s.value('attacks.0.grind'), '0');
  assert.equal(s.value('identity.grind'), '0');
});

test('Printing trims zero-only grinding rows, resolves tokens, and restores screen state', t => {
  const s = sheet(t);
  s.d.documentElement.setAttribute('data-theme', 'dark');
  s.set('skills.0.description', 'Current Level: %LVL');
  const printed = s.print('all');
  assert.equal(printed.theme, 'light');
  assert.equal(printed.skillDescription, 'Current Level: 1');
  assert.deepEqual(printed.visibleRows, { attacks: 4, skills: 9, spells: 4 });

  s.w.dispatchEvent(new s.w.Event('afterprint'));
  assert.equal(s.value('skills.0.description'), 'Current Level: %LVL');
  assert.equal(s.d.documentElement.getAttribute('data-theme'), 'dark');
  const css = s.d.querySelector('style').textContent;
  assert.match(css, /@media print[\s\S]*\.grind-btn,[\s\S]*display: none !important/);
});

test('Text fields render bold, italic, underline and strike while keeping the typed text', t => {
  const s = sheet(t);
  const raw = '**Bold** *it* __under__ ~~gone~~ **%LVL**';
  s.set('skills.0.description', raw);
  const wrap = s.field('skills.0.description').closest('.ta-wrap');
  assert.ok(wrap.classList.contains('showing-hl'));
  assert.equal(wrap.querySelector('.ta-hl').innerHTML,
    '<strong>Bold</strong> <em>it</em> <u>under</u> <s>gone</s> <strong><span class="var-chip">1</span></strong>');
  assert.equal(s.value('skills.0.description'), raw, 'markers are saved as typed');
  for (const literal of ['2 * 3 * 4', '1d6*2 or 1d8*2', '** not bold**', 'unclosed **bold', 'snake_case_name']) {
    s.set('skills.0.description', literal);
    assert.equal(wrap.classList.contains('showing-hl'), false, literal);
  }
  s.set('skills.0.description', '***both*** __%LVL__\n**no\nspan**');
  assert.equal(wrap.querySelector('.ta-hl').innerHTML,
    '<strong><em>both</em></strong> <u><span class="var-chip">1</span></u>\n**no\nspan**');
});

test('Formatting shortcuts and the B/I/U/S bar toggle markers around the selection', t => {
  const s = sheet(t);
  const ta = s.field('skills.0.description');
  const key = (k, extra = {}) => ta.dispatchEvent(new s.w.KeyboardEvent('keydown',
    { key: k, ctrlKey: true, bubbles: true, cancelable: true, ...extra }));
  s.set('skills.0.description', 'Deal fire damage');
  ta.focus();
  ta.setSelectionRange(5, 9);
  key('b');
  assert.equal(ta.value, 'Deal **fire** damage');
  assert.deepEqual([ta.selectionStart, ta.selectionEnd], [7, 11], 'the word stays selected');
  key('i');
  assert.equal(ta.value, 'Deal ***fire*** damage');
  key('b');
  assert.equal(ta.value, 'Deal *fire* damage');
  key('X', { shiftKey: true });
  assert.equal(ta.value, 'Deal *~~fire~~* damage');
  const bar = ta.closest('.ta-wrap').querySelector('.fmt-bar');
  assert.deepEqual([...bar.querySelectorAll('[data-fmt]')].map(b => b.textContent), ['B', 'I', 'U', 'S']);
  bar.querySelector('[data-fmt="s"]').click();
  assert.equal(ta.value, 'Deal *fire* damage');
  bar.querySelector('[data-fmt="i"]').click();
  assert.equal(ta.value, 'Deal fire damage');

  ta.setSelectionRange(ta.value.length, ta.value.length);
  key('u');
  assert.equal(ta.value, 'Deal fire damage____');
  assert.equal(ta.selectionStart, ta.value.length - 2, 'caret between the markers');
  key('u');
  assert.equal(ta.value, 'Deal fire damage');

  s.set('skills.0.description', 'First line\n\n  Second line  ');
  ta.setSelectionRange(0, ta.value.length);
  key('b');
  assert.equal(ta.value, '**First line**\n\n  **Second line**  ');
  key('b');
  assert.equal(ta.value, 'First line\n\n  Second line  ');
  s.flush();
  assert.equal(s.value('skills.0.description'), 'First line\n\n  Second line  ');
});

test('Help explains text formatting in every language', t => {
  const s = sheet(t);
  const nav = s.w.navigator;
  const mac = /Mac|iPhone|iPad|iPod/.test(nav.platform || nav.userAgent || '');
  const keys = mac ? ['⌘B', '⌘I', '⌘U', '⌘⇧X'] : ['Ctrl+B', 'Ctrl+I', 'Ctrl+U', 'Ctrl+Shift+X'];
  s.change(s.d.querySelector('#langSel'), 'fr');
  s.click('[data-act="help"]');
  assert.equal(s.d.querySelector('#helpDialog').open, true);
  assert.equal(s.d.querySelector('[data-i18n="help.fmt.heading"]').textContent, 'Mise en forme du texte');
  const list = s.d.querySelector('#helpFmtList');
  assert.deepEqual([...list.querySelectorAll('code')].map(c => c.textContent), ['**texte**', '*texte*', '__texte__', '~~texte~~']);
  assert.deepEqual([...list.querySelectorAll('kbd')].map(k => k.textContent), keys);
  assert.deepEqual([...list.querySelectorAll('.help-tok-desc > *')].map(el => [el.tagName, el.textContent]),
    [['STRONG', 'Gras'], ['EM', 'Italique'], ['U', 'Souligné'], ['S', 'Barré']]);
  const bold = s.d.querySelector('.fmt-bar [data-fmt="b"]');
  assert.equal(bold.getAttribute('title'), `Gras (${keys[0]})`);
  for (const locale of ['en', 'es', 'de', 'pt']) {
    s.change(s.d.querySelector('#langSel'), locale);
    for (const el of s.d.querySelectorAll('[data-i18n^="help.fmt."]')) assert.ok(!el.textContent.startsWith('help.'), locale);
    assert.ok(!list.textContent.includes('fmt.'), locale);
    assert.ok(!bold.getAttribute('title').startsWith('fmt.'), locale);
  }
});

test('Printing shows formatted text instead of raw markers and restores the editor', t => {
  const s = sheet(t);
  const ta = s.field('skills.0.description');
  s.set('skills.0.description', 'Hit **hard** at %LVL');
  const wrap = ta.closest('.ta-wrap');
  ta.focus();
  assert.equal(wrap.classList.contains('showing-hl'), false, 'raw markers while editing');
  s.print('all');
  assert.equal(wrap.classList.contains('showing-hl'), true);
  assert.equal(wrap.querySelector('.ta-hl').innerHTML, 'Hit <strong>hard</strong> at 1');
  s.w.dispatchEvent(new s.w.Event('afterprint'));
  assert.equal(ta.value, 'Hit **hard** at %LVL');
  assert.equal(wrap.classList.contains('showing-hl'), false, 'focused field is editable again');
  const css = s.d.querySelector('style').textContent;
  assert.match(css, /@media print[\s\S]*\.ta-wrap\.showing-hl > textarea\[data-k\] \{\s*display: none !important/);
  assert.match(css, /@media print[\s\S]*\.fmt-bar \{\s*display: none !important/);
});
