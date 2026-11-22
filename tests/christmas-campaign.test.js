const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const gift=read('idee-cadeau-echecs.html');
const schemas=[...gift.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
const plain=s=>s.replace(/<[^>]+>/g,'').replaceAll('&nbsp;',' ').replaceAll('&amp;','&').replace(/\s+/g,' ').trim();
test('la FAQ cadeau visible et structurée indique les mêmes délais et conditions',()=>{
 const faq=schemas.find(s=>s['@type']==='FAQPage');
 const visible=[...gift.matchAll(/<div class="schema-faq-item"><h3>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p><\/div>/g)];
 assert.equal(visible.length,faq.mainEntity.length);
 visible.forEach(([,q,a],i)=>{assert.equal(plain(q),faq.mainEntity[i].name);assert.equal(plain(a),faq.mainEntity[i].acceptedAnswer.text)});
 assert.doesNotMatch(gift,/14 décembre|maquette|photos.*arrivent bientôt/);
});
test('la sélection contient cinq cadeaux et ne publie aucune offre Black Friday',()=>{
 const graph=schemas.find(s=>s['@graph'])['@graph'];
 const page=graph.find(s=>s['@type']==='WebPage');
 const list=graph.find(s=>s['@type']==='ItemList');
 assert.equal(page.mainEntity['@id'],list['@id']);
 assert.equal(list.itemListElement.length,5);
 assert.match(gift,/<section id="black-friday"[^>]* hidden /);
 const campaign=gift.match(/<section id="black-friday"[\s\S]*?<\/section>/)[0];
 assert.match(campaign,/<div data-black-friday-offer><\/div>/);
 assert.doesNotMatch(campaign,/<del>|\d+\s*%|buy\.stripe\.com/);
});
test('les pages commerciales gardent des liens locaux valides et des ancres uniques',()=>{
 for(const file of ['index.html','idee-cadeau-echecs.html','livres.html','cahiers-exercices-echecs.html','edition-raffinee/index.html']){
  const html=read(file),body=html.split(/<body\b[^>]*>/)[1];
  const ids=[...body.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size,file);
  for(const [,value] of body.matchAll(/(?:href|src)="([^"?]+)(?:\?[^"#]*)?"/g)){
   if(/^(?:https?:|mailto:|tel:|data:|javascript:)/.test(value))continue;
   const [target,hash]=value.split('#');
   const dest=target?path.resolve(root,path.dirname(file),target):path.resolve(root,file);
   assert.ok(fs.existsSync(dest),file+' -> '+value);
   if(hash&&fs.statSync(dest).isFile()&&dest.endsWith('.html'))assert.ok(read(path.relative(root,dest)).includes('id="'+hash+'"'),file+' -> '+value);
  }
 }
});
test('les commandes des cahiers conservent leurs liens Stripe',()=>{
 const cahiers=read('cahiers-exercices-echecs.html');
 for(const id of ['dRm14p0Kj4940lf2hqdQQ05','eVqbJ38cL3501pjf4cdQQ06','9B65kFeB93503xrcW4dQQ07','dRm3cxct19to4Bvf4cdQQ08'])assert.ok(cahiers.includes('https://buy.stripe.com/'+id));
 assert.ok(gift.includes('https://buy.stripe.com/dRm3cxct19to4Bvf4cdQQ08'));
 assert.match(gift,/séances réglées au fil des cours, sans paiement à l’avance/);
});
test('stock et livraison sous sept jours sont cohérents dans le parcours client',()=>{
 for(const file of ['index.html','idee-cadeau-echecs.html','livres.html','cahiers-exercices-echecs.html','edition-raffinee/index.html','commande-confirmee.html','cgv.html','llms.txt','api/order.js','api/worker.js']){
  const text=read(file);
  assert.match(text,/7 jours(?: au)? maximum/,file);
  assert.doesNotMatch(text,/14 jours(?: au)? maximum|(?:fabriqu[ée]s?|fait) (?:sur commande|à la commande)/i,file);
 }
 const contract=read('cgv.html');
 assert.match(contract,/quatorze \(14\) jours/);
 assert.match(contract,/délai maximal de 14 jours/);
});
test('les URL canoniques et sociales désignent la même page commerciale',()=>{
 for(const file of ['idee-cadeau-echecs.html','livres.html','cahiers-exercices-echecs.html','edition-raffinee/index.html']){
  const text=read(file);
  const canonical=text.match(/rel="canonical" href="([^"]+)"/)[1];
  assert.equal(text.match(/property="og:url" content="([^"]+)"/)[1],canonical,file);
  for(const [,json] of text.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){
   const data=JSON.parse(json);
   for(const node of data['@graph']||[data]){
    if(node.offers?.availability==='https://schema.org/InStock'){
     assert.match(node.offers.description,/7 jours maximum/);
     assert.equal(node.offers.eligibleRegion.name,'France métropolitaine');
    }
   }
  }
 }
});
