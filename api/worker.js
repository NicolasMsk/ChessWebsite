/**
 * API maison pour le lead magnet "Guide Volume 1"
 * Cloudflare Worker + KV (base de données) + Resend (envoi email)
 *
 * Endpoints :
 *   POST /subscribe              → inscription + envoi PDF
 *   POST /stripe-webhook         → paiement Stripe réussi → envoi du guide par email
 *   GET  /subscribers            → liste des inscrits (auth Bearer)
 *   GET  /subscribers/export.csv → export CSV (auth Bearer)
 *
 * Variables d'environnement (à configurer via Wrangler) :
 *   RESEND_API_KEY         (secret) : clé API Resend
 *   ADMIN_TOKEN            (secret) : token pour accéder aux endpoints admin
 *   STRIPE_WEBHOOK_SECRET  (secret) : clé de signature du webhook Stripe (whsec_...)
 *   ALLOWED_ORIGIN         (var)    : "https://www.cours-echecs-paris.fr" (ou "*" en dev)
 *
 * Binding KV :
 *   SUBSCRIBERS : namespace KV (structure : subscriber:<id> → JSON, email:<email> → id)
 */

import {
  isPackSession,
  buildOrderRecord,
  orderConfirmationHtml,
  orderConfirmationText,
  orderAdminHtml,
  ordersToCsv,
  csvField,
} from './order.js';
import {
  adminAuthorized, adminSessionRedirect, validAdminSecret, timingSafeEqual,
  secureResponse, readLimitedText, hash,
} from './security.js';

const PDF_URL = 'https://www.cours-echecs-paris.fr/fichiers/guide-volume-1-7f3a9c.pdf';
const FROM_ADDRESS = 'Nicolas Musicki <contact@cours-echecs-paris.fr>';
const REPLY_TO = 'nicolas.musicki@gmail.com';
const ADMIN_EMAIL = 'nicolas.musicki@gmail.com';

export default {
  async fetch(request, env) {
    return secureResponse(await routeRequest(request, env));
  },
};

async function routeRequest(request, env) {
    // Réponse CORS préliminaire
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Les anciens favoris restent utilisables, mais le secret ne figure plus
      // dans les liens de navigation ni dans les réponses contenant des données.
      const adminPaths = ['/admin', '/subscribers', '/subscribers/export.csv', '/orders', '/orders/export.csv'];
      if (request.method === 'GET' && adminPaths.includes(path) && url.searchParams.has('token')) {
        if (!validAdminSecret(env.ADMIN_TOKEN) || !timingSafeEqual(url.searchParams.get('token'), env.ADMIN_TOKEN)) {
          return jsonResponse({ error: 'Non autorisé' }, 401, env);
        }
        return await adminSessionRedirect(path, env);
      }
      if (path === '/admin' && request.method === 'POST') {
        const origin = request.headers.get('Origin');
        if (origin && origin !== url.origin) return new Response('Non autorisé', { status: 403 });
        if (env.SUBSCRIBE_IP_LIMITER && !(await env.SUBSCRIBE_IP_LIMITER.limit({ key: `admin:${request.headers.get('CF-Connecting-IP') || 'unknown'}` })).success) {
          return new Response('Réessayez dans une minute', { status: 429, headers: { 'Retry-After': '60' } });
        }
        const form = new URLSearchParams(await readLimitedText(request, 4096));
        if (!validAdminSecret(env.ADMIN_TOKEN) || !timingSafeEqual(form.get('token'), env.ADMIN_TOKEN)) {
          return new Response('Non autorisé', { status: 401 });
        }
        return await adminSessionRedirect('/admin', env);
      }
      if (path === '/subscribe' && request.method === 'POST') {
        return await handleSubscribe(request, env);
      }
      if (path === '/stripe-webhook' && request.method === 'POST') {
        return await handleStripeWebhook(request, env);
      }
      if (path === '/subscribers' && request.method === 'GET') {
        return await handleListSubscribers(request, env);
      }
      if (path === '/subscribers/export.csv' && request.method === 'GET') {
        return await handleExportCsv(request, env);
      }
      if (path === '/orders' && request.method === 'GET') {
        return await handleListOrders(request, env);
      }
      if (path === '/orders/export.csv' && request.method === 'GET') {
        return await handleExportOrdersCsv(request, env);
      }
      if (path === '/admin' && request.method === 'GET') {
        return await handleAdminPage(request, env);
      }
      if (path === '/' && request.method === 'GET') {
        return new Response('Chess Lead Magnet API — OK', {
          headers: { 'Content-Type': 'text/plain' },
        });
      }
      return new Response('Not found', { status: 404 });
    } catch (err) {
      console.error('Request failed:', err.status || 500);
      return jsonResponse({ error: err.status === 413 ? 'Requête trop volumineuse' : 'Erreur serveur' }, err.status === 413 ? 413 : 500, env);
    }
}

