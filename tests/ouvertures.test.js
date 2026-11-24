const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'_data/ouvertures/italienne.json'),'utf8'));
const html=fs.readFileSync(path.join(root,'blog/ouverture-italienne.html'),'utf8');
const plain=s=>s.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>');

test('les coups affichés et chaque diagramme renvoient aux séquences vérifiées',()=>{
 const records=JSON.parse(fs.readFileSync(path.join(root,'_data/diagrammes.json'),'utf8'));
 assert.equal(data.movesSan,'e4 e5 Nf3 Nc6 Bc4');
 assert.equal(data.steps.at(-1).san,data.movesSan);
 for(const item of [...data.steps,data.plan,data.exercise]){
  const record=records.find(d=>d.file===item.diagram);
  assert.ok(record,item.diagram);assert.equal(record.moves,item.san);
  assert.ok(html.includes('images/diagrammes/'+item.diagram));
 }
 const exercise=records.find(d=>d.file===data.exercise.diagram);
 assert.ok(exercise.checks.some(c=>c.type==='line'&&c.moves===data.exercise.solutionSan));
});

test('la FAQ visible et les métadonnées correspondent au contenu spécifique de l’Italienne',()=>{
 const graph=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
 const article=graph.find(d=>d['@type']==='Article'),faq=graph.find(d=>d['@type']==='FAQPage');
 const visible=[...html.matchAll(/<div class="schema-faq-item"><h3>([^<]+)<\/h3><p>([^<]+)<\/p>/g)];
 assert.equal(visible.length,faq.mainEntity.length);
 visible.forEach((m,i)=>{assert.equal(plain(m[1]),faq.mainEntity[i].name);assert.equal(plain(m[2]),faq.mainEntity[i].acceptedAnswer.text);});
 assert.equal(article.headline,data.h1);assert.equal(article.datePublished,'2026-11-24');
 assert.equal((html.match(/<h1>/g)||[]).length,1);
 assert.doesNotMatch(html,/\{\{[A-Z_]+\}\}/);
 assert.ok(data.sources.every(s=>article.citation.includes(s.url)));
});

