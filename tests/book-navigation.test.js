const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
// Le menu pointe vers le catalogue /livres.html, qui mène lui-même au livre relié
// et aux cahiers : le livre reste donc joignable en deux clics depuis toute page.
for (const file of ['index.html', 'blog/index.html', 'guide-apprendre-les-echecs.html', 'edition-raffinee/index.html']) {
  test(`Les livres sont dans le menu : ${file}`, () => {
    const nav = read(file).match(/<nav\b[\s\S]*?<\/nav>/)[0];
    const link = nav.match(/<a href="([^"]+)"[^>]*>Livres<\/a>/);
    assert.ok(link, 'entrée « Livres » absente du menu');
    assert.equal(link[1], '/livres.html');
  });
}
test('Le catalogue relie le livre et les deux cahiers', () => {
  const html = read('livres.html');
  assert.match(html, /href="edition-raffinee\/"/);
  const cahiers = [...html.matchAll(/href="cahiers-exercices-echecs.html#(\w+)"/g)].map(m => m[1]);
  assert.deepEqual([...new Set(cahiers)].sort(), ['mats', 'pack', 'tactiques']);
  for (const ancre of ['id="mats"', 'id="tactiques"', 'id="pack"']) {
    assert.ok(read('cahiers-exercices-echecs.html').includes(ancre), `${ancre} manquante`);
  }
});
test('Le parcours débutant expose huit liens HTML valides', () => {
  const section = read('blog/index.html').match(/<section class="learning-path"[\s\S]*?<\/section>/)[0];
  const links = [...section.matchAll(/<a href="([^"]+)"[^>]*>/g)];
  assert.equal(links.length, 8);
  for (const [, href] of links) assert.ok(fs.existsSync(path.resolve(root, 'blog', href)), href);
  assert.match(section, /guide-apprendre-les-echecs.html/);
  assert.match(section, /edition-raffinee\//);
});
test('Le livre garde son URL canonique indexée et son public cible', () => {
  const html = read('edition-raffinee/index.html');
  assert.match(html, /rel="canonical" href="https:\/\/www.cours-echecs-paris.fr\/edition-raffinee\/"/);
  assert.match(html, /Niveau 0 à 1&nbsp;000 Elo/);
  assert.match(html, /aria-current="page">Livres/);
});
