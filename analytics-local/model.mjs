export const CATEGORIES = ['Pages commerciales', 'Cours & zones', 'Apprendre & progresser', 'Enfants & bienfaits', 'Culture & champions', 'Guides & matériel', 'Pages techniques', 'Autres pages'];
export const DAY = 86400000;
export const iso = date => new Date(date).toISOString().slice(0, 10);
export const shift = (date, days) => iso(Date.parse(date + 'T12:00:00Z') + days * DAY);
export function periods(end) {
  const d = new Date(end + 'T12:00:00Z');
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 12));
  const monthEnd = iso(first.getTime() - DAY);
  const monthStart = iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1, 12)));
  const previousStart = iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 2, 1, 12)));
  return {
    range: { start: shift(end, -27), end, label: '28 derniers jours consolidés' },
    week: { start: shift(end, -6), end, label: '7 derniers jours consolidés' },
    previousWeek: { start: shift(end, -13), end: shift(end, -7), label: '7 jours précédents' },
    month: { start: monthStart, end: monthEnd, label: 'Dernier mois complet' },
    previousMonth: { start: previousStart, end: shift(monthStart, -1), label: 'Mois complet précédent' },
  };
}

export function normalizePage(input, siteUrl) {
  if (!input || input === '(not set)') return '(not set)';
  let url;
  try { url = new URL(input, siteUrl); } catch { return null; }
  const expected = new URL(siteUrl).hostname.replace(/^www\./, '');
  if (url.hostname.replace(/^www\./, '') !== expected) return null;
  let path = url.pathname;
  if (path.endsWith('/index.html')) path = path.slice(0, -10);
  // Pas de rapprochement automatique des anciennes redirections éditoriales :
  // leur historique reste visible sur sa propre ligne.
  return path || '/';
}

export function category(path, overrides = {}) {
  if (overrides[path]) return overrides[path];
  if (path === '(not set)' || /mentions-legales|commande-confirmee|cgv\.html/.test(path)) return 'Pages techniques';
  if (path === '/' || /^\/edition-raffinee\/|idee-cadeau|guide-apprendre|ebook-gratuit/.test(path)) return 'Pages commerciales';
  if (/^\/zones\/|cours-echecs|combien-coute-cours|professeur-ou/.test(path)) return 'Cours & zones';
  if (/enfant|tdah|intelligence|bienfaits|retraite|echecs-vs/.test(path)) return 'Enfants & bienfaits';
  if (/carlsen|polgar|firouzja|vachier|championnat|citations|films/.test(path)) return 'Culture & champions';
  if (/echiquier|materiel/.test(path)) return 'Guides & matériel';
  if (path.startsWith('/blog/')) return 'Apprendre & progresser';
  return 'Autres pages';
}

export const emptyGsc = () => ({ impressions: 0, clicks: 0, ctr: null, position: null });
export function addGsc(target, row) {
  const before = target.impressions;
  target.clicks += row.clicks || 0;
  target.impressions += row.impressions || 0;
  target.ctr = target.impressions ? target.clicks / target.impressions : null;
  target.position = target.impressions ? ((target.position || 0) * before + (row.position || 0) * (row.impressions || 0)) / target.impressions : null;
}
export function delta(current, previous, kind = 'percent') {
  if (current == null || previous == null) return { value: null, state: 'missing' };
  if (kind === 'points') return { value: (current - previous) * 100, state: 'value' };
  if (kind === 'position') return { value: current - previous, state: 'value' };
  if (previous === 0) return current === 0 ? { value: 0, state: 'value' } : { value: null, state: 'new' };
  return { value: (current - previous) / previous * 100, state: 'value' };
}

export function mergePages(inventory, reports, siteUrl, overrides = {}) {
  const pages = new Map(inventory.map(page => [page.path, { ...page, category: category(page.path, overrides), periods: {} }]));
  function ensure(path) {
    if (!pages.has(path)) pages.set(path, { path, title: path === '(not set)' ? 'Page d’entrée non renseignée' : path.split('/').pop() || path, category: category(path, overrides), inSitemap: false, periods: {} });
    return pages.get(path);
  }
  for (const [period, report] of Object.entries(reports)) {
    const found = new Map();
    function metrics(path) {
      ensure(path);
      if (!found.has(path)) found.set(path, {
        gsc: report.gsc.error ? null : emptyGsc(),
        ga: report.ga.error ? null : { sessions: 0, users: 0, engagedSessions: 0, engagementRate: null, averageSessionDuration: null, keyEvents: 0, views: 0, engagementSeconds: 0 },
        hasGsc: false, hasGa: false, usersApproximate: false,
      });
      return found.get(path);
    }
    for (const row of report.gsc.pages || []) {
      const path = normalizePage(row.keys[0], siteUrl); if (path == null) continue;
      const target = metrics(path); target.hasGsc = true; addGsc(target.gsc, row);
    }
    const userVariants = new Map();
    for (const row of report.ga.landing || []) {
      const path = normalizePage(row.dimensions[0], siteUrl); if (path == null) continue;
      const target = metrics(path); target.hasGa = true;
      const ga = target.ga; const before = ga.sessions;
      ga.sessions += row.sessions; ga.users += row.totalUsers;
      ga.engagedSessions += row.engagedSessions; ga.keyEvents += row.keyEvents;
      ga.engagementRate = ga.sessions ? ga.engagedSessions / ga.sessions : null;
      ga.averageSessionDuration = ga.sessions ? ((ga.averageSessionDuration || 0) * before + row.averageSessionDuration * row.sessions) / ga.sessions : null;
      userVariants.set(path, (userVariants.get(path) || 0) + 1);
      target.usersApproximate = userVariants.get(path) > 1;
    }
    for (const row of report.ga.pages || []) {
      const path = normalizePage(row.dimensions[0], siteUrl); if (path == null) continue;
      const target = metrics(path); target.hasGa = true;
      target.ga.views += row.screenPageViews; target.ga.engagementSeconds += row.userEngagementDuration;
    }
    // Une source indisponible reste null : ne pas afficher un faux zéro.
    for (const [path, page] of pages) page.periods[period] = metrics(path);
  }
  for (const page of pages.values()) for (const period of Object.keys(reports)) {
    if (!page.periods[period]) page.periods[period] = {
      gsc: reports[period].gsc.error ? null : emptyGsc(),
      ga: reports[period].ga.error ? null : { sessions: 0, users: 0, engagedSessions: 0, engagementRate: null, averageSessionDuration: null, keyEvents: 0, views: 0, engagementSeconds: 0 },
      hasGsc: false, hasGa: false,
    };
  }
  return [...pages.values()].sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || (b.periods.range?.gsc?.clicks || 0) - (a.periods.range?.gsc?.clicks || 0));
}
