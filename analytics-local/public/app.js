'use strict';
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const number = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const date = value => dateFormat.format(new Date(value + 'T12:00:00Z'));
const range = p => `${date(p.start)} – ${date(p.end)} ${p.end.slice(0, 4)}`;

// Libellés en français courant ; le terme technique reste dans `tech` (infobulle, CSV).
const metrics = {
  impressions: { name: 'Affichages Google', short: 'Affichages', tech: 'Impressions', source: 'gsc', field: 'impressions', hint: 'Fois où une page du site est apparue dans les résultats Google' },
  clicks: { name: 'Clics Google', short: 'Clics', tech: 'Clics', source: 'gsc', field: 'clicks', hint: 'Personnes arrivées sur le site depuis un résultat Google' },
  ctr: { name: 'Taux de clic', short: 'Taux de clic', tech: 'CTR', source: 'gsc', field: 'ctr', format: 'rate', change: 'points', hint: 'Clics ÷ affichages' },
  position: { name: 'Position Google', short: 'Position', tech: 'Position moyenne', source: 'gsc', field: 'position', format: 'decimal', change: 'position', lower: true, hint: 'Rang moyen dans les résultats — plus bas est mieux, 1 = premier' },
  sessions: { name: 'Visites', short: 'Visites', tech: 'Sessions (page d’entrée)', source: 'ga', field: 'sessions', hint: 'Visites qui ont commencé sur cette page' },
  users: { name: 'Visiteurs', short: 'Visiteurs', tech: 'Utilisateurs entrants', source: 'ga', field: 'users', totalField: 'totalUsers', hint: 'Personnes distinctes entrées par cette page' },
  views: { name: 'Pages vues', short: 'Pages vues', tech: 'Vues', source: 'ga', field: 'views', totalField: 'screenPageViews', hint: 'Nombre de fois où la page a été affichée' },
  engaged: { name: 'Visites engagées', short: 'Engagées', tech: 'Sessions engagées', source: 'ga', field: 'engagedSessions', hint: 'Visites de plus de 10 s, ou avec 2 pages, ou une action clé' },
  engagement: { name: 'Taux d’engagement', short: 'Engagement', tech: 'Taux d’engagement', source: 'ga', field: 'engagementRate', format: 'rate', change: 'points', hint: 'Part des visites engagées' },
  duration: { name: 'Durée moyenne', short: 'Durée', tech: 'Durée de session', source: 'ga', field: 'averageSessionDuration', format: 'duration', hint: 'Durée moyenne d’une visite entrée par cette page' },
  engagementTime: { name: 'Temps de lecture', short: 'Lecture', tech: 'Temps engagé cumulé', source: 'ga', field: 'engagementSeconds', totalField: 'userEngagementDuration', format: 'duration', hint: 'Temps total passé activement sur la page' },
  keyEvents: { name: 'Actions clés', short: 'Actions', tech: 'Événements clés GA4', source: 'ga', field: 'keyEvents', hint: 'Inscriptions au guide, clics contact, téléphone, email…' },
};
const views = {
  combined: ['impressions', 'clicks', 'position', 'sessions', 'keyEvents'],
  gsc: ['impressions', 'clicks', 'ctr', 'position'],
  ga: ['sessions', 'users', 'views', 'engagement', 'duration', 'keyEvents'],
};
const COMPARE = {
  WoW: { label: 'vs semaine précédente', shortLabel: 'vs sem. préc.', current: 'week', previous: 'previousWeek', unit: '7 jours' },
  MoM: { label: 'vs mois précédent', shortLabel: 'vs mois préc.', current: 'month', previous: 'previousMonth', unit: 'un mois' },
};
let data = null, csrf = '', selectedCategory = '', selectedView = 'combined', sortKey = 'clicks', ascending = false, channel = 'all', compareMode = 'WoW', timer = null, chartRows = [], displayedGeneration = '', requestSequence = 0;

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
    if (previous === 0) return current === 0 ? { text: '=', className: 'neutral', raw: 0 } : { text: 'Nouveau', className: 'positive', raw: 'Nouveau' };
    amount = (current - previous) / previous * 100; suffix = ' %';
  }
  const neutral = Math.abs(amount) < .05;
  return { text: `${amount > 0 && !neutral ? '+' : ''}${decimal.format(neutral ? 0 : amount)}${suffix}`, className: neutral ? 'neutral' : ((amount > 0) !== !!metrics[key].lower ? 'positive' : 'negative'), raw: amount };
}
function periodsOf(mode) {
  const c = COMPARE[mode];
  return `${range(data.periods[c.current])} contre ${range(data.periods[c.previous])}`;
}
// Une seule comparaison affichée (celle choisie en haut) ; l'autre reste dans l'infobulle.
function comparison(page, key, mode, total = false) {
  const c = COMPARE[mode];
  const current = value(page, key, c.current, total), previous = value(page, key, c.previous, total);
  const diff = difference(current, previous, key);
  const other = mode === 'WoW' ? 'MoM' : 'WoW';
  const oc = COMPARE[other];
  const otherDiff = difference(value(page, key, oc.current, total), value(page, key, oc.previous, total), key);
  const title = `${c.label} : ${format(previous, key)} → ${format(current, key)} (${periodsOf(mode)}).\n${oc.label} : ${otherDiff.text}.`;
  return `<span class="delta ${diff.className}" title="${esc(title)}">${esc(diff.text)}</span>`;
}
function cell(page, key) {
  const main = value(page, key);
  return `<div class="metric-value${main == null ? ' missing' : ''}">${format(main, key)}</div><div class="metric-compare">${comparison(page, key, compareMode)}</div>`;
}
function renderKpis() {
  const tiles = [
    { key: 'impressions', label: 'Affichages dans Google' },
    { key: 'clicks', label: 'Clics depuis Google' },
    { key: 'sessions', label: 'Visites sur le site' },
    { key: 'keyEvents', label: 'Actions clés' },
  ];
  $('#kpis').innerHTML = tiles.map(({ key, label }, index) => `<article class="kpi ${index === 0 ? 'primary-kpi' : ''}"><div class="kpi-top"><span class="kpi-label">${esc(label)}</span><span class="kpi-source">${metrics[key].source === 'gsc' ? 'Google' : 'GA4'}</span></div><div class="kpi-value">${format(value(data.totals, key, 'range', true), key)}</div><div class="kpi-bottom">${comparison(data.totals, key, compareMode, true)}<span class="kpi-vs">${COMPARE[compareMode].label}</span></div><p class="kpi-hint">${esc(metrics[key].hint)}</p></article>`).join('');
}
function renderCategories() {
  const counts = new Map();
  for (const page of data.pages) counts.set(page.category, (counts.get(page.category) || 0) + 1);
  $('#categories').innerHTML = [...counts].map(([category, count]) => `<button class="category-button ${selectedCategory === category ? 'selected' : ''}" data-category="${esc(category)}"><span class="category-dot"></span>${esc(category)}<span class="category-count">${count}</span></button>`).join('');
  $('#all-pages').classList.toggle('active', !selectedCategory);
  $('#total-pages').textContent = data.pages.length;
  // Sur petit écran la barre latérale disparaît : le même choix est proposé dans un menu.
  $('#category-select').innerHTML = `<option value="">Toutes les catégories</option>` + [...counts].map(([category, count]) => `<option value="${esc(category)}" ${selectedCategory === category ? 'selected' : ''}>${esc(category)} (${count})</option>`).join('');
}
function filteredPages() {
  const term = $('#search').value.toLocaleLowerCase('fr');
  return data.pages.filter(page => (!selectedCategory || page.category === selectedCategory) && `${page.title} ${page.path}`.toLocaleLowerCase('fr').includes(term) && (!$('#hide-empty').checked || Object.values(page.periods).some(p => p.hasGsc || p.hasGa)));
}
function renderTable() {
  if (!data) return;
  const keys = views[selectedView];
  const firstGa = keys.find(key => metrics[key].source === 'ga');
  $('#table-head').innerHTML = `<tr><th scope="col">Page</th>${keys.map(key => `<th scope="col" class="${metrics[key].source === 'ga' ? 'ga-column ' : ''}${key === firstGa ? 'ga-start' : ''}" aria-sort="${sortKey === key ? ascending ? 'ascending' : 'descending' : 'none'}"><button data-sort="${key}" class="${sortKey === key ? 'active-sort' : ''}" title="${esc(metrics[key].hint)} (${esc(metrics[key].tech)})"><span class="source">${metrics[key].source === 'gsc' ? 'Google' : 'GA4'}</span>${esc(metrics[key].short)} <span class="sort-arrow">${sortKey === key ? ascending ? '↑' : '↓' : ''}</span></button></th>`).join('')}</tr>`;
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
    return `<tr class="group-row"><td colspan="${keys.length + 1}"><div>${esc(group)}<span class="group-pill">${rows.length} page${rows.length > 1 ? 's' : ''}</span><span class="group-summary">${format(clicks, 'clicks')} clics Google · ${format(sessions, 'sessions')} visites</span></div></td></tr>` + rows.map(page => `<tr class="page-row"><td class="page-cell"><button class="page-link" data-page="${esc(page.path)}">${esc(page.title)}</button><span class="page-path" title="${esc(page.path)}">${esc(page.path)}</span>${page.noindex ? '<span class="page-status">noindex</span>' : !page.inSitemap ? '<span class="page-status">Hors sitemap</span>' : ''}</td>${keys.map(key => `<td class="${metrics[key].source === 'ga' ? 'ga-column ' : ''}${key === firstGa ? 'ga-start' : ''}">${cell(page, key)}</td>`).join('')}</tr>`).join('');
  }).join('');
  $('#table-title').firstChild.textContent = (selectedCategory || 'Toutes les pages') + ' ';
  $('#result-count').textContent = pages.length;
  $('#table-count').textContent = `${pages.length} page${pages.length > 1 ? 's' : ''} sur ${data.pages.length}`;
  $('#empty').hidden = !!pages.length;
}
// Trois hausses, trois baisses de clics Google sur la comparaison choisie, en phrases lisibles.
function renderInsights() {
  const c = COMPARE[compareMode];
  const rows = data.pages
    .filter(p => value(p, 'clicks', c.current) != null && value(p, 'clicks', c.previous) != null)
    .map(page => { const now = value(page, 'clicks', c.current), before = value(page, 'clicks', c.previous); return { page, now, before, gain: now - before }; });
  const line = item => `<li><button data-page="${esc(item.page.path)}">${esc(item.page.title)}</button><span class="insight-numbers">${number.format(item.before)} → <b>${number.format(item.now)}</b> clics <span class="delta ${item.gain > 0 ? 'positive' : 'negative'}">${item.gain > 0 ? '+' : ''}${number.format(item.gain)}</span></span></li>`;
  const ups = rows.filter(r => r.gain > 0).sort((a, b) => b.gain - a.gain).slice(0, 3);
  const downs = rows.filter(r => r.gain < 0).sort((a, b) => a.gain - b.gain).slice(0, 3);
  $('#insights').innerHTML = rows.length ? `
    <div class="insight-block"><div class="label up">↗ En hausse ${esc(c.label)}</div>${ups.length ? `<ul>${ups.map(line).join('')}</ul>` : '<p class="muted">Aucune page en hausse.</p>'}</div>
    <div class="insight-block"><div class="label down">↘ En baisse ${esc(c.label)}</div>${downs.length ? `<ul>${downs.map(line).join('')}</ul>` : '<p class="muted">Aucune page en baisse.</p>'}</div>` : '<p class="detail-hint">Données comparatives indisponibles.</p>';
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
  const total = chartRows.reduce((n, row) => n + row.value, 0);
  $('#chart-total').textContent = unavailable ? '—' : format(total, key);
  $('#chart-caption').textContent = `${metrics[key].name.toLocaleLowerCase('fr')} sur 28 jours · ${unavailable ? '—' : decimal.format(total / chartRows.length)} par jour en moyenne`;
  $('#chart-first').textContent = date(data.periods.range.start); $('#chart-last').textContent = date(data.periods.range.end);
  if (unavailable) { $('#chart').innerHTML = '<div class="chart-empty">Courbe indisponible pour cette source.</div>'; return; }
  const max = Math.max(...chartRows.map(r => r.value), 1), width = 650, height = 124, left = 34;
  const points = chartRows.map((row, i) => [left + i / (chartRows.length - 1) * (width - left), height - row.value / max * 104]);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const avg = height - (total / chartRows.length) / max * 104;
  // Axe vertical lisible : 0, la moitié, le maximum ; moyenne en pointillé.
  $('#chart').innerHTML = `<svg viewBox="0 0 ${width} 138" preserveAspectRatio="none" role="img" aria-label="${esc(metrics[key].name)}, du ${esc(range(data.periods.range))}"><defs><linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#61bda5" stop-opacity=".22"/><stop offset="100%" stop-color="#61bda5" stop-opacity="0"/></linearGradient></defs>
    ${[[20, max], [72, max / 2], [124, 0]].map(([y, v]) => `<line x1="${left}" y1="${y}" x2="${width}" y2="${y}" stroke="#e6ecee" stroke-dasharray="3 5"/><text x="${left - 6}" y="${y + 4}" text-anchor="end" class="axis-label">${esc(number.format(Math.round(v)))}</text>`).join('')}
    <line x1="${left}" y1="${avg.toFixed(1)}" x2="${width}" y2="${avg.toFixed(1)}" stroke="#b7c6cc" stroke-width="1" stroke-dasharray="2 4"/>
    <path d="${line} L${width},138 L${left},138 Z" fill="url(#area-gradient)"/>
    <path d="${line}" stroke="#3c9d87" stroke-width="2.4" fill="none" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
    <circle cx="${points.at(-1)[0]}" cy="${points.at(-1)[1]}" r="3.5" fill="#3c9d87"/></svg><div class="chart-tooltip" hidden></div>`;
}
function renderCompareBar() {
  const c = COMPARE[compareMode];
  for (const button of document.querySelectorAll('[data-compare]')) { const on = button.dataset.compare === compareMode; button.classList.toggle('selected', on); button.setAttribute('aria-selected', String(on)); }
  $('#compare-detail').textContent = `${c.label} : ${periodsOf(compareMode)}`;
}
function render() {
  $('#dashboard').hidden = false; $('#loading').hidden = true;
  $('#range-label').textContent = range(data.periods.range);
  $('#updated').textContent = 'Données du ' + new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(data.generatedAt));
  $('#timezone-note').textContent = `Search Console compte les journées en heure du Pacifique, GA4 en ${data.gaTimeZone} : les jours ne coïncident pas exactement. GA4 ne voit que les visiteurs qui acceptent les cookies.`;
  renderCompareBar(); renderKpis(); renderCategories(); renderChart(); renderInsights(); renderTable();
}
function rerenderComparisons() { renderCompareBar(); renderKpis(); renderInsights(); renderTable(); }
function openPage(path) {
  const page = data?.pages.find(p => p.path === path); if (!page) return;
  $('#detail-category').textContent = page.category;
  $('#detail-title').textContent = page.title;
  const link = $('#detail-url');
  link.hidden = page.path === '(not set)';
  if (!link.hidden) { link.href = new URL(page.path, data.siteUrl).href; link.textContent = link.href + ' ↗'; }
  const other = compareMode === 'WoW' ? 'MoM' : 'WoW';
  $('#detail-metrics').innerHTML = Object.keys(metrics).map(key => `<article class="detail-card"><div class="detail-source">${metrics[key].source === 'gsc' ? 'Google' : 'GA4'}</div><div class="detail-label" title="${esc(metrics[key].hint)}">${esc(metrics[key].name)}</div>${cell(page, key)}<div class="detail-other">${esc(COMPARE[other].shortLabel)} ${comparison(page, key, other)}</div></article>`).join('');
  $('#detail-periods').innerHTML = `<div class="detail-periods"><strong>Valeurs :</strong> ${esc(range(data.periods.range))}<br><strong>${esc(COMPARE[compareMode].label)} :</strong> ${esc(periodsOf(compareMode))}<br><strong>${esc(COMPARE[other].label)} :</strong> ${esc(periodsOf(other))}</div>`;
  const notes = ['Visites et actions clés : visites qui ont commencé sur cette page. Pages vues et temps de lecture : toutes les visites de la page.'];
  if (Object.values(page.periods).some(p => p.usersApproximate)) notes.push('Plusieurs variantes d’URL sont regroupées : le nombre de visiteurs peut inclure des doublons.');
  if (!page.inSitemap) notes.push('Cette URL ne figure pas dans le sitemap.');
  if (!Object.values(page.periods).some(p => p.hasGsc)) notes.push('Google n’a renvoyé aucune donnée pour cette page sur la période — ce n’est pas une preuve qu’elle n’est pas indexée.');
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
    $('#connection').innerHTML = '<i></i>' + (running ? 'Actualisation en cours' : body.data ? 'Données en cache local' : 'Connexion à vérifier');
    const warnings = [...(body.data?.warnings || []), ...(body.job?.error ? [body.job.error + ' Le dernier cache disponible est conservé.'] : [])];
    const age = body.data ? Date.now() - Date.parse(body.data.generatedAt) : 0;
    if (age > 86400000) warnings.unshift('Ces données ont plus de 24 heures. Cliquez sur « Actualiser » pour les mettre à jour.');
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
  const header = ['Categorie', 'Page', 'URL', 'Canal GA4', ...keys.flatMap(key => [...periods.map(p => `${metrics[key].tech} ${data.periods[p].start} au ${data.periods[p].end}`), `${metrics[key].tech} vs semaine precedente (${metrics[key].change || '%'})`, `${metrics[key].tech} vs mois precedent (${metrics[key].change || '%'})`])];
  const rows = filteredPages().map(page => [page.category, page.title, page.path === '(not set)' ? page.path : new URL(page.path, data.siteUrl).href, channel, ...keys.flatMap(key => [...periods.map(period => value(page, key, period)), difference(value(page, key, 'week'), value(page, key, 'previousWeek'), key).raw, difference(value(page, key, 'month'), value(page, key, 'previousMonth'), key).raw])]);
  const content = '\uFEFF' + [header, ...rows].map(row => row.map(csvField).join(';')).join('\r\n');
  const href = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = href; link.download = `observatoire-${channel}-${data.periods.range.end}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(href), 1000);
}

$('#categories').addEventListener('click', event => { const button = event.target.closest('[data-category]'); if (button) { selectedCategory = button.dataset.category; renderCategories(); renderTable(); } });
$('#category-select').addEventListener('change', () => { selectedCategory = $('#category-select').value; renderCategories(); renderTable(); });
$('#all-pages').addEventListener('click', () => { selectedCategory = ''; if (data) { renderCategories(); renderTable(); } });
$('.tabs').addEventListener('click', event => { const button = event.target.closest('[data-view]'); if (!button) return; selectedView = button.dataset.view; for (const tab of document.querySelectorAll('[data-view]')) { tab.classList.toggle('selected', tab === button); tab.setAttribute('aria-selected', String(tab === button)); } if (!views[selectedView].includes(sortKey)) sortKey = views[selectedView][0]; renderTable(); });
$('#compare-tabs').addEventListener('click', event => { const button = event.target.closest('[data-compare]'); if (!button || !data) return; compareMode = button.dataset.compare; rerenderComparisons(); });
$('#table-head').addEventListener('click', event => { const button = event.target.closest('[data-sort]'); if (button) { ascending = sortKey === button.dataset.sort ? !ascending : false; sortKey = button.dataset.sort; renderTable(); } });
document.addEventListener('click', event => { const button = event.target.closest('[data-page]'); if (button) openPage(button.dataset.page); });
$('#search').addEventListener('input', renderTable); $('#hide-empty').addEventListener('change', renderTable);
$('#channel').addEventListener('change', () => { channel = $('#channel').value; data = null; displayedGeneration = ''; $('#dashboard').hidden = true; $('#loading').hidden = false; load(); });
$('#chart-metric').addEventListener('change', renderChart);
$('#chart').addEventListener('mousemove', event => { const tooltip = $('.chart-tooltip'); if (!tooltip || !chartRows.length) return; const rect = $('#chart').getBoundingClientRect(); const left = rect.width * 34 / 650; const index = Math.max(0, Math.min(chartRows.length - 1, Math.round((event.clientX - rect.left - left) / (rect.width - left) * (chartRows.length - 1)))); const row = chartRows[index]; tooltip.hidden = false; tooltip.textContent = `${date(row.date)} · ${format(row.value, $('#chart-metric').value)}`; tooltip.style.left = Math.min(Math.max(0, event.clientX - rect.left - 40), rect.width - 150) + 'px'; });
$('#chart').addEventListener('mouseleave', () => { const tooltip = $('.chart-tooltip'); if (tooltip) tooltip.hidden = true; });
$('#detail-close').addEventListener('click', () => $('#page-dialog').close()); $('#method-open').addEventListener('click', () => $('#method-dialog').showModal()); $('#method-close').addEventListener('click', () => $('#method-dialog').close());
for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
$('#export').addEventListener('click', exportCsv);
$('#refresh').addEventListener('click', async () => { try { $('#refresh').disabled = true; const response = await fetch('/api/refresh?channel=' + channel, { method: 'POST', headers: { 'X-Dashboard-Token': csrf } }); if (!response.ok) throw new Error('Actualisation refusée. Rechargez la page puis réessayez.'); await load(); } catch (error) { $('#warnings').innerHTML = `<div class="warning">${esc(error.message)}</div>`; $('#refresh').disabled = false; } });
load();
