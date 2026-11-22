const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
test('les cinq achats pointent vers le formulaire depuis pages racine et sous-répertoire, autres liens inchangés',()=>{
 const ids={'14AcN72Sr8pk0lfg8gdQQ09':'pack_livres_relies','dRm14p0Kj4940lf2hqdQQ05':'cahier_mats','eVqbJ38cL3501pjf4cdQQ06':'cahier_tactiques','9B65kFeB93503xrcW4dQQ07':'cahiers_pack','dRm3cxct19to4Bvf4cdQQ08':'trio_livre_cahiers'};
 for(const src of ['https://www.cours-echecs-paris.fr/paiement-liens.js?v=1','https://example.org/ChessWebsite/paiement-liens.js?v=1']){
 const links=Object.keys(ids).concat('other-link').map(id=>({href:'https://buy.stripe.com/'+id,dataset:{}}));
 vm.runInNewContext(fs.readFileSync(path.resolve('paiement-liens.js'),'utf8'),{URL,document:{currentScript:{src},querySelectorAll:()=>links}});
 for(let i=0;i<5;i++){const url=new URL(links[i].href);assert.equal(url.searchParams.get('produit'),Object.values(ids)[i]);assert.equal(url.pathname,new URL('paiement.html',src).pathname);assert.match(links[i].dataset.stripeFallback,/buy.stripe.com/);}assert.equal(links[5].href,'https://buy.stripe.com/other-link');
 }
});
