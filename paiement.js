(function(){'use strict';
 var api='https://chess-lead-magnet.chess-musicki.workers.dev';
 var colorNames={rouge:'Bordeaux',vert:'Vert olive',bleu:'Bleu marine',marron:'Marron'};
 var itemLabels={livre:'Couleur du livre relié',mats:'Couleur du cahier « Mes premiers mats »',tactiques:'Couleur du cahier « Mes premières tactiques »'};
 var itemShort={livre:'Livre',mats:'Cahier mats',tactiques:'Cahier tactiques'};
 var products={pack_livres_relies:{name:'Apprendre les Échecs — livre relié à la main',amount:4000,items:['livre'],image:'images/reliure/pack-2026-echiquier.webp',link:'https://buy.stripe.com/14AcN72Sr8pk0lfg8gdQQ09'},cahier_mats:{name:'Mes premiers mats en un coup — cahier A6',amount:1500,items:['mats'],image:'images/cahiers/cahiers-duo-photo.webp',link:'https://buy.stripe.com/dRm14p0Kj4940lf2hqdQQ05'},cahier_tactiques:{name:'Mes premières tactiques — cahier A6',amount:1500,items:['tactiques'],image:'images/cahiers/cahier-tactiques-photo.webp',link:'https://buy.stripe.com/eVqbJ38cL3501pjf4cdQQ06'},cahiers_pack:{name:'Les deux cahiers nomades — mats et tactiques',amount:2500,items:['mats','tactiques'],image:'images/cahiers/cahiers-duo-photo.webp',link:'https://buy.stripe.com/9B65kFeB93503xrcW4dQQ07'},trio_livre_cahiers:{name:'Le trio — livre relié et deux cahiers',amount:6000,items:['livre','mats','tactiques'],image:'images/reliure/pack-2026-echiquier.webp',link:'https://buy.stripe.com/dRm3cxct19to4Bvf4cdQQ08'}};
 var id=new URLSearchParams(location.search).get('produit')||'pack_livres_relies';
 var p=Object.prototype.hasOwnProperty.call(products,id)?products[id]:null;
 var $=function(id){return document.getElementById(id)};
 var euro=function(amount){return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(amount/100)};
 var config,actions,phone,email;
 function error(message){$('checkout-error').textContent=message;$('checkout-error').hidden=false;$('payment-fallback').hidden=!p;$('checkout-loading').hidden=true;}
 async function request(path,options){var response=await fetch(api+path,Object.assign({cache:'no-store'},options));var result=await response.json();if(!response.ok)throw new Error(result.error||'Le paiement est indisponible pour le moment.');return result;}
 if(!p){error('Cet ouvrage n’est pas reconnu. Retrouvez la sélection dans le catalogue.');return;}
 $('product-name').textContent=p.name;$('summary-total').textContent=euro(p.amount);$('product-image').src=p.image;$('product-image').alt=p.name;$('fallback-link').href=p.link;
 p.items.forEach(function(item){var fieldset=document.createElement('fieldset'),legend=document.createElement('legend'),note=document.createElement('span'),grid=document.createElement('div');fieldset.className='color-choice';legend.textContent=itemLabels[item]+' ';note.textContent='(obligatoire)';legend.appendChild(note);fieldset.appendChild(legend);grid.className='color-options';
  Object.keys(colorNames).forEach(function(key){var label=document.createElement('label'),input=document.createElement('input'),swatch=document.createElement('span');input.type='radio';input.name='color_'+item;input.value=key;input.required=true;swatch.className='swatch swatch-'+key;swatch.setAttribute('aria-hidden','true');label.appendChild(input);label.appendChild(swatch);label.appendChild(document.createTextNode(colorNames[key]));grid.appendChild(label);});
  fieldset.appendChild(grid);$('color-choices').appendChild(fieldset);});
 $('change-order').href=location.pathname+'?produit='+encodeURIComponent(id);
 request('/checkout-config').then(function(data){config=data;if(!window.Stripe)throw new Error('Le paiement sécurisé n’a pas pu être chargé.');if(!data.products[id]||data.products[id].amount!==p.amount)throw new Error('Le prix a changé. Rechargez la page pour consulter le tarif actuel.');$('checkout-loading').hidden=true;$('details-form').hidden=false;}).catch(function(e){error(e.message)});
 $('details-form').addEventListener('submit',async function(event){event.preventDefault();if(!this.reportValidity())return;$('checkout-error').hidden=true;$('continue-button').disabled=true;phone=$('customer-phone').value.trim();email=$('customer-email').value.trim();var colors={};p.items.forEach(function(item){var selected=document.querySelector('[name="color_'+item+'"]:checked');if(selected)colors[item]=selected.value;});
  try{
   var session=await request('/checkout-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product:id,colors:colors,email:email,phone:phone,guestToken:config.guestToken})});
   var stripe=Stripe(config.publishableKey,{locale:'fr'});
   var checkout=stripe.initCheckoutElementsSdk({clientSecret:session.clientSecret,defaultValues:{email:email,phoneNumber:phone},elementsOptions:{fonts:[{cssSrc:'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&family=Montserrat:wght@500;600&display=swap'}],appearance:{theme:'stripe',variables:{colorPrimary:'#3b2314',colorBackground:'#ffffff',colorText:'#111111',colorTextSecondary:'#555555',colorDanger:'#8b3a3a',fontFamily:'Lora, Georgia, serif',fontSizeBase:'16px',borderRadius:'0px',spacingUnit:'4px'},rules:{'.Label':{fontFamily:'Montserrat, sans-serif',fontWeight:'600',fontSize:'14px',color:'#111111'},'.Input':{border:'1px solid #c9bfb1',boxShadow:'none'},'.Input:focus':{border:'1px solid #3b2314',boxShadow:'0 0 0 2px rgba(201,168,76,.45)'},'.Tab, .Block':{border:'1px solid #e4ddd2',boxShadow:'none'},'.Tab--selected':{borderColor:'#3b2314'}}}}});
   var result=await checkout.loadActions();if(result.type!=='success')throw new Error('Le paiement sécurisé n’a pas pu être préparé.');actions=result.actions;
   checkout.createShippingAddressElement({autocomplete:{mode:'disabled'}}).mount('#shipping-address-element');checkout.createPaymentElement().mount('#payment-element');
   function updateTotal(){var current=actions.getSession();var amount=current.total.total.amount;$('summary-total').textContent=amount;$('pay-button').textContent='Payer '+amount;}
   updateTotal();checkout.on('change',updateTotal);
   $('contact-recap').textContent=email+' · '+phone+' · '+p.items.map(function(item){return itemShort[item]+' '+colorNames[colors[item]].toLowerCase();}).join(' · ');$('details-form').hidden=true;$('payment-form').hidden=false;var steps=document.querySelectorAll('.checkout-steps li');if(steps.length===2){steps[0].classList.remove('is-current');steps[1].classList.add('is-current');}$('pay-button').disabled=false;
  }catch(e){error(e.message);$('continue-button').disabled=false;}
 });
 $('payment-form').addEventListener('submit',async function(event){event.preventDefault();if(!this.reportValidity()||!actions)return;$('checkout-error').hidden=true;$('pay-button').disabled=true;
  try{var result=await actions.confirm({phoneNumber:phone});if(result.type==='error')throw new Error(result.error.message||'Le règlement n’a pas abouti. Vérifiez les informations saisies.');}
  catch(e){error(e.message);$('pay-button').disabled=false;}
 });
})();
