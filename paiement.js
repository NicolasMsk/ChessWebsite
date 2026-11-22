(function(){'use strict';
 var api='https://chess-lead-magnet.chess-musicki.workers.dev';
 var products={pack_livres_relies:{name:'Apprendre les Échecs — livre relié à la main',amount:4000,book:true,image:'images/reliure/pack-2026-echiquier.webp',link:'https://buy.stripe.com/14AcN72Sr8pk0lfg8gdQQ09'},cahier_mats:{name:'Mes premiers mats en un coup — cahier A6',amount:1500,image:'images/cahiers/cahiers-duo-photo.webp',link:'https://buy.stripe.com/dRm14p0Kj4940lf2hqdQQ05'},cahier_tactiques:{name:'Mes premières tactiques — cahier A6',amount:1500,image:'images/cahiers/cahier-tactiques-photo.webp',link:'https://buy.stripe.com/eVqbJ38cL3501pjf4cdQQ06'},cahiers_pack:{name:'Les deux cahiers nomades — mats et tactiques',amount:2500,image:'images/cahiers/cahiers-duo-photo.webp',link:'https://buy.stripe.com/9B65kFeB93503xrcW4dQQ07'},trio_livre_cahiers:{name:'Le trio — livre relié et deux cahiers',amount:6000,book:true,image:'images/reliure/pack-2026-echiquier.webp',link:'https://buy.stripe.com/dRm3cxct19to4Bvf4cdQQ08'}};
 var id=new URLSearchParams(location.search).get('produit')||'pack_livres_relies';
 var p=Object.prototype.hasOwnProperty.call(products,id)?products[id]:null;
 var $=function(id){return document.getElementById(id)};
 var euro=function(amount){return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(amount/100)};
 var config,actions,phone,email;
 function error(message){$('checkout-error').textContent=message;$('checkout-error').hidden=false;$('payment-fallback').hidden=!p;$('checkout-loading').hidden=true;}
 async function request(path,options){var response=await fetch(api+path,Object.assign({cache:'no-store'},options));var result=await response.json();if(!response.ok)throw new Error(result.error||'Le paiement est indisponible pour le moment.');return result;}
 if(!p){error('Cet ouvrage n’est pas reconnu. Retrouvez la sélection dans le catalogue.');return;}
 $('product-name').textContent=p.name;$('summary-total').textContent=euro(p.amount);$('product-image').src=p.image;$('product-image').alt=p.name;$('fallback-link').href=p.link;
 $('book-color').hidden=!p.book;Array.from(document.querySelectorAll('[name="book_color"]')).forEach(function(input){input.required=!!p.book;input.disabled=!p.book});
 $('change-order').href=location.pathname+'?produit='+encodeURIComponent(id);
 request('/checkout-config').then(function(data){config=data;if(!window.Stripe)throw new Error('Le paiement sécurisé n’a pas pu être chargé.');if(!data.products[id]||data.products[id].amount!==p.amount)throw new Error('Le prix a changé. Rechargez la page pour consulter le tarif actuel.');$('checkout-loading').hidden=true;$('details-form').hidden=false;}).catch(function(e){error(e.message)});
 $('details-form').addEventListener('submit',async function(event){event.preventDefault();if(!this.reportValidity())return;$('checkout-error').hidden=true;$('continue-button').disabled=true;phone=$('customer-phone').value.trim();email=$('customer-email').value.trim();var selected=document.querySelector('[name="book_color"]:checked');var color=p.book&&selected?selected.value:'';
  try{
   var session=await request('/checkout-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product:id,color:color,email:email,phone:phone,guestToken:config.guestToken})});
   var stripe=Stripe(config.publishableKey,{locale:'fr'});
   var checkout=stripe.initCheckoutElementsSdk({clientSecret:session.clientSecret,defaultValues:{email:email,phoneNumber:phone},elementsOptions:{appearance:{theme:'flat',variables:{colorPrimary:'#203e35',colorBackground:'#fffdf9',colorText:'#3e2c1c',colorDanger:'#9a342b',fontFamily:'Georgia, serif',fontSizeBase:'16px',borderRadius:'6px'}}}});
   var result=await checkout.loadActions();if(result.type!=='success')throw new Error('Le paiement sécurisé n’a pas pu être préparé.');actions=result.actions;
   checkout.createShippingAddressElement({autocomplete:{mode:'disabled'}}).mount('#shipping-address-element');checkout.createPaymentElement().mount('#payment-element');
   function updateTotal(){var current=actions.getSession();var amount=current.total.total.amount;$('summary-total').textContent=amount;$('pay-button').textContent='Payer '+amount;}
   updateTotal();checkout.on('change',updateTotal);
   $('contact-recap').textContent=email+' · '+phone+(color?' · Livre '+config.colors[color].toLowerCase():'');$('details-form').hidden=true;$('payment-form').hidden=false;$('pay-button').disabled=false;
  }catch(e){error(e.message);$('continue-button').disabled=false;}
 });
 $('payment-form').addEventListener('submit',async function(event){event.preventDefault();if(!this.reportValidity()||!actions)return;$('checkout-error').hidden=true;$('pay-button').disabled=true;
  try{var result=await actions.confirm({phoneNumber:phone});if(result.type==='error')throw new Error(result.error.message||'Le règlement n’a pas abouti. Vérifiez les informations saisies.');}
  catch(e){error(e.message);$('pay-button').disabled=false;}
 });
})();
