import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function pages(){
 return ['', 'blog','zones','edition-raffinee'].flatMap(dir=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).filter(e=>e.isFile()&&e.name.endsWith('.html')&&(dir!=='edition-raffinee'||e.name==='index.html')).map(e=>[dir,e.name].filter(Boolean).join('/'))).filter(file=>/<nav\b[^>]*class="[^"]*navbar/.test(fs.readFileSync(path.join(root,file),'utf8')));
}
export function navigation(file){
 const current=file==='edition-raffinee/index.html'?'Le livre':file.startsWith('blog/')?'Blog':file.startsWith('zones/')||file==='cours-echecs-en-visio.html'?'Cours':null;
 return `<nav class="navbar site-nav" aria-label="Navigation principale">
    <div class="container">
      <a href="/" class="logo"><i class="fa-solid fa-chess-knight" aria-hidden="true"></i> Nicolas Musicki</a>
      <button type="button" class="menu-toggle" id="mobile-menu" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="nav-menu">
        <span class="bar"></span><span class="bar"></span><span class="bar"></span>
      </button>
      <ul class="nav-menu" id="nav-menu">
${[['Cours','/#cours'],['Tarifs','/#tarifs'],['Blog','/blog/'],['Le livre','/edition-raffinee/'],['Réserver un cours','/#contact']].map(([label,href],i)=>`        <li><a href="${href}" class="nav-link${i===4?' nav-cta':''}"${label===current?' aria-current="'+(label==='Cours'?'location':'page')+'"':''}>${label}</a></li>`).join('\n')}
      </ul>
    </div>
  </nav>`;
}
export function footer(){
 const groups=[
  ['Cours d’échecs',[['À domicile','/zones/'],['En visio','/cours-echecs-en-visio.html'],['Zones desservies','/zones/cours-echecs-paris-versailles-alentours.html'],['Tarifs et réservation','/#tarifs']]],
  ['Apprendre',[['Articles du blog','/blog/'],['Guide PDF gratuit','/guide-apprendre-les-echecs.html'],['Livre pour débutants','/edition-raffinee/'],['Exercices gratuits','/blog/exercices-echecs-debutant.html']]],
  ['Nicolas Musicki',[['À propos','/#about'],['Offrir un cadeau','/idee-cadeau-echecs.html'],['Instagram','https://www.instagram.com/magickchess/'],['LinkedIn','https://www.linkedin.com/in/nicolas-musicki-4867a4184/']]],
  ['Informations',[['Contact','/#contact'],['Conditions générales de vente','/cgv.html'],['Mentions légales et confidentialité','/mentions-legales.html'],['Gérer mes cookies','/mentions-legales.html#rgpd']]],
 ];
 return `<footer class="site-footer">
    <div class="container">
      <div class="site-footer__intro"><a href="/">Nicolas Musicki</a><p>Professeur d’échecs à Paris, Versailles et en visio.</p></div>
      <div class="site-footer__grid">
${groups.map(([title,links])=>`        <div class="site-footer__group">\n          <h2>${title}</h2>\n          <ul>\n${links.map(([label,href])=>`            <li><a href="${href}"${label==='Gérer mes cookies'?' onclick="if (typeof chessCookiesReset === \'function\') { chessCookiesReset(); return false; }"':''}>${label}</a></li>`).join('\n')}\n          </ul>\n        </div>`).join('\n')}
      </div>
      <p class="site-footer__bottom">© 2026 Nicolas Musicki — Tous droits réservés.</p>
    </div>
  </footer>`;
}
export function transform(source,file){
 let result=source.replace(/<nav\b[^>]*class="[^"]*navbar[^>]*>[\s\S]*?<\/nav>/,navigation(file));
 const footers=[...result.matchAll(/<footer\b[^>]*>[\s\S]*?<\/footer>/g)];
 const last=footers.at(-1);if(!last)throw Error('Footer manquant : '+file);
 result=result.slice(0,last.index)+footer()+result.slice(last.index+last[0].length);
 if(!result.includes('href="/site-navigation.css"'))result=result.replace('</head>','  <link rel="stylesheet" href="/site-navigation.css">\n  <script src="/site-navigation.js" defer></script>\n</head>');
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
  for(const [before,after] of [[oldNav,navigation(file)],[oldFooter,footer()]]){
   if(before===after)continue;
   // La première ligne conserve son indentation d'origine.
   const lineStart=old.lastIndexOf('\n',old.indexOf(before))+1;
   const indent=old.slice(lineStart,old.indexOf(before));
   patch+='@@\n'+(indent+before).split('\n').map(l=>'-'+l).join('\n')+'\n'+(indent+after).split('\n').map(l=>'+'+l).join('\n')+'\n';
  }
  if(!old.includes('href="/site-navigation.css"'))patch+='@@\n-</head>\n+  <link rel="stylesheet" href="/site-navigation.css">\n+  <script src="/site-navigation.js" defer></script>\n+</head>\n';
 }
 if(process.argv.includes('--check'))process.exitCode=changes?1:0;
 else if(process.argv.includes('--write'))console.log(changes+' page(s) réécrite(s).');
 else process.stdout.write(patch+'*** End Patch');
}