// ============================================================
// ENDPOINT : /subscribe (POST)
// ============================================================
async function handleSubscribe(request, env) {
  const raw = await readLimitedText(request, 4096);
  let body;
  try { body = JSON.parse(raw); } catch { body = {}; }
  if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};
  const email = normalizeEmail(body.email);
  const why = (body.why || 'guide_gratuit').toString().trim().slice(0, 100);

  if (!isValidEmail(email)) {
    return jsonResponse({ error: 'Email invalide' }, 400, env);
  }

  // Protection Cloudflare par IP et adresse ; les compteurs sont locaux au
  // point de présence. Le délai KV complète cette limite (sans atomicité globale).
  if (!env.SUBSCRIBE_IP_LIMITER || !env.SUBSCRIBE_EMAIL_LIMITER) {
    return jsonResponse({ error: 'Le formulaire est temporairement indisponible. Réessayez plus tard.' }, 503, env);
  }
  const emailHash = await hash(email);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipAllowed = await env.SUBSCRIBE_IP_LIMITER.limit({ key: `subscribe:${ip}` });
  const emailAllowed = ipAllowed.success && (await env.SUBSCRIBE_EMAIL_LIMITER.limit({ key: emailHash })).success;
  const cooldownKey = `guide-cooldown:${emailHash}`;
  if (!emailAllowed || await env.SUBSCRIBERS.get(cooldownKey)) {
    const response = jsonResponse({ error: 'Veuillez patienter quelques minutes avant de redemander le guide. Vérifiez aussi vos courriers indésirables.' }, 429, env);
    response.headers.set('Retry-After', '600');
    return response;
  }
  await env.SUBSCRIBERS.put(cooldownKey, '1', { expirationTtl: 600 });

  // Une nouvelle demande reste possible après le délai de dix minutes.
  const existing = await env.SUBSCRIBERS.get(`email:${email}`);
  const isNew = !existing;
  const totalCount = null;

  if (isNew) {
    const id = crypto.randomUUID();
    const date = new Date().toISOString();
    const record = { id, email, date, why };

    await env.SUBSCRIBERS.put(`subscriber:${id}`, JSON.stringify(record));
    await env.SUBSCRIBERS.put(`email:${email}`, id);

  }

  // Envoi de l'email avec le PDF
  const emailResult = await sendGuideEmail(email, env);

  // Notification admin à CHAQUE téléchargement (nouveau ou re-téléchargement) — non bloquant
  try {
    await sendAdminNotification({ email, why, totalCount, isNew }, env);
  } catch (err) {
    console.error('Admin notification failed:', err);
  }
  if (!emailResult.ok) {
    return jsonResponse(
      { error: 'Inscription enregistrée mais l\'envoi de l\'email a échoué. Nicolas te contactera.' },
      500,
      env
    );
  }

  return jsonResponse(
    {
      success: true,
      message: 'Parfait ! Votre guide arrive dans votre boîte mail. Si vous ne le voyez pas d\'ici 2 minutes, regardez dans les spams et dans l\'onglet Promotions de Gmail.',
    },
    200,
    env
  );
}

