/** Rendre une page d'ouverture rédigée : node scripts/ouvertures.mjs --write|--check */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {render as renderRelated, transform as syncRelated} from './articles-lies.mjs';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
export const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json=value=>JSON.stringify(value,null,2).replaceAll('<','\\u003c');
const date=value=>new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'));
const paragraphs=items=>items.map(p=>`<p>${escape(p)}</p>`).join('\n');
const figure=(file,alt,caption)=>`<figure class="opening-diagram"><img src="images/diagrammes/${escape(file)}" alt="${escape(alt)}" width="360" height="350" loading="lazy" decoding="async"><figcaption>${escape(caption)}</figcaption></figure>`;

export function validate(data){
 for(const field of ['slug','name','title','description','h1','subtitle','datePublished','dateModified','answer','intro','fit','side','movesFr','movesSan','eco','image','imageAlt','readTime'])if(!data[field]?.trim())throw Error('Champ manquant : '+field);
 if(!/^ouverture-[a-z0-9-]+$/.test(data.slug))throw Error('Slug invalide');
 for(const field of ['datePublished','dateModified'])if(!/^\d{4}-\d{2}-\d{2}$/.test(data[field])||!Number.isFinite(Date.parse(data[field])))throw Error('Date invalide');
 if(data.dateModified<data.datePublished)throw Error('Date de modification antérieure à la publication');
 if(data.title.length>70||data.description.length>170)throw Error('Métadonnées trop longues');
 if(!data.history?.paragraphs?.length||!data.sources?.length||!data.faq?.length||!data.steps?.length||!data.related?.length)throw Error('Contenu éditorial incomplet');
 const sources=new Set(data.sources.map(s=>s.id));
 for(const id of [data.history.source,data.history.noteSource])if(!sources.has(id))throw Error('Histoire sans source');
 for(const source of data.sources)if(!/^https:\/\//.test(source.url)||!source.checked)throw Error('Source non vérifiable');
 // Le PDF est une ressource réelle et partagée, jamais un téléchargement fictif.
 if(data.pdf?.href!=='../guide-apprendre-les-echecs.html#ebook-form')throw Error('Vérifier le parcours PDF avant de modifier sa destination');
 if(data.variants?.length!==2||!data.trap?.solutionSan||!data.trap?.avoidSan)throw Error('Variantes et prévention incomplètes : '+data.slug);
 if(data.quickReference?.length!==3||data.comparisons?.length!==2)throw Error('Repères et comparaisons manquants');
 const diagrams=JSON.parse(read('_data/diagrammes.json'));
 if(!data.lesson||data.lesson.structure?.length<3||data.lesson.pieces?.length<5||data.lesson.reactions?.length<3||!data.lesson.caseStudy?.solutionSan||data.lesson.transition?.length<2)throw Error('Leçon échiquéenne incomplète : '+data.slug);
 if(data.workshop?.choices?.length!==2||data.workshop?.quiz?.length!==3||!data.workshop?.review)throw Error('Atelier comparatif incomplet : '+data.slug);
 for(const choice of data.workshop.choices)if(choice.san!==data.workshop.startSan+' '+choice.lineSan)throw Error('Suite comparative incohérente : '+data.slug);
 for(const item of [...data.steps,data.plan,data.exercise,data.lesson.caseStudy,...data.workshop.choices,...data.variants,data.trap]){
  const record=diagrams.find(d=>d.file===item.diagram);
  if(!record||record.moves!==item.san||!fs.existsSync(path.join(root,'blog/images/diagrammes',item.diagram)))throw Error('Diagramme sans séquence validée : '+item.diagram);
 }
 if(data.steps.at(-1).san!==data.movesSan)throw Error('La séquence principale ne correspond pas aux étapes');
 const exercise=diagrams.find(d=>d.file===data.exercise.diagram);
 if(!exercise.checks.some(c=>c.type==='line'&&c.moves===data.exercise.solutionSan))throw Error('Solution sans validation échiquéenne');
 const decision=diagrams.find(d=>d.file===data.lesson.caseStudy.diagram);
 if(!decision.checks.some(c=>c.type==='line'&&c.moves===data.lesson.caseStudy.solutionSan))throw Error('Position commentée sans suite validée');
}

export function render(data){
 validate(data);
 const canonical='https://www.cours-echecs-paris.fr/blog/'+data.slug+'.html';
 const article={'@context':'https://schema.org','@type':'Article',headline:data.h1,description:data.description,inLanguage:'fr-FR',datePublished:data.datePublished,dateModified:data.dateModified,mainEntityOfPage:{'@type':'WebPage','@id':canonical},image:'https://www.cours-echecs-paris.fr/blog/'+data.image,author:{'@type':'Person','@id':'https://www.cours-echecs-paris.fr/#nicolas-musicki',name:'Nicolas Musicki',url:'https://www.cours-echecs-paris.fr/'},publisher:{'@type':'Organization',name:'Nicolas Musicki',logo:{'@type':'ImageObject',url:'https://www.cours-echecs-paris.fr/nicolas_musicki.webp'}},citation:data.sources.map(s=>s.url),about:{'@type':'Thing',name:data.name}};
 const faq={'@context':'https://schema.org','@type':'FAQPage',mainEntity:data.faq.map(f=>({'@type':'Question',name:f.q,acceptedAnswer:{'@type':'Answer',text:f.a}}))};
 const breadcrumb={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[['Accueil','https://www.cours-echecs-paris.fr/'],['Ouvertures pour débutants','https://www.cours-echecs-paris.fr/blog/meilleures-ouvertures-echecs-debutants.html'],[data.name,canonical]].map(([name,item],i)=>({'@type':'ListItem',position:i+1,name,item}))};
 const sourceLink=id=>`<a href="#source-${escape(id)}">Source</a>`;
 // Le catalogue suffit au rendu ; la nouvelle page n'a pas à exister auparavant.
 const related={articles:new Map(JSON.parse(read('blog/articles.json')).articles.map(a=>[a.id,a])),recommendations:JSON.parse(read('_data/articles-lies.json'))};
 const selected=related.recommendations[data.slug];
 if(!related.articles.has(data.slug)||selected?.related?.length!==3||new Set(selected.related).size!==3||selected.related.some(id=>id===data.slug||!related.articles.has(id)))throw Error('Inscrire la page et trois recommandations valides au catalogue');
 if(JSON.stringify(selected.related)!==JSON.stringify(data.related))throw Error('Les lectures recommandées ne correspondent pas au contenu');
 for(const link of data.comparisons)if(link.slug===data.slug||!related.articles.has(link.slug))throw Error('Comparaison invalide');
 article.isAccessibleForFree=true;
 article.articleSection=['Ouvertures d’échecs','Plans et variantes','Exercices pour débutants'];
 article.hasPart=[['premiers-coups','Les premiers coups'],['variantes','Variantes expliquées'],['pieges','Pièges et défenses'],['faq','Questions fréquentes']].map(([id,name])=>({'@type':'WebPageElement','@id':canonical+'#'+id,name}));
 const lesson=data.lesson,decision=lesson.caseStudy;
 const lessonTokens={
  QUICK_REFERENCE:data.quickReference.map((text,i)=>'<div><dt>'+['Votre objectif','La décision au centre','Le point de vigilance'][i]+'</dt><dd>'+escape(text)+'</dd></div>').join(''),
  COMPARISONS:data.comparisons.map(link=>'<li><a href="'+escape(link.slug)+'.html">'+escape(related.articles.get(link.slug).title)+'</a><p>'+escape(link.text)+'</p></li>').join(''),
  STRUCTURE:paragraphs(lesson.structure),
  PIECES:lesson.pieces.map(p=>`<div><dt><strong>${escape(p.piece)}</strong><span>${escape(p.squares)}</span></dt><dd>${escape(p.condition)}</dd></div>`).join('\n'),
  REACTIONS:lesson.reactions.map(r=>`<div class="opening-reaction"><h3>${escape(r.title)}</h3><p>${escape(r.text)}</p></div>`).join('\n'),
  CASE_TITLE:escape(decision.title),CASE_CONTEXT:escape(decision.context),
  CASE:figure(decision.diagram,decision.alt,decision.movesFr+' — Trait aux '+(decision.turn==='black'?'Noirs':'Blancs')+'.')+`<div><h3>${escape(decision.question)}</h3><p>Repérez d’abord les menaces et les cases contrôlées, puis proposez une réponse.</p><details class="opening-solution"><summary>Lire l’analyse de la position</summary><p>${escape(decision.answer)}</p></details></div>`,
  TRANSITION:paragraphs(lesson.transition)
 };
 const trap=data.trap;
 Object.assign(lessonTokens,{
  VARIANTS:data.variants.map(item=>'<div class="opening-workshop__choice"><h3>'+escape(item.title)+'</h3><p class="opening-sequence">'+escape(item.movesFr)+'</p>'+figure(item.diagram,item.alt,item.movesFr)+'<p>'+escape(item.idea)+'</p><p><strong>Le plan à comprendre :</strong> '+escape(item.plan)+'</p></div>').join(''),
  TRAP_TITLE:escape(trap.title),
  TRAP:figure(trap.diagram,trap.alt,trap.movesFr+' — Trait aux '+(trap.turn==='black'?'Noirs':'Blancs')+'.')+'<div><p class="opening-sequence">'+escape(trap.movesFr)+'</p><p>Avant de lire la suite, repérez les échecs, les captures et les pièces attaquées.</p><details class="opening-solution"><summary>Voir la suite et le mécanisme</summary><p class="opening-sequence">'+escape(trap.solutionFr)+'</p><p>'+escape(trap.explanation)+'</p></details></div>',
  PREVENTION:'<p>'+escape(trap.prevention)+'</p><p><strong>Suite de référence à rejouer depuis le début :</strong></p><p class="opening-sequence">'+escape(trap.avoidFr)+'</p>'
 });
 const workshop=data.workshop;
 Object.assign(lessonTokens,{
  WORKSHOP_TITLE:escape(workshop.title),
  WORKSHOP_INTRO:paragraphs(workshop.introduction),
  WORKSHOP_START:escape(workshop.startFr),
  WORKSHOP_CHOICES:workshop.choices.map(choice=>`<div class="opening-workshop__choice"><h3>${escape(choice.title)}</h3><p class="opening-sequence">${escape(choice.lineFr)}</p>${figure(choice.diagram,choice.alt,'Position après '+choice.lineFr)}${paragraphs(choice.explanation)}</div>`).join('\n'),
  WORKSHOP_QUIZ:workshop.quiz.map(q=>`<details class="opening-solution"><summary>${escape(q.q)}</summary><p>${escape(q.a)}</p></details>`).join('\n'),
  WORKSHOP_REVIEW:escape(workshop.review)
 });
 const tokens={TITLE:escape(data.title),DESCRIPTION:escape(data.description),CANONICAL:canonical,IMAGE:escape('https://www.cours-echecs-paris.fr/blog/'+data.image),IMAGE_ALT:escape(data.imageAlt),NAME:escape(data.name),H1:escape(data.h1),SUBTITLE:escape(data.subtitle),PUBLISHED_DATE:data.datePublished,DATE:data.dateModified,DATE_TEXT:date(data.dateModified),READ_TIME:escape(data.readTime),SCHEMA:json({'@context':'https://schema.org','@graph':[article,faq,breadcrumb].map(({['@context']:context,...entity})=>entity)}),ANSWER:escape(data.answer),INTRO:escape(data.intro),FIT:escape(data.fit),SIDE:escape(data.side),MOVES:escape(data.movesFr),ECO:escape(data.eco),HISTORY_TITLE:escape(data.history.title),HISTORY:paragraphs(data.history.paragraphs)+`<p class="opening-source-ref">${sourceLink(data.history.source)}</p>`,HISTORY_NOTE:`<p>${escape(data.history.note)} ${sourceLink(data.history.noteSource)}</p>`,STEPS:data.steps.map((step,i)=>`<figure class="opening-viewer__position" data-step="${i}"${i!==data.steps.length-1?' hidden':''}><img src="images/diagrammes/${escape(step.diagram)}" alt="${escape(step.alt)}" width="360" height="350" ${i===data.steps.length-1?'fetchpriority="high"':'loading="lazy"'} decoding="async"><figcaption>${escape(step.label)} — ${escape(step.text)}</figcaption></figure>`).join('\n'),STEP_BUTTONS:data.steps.map((step,i)=>`<button type="button" data-go-step="${i}"${i===data.steps.length-1?' aria-current="step"':''}>${escape(step.label)}</button>`).join('\n'),EXPLANATIONS:data.steps.slice(1).map(step=>`<li><strong>${escape(step.label)}</strong><p>${escape(step.text)}</p></li>`).join('\n'),IDEAS:data.ideas.map(idea=>`<div class="opening-card"><h3>${escape(idea.title)}</h3><p>${escape(idea.text)}</p></div>`).join('\n'),PLAN_TITLE:escape(data.plan.title),PLAN_MOVES:escape(data.plan.movesFr),PLAN:figure(data.plan.diagram,data.plan.alt,data.plan.movesFr)+`<p>${escape(data.plan.text)}</p>`,REPLIES_TITLE:escape(data.repliesTitle||'Deux réponses noires à reconnaître'),REPLIES:data.replies.map(reply=>`<div class="opening-card"><h3>${escape(reply.move)} : ${escape(reply.name)}</h3><p>${escape(reply.text)}</p></div>`).join('\n'),MISTAKES:data.mistakes.map(m=>`<li><h3>${escape(m.title)}</h3><p>${escape(m.text)}</p></li>`).join('\n'),EXERCISE:figure(data.exercise.diagram,data.exercise.alt,data.exercise.turn==='black'?'À vous de jouer — les Noirs ont le trait.':'À vous de jouer — les Blancs ont le trait.')+`<div><h3>${escape(data.exercise.question)}</h3><p>Prenez quelques secondes pour choisir et expliquer votre coup.</p><details class="opening-solution"><summary>Voir la réponse expliquée</summary><p>${escape(data.exercise.answer)}</p></details></div>`,PDF_TITLE:escape(data.pdf.title),PDF_TEXT:escape(data.pdf.text),PDF_NOTE:escape(data.pdf.note),PDF_LABEL:escape(data.pdf.label),PDF_HREF:escape(data.pdf.href),PRACTICE:data.practice.map(p=>`<li>${escape(p)}</li>`).join('\n'),FAQ:data.faq.map(f=>`<div class="schema-faq-item"><h3>${escape(f.q)}</h3><p>${escape(f.a)}</p></div>`).join('\n'),SOURCES:data.sources.map(s=>`<li id="source-${escape(s.id)}"><a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)}</a><span> — consulté le ${date(s.checked)}</span></li>`).join('\n'),RELATED:renderRelated(data.slug,related)};
 Object.assign(tokens,lessonTokens);
 let result=read('scripts/templates/ouverture.html').replace(/\{\{([A-Z_]+)\}\}/g,(_,key)=>{if(!(key in tokens))throw Error('Jeton inconnu : '+key);return tokens[key];});
 if(/\{\{[A-Z_]+\}\}/.test(result))throw Error('Modèle incomplet');
 return syncRelated(result,data.slug,related);
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const write=process.argv.includes('--write'),check=process.argv.includes('--check');
 if(!write&&!check)throw Error('Choisir --write ou --check');
 let changes=0;
 for(const file of fs.readdirSync(path.join(root,'_data/ouvertures')).filter(f=>f.endsWith('.json'))){
  const data=JSON.parse(read('_data/ouvertures/'+file));const target=path.join(root,'blog',data.slug+'.html');const output=render(data);
  if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==output){changes++;if(write)fs.writeFileSync(target,output);}
 }
 console.log(JSON.stringify({mode:write?'écriture':'contrôle',pagesToUpdate:changes}));
 if(check&&changes)process.exitCode=1;
}
