const SESSION_COOKIE = '__Host-chess-admin';
const SESSION_SECONDS = 8 * 60 * 60;

export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

export function validAdminSecret(secret) {
  return typeof secret === 'string' && secret.trim().length > 0 &&
    secret !== 'undefined' && secret !== 'null';
}

export async function hmac(value, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hash(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function adminAuthorized(request, env) {
  if (!validAdminSecret(env.ADMIN_TOKEN)) return false;
  const auth = request.headers.get('Authorization') || '';
  if (timingSafeEqual(auth, `Bearer ${env.ADMIN_TOKEN}`)) return true;
  const cookie = (request.headers.get('Cookie') || '').split(';')
    .map(s => s.trim()).find(s => s.startsWith(SESSION_COOKIE + '='));
  if (!cookie) return false;
  const value = cookie.slice(SESSION_COOKIE.length + 1);
  const match = /^(\d+)\.([a-f0-9]{64})$/.exec(value);
  if (!match) return false;
  const expires = Number(match[1]);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(expires) || expires <= now || expires > now + SESSION_SECONDS) return false;
  return timingSafeEqual(match[2], await hmac(`admin-session:${expires}`, env.ADMIN_TOKEN));
}

export async function adminSessionRedirect(path, env) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const signature = await hmac(`admin-session:${expires}`, env.ADMIN_TOKEN);
  return new Response(null, { status: 303, headers: {
    Location: path,
    'Set-Cookie': `${SESSION_COOKIE}=${expires}.${signature}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}`,
  } });
}

export function secureResponse(response) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  headers.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export async function readLimitedText(request, limit) {
  if (Number(request.headers.get('Content-Length')) > limit) {
    throw Object.assign(new Error('Requête trop volumineuse'), { status: 413 });
  }
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let result = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw Object.assign(new Error('Requête trop volumineuse'), { status: 413 });
      }
      result += decoder.decode(value, { stream: true });
    }
    return result + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
