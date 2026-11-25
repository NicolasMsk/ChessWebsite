/** Sans --apply : affiche uniquement les changements prévus. Avec --apply :
 * modifie les textes, la collecte du téléphone et les couleurs des 5 liens
 * existants. Ne crée aucun produit, prix, lien ou paiement. */
import fs from 'node:fs';
import {CHECKOUT_PRODUCTS,BOOK_COLORS} from './checkout.js';
const envFile=new URL('./.env.stripe',import.meta.url);
if(fs.existsSync(envFile))process.loadEnvFile(envFile);
const secret=process.env.STRIPE_SECRET_KEY;
if(!/^(?:sk|rk)_live_/.test(secret||'')){console.error('Connexion Stripe de production absente.');process.exit(1)}
const apply=process.argv.includes('--apply');
const root=new URL('../',import.meta.url);
const targets=new Set(['edition-raffinee/index.html','cahiers-exercices-echecs.html'].flatMap(f=>[...fs.readFileSync(new URL(f,root),'utf8').matchAll(/https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+/g)].map(m=>m[0])));
async function stripe(endpoint,values){const r=await fetch('https://api.stripe.com/v1/'+endpoint,{method:values?'POST':'GET',headers:{Authorization:'Bearer '+secret,...(values?{'Content-Type':'application/x-www-form-urlencoded'}:{})},body:values?new URLSearchParams(values):undefined,signal:AbortSignal.timeout(25000)});if(!r.ok){const d=await r.json().catch(()=>({}));throw Error('Stripe HTTP '+r.status+' ('+(d.error?.param||d.error?.code||'erreur')+')')}return r.json()}
function colorFields(){return [{key:'couleur_livre',label:{type:'custom',custom:'Couleur du livre'},type:'dropdown',optional:false,dropdown:{options:Object.entries(BOOK_COLORS).map(([value,label])=>({label,value}))}}]}
function addFields(values,fields){fields.forEach((f,i)=>{const prefix='custom_fields['+i+']';values[prefix+'[key]']=f.key;values[prefix+'[label][type]']='custom';values[prefix+'[label][custom]']=f.label.custom;values[prefix+'[type]']=f.type;values[prefix+'[optional]']=String(f.optional);f.dropdown.options.forEach((o,j)=>{values[prefix+'[dropdown][options]['+j+'][label]']=o.label;values[prefix+'[dropdown][options]['+j+'][value]']=o.value})})}
try{
 const found=[];let cursor='';
 do{const d=await stripe('payment_links?limit=100'+(cursor?'&starting_after='+cursor:''));found.push(...d.data.filter(l=>targets.has(l.url)));cursor=d.has_more?d.data.at(-1).id:''}while(cursor&&found.length<targets.size);
 if(found.length!==5||targets.size!==5)throw Error('Les cinq liens actuels doivent être identifiés avant toute modification.');
 const plan=[];
 for(const link of found){
  const p=CHECKOUT_PRODUCTS[link.metadata?.product];
  if(!p||!link.active||!link.livemode)throw Error('Lien inattendu ou inactif : aucune modification.');
  const items=await stripe('payment_links/'+link.id+'/line_items');
  if(items.data.length!==1||items.data[0].quantity!==1||items.data[0].price.unit_amount!==p.amount||items.data[0].price.currency!=='eur')throw Error('Le prix du lien ne correspond pas au catalogue.');
  if(p.book&&(link.custom_fields||[]).some(f=>f.key!=='couleur_livre'))throw Error('Le lien contient déjà des champs personnalisés à préserver : examen nécessaire.');
  const amount=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(p.amount/100);
  const message=amount+' TTC, livraison en point relais Mondial Relay comprise en France métropolitaine, sous 7 jours maximum après validation du paiement. '+(p.book?'Livre relié cousu main, couleur au choix.':'Cahiers A6 cousus main, solutions regroupées à la fin.')+' CGV : https://www.cours-echecs-paris.fr/cgv.html';
  const values={'phone_number_collection[enabled]':'true','custom_text[submit][message]':message};
  if(p.book)addFields(values,colorFields());
  plan.push({link,values,product:link.metadata.product,message,fields:p.book?colorFields():link.custom_fields||[]});
 }
 console.log(JSON.stringify({mode:apply?'application':'aperçu',changes:plan.map(p=>({url:p.link.url,product:p.product,phoneRequired:true,message:p.message,bookColors:p.fields.filter(f=>f.key==='couleur_livre').flatMap(f=>f.dropdown.options.map(o=>o.label))}))},null,2));
 if(apply){
  fs.mkdirSync(new URL('../tmp/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../tmp/payment-links-before-update-'+new Date().toISOString().slice(0,10)+'.json',import.meta.url),JSON.stringify(plan.map(p=>({id:p.link.id,url:p.link.url,phone:p.link.phone_number_collection,custom_text:p.link.custom_text,custom_fields:p.link.custom_fields})),null,2));
  for(const p of plan){
   const changed=await stripe('payment_links/'+p.link.id,p.values);
   if(changed.url!==p.link.url||!changed.active||!changed.phone_number_collection?.enabled||changed.custom_text?.submit?.message!==p.message)throw Error('Vérification de la mise à jour impossible.');
   if(CHECKOUT_PRODUCTS[p.product].book){const c=changed.custom_fields.find(f=>f.key==='couleur_livre');if(!c||c.optional||c.dropdown.options.map(o=>o.value).join(',')!==Object.keys(BOOK_COLORS).join(','))throw Error('Le choix de couleur n’est pas correctement enregistré.');}
   console.log('Vérifié : '+p.product+' — téléphone obligatoire'+(CHECKOUT_PRODUCTS[p.product].book?', '+Object.keys(BOOK_COLORS).length+' couleurs au choix':'')+'.');
  }
 }
}catch(e){console.error(e.message);process.exitCode=1}
