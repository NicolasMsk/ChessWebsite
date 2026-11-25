import {readLimitedText,hash} from './security.js';
import {PACK_AMOUNT_CENTS,PACK_PRODUCT_ID,PACK_NAME,DELAI_LIVRAISON,BOOK_COLORS,OUVRAGES,OUVRAGES_PAR_PRODUIT} from './order.js';

export {BOOK_COLORS,OUVRAGES,OUVRAGES_PAR_PRODUIT};
export const CHECKOUT_PRODUCTS=Object.freeze({
 [PACK_PRODUCT_ID]:{name:PACK_NAME,amount:PACK_AMOUNT_CENTS,book:true,items:OUVRAGES_PAR_PRODUIT[PACK_PRODUCT_ID],image:'images/reliure/pack-2026-echiquier.webp'},
 cahier_mats:{name:'Mes premiers mats en un coup — cahier A6',amount:1500,book:false,items:OUVRAGES_PAR_PRODUIT.cahier_mats,image:'images/cahiers/cahiers-duo-photo.webp'},
 cahier_tactiques:{name:'Mes premières tactiques — cahier A6',amount:1500,book:false,items:OUVRAGES_PAR_PRODUIT.cahier_tactiques,image:'images/cahiers/cahier-tactiques-photo.webp'},
 cahiers_pack:{name:'Les deux cahiers nomades — mats et tactiques',amount:2500,book:false,items:OUVRAGES_PAR_PRODUIT.cahiers_pack,image:'images/cahiers/cahiers-duo-photo.webp'},
 trio_livre_cahiers:{name:'Le trio — livre relié et deux cahiers',amount:6000,book:true,items:OUVRAGES_PAR_PRODUIT.trio_livre_cahiers,image:'images/reliure/pack-2026-echiquier.webp'}
});
const API_VERSION='2026-11-18.endive';
const SITE='https://www.cours-echecs-paris.fr';
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
function reply(data,status,origin){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':origin,'Vary':'Origin','Cache-Control':'no-store'}})}
/** Une couleur par ouvrage du produit : {livre:'rouge', mats:'vert', …}. Aucune clé en trop. */
export function normalizeColors(product,colors){
 if(!Object.hasOwn(CHECKOUT_PRODUCTS,product))throw fail('Choisissez un ouvrage.');
 const items=CHECKOUT_PRODUCTS[product].items;
 if(!colors||typeof colors!=='object'||Array.isArray(colors))throw fail('Choisissez la couleur de chaque ouvrage.');
 for(const key of Object.keys(colors))if(!items.includes(key))throw fail('Couleur demandée pour un ouvrage absent de la commande.');
 const out={};
 for(const item of items){if(!Object.hasOwn(BOOK_COLORS,colors[item]))throw fail('Choisissez la couleur : '+OUVRAGES[item]+'.');out[item]=colors[item];}
 return out;
}
export function sessionParameters(product,colors){
 const chosen=normalizeColors(product,colors);
 const p=CHECKOUT_PRODUCTS[product];
 const summary=p.items.map(i=>OUVRAGES[i]+' : '+BOOK_COLORS[chosen[i]].toLowerCase()).join(' ; ');
 const values={mode:'payment',ui_mode:'elements',locale:'fr',
  'line_items[0][price_data][currency]':'eur','line_items[0][price_data][unit_amount]':String(p.amount),
  'line_items[0][price_data][product_data][name]':p.name,
  'line_items[0][price_data][product_data][description]':'Couleurs — '+summary+'. Livraison en point relais Mondial Relay comprise, sous '+DELAI_LIVRAISON+' en France métropolitaine.',
  'line_items[0][quantity]':'1','metadata[product]':product,'payment_intent_data[metadata][product]':product,
  'phone_number_collection[enabled]':'true','shipping_address_collection[allowed_countries][0]':'FR',
  'return_url':SITE+'/commande-confirmee.html?session_id={CHECKOUT_SESSION_ID}'};
 for(const item of p.items){values['metadata[couleur_'+item+']']=chosen[item];values['payment_intent_data[metadata][couleur_'+item+']']=chosen[item];}
 if(chosen.livre){values['metadata[book_color]']=chosen.livre;values['payment_intent_data[metadata][book_color]']=chosen.livre;}
 return values;
}
async function stripe(endpoint,env,values,idempotencyKey){
 const r=await fetch('https://api.stripe.com/v1/'+endpoint,{method:values?'POST':'GET',headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY,'Stripe-Version':API_VERSION,...(values?{'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':idempotencyKey}:{})},body:values?new URLSearchParams(values):undefined,signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw fail('Le paiement est temporairement indisponible. Réessayez ou utilisez la page sécurisée.',502);
 return r.json();
}
export async function handleCheckout(request,env){
 const origin=env.ALLOWED_ORIGIN;
 if(!origin||origin==='*'||request.headers.get('Origin')!==origin)return reply({error:'Origine non autorisée.'},403,origin||SITE);
 const url=new URL(request.url);
 try{
  if(!/^(?:sk|rk)_(?:live|test)_/.test(env.STRIPE_SECRET_KEY||'')||!/^pk_(?:live|test)_/.test(env.STRIPE_PUBLISHABLE_KEY||'')||!env.SUBSCRIBERS||!env.CHECKOUT_IP_LIMITER)throw fail('Le paiement intégré sera bientôt disponible. Vous pouvez utiliser la page sécurisée.',503);
  if(env.STRIPE_SECRET_KEY.split('_')[1]!==env.STRIPE_PUBLISHABLE_KEY.split('_')[1])throw fail('Configuration du paiement indisponible.',503);
  const ip=request.headers.get('CF-Connecting-IP')||'unknown';
  if(!(await env.CHECKOUT_IP_LIMITER.limit({key:ip})).success)throw fail('Trop de tentatives. Réessayez dans une minute.',429);
  if(url.pathname==='/checkout-config'&&request.method==='GET'){
   const token=crypto.randomUUID();
   await env.SUBSCRIBERS.put('checkout:guest:'+await hash(token),JSON.stringify({ip:await hash(ip)}),{expirationTtl:900});
   return reply({publishableKey:env.STRIPE_PUBLISHABLE_KEY,guestToken:token,products:CHECKOUT_PRODUCTS,colors:BOOK_COLORS,items:OUVRAGES},200,origin);
  }
  if(url.pathname==='/checkout-session'&&request.method==='POST'){
   if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw fail('Format de requête non valide.',415);
   let input;try{input=JSON.parse(await readLimitedText(request,2048))}catch(e){if(e.status===413)throw e;throw fail('Requête non valide.');}
   if(!input||typeof input!=='object'||Array.isArray(input))throw fail('Requête non valide.');
   if(!/^[a-f0-9-]{36}$/.test(input.guestToken||''))throw fail('Rechargez la page de paiement.',403);
   const guestKey='checkout:guest:'+await hash(input.guestToken);
   const raw=await env.SUBSCRIBERS.get(guestKey);
   const guest=raw?JSON.parse(raw):null;
   if(!guest||guest.ip!==await hash(ip))throw fail('Votre session a expiré. Rechargez la page.',403);
   // Ancienne page en cache : une seule couleur, celle du livre.
   const requested=input.colors!==undefined?input.colors:(input.color?{livre:input.color}:{});
   const values=sessionParameters(input.product,requested);
   const color=CHECKOUT_PRODUCTS[input.product].items.map(i=>i+'='+values['metadata[couleur_'+i+']']).join(',');
   if(!/^[^\s@<>"\u0000-\u001f]+@[^\s@<>"\u0000-\u001f]+\.[^\s@<>"\u0000-\u001f]{2,}$/.test(input.email||'')||input.email.length>254)throw fail('Vérifiez votre adresse email.');
   if(!/^[+\d][\d ().-]{6,24}$/.test(input.phone||'')||(input.phone.match(/\d/g)||[]).length<8)throw fail('Indiquez un numéro de téléphone valide.');
   if(guest.selection&&guest.selection!==input.product+':'+color+':'+input.email)throw fail('Rechargez la page pour changer votre commande.',409);
   values.customer_email=input.email;
   const selection=input.product+':'+color+':'+input.email;
   // L’idempotence dépend du jeton serveur et du choix validé, jamais d’un prix client.
   const key='site-checkout-'+await hash(input.guestToken+':'+selection);
   const session=await stripe('checkout/sessions',env,values,key);
   guest.selection=selection;
   await env.SUBSCRIBERS.put(guestKey,JSON.stringify(guest),{expirationTtl:900});
   return reply({clientSecret:session.client_secret},200,origin);
  }
  if(url.pathname==='/checkout-status'&&request.method==='GET'){
   const id=url.searchParams.get('session_id')||'';
   if(!/^cs_(?:live|test)_[A-Za-z0-9]{10,200}$/.test(id))throw fail('Référence de paiement non valide.');
   const session=await stripe('checkout/sessions/'+id,env);
   if(!Object.hasOwn(CHECKOUT_PRODUCTS,session.metadata?.product))throw fail('Commande non reconnue.',404);
   // Aucun nom, email, téléphone ou adresse n’est exposé par cette route publique.
   return reply({paid:session.payment_status==='paid',status:session.status,product:session.metadata.product,amount:session.amount_total,currency:session.currency},200,origin);
  }
  return reply({error:'Page introuvable.'},404,origin);
 }catch(e){return reply({error:e.status?e.message:'Le paiement est temporairement indisponible.'},e.status||502,origin)}
}
