window.__loewAdwaitaPortState?.observer?.disconnect();clearInterval(window.__loewAdwaitaPortState?.pruneTimer);document.getElementById('loew-adwaita-game-page')?.remove();
const style=document.createElement('style');style.id='loew-adwaita-game-page';style.textContent=css;document.head.append(style);
// Adwaita's compact detail header and permanent rail conflict with the approved
// game-page layout. Disable only its detail-scoped rules, leaving the shell intact.
function removeDetailOverrides(sheet){
 let rules;try{rules=sheet.cssRules}catch{return}
 for(let i=rules.length-1;i>=0;i--){const r=rules[i];
  if(r.styleSheet){if((r.href||'').includes('adwaita'))removeDetailOverrides(r.styleSheet);continue}
  if(r.cssRules&&!r.selectorText){removeDetailOverrides(r);continue}
  if(r.selectorText&&/appdetails_|sharedappdetailsheader_|\._2iE-78WxX2Pj4GHbq7YJiA|\._2OOzYVWIHaKXm6_7sscT9i|\._3Y87YQY56ZCOqhgcZFaDc5|\._2L3s2nzh7yCnNESfI5_dN1|\._39RheXihcN6H2k2muQTjkI/.test(r.selectorText))sheet.deleteRule(i);else if(r.cssRules)removeDetailOverrides(r);
 }
}
function pruneAdwaita(){for(const sheet of document.styleSheets){if((sheet.href||'').includes('/adwaita/'))removeDetailOverrides(sheet);else{try{for(const r of sheet.cssRules)if(r.styleSheet&&(r.href||'').includes('/adwaita/'))removeDetailOverrides(r.styleSheet)}catch{}}}}
pruneAdwaita();
const pruneTimer=setInterval(pruneAdwaita,1500);
const aliasSignatures=new WeakMap();
function aliasNode(node){if(node.nodeType!==1)return;const signature=node.getAttribute('class');if(aliasSignatures.get(node)===signature)return;for(const cls of [...node.classList])for(const name of aliases[cls]||[])if(!node.classList.contains(name))node.classList.add(name);aliasSignatures.set(node,node.getAttribute('class'))}
function aliasTree(node){aliasNode(node);if(node.querySelectorAll)node.querySelectorAll('[class]').forEach(aliasNode)}
aliasTree(document.body);
let scheduled=false;
function placeLumen(){
 const button=document.getElementById('lumen-moon-btn');if(!button)return;
 if(button.parentElement!==document.body)document.body.append(button);
 button.setAttribute('aria-label','Lumen settings');button.setAttribute('title','Lumen settings');
}
const observer=new MutationObserver(records=>{
 for(const r of records){if(r.type==='attributes')aliasNode(r.target);else for(const node of r.addedNodes)aliasTree(node);}
 if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;placeLumen()})}
});
observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});placeLumen();
window.__loewAdwaitaPortState={aliases:Object.keys(aliases).length,observer,pruneTimer};
