import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = relative => fs.readFile(path.join(siteRoot, relative), 'utf8');

test('the static blog directory exposes every article without JavaScript', async () => {
  const [index, source] = await Promise.all([read('blog/index.html'), read('blog/articles.json')]);
  const articles = JSON.parse(source).articles;
  const directory = index.match(/<nav class="article-directory"[\s\S]*?<\/nav>/)?.[0];
  assert.ok(directory, 'missing static article directory');
  for (const article of articles) {
    const href = article.url || `${article.id}.html`;
    assert.ok(directory.includes(`href="${href}"`), article.id);
  }
});

test('both sitemaps contain every canonical blog article', async () => {
  const [source, rootSitemap, blogSitemap, robots] = await Promise.all([
    read('blog/articles.json'), read('sitemap.xml'), read('blog/sitemap.xml'), read('robots.txt'),
  ]);
  const articles = JSON.parse(source).articles;
  let canonicalCount = 0;
  for (const article of articles) {
    const page = await read(`blog/${article.id}.html`);
    const canonical = page.match(/<link\s+rel="canonical"\s+href="([^"]+)"/)?.[1];
    const expected = `https://www.cours-echecs-paris.fr/blog/${article.id}.html`;
    if (canonical !== expected) continue;
    canonicalCount++;
    assert.ok(rootSitemap.includes(`<loc>${expected}</loc>`), `root sitemap: ${article.id}`);
    assert.ok(blogSitemap.includes(`<loc>${expected}</loc>`), `blog sitemap: ${article.id}`);
  }
  assert.equal(canonicalCount, 34);
  assert.match(robots, /Sitemap: https:\/\/www\.cours-echecs-paris\.fr\/blog\/sitemap\.xml/);
});
