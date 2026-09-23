import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import worker from '../worker.js';
import { hmac, readLimitedText } from '../security.js';

const base = 'https://worker.example';
const adminPaths = ['/admin', '/subscribers', '/subscribers/export.csv', '/orders', '/orders/export.csv'];
function fixture(t) {
  const db = new Map();
  const calls = [];
  const originalFetch = globalThis.fetch;
  let emailStatus = 200;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    calls.push({ body: JSON.parse(options.body), headers: options.headers });
    return new Response('{}', { status: emailStatus });
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const env = {
    ADMIN_TOKEN: 'local-test-secret', STRIPE_WEBHOOK_SECRET: 'local-webhook-secret',
    ALLOWED_ORIGIN: 'https://www.cours-echecs-paris.fr',
    SUBSCRIBE_IP_LIMITER: { limit: async () => ({ success: true }) },
    SUBSCRIBE_EMAIL_LIMITER: { limit: async () => ({ success: true }) },
    SUBSCRIBERS: {
      get: async key => db.get(key) ?? null,
      put: async (key, value) => { db.set(key, value); },
      delete: async key => { db.delete(key); },
      list: async ({ prefix }) => ({ keys: [...db.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }),
    },
  };
  return { env, db, calls, failEmails: () => { emailStatus = 503; }, recoverEmails: () => { emailStatus = 200; } };
}
function get(path, headers = {}) { return new Request(base + path, { headers }); }
function subscribe(body = { email: 'person@example.invalid', why: 'guide_gratuit' }) {
  return new Request(base + '/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1' }, body: JSON.stringify(body) });
}
function signed(env, session, { timestamp = Math.floor(Date.now() / 1000), type = 'checkout.session.completed', tamper = false } = {}) {
  const body = JSON.stringify({ id: 'evt_test', type, data: { object: session } });
  const sig = createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${body}`).digest('hex');
  return new Request(base + '/stripe-webhook', { method: 'POST', headers: { 'Stripe-Signature': `t=${timestamp},v1=${sig}` }, body: tamper ? body + ' ' : body });
}
const paid = { id: 'cs_test_paid', created: 1788590000, payment_status: 'paid', customer_email: 'buyer@example.invalid' };

test('all private routes fail closed without a valid configured secret', async t => {
  const { env } = fixture(t);
  for (const secret of [undefined, '', ' ', 'undefined', 'null']) {
    env.ADMIN_TOKEN = secret;
    for (const path of adminPaths) {
      const r = await worker.fetch(get(path, { Authorization: `Bearer ${secret}` }), env);
      assert.equal(r.status, 401);
      assert.equal(r.headers.get('Cache-Control'), 'no-store');
      assert.equal(r.headers.get('Referrer-Policy'), 'no-referrer');
    }
    assert.equal((await worker.fetch(get('/admin?token=undefined'), env)).status, 401);
  }
});

test('existing Bearer clients and data remain readable; HTML and CSV are escaped', async t => {
  const { env, db } = fixture(t);
  const record = { id: 'one', date: '2026-09-05', email: 'person@example.invalid', why: '=1+1' };
  db.set('subscriber:one', JSON.stringify(record));
  const headers = { Authorization: `Bearer ${env.ADMIN_TOKEN}` };
  const list = await worker.fetch(get('/subscribers', headers), env);
  assert.deepEqual((await list.json()).subscribers, [record]);
  const csv = await (await worker.fetch(get('/subscribers/export.csv', headers), env)).text();
  assert.ok(csv.includes('"\'=1+1"'));
  record.why = '<script>alert(1)</script>'; db.set('subscriber:one', JSON.stringify(record));
  const html = await (await worker.fetch(get('/admin', headers), env)).text();
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes(env.ADMIN_TOKEN));
  assert.ok(!html.includes('?token='));
});

test('legacy admin bookmark exchanges token for signed cookie and clean URL', async t => {
  const { env } = fixture(t);
  const r = await worker.fetch(get('/admin?token=' + env.ADMIN_TOKEN), env);
  assert.equal(r.status, 303); assert.equal(r.headers.get('Location'), '/admin');
  const cookie = r.headers.get('Set-Cookie');
  for (const flag of ['Secure', 'HttpOnly', 'SameSite=Lax', 'Path=/']) assert.ok(cookie.includes(flag));
  assert.ok(!cookie.includes(env.ADMIN_TOKEN));
  const headers = { Cookie: cookie.split(';')[0] };
  for (const path of adminPaths) assert.equal((await worker.fetch(get(path, headers), env)).status, 200);
  assert.equal((await worker.fetch(get('/subscribers', { Cookie: headers.Cookie + 'broken' }), env)).status, 401);
  env.ADMIN_TOKEN = 'rotated';
  assert.equal((await worker.fetch(get('/subscribers', headers), env)).status, 401);
});

test('expired signed sessions are refused', async t => {
  const { env } = fixture(t); const expires = Math.floor(Date.now() / 1000) - 1;
  const sig = await hmac(`admin-session:${expires}`, env.ADMIN_TOKEN);
  assert.equal((await worker.fetch(get('/orders', { Cookie: `__Host-chess-admin=${expires}.${sig}` }), env)).status, 401);
});

test('admin form logs in and rejects cross-origin submissions', async t => {
  const { env } = fixture(t);
  assert.ok((await (await worker.fetch(get('/admin'), env)).text()).includes('type="password"'));
  const login = origin => new Request(base + '/admin', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'token=' + env.ADMIN_TOKEN });
  assert.equal((await worker.fetch(login(base), env)).status, 303);
  assert.equal((await worker.fetch(login('https://other.example'), env)).status, 403);
});

test('subscription delivers guide, suppresses repeated emails and avoids full database scans', async t => {
  const { env, calls, db } = fixture(t);
  env.SUBSCRIBERS.list = () => { throw new Error('no full scan'); };
  assert.equal((await worker.fetch(subscribe(), env)).status, 200);
  assert.equal(calls.length, 2);
  const limited = await worker.fetch(subscribe(), env);
  assert.equal(limited.status, 429); assert.equal(limited.headers.get('Retry-After'), '600');
  assert.equal(calls.length, 2);
  assert.equal([...db.keys()].filter(k => k.startsWith('subscriber:')).length, 1);
});

test('rate limits, missing bindings and invalid input cause no writes or emails', async t => {
  const { env, calls, db } = fixture(t);
  for (const input of [null, [], { email: 'bad' }, { email: 'a'.repeat(255) + '@example.invalid' }]) {
    assert.equal((await worker.fetch(subscribe(input), env)).status, 400);
  }
  assert.equal((await worker.fetch(subscribe({ email: 'p@example.invalid', why: 'a'.repeat(5000) }), env)).status, 413);
  env.SUBSCRIBE_IP_LIMITER.limit = async () => ({ success: false });
  assert.equal((await worker.fetch(subscribe(), env)).status, 429);
  delete env.SUBSCRIBE_EMAIL_LIMITER;
  assert.equal((await worker.fetch(subscribe(), env)).status, 503);
  assert.equal(db.size, 0); assert.equal(calls.length, 0);
});

test('streaming body limit applies without Content-Length', async () => {
  const r = new Request(base, { method: 'POST', body: new ReadableStream({ start(c) { c.enqueue(new Uint8Array(5000)); c.close(); } }), duplex: 'half' });
  await assert.rejects(readLimitedText(r, 4096), e => e.status === 413);
});

test('old, future and altered Stripe signatures are rejected before side effects', async t => {
  const { env, db, calls } = fixture(t);
  for (const options of [{ timestamp: 1 }, { timestamp: Math.floor(Date.now()/1000) + 600 }, { tamper: true }]) {
    assert.equal((await worker.fetch(signed(env, paid, options), env)).status, 400);
  }
  assert.equal(db.size, 0); assert.equal(calls.length, 0);
});

test('paid guide webhook is deduplicated and unpaid events do nothing', async t => {
  const { env, calls } = fixture(t);
  assert.equal((await worker.fetch(signed(env, { ...paid, payment_status: 'unpaid' }), env)).status, 200);
  assert.equal(calls.length, 0);
  assert.equal((await worker.fetch(signed(env, paid), env)).status, 200);
  assert.equal((await worker.fetch(signed(env, paid), env)).status, 200);
  assert.equal(calls.length, 2);
  for (const call of calls) assert.ok(call.headers['Idempotency-Key']);
});

test('sans secret, la désinscription retombe sur un contact par email et ne casse rien', async t => {
  const { env, calls } = fixture(t);
  assert.equal((await worker.fetch(subscribe(), env)).status, 200);
  const guide = calls[0].body;
  assert.equal(guide.headers['List-Unsubscribe'], '<mailto:nicolas.musicki@gmail.com?subject=Desinscription>');
  assert.equal(guide.headers['List-Unsubscribe-Post'], undefined);
  assert.match(guide.html, /mailto:nicolas\.musicki@gmail\.com\?subject=Desinscription/);
  assert.match(guide.text, /répondez simplement/);
  const page = await worker.fetch(get('/desinscription?e=x&t=y'), env);
  assert.equal(page.status, 503);
  assert.match(await page.text(), /mailto:nicolas\.musicki@gmail\.com/);
});

test('le lien de désinscription signé confirme en GET puis supprime en POST, de façon idempotente', async t => {
  const { env, calls, db } = fixture(t);
  env.UNSUBSCRIBE_SECRET = 'local-unsubscribe-secret';
  assert.equal((await worker.fetch(subscribe(), env)).status, 200);
  const guide = calls[0].body;
  const lien = /https:\/\/worker\.example\/desinscription\?e=[A-Za-z0-9_-]+&t=[a-f0-9]{64}/.exec(guide.html)?.[0];
  assert.ok(lien, 'le lien signé figure dans le corps HTML');
  assert.ok(guide.text.includes(lien), 'le lien signé figure dans la version texte');
  assert.equal(guide.headers['List-Unsubscribe'], `<${lien}>, <mailto:nicolas.musicki@gmail.com?subject=Desinscription>`);
  assert.equal(guide.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');

  const cles = () => [...db.keys()].filter(k => k.startsWith('subscriber:') || k.startsWith('email:'));
  assert.equal(cles().length, 2);

  const confirmation = await worker.fetch(new Request(lien), env);
  assert.equal(confirmation.status, 200);
  const html = await confirmation.text();
  assert.match(html, /<form method="post"/);
  assert.match(html, /person@example\.invalid/);
  assert.equal(cles().length, 2, 'un GET ne détruit rien');

  const oneClick = new Request(lien, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click' });
  const fait = await worker.fetch(oneClick, env);
  assert.equal(fait.status, 200);
  assert.match(await fait.text(), /vous êtes désinscrit/);
  assert.equal(cles().length, 0, 'les clés subscriber et email sont supprimées');

  assert.equal((await worker.fetch(new Request(lien, { method: 'POST' }), env)).status, 200, 'rejouer le lien reste un succès');
  assert.equal(calls.length, 2, 'la désinscription n’envoie aucun email');
});

test('un lien de désinscription altéré est refusé sans effet et limité en débit', async t => {
  const { env, db } = fixture(t);
  env.UNSUBSCRIBE_SECRET = 'local-unsubscribe-secret';
  db.set('email:person@example.invalid', 'one');
  db.set('subscriber:one', '{}');
  const encode = Buffer.from('person@example.invalid').toString('base64url');
  const bon = await hmac('desinscription:person@example.invalid', env.UNSUBSCRIBE_SECRET);
  const faux = bon.replace(/^./, c => (c === 'a' ? 'b' : 'a'));
  for (const url of [
    `/desinscription?e=${encode}&t=${faux}`,
    `/desinscription?e=${encode}`,
    `/desinscription?e=%%%&t=${bon}`,
    `/desinscription?e=${Buffer.from('autre@example.invalid').toString('base64url')}&t=${bon}`,
  ]) {
    for (const method of ['GET', 'POST']) {
      assert.equal((await worker.fetch(new Request(base + url, { method }), env)).status, 400, `${method} ${url}`);
    }
  }
  assert.equal(db.size, 2, 'aucune suppression');
  env.SUBSCRIBE_IP_LIMITER.limit = async () => ({ success: false });
  assert.equal((await worker.fetch(get(`/desinscription?e=${encode}&t=${faux}`), env)).status, 429);
  env.SUBSCRIBE_IP_LIMITER.limit = async () => ({ success: true });
  assert.equal((await worker.fetch(new Request(base + `/desinscription?e=${encode}&t=${bon}`, { method: 'POST' }), env)).status, 200, 'le lien valide n’est jamais limité');
  assert.equal(db.size, 0);
});

test('le chemin legacy ?token= partage la limite de débit du formulaire ; les en-têtes durcis sont posés', async t => {
  const { env } = fixture(t);
  const racine = await worker.fetch(get('/'), env);
  assert.equal(racine.headers.get('Strict-Transport-Security'), 'max-age=31536000; includeSubDomains');
  assert.equal(racine.headers.get('Cross-Origin-Opener-Policy'), 'same-origin');
  assert.match(racine.headers.get('Permissions-Policy'), /camera=\(\)/);
  env.SUBSCRIBE_IP_LIMITER.limit = async ({ key }) => ({ success: !key.startsWith('admin:') });
  const r = await worker.fetch(get('/admin?token=' + env.ADMIN_TOKEN), env);
  assert.equal(r.status, 429);
  assert.equal(r.headers.get('Retry-After'), '60');
  assert.equal(r.headers.get('Set-Cookie'), null, 'aucune session ouverte quand la limite est atteinte');
});

test('la déconnexion efface le cookie de session et refuse les origines tierces', async t => {
  const { env } = fixture(t);
  const login = await worker.fetch(get('/admin?token=' + env.ADMIN_TOKEN), env);
  assert.equal(login.status, 303);
  const page = await worker.fetch(get('/admin', { Cookie: login.headers.get('Set-Cookie').split(';')[0] }), env);
  assert.match(await page.text(), /action="\/logout"/);
  const logout = await worker.fetch(new Request(base + '/logout', { method: 'POST', headers: { Origin: base } }), env);
  assert.equal(logout.status, 303); assert.equal(logout.headers.get('Location'), '/admin');
  const cookie = logout.headers.get('Set-Cookie');
  assert.ok(cookie.startsWith('__Host-chess-admin=;'), cookie);
  for (const flag of ['Max-Age=0', 'Secure', 'HttpOnly', 'Path=/']) assert.ok(cookie.includes(flag), flag);
  assert.equal((await worker.fetch(new Request(base + '/logout', { method: 'POST', headers: { Origin: 'https://other.example' } }), env)).status, 403);
});

test('failed pack emails retry without losing or duplicating the stored order', async t => {
  const f = fixture(t); const session = { ...paid, metadata: { product: 'pack_livres_relies' }, amount_total: 6499 };
  f.failEmails();
  assert.equal((await worker.fetch(signed(f.env, session), f.env)).status, 500);
  const saved = f.db.get('order:' + paid.id); assert.ok(saved);
  f.recoverEmails();
  assert.equal((await worker.fetch(signed(f.env, session), f.env)).status, 200);
  assert.equal(f.db.get('order:' + paid.id), saved);
  assert.equal(f.calls.length, 4);
  assert.deepEqual(f.calls[0], f.calls[2]); assert.deepEqual(f.calls[1], f.calls[3]);
  assert.equal((await worker.fetch(signed(f.env, session), f.env)).status, 200);
  assert.equal(f.calls.length, 4);
  assert.ok(!f.calls.some(c => c.body.subject === 'Ton guide des échecs est prêt'));
});

test('historical orders are untouched and do not trigger migration emails', async t => {
  const { env, calls, db } = fixture(t);
  const original = JSON.stringify({ id: paid.id, status: 'expedie', date: '2026-08-20' });
  db.set('order:' + paid.id, original);
  assert.equal((await worker.fetch(signed(env, { ...paid, metadata: { product: 'pack_livres_relies' } }), env)).status, 200);
  assert.equal(db.get('order:' + paid.id), original); assert.equal(calls.length, 0);
});
