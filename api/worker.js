/**
 * API maison pour le lead magnet "Guide Volume 1"
 * Cloudflare Worker + KV (base de données) + Resend (envoi email)
 *
 * Endpoints :
 *   POST /subscribe              → inscription + envoi PDF
 *   GET  /subscribers            → liste des inscrits (auth Bearer)
 *   GET  /subscribers/export.csv → export CSV (auth Bearer)
 *
 * Variables d'environnement (à configurer via Wrangler) :
 *   RESEND_API_KEY  (secret) : clé API Resend
 *   ADMIN_TOKEN     (secret) : token pour accéder aux endpoints admin
 *   ALLOWED_ORIGIN  (var)    : "https://www.cours-echecs-paris.fr" (ou "*" en dev)
 *
 * Binding KV :
 *   SUBSCRIBERS : namespace KV (structure : subscriber:<id> → JSON, email:<email> → id)
 */

const PDF_URL = 'https://www.cours-echecs-paris.fr/fichiers/guide-volume-1.pdf';
const FROM_ADDRESS = 'Nicolas Musicki <contact@cours-echecs-paris.fr>';
const REPLY_TO = 'nicolas.musicki@gmail.com';
const ADMIN_EMAIL = 'nicolas.musicki@gmail.com';

export default {
  async fetch(request, env) {
    // Réponse CORS préliminaire
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/subscribe' && request.method === 'POST') {
        return await handleSubscribe(request, env);
      }
      if (path === '/subscribers' && request.method === 'GET') {
        return await handleListSubscribers(request, env);
      }
      if (path === '/subscribers/export.csv' && request.method === 'GET') {
        return await handleExportCsv(request, env);
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
      console.error('Error:', err);
      return jsonResponse({ error: 'Erreur serveur' }, 500, env);
    }
  },
};

// ============================================================
// ENDPOINT : /subscribe (POST)
// ============================================================
async function handleSubscribe(request, env) {
  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const why = (body.why || 'guide_gratuit').toString().trim().slice(0, 100);

  if (!isValidEmail(email)) {
    return jsonResponse({ error: 'Email invalide' }, 400, env);
  }

  // Vérifier les doublons (soft-succeed : renvoyer quand même le PDF)
  const existing = await env.SUBSCRIBERS.get(`email:${email}`);
  const isNew = !existing;
  let totalCount = null;

  if (isNew) {
    const id = crypto.randomUUID();
    const date = new Date().toISOString();
    const record = { id, email, date, why };

    await env.SUBSCRIBERS.put(`subscriber:${id}`, JSON.stringify(record));
    await env.SUBSCRIBERS.put(`email:${email}`, id);

    try {
      const all = await fetchAllSubscribers(env);
      totalCount = all.length;
    } catch {}
  }

  // Envoi de l'email avec le PDF
  const emailResult = await sendGuideEmail(email, env);

  // Notification admin (nouveau inscrit uniquement) — non bloquant
  if (isNew) {
    try {
      await sendAdminNotification({ email, why, totalCount }, env);
    } catch (err) {
      console.error('Admin notification failed:', err);
    }
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
      message: 'Parfait ! Ton guide arrive dans ta boîte mail (vérifie tes spams si tu ne le vois pas).',
    },
    200,
    env
  );
}

// ============================================================
// ENDPOINT : /subscribers (GET, admin)
// ============================================================
async function handleListSubscribers(request, env) {
  if (!isAdminAuthorized(request, env)) {
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
  if (!isAdminAuthorized(request, env)) {
    return new Response('Non autorisé', { status: 401 });
  }

  const subscribers = await fetchAllSubscribers(env);
  subscribers.sort((a, b) => b.date.localeCompare(a.date));

  let csv = 'id,date,email,why\n';
  for (const s of subscribers) {
    csv += `"${s.id}","${s.date}","${s.email}","${s.why}"\n`;
  }

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="subscribers.csv"',
    },
  });
}

