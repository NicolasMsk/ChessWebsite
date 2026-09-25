const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
for (const file of ['index.html', 'blog/index.html', 'guide-apprendre-les-echecs.html', 'edition-raffinee/index.html']) {
  test(`Le livre est dans le menu : ${file}`, () => {
    const nav = read(file).match(/<nav\b[\s\S]*?<\/nav>/)[0];
    const link = nav.match(/<a href="([^"]+)"[^>]*>Le livre<\/a>/);
    assert.ok(link);
    const target = link[1].startsWith('/') ? path.join(root, link[1]) : path.resolve(root, path.dirname(file), link[1]);
    assert.equal(path.resolve(target), path.join(root, 'edition-raffinee'));
  });
}
test('Le parcours débutant expose huit liens HTML valides', () => {
  const section = read('blog/index.html').match(/<section class="learning-path"[\s\S]*?<\/section>/)[0];
  const links = [...section.matchAll(/<a href="([^"]+)">/g)];
  assert.equal(links.length, 8);
  for (const [, href] of links) assert.ok(fs.existsSync(path.resolve(root, 'blog', href)), href);
  assert.match(section, /guide-apprendre-les-echecs.html/);
  assert.match(section, /edition-raffinee\//);
});
test('Le livre garde son URL canonique indexée et son public cible', () => {
  const html = read('edition-raffinee/index.html');
  assert.match(html, /rel="canonical" href="https:\/\/www.cours-echecs-paris.fr\/edition-raffinee\/"/);
  assert.match(html, /Niveau 0 à 1&nbsp;000 Elo/);
  assert.match(html, /aria-current="page">Le livre/);
});