// ============================================================
// ENDPOINT : /stripe-webhook (POST) — paiement réussi → envoi du guide
// ============================================================
async function handleStripeWebhook(request, env) {
  const signature = request.headers.get('Stripe-Signature') || '';
  const rawBody = await readLimitedText(request, 262144);

  const valid = await verifyStripeSignature(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    return new Response('Invalid signature', { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid payload', { status: 400 });
  }

  if (!event || typeof event !== 'object') return new Response('Invalid payload', { status: 400 });

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data?.object || {};
    if (typeof session.id !== 'string' || !session.id) return new Response('Invalid session', { status: 400 });
    if (session.payment_status !== 'paid') return jsonResponse({ received: true }, 200, env);

    // AIGUILLAGE PRODUIT — à ne jamais déplacer plus bas.
    // Le pack de livres reliés a son propre traitement et ne doit surtout pas
    // déclencher l'envoi du guide PDF gratuit (deux produits distincts).
    if (isPackSession(session)) {
      await handlePackOrder(session, env);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const email = normalizeEmail(session.customer_details?.email || session.customer_email);

    if (isValidEmail(email)) {
      // Enregistrer l'acheteur (best-effort, ne bloque pas l'envoi)
      try {
        const existing = await env.SUBSCRIBERS.get(`email:${email}`);
        if (!existing) {
          const id = crypto.randomUUID();
          const record = { id, email, date: new Date().toISOString(), why: 'achat_stripe' };
          await env.SUBSCRIBERS.put(`subscriber:${id}`, JSON.stringify(record));
          await env.SUBSCRIBERS.put(`email:${email}`, id);
        }
      } catch (err) {
        console.error('KV store failed:', err);
      }

      // Ne relancer que les notifications qui n'ont pas encore réussi.
      await deliverNotifications([
        [`payment:${session.id}:guide`, key => sendGuideEmail(email, env, key)],
        [`payment:${session.id}:admin`, key => sendAdminNotification({ email, why: 'achat_stripe', totalCount: null, sentAt: Number(session.created || 0) * 1000 }, env, key)],
      ], env);
    }
  }

  // Acquitter après traitement ; les échecs remontent en 500 pour permettre la relance.
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ============================================================
// Traitement d'une commande du pack de livres reliés
// ============================================================
async function handlePackOrder(session, env) {
  // On ne traite que les paiements effectivement encaissés.
  if (session.payment_status !== 'paid') {
    console.log('Pack order ignored, payment_status =', session.payment_status);
    return;
  }

  const key = `order:${session.id}`;

  const existing = await env.SUBSCRIBERS.get(key);
  let order;
  if (existing) {
    order = JSON.parse(existing);
    // Les anciennes commandes ne sont ni modifiées ni renotifiées à la migration.
    if (!order.notificationTracking) return;
  } else {
    order = { ...buildOrderRecord(session, new Date(Number(session.created || 0) * 1000).toISOString()), notificationTracking: true };
    await env.SUBSCRIBERS.put(key, JSON.stringify(order));
  }

  const notifications = [
    [`payment:${session.id}:order-admin`, id => sendOrderAdminNotification(order, env, id)],
  ];
  if (isValidEmail(order.email)) {
    notifications.unshift([`payment:${session.id}:order-client`, id => sendOrderConfirmationEmail(order, env, id)]);
  }
  await deliverNotifications(notifications, env);
}

async function deliverNotifications(notifications, env) {
  let failed = false;
  for (const [key, send] of notifications) {
    try {
      if (await env.SUBSCRIBERS.get(`delivered:${key}`)) continue;
      const result = await send(key);
      if (!result.ok) throw new Error('Email provider refused delivery');
      await env.SUBSCRIBERS.put(`delivered:${key}`, '1');
    } catch {
      failed = true;
      console.error('Payment notification failed; retry required');
    }
  }
  if (failed) throw new Error('Payment notifications incomplete');
}

// ============================================================
// Emails de commande
// ============================================================
async function sendOrderConfirmationEmail(order, env, idempotencyKey) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [order.email],
      reply_to: REPLY_TO,
      subject: 'Ta commande est confirmée — Apprendre les Échecs, Volumes I & II',
      html: orderConfirmationHtml(order),
      text: orderConfirmationText(order),
    }),
  });
  return { ok: response.ok, status: response.status };
}

