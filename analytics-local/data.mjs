import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { periods, iso, shift, normalizePage, mergePages } from './model.mjs';
import { gscQuery, gaReport } from './google.mjs';

export const APP_ROOT = path.dirname(fileURLToPath(import.meta.url));
export const SITE_ROOT = path.dirname(APP_ROOT);
export const CACHE_ROOT = path.join(APP_ROOT, '.cache');
const landingMetrics = ['sessions', 'totalUsers', 'engagedSessions', 'engagementRate', 'averageSessionDuration', 'keyEvents'];
const pageMetrics = ['screenPageViews', 'userEngagementDuration'];
export async function loadConfig() {
  let local = {};
  try { local = JSON.parse(await fs.readFile(path.join(APP_ROOT, 'config.local.json'), 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const config = { siteUrl: 'https://www.cours-echecs-paris.fr/', ga4PropertyId: '512332614', credentialsFile: '../chess_service_account.json', port: 4317, categoryOverrides: {}, ...local };
  if (!/^\d+$/.test(config.ga4PropertyId) || !Number.isInteger(config.port) || config.port < 1024 || config.port > 65535) throw new Error('Configuration locale invalide.');
  config.credentialsFile = path.resolve(APP_ROOT, config.credentialsFile);
  return config;
}
export async function inventory(config) {
  const sitemap = await fs.readFile(path.join(SITE_ROOT, 'sitemap.xml'), 'utf8');
  const listed = new Set([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => normalizePage(m[1], config.siteUrl)));
  const output = [];
  for (const folder of ['', 'blog', 'zones', 'edition-raffinee']) {
    for (const entry of await fs.readdir(path.join(SITE_ROOT, folder), { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
      const relative = [folder, entry.name].filter(Boolean).join('/');
      const pagePath = normalizePage('/' + relative, config.siteUrl);
      const content = await fs.readFile(path.join(SITE_ROOT, relative), 'utf8');
      const noindex = /<meta[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(content);
      // Les maquettes locales non publiées de livres ne sont pas inventoriées.
      if (folder === 'edition-raffinee' && !listed.has(pagePath)) continue;
      const title = (content.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || pagePath)
        .replace(/\s*[|—]\s*(?:Nicolas Musicki|Cours d['’]Échecs Paris).*$/i, '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').trim();
      output.push({ path: pagePath, title, inSitemap: listed.has(pagePath), noindex });
    }
  }
  return output;
}
const safe = async (fn, fallback) => { try { return await fn(); } catch (e) { return { ...fallback, error: e.message }; } };
async function report(config, range, channel) {
  const [gsc, ga] = await Promise.all([
    safe(async () => {
      const pages = await gscQuery(config, range, ['page']);
      const totals = await gscQuery(config, range);
      return { pages, totals: totals[0] || { clicks: 0, impressions: 0, ctr: 0, position: null } };
    }, {}),
    safe(async () => {
      const landing = await gaReport(config, range, ['landingPage'], landingMetrics, channel);
      const pages = await gaReport(config, range, ['pagePath'], pageMetrics, channel);
      const totals = await gaReport(config, range, [], [...landingMetrics, ...pageMetrics], channel);
      return { landing: landing.rows, pages: pages.rows, totals: totals.rows[0] || Object.fromEntries([...landingMetrics, ...pageMetrics].map(m => [m, 0])), metadata: [...landing.metadata, ...pages.metadata, ...totals.metadata] };
    }, {}),
  ]);
  return { gsc, ga };
}
export async function refresh(config, channel = 'all', onProgress = () => {}) {
  const end = shift(iso(new Date()), -3);
  const ranges = periods(end);
  const reports = {};
  const entries = Object.entries(ranges);
  // Deux périodes en parallèle, au plus quatre requêtes API simultanées.
  for (let i = 0; i < entries.length; i += 2) {
    await Promise.all(entries.slice(i, i + 2).map(async ([key, range]) => {
      reports[key] = await report(config, range, channel);
      onProgress(`Périodes chargées : ${Object.keys(reports).length}/${entries.length}`);
    }));
  }
  if (reports.range.gsc.error && reports.range.ga.error) throw new Error('Les deux API sont indisponibles. ' + reports.range.gsc.error + ' ' + reports.range.ga.error);
  onProgress('Assemblage des pages et des courbes…');
  const [gscDaily, gaDaily, pages] = await Promise.all([
    safe(async () => ({ rows: await gscQuery(config, ranges.range, ['date']) }), { rows: [] }),
    safe(() => gaReport(config, ranges.range, ['date'], ['sessions', 'screenPageViews', 'keyEvents'], channel), { rows: [] }),
    inventory(config),
  ]);
  const warnings = [];
  for (const [key, value] of Object.entries(reports)) {
    for (const source of ['gsc', 'ga']) if (value[source].error) warnings.push(`${source === 'gsc' ? 'Search Console' : 'GA4'} · ${ranges[key].label} : ${value[source].error}`);
    if (value.ga.metadata?.some(m => m.subjectToThresholding)) warnings.push(`GA4 · ${ranges[key].label} : un seuil de confidentialité peut limiter les données.`);
    if (value.ga.metadata?.some(m => m.dataLossFromOtherRow)) warnings.push(`GA4 · ${ranges[key].label} : certaines lignes sont regroupées dans « other ».`);
    if (value.ga.metadata?.some(m => m.samplingMetadatas?.length)) warnings.push(`GA4 · ${ranges[key].label} : rapport échantillonné.`);
  }
  if (gscDaily.error) warnings.push('Courbe Search Console : ' + gscDaily.error);
  if (gaDaily.error) warnings.push('Courbe GA4 : ' + gaDaily.error);
  const data = {
    version: 1, generatedAt: new Date().toISOString(), channel,
    siteUrl: config.siteUrl, ga4PropertyId: config.ga4PropertyId, periods: ranges,
    gaTimeZone: reports.range.ga.metadata?.find(m => m.timeZone)?.timeZone || 'Non disponible',
    warnings, pages: mergePages(pages, reports, config.siteUrl, config.categoryOverrides),
    totals: Object.fromEntries(Object.entries(reports).map(([key, r]) => [key, { gsc: r.gsc.error ? null : r.gsc.totals, ga: r.ga.error ? null : r.ga.totals }])),
    daily: { gsc: gscDaily.rows, ga: gaDaily.rows },
  };
  await fs.mkdir(CACHE_ROOT, { recursive: true });
  const filename = path.join(CACHE_ROOT, channel + '.json');
  await fs.writeFile(filename + '.tmp', JSON.stringify(data));
  await fs.rename(filename + '.tmp', filename);
  return data;
}
export async function cached(channel) {
  try { return JSON.parse(await fs.readFile(path.join(CACHE_ROOT, channel + '.json'), 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}
