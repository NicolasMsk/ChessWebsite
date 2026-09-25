// Menu et pied de page communs : chaque page publiée doit porter exactement ce que
// génère scripts/site-navigation.mjs (lancer `node scripts/site-navigation.mjs --write`
// après toute modification du menu ou du pied de page).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {root, pages, transform, navigation, footer} from '../scripts/site-navigation.mjs';

const MENU = ['Cours', 'Tarifs', 'Blog', 'Le livre', 'Réserver un cours'];

test('le menu tient en cinq entrées, la dernière étant le bouton Réserver', () => {
  const html = navigation('index.html');
  const labels = [...html.matchAll(/class="nav-link[^"]*"[^>]*>([^<]+)</g)].map(m => m[1]);
  assert.deepEqual(labels, MENU);
  assert.match(html, /class="nav-link nav-cta"[^>]*>Réserver un cours/);
  assert.doesNotMatch(html, /À propos|Zones|Visio|Cadeau|Guide gratuit/);
});

test('le pied de page regroupe les liens retirés du menu en quatre sections', () => {
  const html = footer();
  const titles = [...html.matchAll(/<h2>([^<]+)<\/h2>/g)].map(m => m[1]);
  assert.deepEqual(titles, ['Cours d’échecs', 'Apprendre', 'Nicolas Musicki', 'Informations']);
  for (const label of ['À domicile', 'En visio', 'Zones desservies', 'Guide PDF gratuit', 'À propos', 'Offrir un cadeau', 'Conditions générales de vente', 'Mentions légales et confidentialité', 'Gérer mes cookies']) {
    assert.ok(html.includes(`>${label}<`), `lien manquant : ${label}`);
  }
});

test('toutes les pages avec menu sont synchronisées avec le générateur', () => {
  const list = pages();
  assert.ok(list.length >= 40, `seulement ${list.length} pages détectées`);
  const desync = list.filter(file => {
    const source = fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
    return transform(source, file) !== source;
  });
  assert.deepEqual(desync, []);
});

test('les cibles du menu existent sur la page d’accueil', () => {
  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const id of ['cours', 'tarifs', 'contact', 'about']) {
    assert.match(home, new RegExp(`id="${id}"`), `ancre #${id} absente de index.html`);
  }
  for (const file of ['blog/index.html', 'edition-raffinee/index.html', 'zones/index.html', 'cours-echecs-en-visio.html', 'guide-apprendre-les-echecs.html', 'idee-cadeau-echecs.html', 'cgv.html', 'mentions-legales.html', 'blog/exercices-echecs-debutant.html', 'zones/cours-echecs-paris-versailles-alentours.html']) {
    assert.ok(fs.existsSync(path.join(root, file)), `page liée absente : ${file}`);
  }
});