async function sendOrderAdminNotification(order, env, idempotencyKey) {
  const montant = ((Number(order.amount_total) || 0) / 100).toFixed(2).replace('.', ',');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [ADMIN_EMAIL],
      reply_to: order.email || REPLY_TO,
      subject: `🎉 Nouvelle commande — ${montant} € — ${order.name || order.email}`,
      html: orderAdminHtml(order),
    }),
  });
  return { ok: response.ok, status: response.status };
}

// Vérifie la signature d'un webhook Stripe (HMAC-SHA256 via Web Crypto)
async function verifyStripeSignature(payload, sigHeader, secret) {
  if (!secret || !sigHeader) return false;

  let timestamp = null;
  const signatures = [];
  for (const part of sigHeader.split(',')) {
    const [key, value] = part.split('=');
    if (key === 't') timestamp = value;
    if (key === 'v1') signatures.push(value);
  }
  if (!timestamp || signatures.length === 0) return false;

  // Stripe génère un nouvel horodatage et une nouvelle signature à chaque relance.
  if (!/^\d+$/.test(timestamp) || !Number.isSafeInteger(Number(timestamp)) ||
      Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 300) return false;
  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const expected = [...new Uint8Array(sigBuffer)].map((b) => b.toString(16).padStart(2, '0')).join('');

  return signatures.some((sig) => timingSafeEqual(sig, expected));
}


// ============================================================
// ENDPOINT : /subscribers (GET, admin)
// ============================================================
async function handleListSubscribers(request, env) {
  if (!await adminAuthorized(request, env)) {
    return jsonResponse({ error: 'Non autorisé' }, 401, env);
  }

  const subscribers = await fetchAllSubscribers(env);
  subscribers.sort((a, b) => b.date.localeCompare(a.date));

  return jsonResponse({ count: subscribers.length, subscribers }, 200, env);
}

// ============================================================
// ENDPOINT : /subscribers/export.csv (GET, admin)
// ============================================================
async function handleExportCsv(request, env) {
  if (!await adminAuthorized(request, env)) {
    return new Response('Non autorisé', { status: 401 });
  }

  const subscribers = await fetchAllSubscribers(env);
  subscribers.sort((a, b) => b.date.localeCompare(a.date));

  let csv = 'id,date,email,why\n';
  for (const s of subscribers) {
    csv += [s.id, s.date, s.email, s.why].map(csvField).join(',') + '\n';
  }

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="subscribers.csv"',
    },
  });
}

// ============================================================
// ENDPOINTS : /orders et /orders/export.csv (GET, admin)
// ============================================================
async function fetchAllOrders(env) {
  const orders = [];
  let cursor;
  do {
    const list = await env.SUBSCRIBERS.list({ prefix: 'order:', cursor });
    for (const key of list.keys) {
      const raw = await env.SUBSCRIBERS.get(key.name);
      if (!raw) continue;
      try {
        orders.push(JSON.parse(raw));
      } catch {
        console.error('Order JSON invalide:', key.name);
      }
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);

  orders.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return orders;
}

async function handleListOrders(request, env) {
  if (!await adminAuthorized(request, env)) {
    return jsonResponse({ error: 'Non autorisé' }, 401, env);
  }
  const orders = await fetchAllOrders(env);
  return jsonResponse({ count: orders.length, orders }, 200, env);
}

async function handleExportOrdersCsv(request, env) {
  if (!await adminAuthorized(request, env)) {
    return new Response('Non autorisé', { status: 401 });
  }
  const orders = await fetchAllOrders(env);
  return new Response(ordersToCsv(orders), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="commandes.csv"',
    },
  });
}