test('les liens, le formulaire PDF existant et les ressources locales sont accessibles dans le dépôt',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,new Set(ids).size);
 for(const [,href] of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(href),href);
 for(const [,url] of html.matchAll(/(?:href|src)="([^"#]+)"/g)){
  if(/^(https?:|mailto:|tel:|data:)/.test(url))continue;
  const target=path.resolve(root,'blog',url.split(/[?#]/)[0]);assert.ok(fs.existsSync(target),url);
 }
 assert.ok(html.includes(data.pdf.href));
 assert.match(fs.readFileSync(path.join(root,'guide-apprendre-les-echecs.html'),'utf8'),/id="ebook-form"/);
 assert.match(data.pdf.note,/Guide général/);
 assert.ok(html.includes('rel="noopener noreferrer"'));
});

test('la position caractéristique et les explications restent disponibles sans JavaScript',()=>{
 const positions=[...html.matchAll(/<figure class="opening-viewer__position"([^>]*)>([\s\S]*?)<\/figure>/g)];
 const visible=positions.filter(m=>!m[1].includes('hidden'));
 assert.equal(visible.length,1);assert.ok(visible[0][2].includes(data.steps.at(-1).diagram));
 assert.equal((html.match(/data-go-step="/g)||[]).length,data.steps.length);
 assert.equal((html.match(/<li><strong>[123]/g)||[]).length,5);
 assert.match(html,/<details class="opening-solution">/);
 assert.match(html,/aria-live="polite"/);
});

test('les onze fiches ont un contenu distinct, une FAQ fidèle et des parcours complets',()=>{
 const directory=path.join(root,'_data/ouvertures');
 const pages=fs.readdirSync(directory).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(directory,f),'utf8')));
 assert.equal(pages.length,11);
 for(const key of ['title','description','h1','answer','subtitle'])assert.equal(new Set(pages.map(p=>p[key])).size,11,key+' dupliqué');
 const hub=fs.readFileSync(path.join(root,'blog/meilleures-ouvertures-echecs-debutants.html'),'utf8');
 const sitemaps=['sitemap.xml','blog/sitemap.xml'].map(p=>fs.readFileSync(path.join(root,p),'utf8'));
 for(const page of pages){
  const file=fs.readFileSync(path.join(root,'blog',page.slug+'.html'),'utf8');
  const graph=JSON.parse(file.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  const faq=graph.find(e=>e['@type']==='FAQPage');
  const article=graph.find(e=>e['@type']==='Article');
  assert.equal(article.headline,page.h1);assert.ok(article.citation.length>=1);
  const answers=[...file.matchAll(/<div class="schema-faq-item"><h3>([^<]+)<\/h3><p>([^<]+)<\/p>/g)];
  assert.equal(answers.length,faq.mainEntity.length,page.slug);
  answers.forEach((m,i)=>{assert.equal(plain(m[1]),faq.mainEntity[i].name);assert.equal(plain(m[2]),faq.mainEntity[i].acceptedAnswer.text);});
  const ids=[...file.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size,page.slug);
  for(const [,fragment] of file.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(fragment),page.slug+'#'+fragment);
  for(const [,url] of file.matchAll(/(?:href|src)="([^"#]+)"/g)){
   if(/^(https?:|mailto:|tel:|data:)/.test(url))continue;
   assert.ok(fs.existsSync(path.resolve(root,'blog',url.split(/[?#]/)[0])),page.slug+' : '+url);
  }
  assert.ok(hub.includes('href="'+page.slug+'.html"'),page.slug+' sans lien entrant');
  assert.ok(sitemaps.every(xml=>xml.includes('/blog/'+page.slug+'.html')),page.slug+' sans sitemap');
  assert.ok(file.includes('../guide-apprendre-les-echecs.html#ebook-form'));
  assert.equal(page.exercise.turn==='black',page.side==='Avec les Noirs');
  if(page.side==='Avec les Noirs')assert.ok(file.includes('À vous de jouer — les Noirs ont le trait.'));
  assert.ok(page.plan.san.split(' ').length<=10,'La ligne illustrative va trop loin : '+page.slug);
 }
});

test('les positions commentées disposent de preuves et les onze leçons expliquent les décisions',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'_data/diagrammes.json'),'utf8'));
 const directory=path.join(root,'_data/ouvertures');
 for(const file of fs.readdirSync(directory).filter(f=>f.endsWith('.json'))){
  const page=JSON.parse(fs.readFileSync(path.join(directory,file),'utf8'));
  const lesson=page.lesson,decision=lesson.caseStudy;
  const record=manifest.find(r=>r.file===decision.diagram);
  assert.ok(record,page.slug);assert.equal(record.moves,decision.san);
  assert.ok(record.checks.some(c=>c.type==='line'&&c.moves===decision.solutionSan),page.slug+' sans preuve');
  assert.ok(record.checks.every(c=>c.type!=='attacks'||decision.checks.some(d=>JSON.stringify(d)===JSON.stringify(c))));
  const html=fs.readFileSync(path.join(root,'blog',page.slug+'.html'),'utf8');
  for(const id of ['lire-position','placement-pieces','reagir','position-commentee','apres-ouverture'])assert.ok(html.includes('id="'+id+'"'),page.slug+' : '+id);
  assert.ok(lesson.pieces.some(p=>/cavalier/i.test(p.piece)));assert.ok(lesson.pieces.some(p=>/fou/i.test(p.piece)));
  assert.ok(html.includes(decision.diagram));
  assert.ok(html.includes(plain(decision.question).replace(/&/g,'&amp;').replace(/'/g,'&#39;')));
 }
 const scotch=JSON.parse(fs.readFileSync(path.join(directory,'ecossaise.json'),'utf8'));
 assert.equal(scotch.lesson.caseStudy.san,'e4 e5 Nf3 Nc6 d4 exd4 Qxd4');
 assert.equal(scotch.lesson.caseStudy.solutionSan,'Nxd4');
 const spanish=JSON.parse(fs.readFileSync(path.join(directory,'espagnole.json'),'utf8'));
 assert.deepEqual(spanish.lesson.caseStudy.checks.filter(c=>c.type==='attacks'),[{type:'attacks',from:'d4',targets:['e4','e5']}]);
});

test('les ateliers relient leurs coups, diagrammes et quiz sans remplacer le maillage ou le PDF',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'_data/diagrammes.json'),'utf8'));
 const directory=path.join(root,'_data/ouvertures');
 for(const file of fs.readdirSync(directory).filter(f=>f.endsWith('.json'))){
  const page=JSON.parse(fs.readFileSync(path.join(directory,file),'utf8'));
  const workshop=page.workshop;
  assert.equal(workshop.choices.length,2);assert.equal(workshop.quiz.length,3);
  const html=fs.readFileSync(path.join(root,'blog',page.slug+'.html'),'utf8');
  assert.ok(html.includes('id="atelier"'));assert.ok(html.includes('href="#atelier"'));
  for(const choice of workshop.choices){
   assert.equal(choice.san,workshop.startSan+' '+choice.lineSan);
   const record=manifest.find(r=>r.file===choice.diagram);
   assert.ok(record,choice.diagram);assert.equal(record.moves,choice.san);
   assert.deepEqual(record.checks,choice.checks);
   assert.ok(html.includes(choice.diagram));
  }
  for(const question of workshop.quiz)assert.ok(html.includes('<summary>'+question.q+'</summary>'),page.slug);
  assert.ok(html.includes('../guide-apprendre-les-echecs.html#ebook-form'));
  assert.equal((html.match(/<!-- blog-related:start -->/g)||[]).length,1);
 }
});

test('les variantes et pièges conservent leurs preuves, leurs défenses et leurs liens de sommaire',()=>{
 const records=JSON.parse(fs.readFileSync(path.join(root,'_data/diagrammes.json'),'utf8'));
 for(const name of fs.readdirSync(path.join(root,'_data/ouvertures')).filter(f=>f.endsWith('.json'))){
  const page=JSON.parse(fs.readFileSync(path.join(root,'_data/ouvertures',name),'utf8'));
  const html=fs.readFileSync(path.join(root,'blog',page.slug+'.html'),'utf8');
  for(const section of ['variantes','pieges']){assert.ok(html.includes('id="'+section+'"'));assert.ok(html.includes('href="#'+section+'"'));}
  for(const item of [...page.variants,page.trap]){
   const record=records.find(r=>r.file===item.diagram);assert.equal(record.moves,item.san);assert.ok(html.includes(item.diagram));
   for(const proof of item.checks||[])assert.ok(record.checks.some(c=>JSON.stringify(c)===JSON.stringify(proof)),page.slug+' : preuve manquante');
  }
  assert.ok(html.includes(page.trap.solutionFr));assert.ok(html.includes(page.trap.avoidFr));
  assert.ok(page.trap.checks.some(c=>c.afterChecks?.some(a=>a.type==='material')));
 }
});

test('les repères visibles, les comparaisons et les métadonnées sont cohérents sur les onze pages',()=>{
 const directory=path.join(root,'_data/ouvertures');
 for(const name of fs.readdirSync(directory).filter(n=>n.endsWith('.json'))){
  const page=JSON.parse(fs.readFileSync(path.join(directory,name),'utf8'));
  const html=fs.readFileSync(path.join(root,'blog',page.slug+'.html'),'utf8');
  const graph=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  const article=graph.find(e=>e['@type']==='Article');
  assert.equal(article.isAccessibleForFree,true);
  for(const part of article.hasPart)assert.ok(html.includes('id="'+part['@id'].split('#')[1]+'"'));
  for(const value of page.quickReference)assert.ok(plain(html).includes(value));
  for(const link of page.comparisons){assert.notEqual(link.slug,page.slug);assert.ok(html.includes('href="'+link.slug+'.html"'));assert.ok(fs.existsSync(path.join(root,'blog',link.slug+'.html')));}
  const description=html.match(/<meta name="description" content="([^"]+)"/)[1];
  assert.equal(plain(description),page.description);
  for(const name of ['og:description','twitter:description'])assert.ok(html.includes(name+'" content="'+description+'"')); 
  assert.match(html,/<details class="opening-contents" open>/);
  assert.match(html,/width=device-width, initial-scale=1/);
  assert.doesNotMatch(html,/maximum-scale=1|user-scalable=no/);
 }
});

test('le sommaire mobile se replie, reste ouvrable et réagit au changement de largeur',()=>{
 const vm=require('node:vm');const events={};const links=[{},{}];
 const media={matches:true,addEventListener:(name,fn)=>events[name]=fn};
 const contents={open:true,querySelectorAll:()=>links.map(link=>({addEventListener:(name,fn)=>link[name]=fn}))};
 const document={querySelectorAll:()=>[],querySelector:()=>contents};
 vm.runInNewContext(fs.readFileSync(path.join(root,'ouvertures.js'),'utf8'),{document,window:{matchMedia:()=>media}});
 assert.equal(contents.open,false);contents.open=true;links[0].click();assert.equal(contents.open,false);
 media.matches=false;events.change();assert.equal(contents.open,true);
 links[1].click();assert.equal(contents.open,true);
});

test('aucun jeton de modèle {{…}} ne reste dans les pages publiées', () => {
  const fs = require('node:fs'), path = require('node:path');
  const dir = path.join(__dirname, '..', 'blog');
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.html'))) {
    assert.doesNotMatch(fs.readFileSync(path.join(dir, file), 'utf8'), /\{\{[^{}]*\}\}/, file);
  }
});

test('les encarts Sources et vérification et leurs ancres ne sont plus affichés',()=>{
 for(const name of fs.readdirSync(path.join(root,'blog')).filter(n=>n.endsWith('.html'))){
  const html=fs.readFileSync(path.join(root,'blog',name),'utf8');
  assert.doesNotMatch(html,/Sources et vérification/,name);
  if(name.startsWith('ouverture-'))assert.doesNotMatch(html,/href="#sources?[^"]*"|class="opening-sources"/,name);
 }
});
