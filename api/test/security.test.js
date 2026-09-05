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
