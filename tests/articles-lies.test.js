import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {load,transform,render,root} from '../scripts/articles-lies.mjs';

test('tous les articles du catalogue ont trois recommandations valides, distinctes et sans boucle vers eux-mêmes',()=>{
 const data=load();
 for(const [id,a] of data.articles){
  const source=a.source.replace(/\r\n/g,'\n');
  assert.equal((source.match(/<!-- blog-related:start -->/g)||[]).length,1,id);
  assert.equal((source.match(/id="blog-related-title"/g)||[]).length,1,id);
  assert.ok(source.includes(render(id,data)),id+' : contenu désynchronisé');
  assert.equal(transform(source,id,data),source,id+' : génération non idempotente');
  const links=[...render(id,data).matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(links.length,3);assert.equal(new Set(links).size,3);
  for(const href of links){assert.notEqual(href,id+'.html');assert.ok(data.articles.has(href.slice(0,-5)));assert.ok(fs.existsSync(path.join(root,'blog',href)));}
 }
});

test('chaque article reçoit une recommandation et les anciennes adresses redirigées sont exclues',()=>{
 const data=load();
 for(const [id,n] of data.inbound)assert.ok(n>0,id+' isolé');
 for(const id of data.redirects){
  const source=fs.readFileSync(path.join(root,'blog',id+'.html'),'utf8');
  assert.match(source,/http-equiv="refresh"/i);assert.doesNotMatch(source,/blog-related:start/);
 }
});

test('les liens dans le texte et les encarts commerciaux sont conservés lors du remplacement',()=>{
 const data=load(),id='10-erreurs-debutant-echecs';
 const source='<p>Relire les <a href="regles-echecs-guide-complet.html">règles illustrées</a>.</p>'+
 '<div class="article-recommendation"><h3>Article recommandé</h3><a href="finales-echecs.html">Ancienne recommandation</a></div>'+
 '<div class="article-recommendation"><h3>Pour aller plus loin</h3><a href="../guide-apprendre-les-echecs.html">Guide gratuit</a></div>'+
 '<aside class="author-box"><p>Auteur</p></aside>';
 const result=transform(source,id,data);
 assert.ok(result.includes('<a href="regles-echecs-guide-complet.html">règles illustrées</a>'));
 assert.ok(result.includes('<a href="../guide-apprendre-les-echecs.html">Guide gratuit</a>'));
 assert.doesNotMatch(result,/Ancienne recommandation/);
 assert.equal((result.match(/blog-related:start/g)||[]).length,1);
});

test('la page des dix erreurs propose exercices, ouvertures et finales dans un bloc HTML accessible',()=>{
 const data=load(),block=render('10-erreurs-debutant-echecs',data);
 for(const id of ['exercices-echecs-debutant','meilleures-ouvertures-echecs-debutants','finales-echecs'])assert.ok(block.includes('href="'+id+'.html"'));
 assert.match(block,/aria-labelledby="blog-related-title"/);
 assert.match(block,/>À lire aussi<\/h2>/);
 assert.doesNotMatch(block,/onclick=|target="_blank"|nofollow/);
});
