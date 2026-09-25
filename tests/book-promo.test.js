const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const targets = [
  'apprendre-jouer-echecs', 'regles-echecs-guide-complet',
  'debuter-echecs-guide-complet-0-500-elo', '10-erreurs-debutant-echecs',
  'meilleures-ouvertures-echecs-debutants', 'exercices-echecs-debutant',
  'finales-echecs', 'echecs-adultes-debutants-30-40-50-ans',
  'comment-apprendre-echecs-enfant', 'stagnation-echecs-progresser',
];
for (const slug of targets) {
  test(`Encart du livre : ${slug}`, () => {
    const html = fs.readFileSync(path.join(root, 'blog', `${slug}.html`), 'utf8');
    assert.equal((html.match(/class="book-promo"/g) || []).length, 1);
    assert.equal((html.match(/href="\.\.\/book-promo.css"/g) || []).length, 1);
    assert.equal((html.match(/id="book-promo-title"/g) || []).length, 1);
    const card = html.match(/<aside class="book-promo"[\s\S]*?<\/aside>/)[0];
    assert.match(card, /aria-labelledby="book-promo-title"/);
    assert.match(card, /loading="lazy"/);
    assert.match(card, /width="1122" height="1402"/);
    assert.match(card, /class="book-promo__cta" href="\.\.\/edition-raffinee\/"/);
    for (const [, url] of card.matchAll(/(?:href|src)="([^"#]+)(?:#[^"]*)?"/g)) {
      assert.ok(fs.existsSync(path.resolve(root, 'blog', url)), url);
      assert.doesNotMatch(url, /\.pdf$/i);
    }
  });
}
test('Le sommaire ciblé existe', () => {
  assert.match(fs.readFileSync(path.join(root, 'edition-raffinee/index.html'), 'utf8'), /id="sommaire-livre"/);
});
test('La promotion reste limitée aux articles sélectionnés', () => {
  for (const name of fs.readdirSync(path.join(root, 'blog')).filter(n => n.endsWith('.html'))) {
    if (!targets.includes(name.slice(0, -5))) {
      assert.doesNotMatch(fs.readFileSync(path.join(root, 'blog', name), 'utf8'), /class="book-promo"/);
    }
  }
});
