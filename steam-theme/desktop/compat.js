window.__loewAdwaitaPortState?.observer?.disconnect();if(window.__loewAdwaitaPortState?.scrollHandler)document.removeEventListener('scroll',window.__loewAdwaitaPortState.scrollHandler,true);clearInterval(window.__loewAdwaitaPortState?.pruneTimer);document.getElementById('loew-adwaita-game-page')?.remove();
const style=document.createElement('style');style.id='loew-adwaita-game-page';style.textContent=css;document.head.append(style);
// Adwaita's compact detail header and permanent rail conflict with the approved
// game-page layout. Disable only its detail-scoped rules, leaving the shell intact.
const prunedRuleCounts=new WeakMap();
function removeDetailOverrides(sheet){
 let rules;try{rules=sheet.cssRules}catch{return}
 // Imports precede normal CSS rules. Visit imports even while their bytes load.
 for(const r of rules){if(r.styleSheet){removeDetailOverrides(r.styleSheet);continue}if(r.type===1||r.type===4)break}
 if(prunedRuleCounts.get(sheet)===rules.length)return;
 for(let i=rules.length-1;i>=0;i--){const r=rules[i];
  if(r.styleSheet)continue;
  if(r.selectorText&&/appdetails_|sharedappdetailsheader_|\._2iE-78WxX2Pj4GHbq7YJiA|\._2OOzYVWIHaKXm6_7sscT9i|\._3Y87YQY56ZCOqhgcZFaDc5|\._2L3s2nzh7yCnNESfI5_dN1|\._39RheXihcN6H2k2muQTjkI/.test(r.selectorText))sheet.deleteRule(i);
  else if(r.cssRules)removeDetailOverrides(r);
 }
 prunedRuleCounts.set(sheet,sheet.cssRules.length);
}
function pruneAdwaita(){
 for(const sheet of document.styleSheets){
  if((sheet.href||'').includes('/adwaita/')){removeDetailOverrides(sheet);continue}
  try{for(const r of sheet.cssRules){if(r.styleSheet&&(r.href||'').includes('/adwaita/'))removeDetailOverrides(r.styleSheet);else if(r.type===1||r.type===4)break}}catch{}
 }
}
pruneAdwaita();
const pruneTimer=setInterval(pruneAdwaita,1500);
const aliasSignatures=new WeakMap();
function aliasNode(node){if(node.nodeType!==1)return;const signature=node.getAttribute('class');if(aliasSignatures.get(node)===signature)return;for(const cls of [...node.classList])for(const name of aliases[cls]||[])if(!node.classList.contains(name))node.classList.add(name);aliasSignatures.set(node,node.getAttribute('class'))}
function aliasTree(node){aliasNode(node);if(node.querySelectorAll)node.querySelectorAll('[class]').forEach(aliasNode)}
aliasTree(document.body);
let scheduled=false;
function syncFloating(){
 const floating=document.querySelector('._2L3s2nzh7yCnNESfI5_dN1');
 const inPage=[...document.querySelectorAll('._2OOzYVWIHaKXm6_7sscT9i .InPage')].find(x=>x.getBoundingClientRect().width>0);
 if(!floating||!inPage)return;
 const top=floating.parentElement.getBoundingClientRect().top;
 const visible=inPage.getBoundingClientRect().bottom<=top+32;
 const value=visible?'true':'false';if(floating.dataset.loewFloating!==value)floating.dataset.loewFloating=value;
}
let scrollScheduled=false;
const scrollHandler=()=>{if(!scrollScheduled){scrollScheduled=true;requestAnimationFrame(()=>{scrollScheduled=false;syncFloating()})}};
document.addEventListener('scroll',scrollHandler,true);
function placeLumen(){syncFloating();
 const button=document.getElementById('lumen-moon-btn');if(!button)return;
 if(button.parentElement!==document.body)document.body.append(button);
 button.setAttribute('aria-label','Lumen settings');button.setAttribute('title','Lumen settings');
}
const observer=new MutationObserver(records=>{
 for(const r of records){if(r.type==='attributes')aliasNode(r.target);else for(const node of r.addedNodes)aliasTree(node);}
 if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;placeLumen()})}
});
observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});placeLumen();
window.__loewAdwaitaPortState={aliases:Object.keys(aliases).length,observer,pruneTimer,scrollHandler};