// ============================================================
// ENDPOINT : /admin (GET, connexion puis page HTML lisible sur mobile)
// ============================================================
async function handleAdminPage(request, env) {
  if (!await adminAuthorized(request, env)) {
    return new Response('<!DOCTYPE html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connexion administrateur</title><body style="font-family:sans-serif;padding:40px;text-align:center;"><h1>Connexion administrateur</h1><p>Connecte-toi pour consulter les inscriptions.</p><form method="post" action="/admin"><label for="token">Clé administrateur</label><br><input id="token" name="token" type="password" required autocomplete="current-password" style="margin:16px;padding:12px"><br><button type="submit">Se connecter</button></form></body></html>', {
      status: 401,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const subscribers = await fetchAllSubscribers(env);
  subscribers.sort((a, b) => b.date.localeCompare(a.date));

  const rows = subscribers.map((s, i) => {
    const dateFr = new Date(s.date).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
    return `<tr>
      <td style="padding:10px 8px;color:#888;font-variant-numeric:tabular-nums;">${subscribers.length - i}</td>
      <td style="padding:10px 8px;"><a href="mailto:${escapeHtml(s.email)}" style="color:#3E2C1C;text-decoration:none;">${escapeHtml(s.email)}</a></td>
      <td style="padding:10px 8px;color:#666;font-variant-numeric:tabular-nums;white-space:nowrap;">${escapeHtml(dateFr)}</td>
      <td style="padding:10px 8px;color:#888;font-size:12px;">${escapeHtml(s.why || '')}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Inscrits Guide Volume 1</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; margin:0; background:#faf6ef; color:#3E2C1C; }
  .wrap { max-width:900px; margin:0 auto; padding:24px 16px 60px; }
  h1 { margin:0 0 4px; font-size:24px; }
  .sub { color:#888; margin:0 0 20px; font-size:14px; }
  .count { display:inline-block; background:#3E2C1C; color:#fff; padding:4px 12px; border-radius:20px; font-weight:600; font-size:14px; margin-right:8px; }
  .actions { margin:16px 0 20px; }
  .btn { display:inline-block; background:#fff; color:#3E2C1C; border:1px solid #ddd; padding:8px 14px; border-radius:6px; text-decoration:none; font-size:14px; margin-right:8px; }
  .btn:hover { background:#f5ebd5; }
  table { width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.06); }
  th { text-align:left; padding:12px 8px; background:#f5ebd5; font-size:12px; text-transform:uppercase; letter-spacing:1px; color:#3E2C1C; }
  tr:not(:last-child) td { border-bottom:1px solid #f0e8d8; }
  .empty { text-align:center; padding:40px; color:#888; }
  @media (max-width:600px) {
    th:nth-child(4), td:nth-child(4) { display:none; }
    body { font-size:14px; }
  }
</style>
</head>
<body>
  <div class="wrap">
    <h1>📩 Inscrits — Guide Volume 1</h1>
    <p class="sub"><span class="count">${subscribers.length}</span> inscrits au total</p>

    <div class="actions">
      <a href="/subscribers/export.csv" class="btn">⬇️ Télécharger CSV</a>
      <a href="/admin" class="btn">🔄 Rafraîchir</a>
    </div>

    ${subscribers.length === 0
      ? '<div class="empty">Aucun inscrit pour le moment.</div>'
      : `<table>
          <thead><tr><th>#</th><th>Email</th><th>Date</th><th>Source</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`
    }
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// ============================================================
// Utilitaires
// ============================================================

async function fetchAllSubscribers(env) {
  const subscribers = [];
  let cursor = undefined;
  do {
    const list = await env.SUBSCRIBERS.list({ prefix: 'subscriber:', cursor });
    for (const key of list.keys) {
      const raw = await env.SUBSCRIBERS.get(key.name);
      if (raw) {
        try {
          subscribers.push(JSON.parse(raw));
        } catch {}
      }
    }
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);
  return subscribers;
}


function normalizeEmail(input) {
  return (input || '').toString().trim().toLowerCase();
}

function isValidEmail(email) {
  return email.length <= 254 && /^[^\s@<>"\u0000-\u001f]+@[^\s@<>"\u0000-\u001f]+\.[^\s@<>"\u0000-\u001f]{2,}$/.test(email);
}

function corsHeaders(env) {
  const origin = env.ALLOWED_ORIGIN || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function jsonResponse(data, status, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  });
}

// ============================================================
// Envoi d'email via Resend
// ============================================================
async function sendGuideEmail(to, env, idempotencyKey) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [to],
      reply_to: REPLY_TO,
      subject: 'Votre guide des échecs est prêt',
      html: guideEmailHtml(),
      text: guideEmailText(),
    }),
  });

  return { ok: response.ok, status: response.status };
}

