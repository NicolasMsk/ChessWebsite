import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { loadConfig, APP_ROOT, cached, refresh } from './data.mjs';

const config = await loadConfig();
if (process.argv.includes('--refresh')) {
  const data = await refresh(config, process.argv.includes('--google') ? 'google' : 'all', message => console.log(message));
  console.log(`Données actualisées : ${data.pages.length} pages, ${data.warnings.length} avertissement(s).`);
  for (const warning of data.warnings) console.log(warning);
} else {
  const csrf = randomBytes(24).toString('hex');
  const jobs = new Map();
  const allowedHosts = new Set([`127.0.0.1:${config.port}`, `localhost:${config.port}`]);
  const allowedOrigins = new Set([...allowedHosts].map(h => 'http://' + h));
  function startRefresh(channel) {
    if (jobs.get(channel)?.running) return;
    const job = { running: true, progress: 'Connexion aux API Google…', error: null };
    jobs.set(channel, job);
    refresh(config, channel, message => { job.progress = message; }).catch(error => { job.error = error.message; }).finally(() => { job.running = false; });
  }
  function send(response, status, body, contentType = 'application/json; charset=utf-8') {
    response.writeHead(status, {
      'Content-Type': contentType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    });
    response.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  }
  const server = http.createServer(async (request, response) => {
    try {
      if (!allowedHosts.has(request.headers.host) || (request.headers.origin && !allowedOrigins.has(request.headers.origin))) return send(response, 403, { error: 'Accès local uniquement.' });
      const url = new URL(request.url, `http://127.0.0.1:${config.port}`);
      const channel = url.searchParams.get('channel') || 'all';
      if (!['all', 'google'].includes(channel)) return send(response, 400, { error: 'Canal invalide.' });
      if (url.pathname === '/api/data' && request.method === 'GET') {
        const data = await cached(channel);
        if (!data && !jobs.has(channel)) startRefresh(channel);
        return send(response, 200, { data, job: jobs.get(channel) || null, csrf });
      }
      if (url.pathname === '/api/refresh' && request.method === 'POST') {
        if (request.headers['x-dashboard-token'] !== csrf) return send(response, 403, { error: 'Actualisation non autorisée.' });
        startRefresh(channel);
        return send(response, 202, { accepted: true });
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') return send(response, 405, { error: 'Méthode non autorisée.' });
      const files = { '/': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'] };
      const file = files[url.pathname];
      if (!file) return send(response, 404, { error: 'Introuvable.' });
      const content = await fs.readFile(path.join(APP_ROOT, 'public', file[0]));
      return send(response, 200, request.method === 'HEAD' ? '' : content, file[1]);
    } catch (error) {
      console.error('Dashboard request failed:', error.code || error.name);
      send(response, 500, { error: 'Erreur locale. Consulter le terminal ou relancer le tableau de bord.' });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.listen(config.port, '127.0.0.1', () => console.log(`Tableau de bord local : http://127.0.0.1:${config.port}`));
  server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Le port ${config.port} est déjà utilisé. Le tableau de bord est peut-être déjà lancé.` : error.message); process.exitCode = 1; });
}
