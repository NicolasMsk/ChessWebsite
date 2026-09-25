const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'edition-raffinee/index.html'),'utf8');
const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
const book=schemas.find(s=>Array.isArray(s['@type'])&&s['@type'].includes('Book'));
const faq=schemas.find(s=>s['@type']==='FAQPage');
const plain=s=>s.replace(/<[^>]+>/g,'').replaceAll('&nbsp;',' ').replaceAll('&amp;','&').replace(/\s+/g,' ').trim();
test('Titre, description et H1 ciblent le livre débutant sans duplication',()=>{
 assert.equal((html.match(/<h1>/g)||[]).length,1);
 assert.match(html,/<title>Livre pour apprendre les échecs — Spécial débutants<\/title>/);
 const description=html.match(/name="description" content="([^"]+)"/)[1];
 assert.ok(description.length<=165);
 assert.match(description,/Nicolas Musicki/);
 assert.doesNotMatch(html,/<meta[^>]+(?:noindex|nosnippet|noarchive)/i);
});
test('Une seule entité décrit le livre et le produit, sans avis ni identifiants inventés',()=>{
 assert.deepEqual(book['@type'],['Book','Product']);
 assert.equal(book['@id'],'https://www.cours-echecs-paris.fr/edition-raffinee/#book');
 assert.equal(book.author.name,'Nicolas Musicki');
 assert.equal(book.inLanguage,'fr');
 assert.match(book.audience.audienceType,/0 à 1 000 Elo/);
 assert.equal(book.bookFormat,'https://schema.org/Hardcover');
 for(const key of ['aggregateRating','review','isbn','gtin','sku'])assert.equal(book[key],undefined);
 for(const url of book.image){assert.match(url,/pack-2026-/);assert.ok(fs.existsSync(path.join(root,new URL(url).pathname)));}
 const offer=JSON.parse(fs.readFileSync(path.join(root,'_data/offre-livre.json'),'utf8'));
 assert.equal(book.offers.price,offer.prixSchema);
 assert.equal(book.offers.priceValidUntil,offer.finOffre);
 assert.equal(book.offers.priceCurrency,'EUR');
});
test('Les six réponses structurées correspondent exactement aux réponses visibles',()=>{
 const block=html.match(/<section class="schema-faq" id="faq"[\s\S]*?<\/section>/)[0];
 const visible=[...block.matchAll(/<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)];
 assert.equal(visible.length,6);assert.equal(faq.mainEntity.length,6);
 visible.forEach(([,q,a],i)=>{assert.equal(plain(q),faq.mainEntity[i].name);assert.equal(plain(a),faq.mainEntity[i].acceptedAnswer.text);});
});
test('Ancres uniques, liens locaux valides et prix de commande conservé',()=>{
 const body=html.split('<body>')[1];
 const ids=[...body.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length);
 for(const [,href] of body.matchAll(/href="([^"]+)"/g)){
  if(href.startsWith('#')&&href.length>1)assert.ok(ids.includes(href.slice(1)),href);
  if(href.startsWith('../')&&!href.includes('#'))assert.ok(fs.existsSync(path.resolve(root,'edition-raffinee',href)),href);
 }
 assert.match(body,/class="product-offer__cta" href="https:\/\/buy.stripe.com\//);
 assert.match(body,/Ce n’est pas une promesse de classement/);
});
test('Le résumé llms distingue le guide gratuit du livre et ne garde pas les 96 pages obsolètes',()=>{
 const llms=fs.readFileSync(path.join(root,'llms.txt'),'utf8');
 assert.match(llms,/livre pour débutants de Nicolas Musicki/);
 assert.match(llms,/guide-apprendre-les-echecs.html/);
 assert.doesNotMatch(llms,/Volume 1 \(96 pages\)/);
});