// ============================================================
// Notification admin (Nicolas) à chaque nouvelle inscription
// ============================================================
async function sendAdminNotification({ email, why, totalCount, isNew = true, sentAt = Date.now() }, env, idempotencyKey) {
  const date = new Date(sentAt).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  const total = totalCount != null ? `<p style="margin:6px 0;"><strong>Total inscrits :</strong> ${totalCount}</p>` : '';
  const titre = isNew ? '📩 Nouveau téléchargement du guide' : '🔁 Guide re-téléchargé (email déjà inscrit)';

  const html = `<!DOCTYPE html><html lang="fr"><body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color:#222;">
    <div style="max-width:520px; margin:20px auto; padding:20px; border:1px solid #e5e5e5; border-radius:8px;">
      <h2 style="margin:0 0 12px; color:#3E2C1C;">${titre}</h2>
      <p style="margin:6px 0;"><strong>Email :</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
      <p style="margin:6px 0;"><strong>Source :</strong> ${escapeHtml(why)}</p>
      <p style="margin:6px 0;"><strong>Date :</strong> ${escapeHtml(date)} (Paris)</p>
      ${total}
    </div>
  </body></html>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [ADMIN_EMAIL],
      reply_to: email,
      subject: isNew ? `📩 Nouveau inscrit guide : ${email}` : `🔁 Guide re-téléchargé : ${email}`,
      html,
    }),
  });

  return { ok: response.ok, status: response.status };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Version texte brut (améliore la délivrabilité)
function guideEmailText() {
  return `Bonjour,

Merci pour votre inscription ! Comme promis, voici votre guide des échecs (PDF, 96 pages) :

${PDF_URL}

Quelques conseils pour bien en profiter :
- Lis dans l'ordre, chaque chapitre s'appuie sur le précédent.
- Prenez votre temps : un chapitre par jour constitue déjà un bon rythme.
- Fais les exercices, les solutions sont en annexe.

À très vite,
Nicolas Musicki
Professeur d'échecs — cours-echecs-paris.fr

P.S. Si vous souhaitez progresser avec un accompagnement, mon premier cours est offert, à domicile (Paris/Versailles) ou en visio : https://www.cours-echecs-paris.fr/#contact`;
}

