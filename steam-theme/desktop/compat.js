document.getElementById('loew-card-layout-isolation')?.remove();
window.__loewAdwaitaPortState?.observer?.disconnect();window.__loewAdwaitaPortState?.styleContexts?.restore();if(window.__loewAdwaitaPortState?.scrollHandler)document.removeEventListener('scroll',window.__loewAdwaitaPortState.scrollHandler,true);clearInterval(window.__loewAdwaitaPortState?.pruneTimer);document.getElementById('loew-adwaita-game-page')?.remove();
const style=document.createElement('style');style.id='loew-adwaita-game-page';style.textContent=css;document.head.append(style);
// Adwaita's compact detail header and permanent rail conflict with the approved
// game-page layout. Disable only its detail-scoped rules, leaving the shell intact.
const prunedRuleCounts=new WeakMap();
// Nested relational rules for absent dialogs/chat can invalidate the entire
// library on each class change. Keep their original rules and cascade position,
// but make the browser skip them until their simple DOM context exists.
const styleContexts=(()=>{
 const records=[],counts=new WeakMap(),wrapped=new WeakSet();
 const relational=rule=>rule.selectorText?.includes(':has(')||[...rule.cssRules||[]].some(relational);
 const resolve=(selector,parent)=>!parent?selector:selector.includes('&')?selector.replaceAll('&',':is('+parent+')'):':is('+parent+') '+selector;
 function prepare(sheet,parent='',simpleParent=true){
  let rules;try{rules=sheet.cssRules}catch{return}
  if(!rules.length||counts.get(sheet)===rules.length)return;
  for(let i=rules.length-1;i>=0;i--){let rule=rules[i];
   if(wrapped.has(rule))continue;
   if(rule.selectorText){
    const selector=resolve(rule.selectorText,parent);
    // Only class/type/ID contexts: focus/hover, attributes and :has() stay CSS
    // driven. Their state must never depend on a mutation-observer callback.
    const simple=simpleParent&&/^[\w\s.#,&>+~\\-]+$/.test(rule.selectorText);
    if(relational(rule)&&simple){
     let present;try{present=!!document.querySelector(selector)}catch{continue}
     const css=rule.cssText;
     sheet.deleteRule(i);sheet.insertRule('@media '+(present?'all':'not all')+'{'+css+'}',i);
     const media=sheet.cssRules[i];wrapped.add(media);
     records.push({sheet,media,css,selector,present});
     rule=media.cssRules[0];
     if(!present)continue;
    }
    if(rule.cssRules)prepare(rule,selector,simple);
   }else if(rule.cssRules)prepare(rule,parent,simpleParent);
  }
  counts.set(sheet,sheet.cssRules.length);
 }
 function sync(){for(const record of records){
  const present=!!document.querySelector(record.selector);
  if(present!==record.present){record.present=present;record.media.media.mediaText=present?'all':'not all';}
 }}
 function restore(){for(const record of [...records].reverse()){
  const index=[...record.sheet.cssRules].indexOf(record.media);if(index<0)continue;
  record.sheet.deleteRule(index);record.sheet.insertRule(record.css,index);
 }records.length=0;}
 return {prepare,sync,restore,records};
})();
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
  if((sheet.href||'').includes('/adwaita/')){removeDetailOverrides(sheet);styleContexts.prepare(sheet);continue}
  try{for(const r of sheet.cssRules){if(r.styleSheet&&(r.href||'').includes('/adwaita/')){removeDetailOverrides(r.styleSheet);styleContexts.prepare(r.styleSheet);}else if(r.type===1||r.type===4)break}}catch{}
 }
 styleContexts.sync();
}
pruneAdwaita();
const pruneTimer=setInterval(pruneAdwaita,1500);
const aliasSignatures=new WeakMap();
function aliasNode(node){if(node.nodeType!==1)return;const signature=node.getAttribute('class');if(aliasSignatures.get(node)===signature)return;const missing=new Set();for(const cls of node.classList)for(const name of aliases[cls]||[])if(!node.classList.contains(name))missing.add(name);if(missing.size)node.classList.add(...missing);aliasSignatures.set(node,node.getAttribute('class'))}
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
 styleContexts.sync();
 if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;placeLumen()})}
});
observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});placeLumen();
window.__loewAdwaitaPortState={aliases:Object.keys(aliases).length,observer,pruneTimer,scrollHandler,styleContexts};
