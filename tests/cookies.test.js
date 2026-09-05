import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../cookies.js', import.meta.url), 'utf8');
for (const consent of ['accepted', 'refused', null]) {
  test(`cookie preferences remain accessible with stored choice: ${consent}`, () => {
    const writes = []; const storage = new Map(); const scripts = [];
    if (consent) storage.set('chess-cookie-consent', consent);
    let reloads = 0;
    const document = {
      readyState: 'loading', addEventListener() {},
      createElement: tag => ({ tag }), head: { appendChild: el => scripts.push(el) },
      get cookie() { return '_ga=old; _ga_KCK01E71GB=old; other=keep'; },
      set cookie(value) { writes.push(value); },
    };
    const context = {
      window: {}, document,
      location: { hostname: 'www.cours-echecs-paris.fr', reload: () => { reloads++; } },
      localStorage: { getItem: key => storage.get(key), removeItem: key => storage.delete(key) },
    };
    vm.runInNewContext(source, context);
    assert.equal(typeof context.window.chessCookiesReset, 'function');
    assert.equal(scripts.some(s => s.src?.includes('googletagmanager')), consent === 'accepted');
    context.window.chessCookiesReset();
    assert.equal(storage.has('chess-cookie-consent'), false);
    assert.equal(context.window['ga-disable-G-KCK01E71GB'], true);
    assert.equal(context.window.gtag, undefined);
    assert.equal(reloads, 1);
    assert.ok(writes.some(s => s.startsWith('_ga=') && s.includes('domain=cours-echecs-paris.fr')));
    assert.ok(writes.every(s => !s.startsWith('other=')));
  });
}