// ============================================================
// Template HTML de l'email
// ============================================================
function guideEmailHtml() {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Votre guide est prêt</title>
</head>
<body style="margin:0; padding:0; background-color:#faf6ef; font-family: Georgia, 'Times New Roman', serif;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#faf6ef; padding:40px 20px;">
  <tr>
    <td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px; background-color:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 20px rgba(62,44,28,0.1);">
        <tr>
          <td style="background:linear-gradient(135deg,#F0D9B5 0%,#B58863 100%); padding:36px 40px; text-align:center;">
            <div style="font-family:Georgia,serif; font-size:12px; text-transform:uppercase; letter-spacing:3px; color:#3E2C1C; opacity:0.85; margin-bottom:6px;">Collection « Apprendre les Échecs »</div>
            <div style="font-family:Georgia,serif; font-size:26px; font-weight:700; color:#3E2C1C; line-height:1.2;">Votre guide est prêt</div>
            <div style="font-family:Georgia,serif; font-style:italic; font-size:14px; color:#3E2C1C; opacity:0.8; margin-top:8px;">Volume 1 — 96 pages illustrées</div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 20px; color:#3a3a3a; font-size:16px; line-height:1.65;">
            <p style="margin:0 0 20px; font-size:17px;">Bonjour,</p>
            <p style="margin:0 0 20px;">Merci pour votre inscription ! Comme promis, voici votre guide à télécharger — <strong>c'est cadeau</strong> :</p>
            <p style="margin:0 0 20px; text-align:center;">
              <a href="${PDF_URL}" target="_blank" style="display:inline-block; background:#3E2C1C; color:#F0D9B5; text-decoration:none; padding:16px 40px; border-radius:8px; font-family:Georgia,serif; font-size:16px; font-weight:700; letter-spacing:1px;">📕 Télécharger mon guide (PDF)</a>
            </p>
            <p style="margin:0 0 30px; font-size:13px; color:#8B5A2B; text-align:center;">
              ou copie-colle ce lien :<br>
              <a href="${PDF_URL}" style="color:#8B5A2B; word-break:break-all;">${PDF_URL}</a>
            </p>
            <div style="margin:30px 0; padding:22px 24px; background:#faf6ef; border-left:4px solid #8B5A2B; border-radius:6px;">
              <p style="margin:0 0 10px; font-weight:700; color:#3E2C1C; font-size:15px;">Quelques conseils pour bien en profiter :</p>
              <p style="margin:0 0 8px; font-size:14.5px;">📖 <strong>Lis dans l'ordre.</strong> Chaque chapitre s'appuie sur le précédent.</p>
              <p style="margin:0 0 8px; font-size:14.5px;">⏱️ <strong>Prenez votre temps</strong> — un chapitre par jour constitue déjà un bon rythme.</p>
              <p style="margin:0; font-size:14.5px;">✍️ <strong>Fais les exercices</strong>, ne les saute pas. Les solutions sont en annexe.</p>
            </div>
            <p style="margin:0 0 8px;">À très vite,</p>
            <p style="margin:0 0 4px; font-weight:700; color:#3E2C1C;">Nicolas Musicki</p>
            <p style="margin:0 0 25px; font-size:13px; color:#8B5A2B;">Professeur et entraîneur d'échecs — 2086 Elo FIDE</p>
            <p style="margin:28px 0 0; padding-top:20px; border-top:1px solid #e8e0cc; font-size:14px; color:#5a5a5a; font-style:italic;">
              <strong style="color:#3E2C1C; font-style:normal;">P.S.</strong> Si vous souhaitez progresser avec un accompagnement, <a href="https://www.cours-echecs-paris.fr/#contact" style="color:#8B5A2B;">mon 1er cours est offert</a>, à domicile ou en visio.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#3E2C1C; padding:22px 40px; text-align:center; color:#F0D9B5; font-size:12px; letter-spacing:0.5px;">
            <a href="https://www.cours-echecs-paris.fr" style="color:#F0D9B5; text-decoration:none;">cours-echecs-paris.fr</a>
            &nbsp;·&nbsp;
            <a href="https://www.instagram.com/magickchess/" style="color:#F0D9B5; text-decoration:none;">Instagram @magickchess</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
