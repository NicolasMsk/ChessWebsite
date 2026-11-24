/* Lecture progressive : les explications et la position caractéristique restent visibles sans JS. */
document.querySelectorAll('[data-opening-viewer]').forEach(viewer=>{
 const positions=[...viewer.querySelectorAll('[data-step]')];
 const choices=[...viewer.querySelectorAll('[data-go-step]')];
 const previous=viewer.querySelector('[data-prev-step]');
 const next=viewer.querySelector('[data-next-step]');
 const status=viewer.querySelector('[aria-live]');
 if(!positions.length||choices.length!==positions.length||!previous||!next||!status)return;
 let index=positions.findIndex(p=>!p.hidden);
 function show(value,announce=true){
  index=Math.max(0,Math.min(value,positions.length-1));
  positions.forEach((p,i)=>{p.hidden=i!==index;});
  choices.forEach((button,i)=>{if(i===index)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
  previous.disabled=index===0;next.disabled=index===positions.length-1;
  status.textContent=announce?`Position ${index+1} sur ${positions.length} : ${positions[index].querySelector('figcaption').textContent}`:`Position ${index+1} sur ${positions.length}`;
 }
 choices.forEach((button,i)=>button.addEventListener('click',()=>show(i)));
 previous.addEventListener('click',()=>show(index-1));
 next.addEventListener('click',()=>show(index+1));
 viewer.querySelector('.opening-viewer__tools').hidden=false;
 show(index<0?positions.length-1:index,false);
});

/* Le sommaire reste entièrement visible sans JavaScript. */
const openingContents=document.querySelector('.opening-contents');
if(openingContents&&typeof window.matchMedia==='function'){
 const compactContents=window.matchMedia('(max-width: 600px)');
 const adaptContents=()=>{openingContents.open=!compactContents.matches;};
 adaptContents();
 compactContents.addEventListener('change',adaptContents);
 openingContents.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',()=>{
  if(compactContents.matches)openingContents.open=false;
 }));
}
