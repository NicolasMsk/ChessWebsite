import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pages,root} from '../scripts/site-navigation.mjs';

const records=JSON.parse(fs.readFileSync(path.join(root,'_data/diagrammes.json'),'utf8'));
const known=new Set(records.map(r=>r.file));

test('chaque diagramme publié a une position répertoriée, un texte alternatif et des dimensions',()=>{
 const used=new Set();
 for(const page of pages()){
  const source=fs.readFileSync(path.join(root,page),'utf8');
  for(const match of source.matchAll(/<img\b[^>]*src="([^"]*images\/diagrammes\/([^"?]+)\.svg)(?:\?[^"]*)?"[^>]*>/g)){
   const name=match[2]+'.svg';assert.ok(known.has(name),page+' : '+name+' non contrôlé');
   assert.ok(fs.existsSync(path.resolve(root,path.dirname(page),match[1])),page+' : image absente');
   assert.match(match[0],/alt="[^"]{15,}"/);assert.match(match[0],/width="360"/);assert.match(match[0],/height="350"/);
   used.add(name);
  }
 }
 assert.deepEqual([...known].filter(name=>!used.has(name)),[],'Aucun diagramme inutilisé dans le référentiel');
});

test('le guide débutant illustre les règles, les cinq tactiques, les ouvertures et mat contre pat',()=>{
 const source=fs.readFileSync(path.join(root,'blog/debuter-echecs-guide-complet-0-500-elo.html'),'utf8');
 for(const name of ['position-depart','prise-en-passant','promotion-pion','roque-avant','roque-apres','debutant-fourchette','debutant-clouage','debutant-attaque-double','debutant-decouverte','echec-et-mat','italienne','londres','francaise-avance','debutant-mat-dame','debutant-pat-dame'])assert.ok(source.includes('/'+name+'.svg'),name+' manquant');
 assert.doesNotMatch(source,/roi en e8 est en échec\)\.|AU MOINS une case légale|3\.\(n'importe\)/);
});
