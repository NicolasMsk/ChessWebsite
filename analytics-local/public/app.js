'use strict';
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const number = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const date = value => dateFormat.format(new Date(value + 'T12:00:00Z'));
const range = p => `${date(p.start)} – ${date(p.end)} ${p.end.slice(0, 4)}`;
const metrics = {
  impressions: { name: 'Impressions', source: 'gsc', field: 'impressions' },
  clicks: { name: 'Clics Google', source: 'gsc', field: 'clicks' },
  ctr: { name: 'CTR', source: 'gsc', field: 'ctr', format: 'rate', change: 'points' },
  position: { name: 'Position', source: 'gsc', field: 'position', format: 'decimal', change: 'position', lower: true },
  sessions: { name: 'Sessions entrantes', source: 'ga', field: 'sessions' },
  users: { name: 'Utilisateurs entrants', source: 'ga', field: 'users', totalField: 'totalUsers' },
  views: { name: 'Vues de la page', source: 'ga', field: 'views', totalField: 'screenPageViews' },
  engaged: { name: 'Sessions engagées', source: 'ga', field: 'engagedSessions' },
  engagement: { name: 'Taux d’engagement', source: 'ga', field: 'engagementRate', format: 'rate', change: 'points' },
  duration: { name: 'Durée de session', source: 'ga', field: 'averageSessionDuration', format: 'duration' },
  engagementTime: { name: 'Temps engagé / page', source: 'ga', field: 'engagementSeconds', totalField: 'userEngagementDuration', format: 'duration' },
  keyEvents: { name: 'Événements clés', source: 'ga', field: 'keyEvents' },
};
const views = { combined: ['impressions', 'clicks', 'position', 'sessions', 'views', 'engagement', 'keyEvents'], gsc: ['impressions', 'clicks', 'ctr', 'position'], ga: ['sessions', 'users', 'views', 'engaged', 'engagement', 'duration', 'keyEvents'] };
let data = null, csrf = '', selectedCategory = '', selectedView = 'combined', sortKey = 'clicks', ascending = false, channel = 'all', timer = null, chartRows = [], displayedGeneration = '', requestSequence = 0;

