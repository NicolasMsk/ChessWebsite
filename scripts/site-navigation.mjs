import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chargerOffre} from './prix-livre.mjs';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function pages(){
 return ['', 'blog','zones','edition-raffinee'].flatMap(dir=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).filter(e=>e.isFile()&&e.name.endsWith('.html')&&(dir!=='edition-raffinee'||e.name==='index.html')).map(e=>[dir,e.name].filter(Boolean).join('/'))).filter(file=>/<nav\b[^>]*class="[^"]*navbar/.test(fs.readFileSync(path.join(root,file),'utf8')));
}
// Tous les liens sont relatifs à la page (préfixe ../ selon la profondeur) :
// le site se consulte donc aussi en local, en ouvrant simplement un fichier
// dans le navigateur, sans serveur — menu, pied de page et styles compris.
export function prefixe(file){ return '../'.repeat(file.split('/').length-1); }
export function bandeau(file){
 const offre=chargerOffre();
 const vente=file==='edition-raffinee/index.html';
 return '<aside class="promo-banner rentree-banner" aria-label="Offre sur le livre relié à la main"><div class="rentree-banner__inner">'+
 '<div class="rentree-banner__copy"><span class="rentree-banner__tag">'+offre.mention+'</span><span class="rentree-banner__detail">Livre relié à la main · 200 pages pour débuter · Livraison comprise</span></div>'+
 '<div class="rentree-banner__offer"><strong>'+offre.prix+' €</strong></div>'+
 '<a class="rentree-banner__cta" href="'+(vente?'#pack-livres':prefixe(file)+'edition-raffinee/')+'">'+(vente?'Voir l’offre':'Découvrir le livre')+' →</a></div></aside>';
}
export function navigation(file){
 const p=prefixe(file);
 const current=file==='guide-apprendre-les-echecs.html'?'Guide gratuit':['edition-raffinee/index.html','livres.html','cahiers-exercices-echecs.html'].includes(file)?'Livres':file.startsWith('blog/')?'Blog':file.startsWith('zones/')||file==='cours-echecs-en-visio.html'?'Cours':null;
 return `<nav class="navbar site-nav" aria-label="Navigation principale">
    <div class="container">
      <a href="${p}index.html" class="logo"><i class="fa-solid fa-chess-knight" aria-hidden="true"></i> Nicolas Musicki</a>
      <button type="button" class="menu-toggle" id="mobile-menu" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="nav-menu">
        <span class="bar"></span><span class="bar"></span><span class="bar"></span>
      </button>
      <ul class="nav-menu" id="nav-menu">
${[['Cours','index.html#cours'],['Tarifs','index.html#tarifs'],['Guide gratuit','guide-apprendre-les-echecs.html'],['Livres','livres.html'],['Blog','blog/index.html'],['Réserver un cours','index.html#contact']].map(([label,href])=>`        <li><a href="${p}${href}" class="nav-link${label==='Réserver un cours'?' nav-cta':''}"${label===current?' aria-current="'+(label==='Cours'?'location':'page')+'"':''}>${label}</a></li>`).join('\n')}
      </ul>
    </div>
  </nav>`;
}
export function footer(file){
 const p=prefixe(file);
 const groups=[
  ['Cours d’échecs',[['À domicile','zones/index.html'],['En visio','cours-echecs-en-visio.html'],['Cours pour seniors','cours-echecs-seniors.html'],['Chess lessons in English','chess-lessons-paris.html'],['Zones desservies','zones/cours-echecs-paris-versailles-alentours.html'],['Tarifs et réservation','index.html#tarifs']]],
  ['Apprendre',[['Articles du blog','blog/index.html'],['Guide PDF gratuit','guide-apprendre-les-echecs.html'],['Livre pour débutants','edition-raffinee/index.html'],['Cahiers d’exercices','cahiers-exercices-echecs.html'],['Exercices gratuits','blog/exercices-echecs-debutant.html']]],
  ['Nicolas Musicki',[['À propos','index.html#about'],['Tous les livres','livres.html'],['Offrir un cadeau','idee-cadeau-echecs.html']]],
  ['Informations',[['Contact','index.html#contact'],['Conditions générales de vente','cgv.html'],['Mentions légales et confidentialité','mentions-legales.html'],['Gérer mes cookies','mentions-legales.html#rgpd']]],
 ].map(([title,links])=>[title,links.map(([label,href])=>[label,p+href])]);
 // Balisage et classes du pied de page HISTORIQUE du site (.footer-content,
 // .footer-links, .footer-social…) : ils sont déjà stylés par style.css et
 // blog-style.css sur toutes les pages. On ne change que le contenu des rubriques.
 return `<footer>
    <div class="container">
      <div class="footer-content">
        <div class="footer-logo">
          <i class="fa-solid fa-chess-knight"></i> Nicolas Musicki
          <p>Professeur d’échecs à Paris, Versailles et en visio</p>
        </div>
${groups.map(([title,links])=>`        <div class="footer-links">\n          <h4>${title}</h4>\n          <ul>\n${links.map(([label,href])=>`            <li><a href="${href}"${label==='Gérer mes cookies'?' onclick="if (typeof chessCookiesReset === \'function\') { chessCookiesReset(); return false; }"':''}>${label}</a></li>`).join('\n')}\n          </ul>\n        </div>`).join('\n')}
        <div class="footer-social">
          <h4>Suivez-moi</h4>
          <div class="social-icons">
            <a href="https://www.instagram.com/magickchess/" class="social-icon" aria-label="Instagram" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-instagram"></i></a>
            <a href="https://www.linkedin.com/in/nicolas-musicki-4867a4184/" class="social-icon" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-linkedin-in"></i></a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© 2026 Nicolas Musicki — Tous droits réservés.</p>
      </div>
    </div>
  </footer>`;
}
function retirerBandeau(source){
 const opening=/<(div|aside)\b[^>]*class="promo-banner[^>]*>/.exec(source);
 if(!opening)return source;
 const tags=new RegExp('<(/?)'+opening[1]+'\\b[^>]*>','g');
 tags.lastIndex=opening.index;
 let depth=0;
 for(let tag;(tag=tags.exec(source));){
   depth+=tag[1]?-1:1;
   if(depth===0)return source.slice(0,opening.index)+source.slice(tags.lastIndex).replace(/^\s*/, '');
 }
 throw Error('Bandeau non fermé');
}
export function transform(source,file){
 const p=prefixe(file);
 let result=source.replace(/<nav\b[^>]*class="[^"]*navbar[^>]*>[\s\S]*?<\/nav>/,navigation(file));
 const footers=[...result.matchAll(/<footer\b[^>]*>[\s\S]*?<\/footer>/g)];
 const last=footers.at(-1);if(!last)throw Error('Footer manquant : '+file);
 result=result.slice(0,last.index)+footer(file)+result.slice(last.index+last[0].length);
 // Chemins relatifs vers la feuille et le script communs : la page reste
 // consultable en local, ouverte directement dans le navigateur.
 result=result.replace(/(href|src)="(?:\.\.\/)*\/?site-navigation\.(css|js)"/g,(_m,attr,ext)=>`${attr}="${p}site-navigation.${ext}"`);
 if(!result.includes(`href="${p}site-navigation.css"`))result=result.replace('</head>',`  <link rel="stylesheet" href="${p}site-navigation.css">\n  <script src="${p}site-navigation.js" defer></script>\n</head>`);
 // Le bandeau est présent sans JavaScript sur toutes les pages du site.
 result=retirerBandeau(result);
 result=result.replace(/<body\b([^>]*)>/,(_m,attrs)=>{
   if(/class="/.test(attrs)) attrs=attrs.replace(/class="([^"]*)"/,(_c,classes)=>'class="'+[...new Set([...classes.split(/\s+/).filter(Boolean),'has-promo','has-rentree-promo'])].join(' ')+'"');
   else attrs+=' class="has-promo has-rentree-promo"';
   return '<body'+attrs+'>';
 });
 result=result.replace(/^[ \t]*<(?:link|script)\b[^>]*(?:href|src)="[^"]*promo-rentree\.(?:css|js)[^"]*"[^>]*>(?:<\/script>)?\r?\n/gm,'');
 result=result.replace('</head>','  <link rel="stylesheet" href="'+p+'promo-rentree.css?v=4">\n  <script src="'+p+'promo-rentree.js?v=4" defer></script>\n</head>');
 result=result.replace(/<nav\b[^>]*class="[^"]*navbar/,bandeau(file)+'\n  <nav class="navbar');
 return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 // Usage : node scripts/site-navigation.mjs [--check | --write] [page.html …]
 //   --check : code de sortie 1 si une page n'a pas le menu et le pied de page communs
 //   --write : réécrit directement les pages (menu, pied de page, feuille et script communs)
 //   sinon   : imprime un patch à relire
 const selected=process.argv.filter(a=>a.endsWith('.html'));
 let patch='*** Begin Patch\n';let changes=0;
 for(const file of pages().filter(f=>!selected.length||selected.includes(f))){
  const old=fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
  const next=transform(old,file);if(old===next)continue;changes++;
  if(process.argv.includes('--check')){console.error('Navigation non synchronisée : '+file);continue;}
  if(process.argv.includes('--write')){fs.writeFileSync(path.join(root,file),next);console.log('Mis à jour : '+file);continue;}
  // Blocs ciblés : ne pas réécrire le contenu éditorial ni les scripts des pages.
  patch+='*** Update File: '+file+'\n';
  const oldNav=old.match(/<nav\b[^>]*class="[^"]*navbar[^>]*>[\s\S]*?<\/nav>/)[0];
  const oldFooter=[...old.matchAll(/<footer\b[^>]*>[\s\S]*?<\/footer>/g)].at(-1)[0];
  for(const [before,after] of [[oldNav,navigation(file)],[oldFooter,footer(file)]]){
   if(before===after)continue;
   // La première ligne conserve son indentation d'origine.
   const lineStart=old.lastIndexOf('\n',old.indexOf(before))+1;
   const indent=old.slice(lineStart,old.indexOf(before));
   patch+='@@\n'+(indent+before).split('\n').map(l=>'-'+l).join('\n')+'\n'+(indent+after).split('\n').map(l=>'+'+l).join('\n')+'\n';
  }
  if(!/site-navigation\.css/.test(old)){const p=prefixe(file);patch+=`@@\n-</head>\n+  <link rel="stylesheet" href="${p}site-navigation.css">\n+  <script src="${p}site-navigation.js" defer></script>\n+</head>\n`;}
 }
 if(process.argv.includes('--check'))process.exitCode=changes?1:0;
 else if(process.argv.includes('--write'))console.log(changes+' page(s) réécrite(s).');
 else process.stdout.write(patch+'*** End Patch');
}
