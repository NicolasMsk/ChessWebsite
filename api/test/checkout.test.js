import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handleCheckout,sessionParameters,CHECKOUT_PRODUCTS,BOOK_COLORS} from '../checkout.js';
const origin='https://www.cours-echecs-paris.fr';
function environment(){const data=new Map();return {ALLOWED_ORIGIN:origin,STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_PUBLISHABLE_KEY:'pk_test_fixture',SUBSCRIBERS:{get:async k=>data.get(k),put:async(k,v)=>data.set(k,v)},CHECKOUT_IP_LIMITER:{limit:async()=>({success:true})}};}
function request(path,body,ip='192.0.2.1'){return new Request('https://worker.example'+path,{method:body===undefined?'GET':'POST',headers:{Origin:origin,'CF-Connecting-IP':ip,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});}
async function guest(env){return (await (await handleCheckout(request('/checkout-config'),env)).json()).guestToken;}
test('catalogue serveur impose prix, une couleur par ouvrage et collecte du téléphone',()=>{
 for(const [product,p] of Object.entries(CHECKOUT_PRODUCTS))for(const color of Object.keys(BOOK_COLORS)){const colors=Object.fromEntries(p.items.map(i=>[i,color]));const values=sessionParameters(product,colors);assert.equal(values['line_items[0][price_data][unit_amount]'],String(p.amount));assert.equal(values['phone_number_collection[enabled]'],'true');assert.equal(values.ui_mode,'elements');for(const i of p.items)assert.equal(values['metadata[couleur_'+i+']'],color);if(p.items.includes('livre'))assert.equal(values['metadata[book_color]'],color);}
 assert.deepEqual(CHECKOUT_PRODUCTS.cahiers_pack.items,['mats','tactiques']);assert.deepEqual(CHECKOUT_PRODUCTS.trio_livre_cahiers.items,['livre','mats','tactiques']);
 for(const [product,colors] of [['__proto__',{livre:'rouge'}],['pack_livres_relies',{}],['pack_livres_relies',{livre:'or'}],['cahiers_pack',{mats:'bleu'}],['cahier_mats',{mats:'bleu',livre:'rouge'}],['cahier_mats','bleu'],['trio_livre_cahiers',{livre:'rouge',mats:'vert',tactiques:'__proto__'}]])assert.throws(()=>sessionParameters(product,colors));
 const trio=sessionParameters('trio_livre_cahiers',{livre:'rouge',mats:'vert',tactiques:'bleu'});assert.match(trio['line_items[0][price_data][product_data][description]'],/Livre relié : bordeaux ; Cahier « Mes premiers mats » : vert olive ; Cahier « Mes premières tactiques » : bleu marine/);
});
test('paiement refuse origine externe, configuration absente, modes divergents et débit excessif',async()=>{
 const env=environment();assert.equal((await handleCheckout(new Request('https://worker.example/checkout-config'),env)).status,403);
 assert.equal((await handleCheckout(request('/checkout-config'),{...env,STRIPE_SECRET_KEY:''})).status,503);
 assert.equal((await handleCheckout(request('/checkout-config'),{...env,STRIPE_PUBLISHABLE_KEY:'pk_live_fixture'})).status,503);
 assert.equal((await handleCheckout(request('/checkout-config'),{...env,CHECKOUT_IP_LIMITER:{limit:async()=>({success:false})}})).status,429);
});
test('session refuse jeton expiré, autre IP, téléphone absent, couleur manquante et JSON nul',async()=>{
 const env=environment(),token=await guest(env);const valid={guestToken:token,product:'pack_livres_relies',color:'bleu',email:'client@example.fr',phone:'+33612345678'};
 for(const [body,ip,status] of [[{...valid,guestToken:crypto.randomUUID()},undefined,403],[valid,'192.0.2.2',403],[{...valid,phone:''},undefined,400],[{...valid,color:''},undefined,400],[{...valid,product:'cahiers_pack',color:undefined,colors:{mats:'vert'}},undefined,400],[null,undefined,400]])assert.equal((await handleCheckout(request('/checkout-session',body,ip),env)).status,status);
});
test('création conserve prix serveur et couleur, retries idempotents et verrouillage du choix',async()=>{
 const env=environment(),token=await guest(env);const input={guestToken:token,product:'trio_livre_cahiers',colors:{livre:'marron',mats:'rouge',tactiques:'vert'},email:'client@example.fr',phone:'0612345678',amount:1};const original=globalThis.fetch;const calls=[];
 globalThis.fetch=async(url,options)=>{calls.push({url,options});return Response.json({client_secret:'cs_test_fixture_secret_fixture'});};
 try{for(let i=0;i<2;i++){const response=await handleCheckout(request('/checkout-session',input),env);assert.equal(response.status,200);assert.equal((await response.json()).clientSecret,'cs_test_fixture_secret_fixture');}
 const form=calls[0].options.body;assert.equal(form.get('line_items[0][price_data][unit_amount]'),'6000');assert.equal(form.get('metadata[book_color]'),'marron');assert.equal(form.get('metadata[couleur_mats]'),'rouge');assert.equal(form.get('metadata[couleur_tactiques]'),'vert');assert.equal(form.get('customer_email'),'client@example.fr');assert.equal(calls[0].options.headers['Idempotency-Key'],calls[1].options.headers['Idempotency-Key']);
 assert.equal((await handleCheckout(request('/checkout-session',{...input,colors:{livre:'marron',mats:'vert',tactiques:'vert'}}),env)).status,409);assert.equal(calls.length,2);
 }finally{globalThis.fetch=original;}
});
test('vérification de paiement ne divulgue aucune coordonnée et respecte le statut réel',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({payment_status:'unpaid',status:'open',metadata:{product:'cahier_mats'},amount_total:1500,currency:'eur',customer_details:{email:'private@example.fr',phone:'0612345678'}});
 try{const response=await handleCheckout(request('/checkout-status?session_id=cs_test_abcdefghijklmnop'),environment());assert.deepEqual(await response.json(),{paid:false,status:'open',product:'cahier_mats',amount:1500,currency:'eur'});}finally{globalThis.fetch=original;}
});
test('erreur Stripe ne divulgue ni détail serveur ni clé',async()=>{
 const env=environment(),guestToken=await guest(env),original=globalThis.fetch;globalThis.fetch=async()=>new Response('secret Stripe detail',{status:400});
 try{const response=await handleCheckout(request('/checkout-session',{guestToken,product:'cahier_mats',colors:{mats:'rouge'},email:'client@example.fr',phone:'0612345678'}),env);assert.equal(response.status,502);assert.doesNotMatch(await response.text(),/secret Stripe detail|sk_test/);}finally{globalThis.fetch=original;}
});
