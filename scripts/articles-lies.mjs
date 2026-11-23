/** Recommandations éditoriales écrites dans le HTML, sans dépendance à JavaScript.
 * node scripts/articles-lies.mjs --check
 * node scripts/articles-lies.mjs --write --date=2026-11-23
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function load(){
 const catalog=JSON.parse(fs.readFileSync(path.join(root,'blog/articles.json'),'utf8')).articles;
 const recommendations=JSON.parse(fs.readFileSync(path.join(root,'_data/articles-lies.json'),'utf8'));
 const redirects=[],articles=new Map();
 for(const a of catalog){
  if(!/^[a-z0-9-]+$/.test(a.id)||articles.has(a.id)||redirects.includes(a.id))throw Error('Identifiant invalide ou dupliqué : '+a.id);
  const source=fs.readFileSync(path.join(root,'blog',a.id+'.html'),'utf8');
  if(/http-equiv="refresh"/i.test(source)){redirects.push(a.id);continue;}
  articles.set(a.id,{...a,source});
 }
 const publicHtml=fs.readdirSync(path.join(root,'blog')).filter(f=>f.endsWith('.html')&&f!=='index.html');
 if(publicHtml.some(f=>!catalog.some(a=>a.id+'.html'===f)))throw Error('Une page du blog manque au catalogue.');
 if(Object.keys(recommendations).length!==articles.size||[...articles.keys()].some(id=>!recommendations[id]))throw Error('Chaque article doit avoir une sélection éditoriale.');
 const inbound=new Map([...articles.keys()].map(id=>[id,0]));
 for(const [id,r] of Object.entries(recommendations)){
  if(!articles.has(id)||!r.description?.trim()||r.related?.length!==3||new Set(r.related).size!==3)throw Error('Sélection incomplète : '+id);
  for(const target of r.related){
   if(target===id||!articles.has(target))throw Error('Cible invalide ou redirigée : '+id+' → '+target);
   inbound.set(target,inbound.get(target)+1);
  }
 }
 if([...inbound].some(([,n])=>n===0))throw Error('Un article ne reçoit aucune recommandation.');
 return {articles,redirects,recommendations,inbound};
}

export function render(id,data){
 const links=data.recommendations[id].related.map(target=>{
  const article=data.articles.get(target);
  return `        <li><a class="blog-related__card" href="${target}.html"><h3>${escape(article.title)}</h3><p>${escape(data.recommendations[target].description)}</p><span class="blog-related__read">Lire l’article <span aria-hidden="true">→</span></span></a></li>`;
 }).join('\n');
 return `<!-- blog-related:start -->
    <aside class="blog-related" aria-labelledby="blog-related-title">
      <p class="blog-related__eyebrow">Poursuivre votre lecture</p>
      <h2 class="blog-related__title" id="blog-related-title">À lire aussi</h2>
      <ul class="blog-related__list">
${links}
      </ul>
    </aside>
    <!-- blog-related:end -->`;
}

function legacyBlocks(source){
 const result=[];
 for(const match of source.matchAll(/<div\b[^>]*class="article-recommendation"[^>]*>/g)){
  const tags=/<(\/?)div\b[^>]*>/g;tags.lastIndex=match.index;let depth=0,end;
  for(let tag;(tag=tags.exec(source));){depth+=tag[1]?-1:1;if(!depth){end=tags.lastIndex;break;}}
  if(!end)throw Error('Ancien bloc non fermé');
  result.push({start:match.index,end,html:source.slice(match.index,end)});
 }
 return result;
}

export function transform(source,id,data){
 let result=source.replace(/<!-- blog-related:start -->[\s\S]*?<!-- blog-related:end -->\s*/g,'');
 result=result.replace(/href="((?:\.\.\/)?blog-style\.css)(?:\?[^"]*)?"/g,'href="$1?v=20261123"');
 // Remplace les anciens blocs de lecture ; conserve les encarts du guide,
 // des cours et des cadeaux commerciaux, ainsi que tous les liens du texte.
 const removable=legacyBlocks(result).filter(block=>{
  const title=block.html.match(/<h[234][^>]*>([\s\S]*?)<\/h[234]>/)?.[1].replace(/<[^>]*>/g,'').trim()||'';
  const generic=/^(?:Articles? recommand|À lire aussi|Pour continuer votre apprentissage|Le cadeau est pour|Revoir les erreurs fréquentes)/i.test(title);
  const links=[...block.html.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
  return generic&&links.length&&links.every(href=>[...data.articles.keys()].some(target=>href===target+'.html'));
 });
 for(const block of removable.reverse()){
  const lineStart=result.lastIndexOf('\n',block.start)+1;
  const start=/^[ \t]*$/.test(result.slice(lineStart,block.start))?lineStart:block.start;
  const following=result.slice(block.end).match(/^[ \t]*\r?\n/);
  const end=block.end+(following?.[0].length||0);
  result=result.slice(0,start)+result.slice(end);
 }
 const author=/<aside\b[^>]*class="author-box"[^>]*>/;
 if(!author.test(result))throw Error('Encart auteur absent : '+id);
 return result.replace(author,render(id,data)+'\n\n    $&');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const data=load(),write=process.argv.includes('--write');
 const date=process.argv.find(a=>a.startsWith('--date='))?.slice(7);
 if(write&&!/^\d{4}-\d{2}-\d{2}$/.test(date||''))throw Error('Indiquer la date exacte avec --date=AAAA-MM-JJ.');
 const changed=[];
 for(const [id,a] of data.articles){
  let next=transform(a.source.replace(/\r\n/g,'\n'),id,data);
  if(next===a.source.replace(/\r\n/g,'\n'))continue;
  changed.push(id);
  if(write){
   next=next.replace(/("dateModified"\s*:\s*")[^"]+/g,'$1'+date).replace(/(<meta[^>]+(?:property="article:modified_time"|itemprop="dateModified")[^>]+content=")[^"]+/g,'$1'+date);
   fs.writeFileSync(path.join(root,'blog',id+'.html'),next);
  }
 }
 if(write&&changed.length)for(const file of ['sitemap.xml','blog/sitemap.xml']){
  const name=path.join(root,file),before=fs.readFileSync(name,'utf8');
  const after=before.replace(/<url>[\s\S]*?<\/url>/g,block=>changed.some(id=>block.includes('/blog/'+id+'.html'))?block.replace(/<lastmod>[^<]+<\/lastmod>/,'<lastmod>'+date+'</lastmod>'):block);
  fs.writeFileSync(name,after);
 }
 console.log(JSON.stringify({articles:data.articles.size,redirects:data.redirects.length,recommendations:data.articles.size*3,articlesWithoutIncomingLink:[...data.inbound].filter(([,n])=>!n).length,changed:changed.length,mode:write?'écriture':'contrôle'},null,2));
 if(!write&&changed.length){console.error('Recommandations à synchroniser : '+changed.join(', '));process.exitCode=1;}
}
