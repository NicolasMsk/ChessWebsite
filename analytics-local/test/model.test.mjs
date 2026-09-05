import test from 'node:test';
import assert from 'node:assert/strict';
import { periods, normalizePage, category, delta, mergePages } from '../model.mjs';
const site = 'https://www.cours-echecs-paris.fr/';
test('calendar comparisons include leap days and do not overlap weeks', () => {
  const p = periods('2024-03-05');
  assert.deepEqual(p.month, { start: '2024-02-01', end: '2024-02-29', label: 'Dernier mois complet' });
  assert.equal(p.previousMonth.end, '2024-01-31');
  assert.equal(p.week.start, '2024-02-28'); assert.equal(p.previousWeek.end, '2024-02-27');
  assert.equal(periods('2026-01-05').month.start, '2025-12-01');
});
test('URL matching strips query parameters without combining distinct articles or outside hosts', () => {
  assert.equal(normalizePage(site + 'blog/index.html?utm_source=test', site), '/blog/');
  assert.equal(normalizePage('/blog/old.html', site), '/blog/old.html');
  assert.equal(normalizePage('https://evil.example/blog/', site), null);
  assert.equal(normalizePage('(not set)', site), '(not set)');
});
test('comparisons distinguish a zero baseline, missing data and changes in percentage points', () => {
  assert.equal(delta(10, 0).state, 'new'); assert.equal(delta(null, 0).state, 'missing');
  assert.equal(delta(0, 0).value, 0); assert.equal(delta(150, 100).value, 50);
  assert.ok(Math.abs(delta(.25, .20, 'points').value - 5) < .00001);
  assert.equal(delta(7, 10, 'position').value, -3);
});
test('categories can be overridden without changing public pages', () => {
  assert.equal(category('/zones/cours-echecs-versailles.html'), 'Cours & zones');
  assert.equal(category('/blog/regles-echecs-guide-complet.html'), 'Apprendre & progresser');
  assert.equal(category('/custom.html', { '/custom.html': 'Ma catégorie' }), 'Ma catégorie');
});
test('merged URLs weight Search Console position and GA rates correctly', () => {
  const gsc = { pages: [{ keys: [site], clicks: 10, impressions: 100, position: 10 }, { keys: [site + 'index.html'], clicks: 10, impressions: 300, position: 2 }] };
  const ga = { landing: [
    { dimensions: ['/'], sessions: 10, totalUsers: 8, engagedSessions: 5, keyEvents: 1, averageSessionDuration: 20 },
    { dimensions: ['/index.html'], sessions: 30, totalUsers: 20, engagedSessions: 30, keyEvents: 3, averageSessionDuration: 100 },
  ], pages: [{ dimensions: ['/'], screenPageViews: 55, userEngagementDuration: 120 }] };
  const [page] = mergePages([{ path: '/', title: 'Accueil' }], { range: { gsc, ga } }, site);
  assert.equal(page.periods.range.gsc.position, 4);
  assert.equal(page.periods.range.gsc.ctr, .05);
  assert.equal(page.periods.range.ga.engagementRate, 35 / 40);
  assert.equal(page.periods.range.ga.averageSessionDuration, 80);
  assert.equal(page.periods.range.ga.views, 55);
  assert.equal(page.periods.range.usersApproximate, true);
});
test('an unavailable API is not a zero and pages only seen in old periods remain visible', () => {
  const reports = { range: { gsc: { error: 'unavailable' }, ga: { landing: [], pages: [] } }, previousMonth: { gsc: { pages: [{ keys: [site + 'old.html'], clicks: 3, impressions: 12, position: 4 }] }, ga: { landing: [], pages: [] } } };
  const pages = mergePages([{ path: '/', title: 'Accueil' }], reports, site);
  assert.equal(pages.length, 2);
  assert.equal(pages[0].periods.range.gsc, null);
  assert.equal(pages.find(p => p.path === '/old.html').periods.range.gsc, null);
  assert.equal(pages.find(p => p.path === '/old.html').periods.previousMonth.gsc.clicks, 3);
});