function value(page, key, period = 'range', total = false) {
  const metric = metrics[key];
  const container = total ? page[period] : page.periods[period];
  return container?.[metric.source]?.[total ? metric.totalField || metric.field : metric.field] ?? null;
}
function format(value, key) {
  if (value == null || !Number.isFinite(value)) return '—';
  const type = metrics[key].format;
  if (type === 'rate') return decimal.format(value * 100) + ' %';
  if (type === 'decimal') return decimal.format(value);
  if (type === 'duration') {
    const seconds = Math.round(value);
    if (seconds >= 3600) return `${number.format(Math.floor(seconds / 3600))} h ${Math.floor(seconds % 3600 / 60)} min`;
    return seconds >= 60 ? `${Math.floor(seconds / 60)} min ${seconds % 60} s` : `${seconds} s`;
  }
  return number.format(value);
}
function difference(current, previous, key) {
  if (current == null || previous == null) return { text: '—', className: 'neutral', raw: null };
  let amount, suffix;
  if (metrics[key].change === 'points') { amount = (current - previous) * 100; suffix = ' pt'; }
  else if (metrics[key].change === 'position') { amount = current - previous; suffix = ''; }
  else {
    if (previous === 0) return current === 0 ? { text: '0 %', className: 'neutral', raw: 0 } : { text: 'Nouveau', className: 'neutral', raw: 'Nouveau' };
    amount = (current - previous) / previous * 100; suffix = ' %';
  }
  const neutral = Math.abs(amount) < .05;
  return { text: `${amount > 0 && !neutral ? '+' : ''}${decimal.format(neutral ? 0 : amount)}${suffix}`, className: neutral ? 'neutral' : ((amount > 0) !== !!metrics[key].lower ? 'positive' : 'negative'), raw: amount };
}
function comparison(page, key, mode, total = false) {
  const current = value(page, key, mode === 'WoW' ? 'week' : 'month', total);
  const previous = value(page, key, mode === 'WoW' ? 'previousWeek' : 'previousMonth', total);
  const diff = difference(current, previous, key);
  const title = `${mode} : ${format(previous, key)} → ${format(current, key)}. ${mode === 'WoW' ? range(data.periods.week) + ' vs ' + range(data.periods.previousWeek) : range(data.periods.month) + ' vs ' + range(data.periods.previousMonth)}`;
  return `<span class="delta ${diff.className}" title="${esc(title)}">${esc(diff.text)}</span>`;
}
function cell(page, key) {
  const main = value(page, key);
  return `<div class="metric-value${main == null ? ' missing' : ''}">${format(main, key)}</div><div class="metric-compare"><span class="comparison-name">WoW</span>${comparison(page, key, 'WoW')}</div><div class="metric-compare"><span class="comparison-name">MoM</span>${comparison(page, key, 'MoM')}</div>`;
}
function renderKpis() {
  $('#kpis').innerHTML = ['impressions', 'clicks', 'sessions', 'keyEvents'].map((key, index) => `<article class="kpi ${index === 0 ? 'primary-kpi' : ''}"><div class="kpi-top"><span class="kpi-label">${key === 'sessions' ? 'Sessions du site' : esc(metrics[key].name)}</span><span class="kpi-source">${metrics[key].source === 'gsc' ? 'GOOGLE' : 'GA4'}</span></div><div class="kpi-value">${format(value(data.totals, key, 'range', true), key)}</div><div class="kpi-bottom"><span class="kpi-comparison"><span class="comparison-name">WoW</span>${comparison(data.totals, key, 'WoW', true)}</span><span class="kpi-comparison"><span class="comparison-name">MoM</span>${comparison(data.totals, key, 'MoM', true)}</span></div></article>`).join('');
}
function renderCategories() {
  const counts = new Map();
  for (const page of data.pages) counts.set(page.category, (counts.get(page.category) || 0) + 1);
  $('#categories').innerHTML = [...counts].map(([category, count]) => `<button class="category-button ${selectedCategory === category ? 'selected' : ''}" data-category="${esc(category)}"><span class="category-dot"></span>${esc(category)}<span class="category-count">${count}</span></button>`).join('');
  $('#all-pages').classList.toggle('active', !selectedCategory);
  $('#total-pages').textContent = data.pages.length;
}
function filteredPages() {
  const term = $('#search').value.toLocaleLowerCase('fr');
  return data.pages.filter(page => (!selectedCategory || page.category === selectedCategory) && `${page.title} ${page.path}`.toLocaleLowerCase('fr').includes(term) && (!$('#hide-empty').checked || Object.values(page.periods).some(p => p.hasGsc || p.hasGa)));
}
function renderTable() {
  if (!data) return;
  const keys = views[selectedView];
  let firstGa = keys.find(key => metrics[key].source === 'ga');
  $('#table-head').innerHTML = `<tr><th scope="col">PAGE / URL</th>${keys.map(key => `<th scope="col" class="${metrics[key].source === 'ga' ? 'ga-column ' : ''}${key === firstGa ? 'ga-start' : ''}" aria-sort="${sortKey === key ? ascending ? 'ascending' : 'descending' : 'none'}"><button data-sort="${key}" class="${sortKey === key ? 'active-sort' : ''}"><span class="source">${metrics[key].source === 'gsc' ? 'SEARCH CONSOLE' : 'GA4'}</span>${esc(metrics[key].name)} ${sortKey === key ? ascending ? '↑' : '↓' : '↕'}</button></th>`).join('')}</tr>`;
  const pages = filteredPages();
  const groups = new Map();
  for (const page of pages) { if (!groups.has(page.category)) groups.set(page.category, []); groups.get(page.category).push(page); }
  $('#table-body').innerHTML = [...groups].map(([group, rows]) => {
    rows.sort((a, b) => {
      const av = value(a, sortKey), bv = value(b, sortKey);
      if (av == null) return bv == null ? a.path.localeCompare(b.path) : 1;
      if (bv == null) return -1;
      return (ascending ? av - bv : bv - av) || a.path.localeCompare(b.path);
    });
    const clicks = rows.every(p => value(p, 'clicks') != null) ? rows.reduce((n, p) => n + value(p, 'clicks'), 0) : null;
    const sessions = rows.every(p => value(p, 'sessions') != null) ? rows.reduce((n, p) => n + value(p, 'sessions'), 0) : null;
    return `<tr class="group-row"><td colspan="${keys.length + 1}"><div>${esc(group).toLocaleUpperCase('fr')}<span class="group-pill">${rows.length}</span><span class="group-summary">${format(clicks, 'clicks')} clics · ${format(sessions, 'sessions')} sessions entrantes</span></div></td></tr>` + rows.map(page => `<tr class="page-row"><td class="page-cell"><button class="page-link" data-page="${esc(page.path)}">${esc(page.title)}</button><span class="page-path" title="${esc(page.path)}">${esc(page.path)}</span>${page.noindex ? '<span class="page-status">noindex</span>' : !page.inSitemap ? '<span class="page-status">Hors sitemap</span>' : ''}</td>${keys.map(key => `<td class="${metrics[key].source === 'ga' ? 'ga-column ' : ''}${key === firstGa ? 'ga-start' : ''}">${cell(page, key)}</td>`).join('')}</tr>`).join('');
  }).join('');
  $('#table-title').firstChild.textContent = (selectedCategory || 'Toutes vos pages') + ' ';
  $('#result-count').textContent = pages.length;
  $('#table-count').textContent = `${pages.length} page${pages.length > 1 ? 's' : ''} affichée${pages.length > 1 ? 's' : ''} sur ${data.pages.length}`;
  $('#empty').hidden = !!pages.length;
}
function renderInsights() {
  const comparable = data.pages.filter(p => value(p, 'clicks', 'week') != null && value(p, 'clicks', 'previousWeek') != null);
  const gains = comparable.map(page => ({ page, gain: value(page, 'clicks', 'week') - value(page, 'clicks', 'previousWeek') })).sort((a, b) => b.gain - a.gain);
  const best = gains.find(item => item.gain > 0), worst = [...gains].reverse().find(item => item.gain < 0);
  const make = (item, down) => item ? `<div class="insight"><span class="insight-symbol ${down ? 'down' : ''}">${down ? '↘' : '↗'}</span><div><div class="label">${down ? 'À SURVEILLER' : 'PLUS FORTE PROGRESSION'}</div><button data-page="${esc(item.page.path)}">${esc(item.page.title)}</button><div class="gain ${down ? 'down' : ''}">${item.gain > 0 ? '+' : ''}${number.format(item.gain)} clics sur 7 jours</div></div></div>` : `<div class="insight"><span class="insight-symbol">–</span><div><div class="label">${down ? 'À SURVEILLER' : 'PLUS FORTE PROGRESSION'}</div><span class="muted">${down ? 'Aucune baisse de clics sur la période.' : 'Pas encore de progression mesurable.'}</span></div></div>`;
  $('#insights').innerHTML = comparable.length ? make(best, false) + make(worst, true) : '<p class="detail-hint">Données comparatives indisponibles.</p>';
}
function dailyRows(key) {
  const lookup = new Map();
  if (metrics[key].source === 'gsc') for (const row of data.daily.gsc) lookup.set(row.keys[0], row[key]);
  else for (const row of data.daily.ga) { const raw = row.dimensions[0]; lookup.set(`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`, row[key === 'views' ? 'screenPageViews' : key]); }
  const rows = [];
  for (let timestamp = Date.parse(data.periods.range.start + 'T12:00:00Z'); timestamp <= Date.parse(data.periods.range.end + 'T12:00:00Z'); timestamp += 86400000) {
    const day = new Date(timestamp).toISOString().slice(0, 10); rows.push({ date: day, value: lookup.get(day) || 0 });
  }
  return rows;
}
function renderChart() {
  const key = $('#chart-metric').value;
  chartRows = dailyRows(key);
  const unavailable = value(data.totals, key, 'range', true) == null || data.warnings.some(w => w.startsWith(metrics[key].source === 'gsc' ? 'Courbe Search Console' : 'Courbe GA4'));
  $('#chart-total').textContent = unavailable ? '—' : format(chartRows.reduce((n, row) => n + row.value, 0), key);
  $('#chart-caption').textContent = metrics[key].name.toLocaleLowerCase('fr') + ' sur la période';
  $('#chart-first').textContent = date(data.periods.range.start); $('#chart-last').textContent = date(data.periods.range.end);
  if (unavailable) { $('#chart').innerHTML = '<div class="chart-empty">Courbe indisponible pour cette source.</div>'; return; }
  const max = Math.max(...chartRows.map(r => r.value), 1), width = 650, height = 124;
  const points = chartRows.map((row, i) => [i / (chartRows.length - 1) * width, height - row.value / max * 104]);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  $('#chart').innerHTML = `<svg viewBox="0 0 ${width} 138" preserveAspectRatio="none" role="img" aria-label="${esc(metrics[key].name)}, du ${esc(range(data.periods.range))}"><defs><linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#61bda5" stop-opacity=".22"/><stop offset="100%" stop-color="#61bda5" stop-opacity="0"/></linearGradient></defs>${[20, 54, 89, 124].map(y => `<line x1="0" y1="${y}" x2="650" y2="${y}" stroke="#edf2f3" stroke-dasharray="3 5"/>`).join('')}<path d="${line} L650,138 L0,138 Z" fill="url(#area-gradient)"/><path d="${line}" stroke="#3c9d87" stroke-width="2.4" fill="none" vector-effect="non-scaling-stroke" stroke-linejoin="round"/><circle cx="${points.at(-1)[0]}" cy="${points.at(-1)[1]}" r="3" fill="#3c9d87"/></svg><div class="chart-tooltip" hidden></div>`;
}
function render() {
  $('#dashboard').hidden = false; $('#loading').hidden = true;
  $('#range-label').textContent = range(data.periods.range);
  $('#value-period').textContent = range(data.periods.range);
  $('#wow-period').textContent = `${range(data.periods.week)} vs ${range(data.periods.previousWeek)}`;
  $('#mom-period').textContent = `${range(data.periods.month)} vs ${range(data.periods.previousMonth)}`;
  $('#updated').textContent = 'Données enregistrées le ' + new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(data.generatedAt));
  $('#timezone-note').textContent = `Vue d’ensemble : site entier. Search Console : heure du Pacifique · GA4 : ${data.gaTimeZone}. Les journées ne sont donc pas strictement alignées. Les utilisateurs et événements observés dépendent du consentement et du paramétrage GA4.`;
  renderKpis(); renderCategories(); renderChart(); renderInsights(); renderTable();
}
function openPage(path) {
  const page = data?.pages.find(p => p.path === path); if (!page) return;
  $('#detail-category').textContent = page.category;
  $('#detail-title').textContent = page.title;
  const link = $('#detail-url');
  link.hidden = page.path === '(not set)';
  if (!link.hidden) { link.href = new URL(page.path, data.siteUrl).href; link.textContent = link.href + ' ↗'; }
  $('#detail-metrics').innerHTML = Object.keys(metrics).map(key => `<article class="detail-card"><div class="detail-source">${metrics[key].source === 'gsc' ? 'SEARCH CONSOLE' : 'GOOGLE ANALYTICS 4'}</div><div class="detail-label">${esc(metrics[key].name)}</div>${cell(page, key)}</article>`).join('');
  $('#detail-periods').innerHTML = `<div class="detail-periods"><strong>WoW</strong> ${esc(range(data.periods.week))} / ${esc(range(data.periods.previousWeek))}<br><strong>MoM</strong> ${esc(range(data.periods.month))} / ${esc(range(data.periods.previousMonth))}</div>`;
  const notes = ['Sessions et événements clés : attribués à la page d’entrée. Vues et temps engagé : attribués à la page consultée.'];
  if (Object.values(page.periods).some(p => p.usersApproximate)) notes.push('Plusieurs variantes d’URL sont regroupées : les utilisateurs entrants de cette ligne peuvent inclure des doublons.');
  if (!page.inSitemap) notes.push('Cette URL ne figure pas dans le sitemap local.');
  if (!Object.values(page.periods).some(p => p.hasGsc)) notes.push('Aucune ligne Search Console renvoyée pour cette URL sur les périodes chargées. Cela ne suffit pas à conclure à une absence d’indexation.');
  $('#detail-note').textContent = notes.join(' ');
  $('#page-dialog').showModal();
}
async function load() {
  clearTimeout(timer);
  const sequence = ++requestSequence;
  try {
    const response = await fetch('/api/data?channel=' + channel);
    if (!response.ok) throw new Error('Le serveur local ne répond pas correctement.');
    const body = await response.json(); if (sequence !== requestSequence) return;
    csrf = body.csrf;
    const changed = body.data && body.data.generatedAt + body.data.channel !== displayedGeneration;
    if (changed) { data = body.data; displayedGeneration = data.generatedAt + data.channel; render(); }
    const running = !!body.job?.running;
    $('#refresh').disabled = running; $('#refresh-icon').classList.toggle('spinning', running);
    $('#progress').textContent = body.job?.progress || 'Connexion aux API…';
    $('#connection').innerHTML = '<i></i>' + (running ? 'Actualisation en cours' : body.data ? 'Données API · cache local' : 'Connexion à vérifier');
    const warnings = [...(body.data?.warnings || []), ...(body.job?.error ? [body.job.error + ' Le dernier cache disponible est conservé.'] : [])];
    const age = body.data ? Date.now() - Date.parse(body.data.generatedAt) : 0;
    if (age > 86400000) warnings.unshift('Le cache a plus de 24 heures. Actualisez les API pour obtenir une vue récente.');
    $('#warnings').innerHTML = warnings.map(w => `<div class="warning">${esc(w)}</div>`).join('');
    if (!body.data && !running && body.job?.error) { $('#loading').hidden = true; $('#dashboard').hidden = true; }
    if (running) timer = setTimeout(load, 1500);
  } catch (error) {
    $('#warnings').innerHTML = `<div class="warning">${esc(error.message)} Relancez le serveur local si nécessaire.</div>`;
    $('#refresh').disabled = false;
    $('#loading').hidden = true;
  }
}
function csvField(value) {
  let text = value == null ? '' : String(value);
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
function exportCsv() {
  if (!data) return;
  const keys = Object.keys(metrics), periods = ['range', 'week', 'previousWeek', 'month', 'previousMonth'];
  const header = ['Categorie', 'Page', 'URL', 'Canal GA4', ...keys.flatMap(key => [...periods.map(p => `${metrics[key].name} ${data.periods[p].start} au ${data.periods[p].end}`), `${metrics[key].name} WoW (${metrics[key].change || '%'})`, `${metrics[key].name} MoM (${metrics[key].change || '%'})`])];
  const rows = filteredPages().map(page => [page.category, page.title, page.path === '(not set)' ? page.path : new URL(page.path, data.siteUrl).href, channel, ...keys.flatMap(key => [...periods.map(period => value(page, key, period)), difference(value(page, key, 'week'), value(page, key, 'previousWeek'), key).raw, difference(value(page, key, 'month'), value(page, key, 'previousMonth'), key).raw])]);
  const content = '\uFEFF' + [header, ...rows].map(row => row.map(csvField).join(';')).join('\r\n');
  const href = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = href; link.download = `observatoire-${channel}-${data.periods.range.end}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(href), 1000);
}

$('#categories').addEventListener('click', event => { const button = event.target.closest('[data-category]'); if (button) { selectedCategory = button.dataset.category; renderCategories(); renderTable(); } });
$('#all-pages').addEventListener('click', () => { selectedCategory = ''; if (data) { renderCategories(); renderTable(); } });
$('.tabs').addEventListener('click', event => { const button = event.target.closest('[data-view]'); if (!button) return; selectedView = button.dataset.view; for (const tab of document.querySelectorAll('[data-view]')) { tab.classList.toggle('selected', tab === button); tab.setAttribute('aria-selected', String(tab === button)); } if (!views[selectedView].includes(sortKey)) sortKey = views[selectedView][0]; renderTable(); });
$('#table-head').addEventListener('click', event => { const button = event.target.closest('[data-sort]'); if (button) { ascending = sortKey === button.dataset.sort ? !ascending : false; sortKey = button.dataset.sort; renderTable(); } });
document.addEventListener('click', event => { const button = event.target.closest('[data-page]'); if (button) openPage(button.dataset.page); });
$('#search').addEventListener('input', renderTable); $('#hide-empty').addEventListener('change', renderTable);
$('#channel').addEventListener('change', () => { channel = $('#channel').value; data = null; displayedGeneration = ''; $('#dashboard').hidden = true; $('#loading').hidden = false; load(); });
$('#chart-metric').addEventListener('change', renderChart);
$('#chart').addEventListener('mousemove', event => { const tooltip = $('.chart-tooltip'); if (!tooltip || !chartRows.length) return; const rect = $('#chart').getBoundingClientRect(); const index = Math.max(0, Math.min(chartRows.length - 1, Math.round((event.clientX - rect.left) / rect.width * (chartRows.length - 1)))); const row = chartRows[index]; tooltip.hidden = false; tooltip.textContent = `${date(row.date)} · ${format(row.value, $('#chart-metric').value)}`; tooltip.style.left = Math.min(Math.max(0, event.clientX - rect.left - 40), rect.width - 140) + 'px'; });
$('#chart').addEventListener('mouseleave', () => { const tooltip = $('.chart-tooltip'); if (tooltip) tooltip.hidden = true; });
$('#detail-close').addEventListener('click', () => $('#page-dialog').close()); $('#method-open').addEventListener('click', () => $('#method-dialog').showModal()); $('#method-close').addEventListener('click', () => $('#method-dialog').close());
for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
$('#export').addEventListener('click', exportCsv);
$('#refresh').addEventListener('click', async () => { try { $('#refresh').disabled = true; const response = await fetch('/api/refresh?channel=' + channel, { method: 'POST', headers: { 'X-Dashboard-Token': csrf } }); if (!response.ok) throw new Error('Actualisation refusée. Rechargez la page puis réessayez.'); await load(); } catch (error) { $('#warnings').innerHTML = `<div class="warning">${esc(error.message)}</div>`; $('#refresh').disabled = false; } });
load();
