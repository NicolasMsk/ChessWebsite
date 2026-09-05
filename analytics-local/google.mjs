import fs from 'node:fs/promises';
import { createSign } from 'node:crypto';
let tokenCache;
let tokenPromise;
export async function accessToken(credentialsFile) {
  if (tokenCache && tokenCache.file === credentialsFile && tokenCache.expires > Date.now() + 60000) return tokenCache.token;
  if (tokenPromise) return tokenPromise;
  tokenPromise = (async () => {
    const key = JSON.parse((await fs.readFile(credentialsFile, 'utf8')).replace(/^\uFEFF/, ''));
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const data = encode({ alg: 'RS256', typ: 'JWT' }) + '.' + encode({ iss: key.client_email, scope: 'https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/analytics.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
    const signature = createSign('RSA-SHA256').update(data).sign(key.private_key, 'base64url');
    const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: data + '.' + signature }), signal: AbortSignal.timeout(25000) });
    if (!response.ok) throw new Error(`Authentification Google refusée (${response.status}). Vérifier le compte de service et sa clé.`);
    const body = await response.json();
    tokenCache = { file: credentialsFile, token: body.access_token, expires: Date.now() + body.expires_in * 1000 };
    return body.access_token;
  })();
  try { return await tokenPromise; } finally { tokenPromise = null; }
}

export async function google(config, url, body) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = await accessToken(config.credentialsFile);
    const response = await fetch(url, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(45000) });
    if (response.ok) return response.json();
    if (response.status === 401) tokenCache = null;
    if ((response.status === 429 || response.status >= 500 || response.status === 401) && attempt < 2) { await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); continue; }
    const error = await response.json().catch(() => ({}));
    // Réponse API seulement ; ni jeton, ni clé, ni contenu de la requête.
    const message = String(error.error?.message || 'Accès API refusé').slice(0, 400);
    throw new Error(`Google API ${response.status} : ${message}`);
  }
}

export async function gscQuery(config, range, dimensions = []) {
  const rows = []; let startRow = 0;
  while (true) {
    const response = await google(config, `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(config.siteUrl)}/searchAnalytics/query`, { startDate: range.start, endDate: range.end, dimensions, type: 'web', dataState: 'final', rowLimit: 25000, startRow });
    const batch = response.rows || []; rows.push(...batch);
    if (batch.length < 25000) break;
    startRow += batch.length;
    if (startRow >= 100000) throw new Error('Limite locale de pagination Search Console atteinte ; extraction incomplète.');
  }
  return rows;
}

export async function gaReport(config, range, dimensions, metrics, channel = 'all') {
  const expressions = [{ filter: { fieldName: 'hostName', inListFilter: { values: [new URL(config.siteUrl).hostname, new URL(config.siteUrl).hostname.replace(/^www\./, '')] } } }];
  if (channel === 'google') expressions.push({ filter: { fieldName: 'sessionSourceMedium', stringFilter: { matchType: 'EXACT', value: 'google / organic' } } });
  const rows = []; const metadata = []; let offset = 0;
  while (true) {
    const response = await google(config, `https://analyticsdata.googleapis.com/v1beta/properties/${config.ga4PropertyId}:runReport`, {
      dateRanges: [{ startDate: range.start, endDate: range.end }],
      dimensions: dimensions.map(name => ({ name })), metrics: metrics.map(name => ({ name })),
      dimensionFilter: { andGroup: { expressions } }, limit: '10000', offset: String(offset), keepEmptyRows: false,
    });
    if (response.metadata) metadata.push(response.metadata);
    const batch = response.rows || [];
    for (const row of batch) rows.push({ dimensions: (row.dimensionValues || []).map(d => d.value), ...Object.fromEntries(response.metricHeaders.map((header, index) => [header.name, Number(row.metricValues[index].value)])) });
    offset += batch.length;
    if (offset >= (response.rowCount || 0) || !batch.length) break;
    if (offset >= 100000) throw new Error('Limite locale de pagination GA4 atteinte ; extraction incomplète.');
  }
  return { rows, metadata };
}