// ============================================================
// ENDPOINT : /admin?token=... (GET, page HTML lisible sur mobile)
// ============================================================
async function handleAdminPage(request, env) {
  if (!isAdminAuthorized(request, env)) {
    return new Response('<!DOCTYPE html><meta charset="utf-8"><body style="font-family:sans-serif;padding:40px;text-align:center;"><h1>⛔️ Non autorisé</h1><p>Token manquant ou invalide. Utilise <code>?token=...</code> dans l\'URL.</p></body>', {
      status: 401,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const subscribers = await fetchAllSubscribers(env);
  subscribers.sort((a, b) => b.date.localeCompare(a.date));

  const token = encodeURIComponent(env.ADMIN_TOKEN);
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
      <a href="/subscribers/export.csv?token=${token}" class="btn">⬇️ Télécharger CSV</a>
      <a href="/admin?token=${token}" class="btn">🔄 Rafraîchir</a>
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

function isAdminAuthorized(request, env) {
  const auth = request.headers.get('Authorization') || '';
  if (auth === `Bearer ${env.ADMIN_TOKEN}`) return true;
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  return token && token === env.ADMIN_TOKEN;
}

function normalizeEmail(input) {
  return (input || '').toString().trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
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
async function sendGuideEmail(to, env) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [to],
      reply_to: REPLY_TO,
      subject: '🎁 Ton guide des échecs est prêt !',
      html: guideEmailHtml(),
    }),
  });

  return { ok: response.ok, status: response.status };
}

// ============================================================
// Notification admin (Nicolas) à chaque nouvelle inscription
// ============================================================
async function sendAdminNotification({ email, why, totalCount }, env) {
  const date = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  const total = totalCount != null ? `<p style="margin:6px 0;"><strong>Total inscrits :</strong> ${totalCount}</p>` : '';

  const html = `<!DOCTYPE html><html lang="fr"><body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color:#222;">
    <div style="max-width:520px; margin:20px auto; padding:20px; border:1px solid #e5e5e5; border-radius:8px;">
      <h2 style="margin:0 0 12px; color:#3E2C1C;">📩 Nouveau téléchargement du guide</h2>
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
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [ADMIN_EMAIL],
      reply_to: email,
      subject: `📩 Nouveau inscrit guide : ${email}`,
      html,
    }),
  });

  return { ok: response.ok, status: response.status };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
<title>Ton guide est prêt</title>
</head>
<body style="margin:0; padding:0; background-color:#faf6ef; font-family: Georgia, 'Times New Roman', serif;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#faf6ef; padding:40px 20px;">
  <tr>
    <td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px; background-color:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 20px rgba(62,44,28,0.1);">
        <tr>
          <td style="background:linear-gradient(135deg,#F0D9B5 0%,#B58863 100%); padding:36px 40px; text-align:center;">
            <div style="font-family:Georgia,serif; font-size:12px; text-transform:uppercase; letter-spacing:3px; color:#3E2C1C; opacity:0.85; margin-bottom:6px;">Collection « Apprendre les Échecs »</div>
            <div style="font-family:Georgia,serif; font-size:26px; font-weight:700; color:#3E2C1C; line-height:1.2;">Ton guide est prêt ! 🎁</div>
            <div style="font-family:Georgia,serif; font-style:italic; font-size:14px; color:#3E2C1C; opacity:0.8; margin-top:8px;">Volume 1 — 90 pages illustrées</div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 20px; color:#3a3a3a; font-size:16px; line-height:1.65;">
            <p style="margin:0 0 20px; font-size:17px;">Bonjour,</p>
            <p style="margin:0 0 20px;">Merci pour ton inscription ! Comme promis, voici ton guide à télécharger — <strong>c'est cadeau</strong> :</p>
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
              <p style="margin:0 0 8px; font-size:14.5px;">⏱️ <strong>Prends ton temps</strong> — 1 chapitre par jour, c'est parfait.</p>
              <p style="margin:0; font-size:14.5px;">✍️ <strong>Fais les exercices</strong>, ne les saute pas. Les solutions sont en annexe.</p>
            </div>
            <p style="margin:0 0 8px;">À très vite,</p>
            <p style="margin:0 0 4px; font-weight:700; color:#3E2C1C;">Nicolas Musicki</p>
            <p style="margin:0 0 25px; font-size:13px; color:#8B5A2B;">Professeur et entraîneur d'échecs — 2092 Elo FIDE</p>
            <p style="margin:28px 0 0; padding-top:20px; border-top:1px solid #e8e0cc; font-size:14px; color:#5a5a5a; font-style:italic;">
              <strong style="color:#3E2C1C; font-style:normal;">P.S.</strong> Si tu veux aller plus vite qu'en autodidacte, <a href="https://www.cours-echecs-paris.fr/#contact" style="color:#8B5A2B;">mon 1er cours est offert</a>, à domicile ou en visio.
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
