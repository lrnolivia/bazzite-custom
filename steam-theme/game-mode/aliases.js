// Only tag nodes touched by Steam; cache our final class signature to avoid loops.
const signatures=new WeakMap();
function tag(node){
 if(node.nodeType!==1)return;
 const before=node.getAttribute('class');if(signatures.get(node)===before)return;
 const add=new Set();for(const cls of node.classList)for(const alias of aliases[cls]||[])if(!node.classList.contains(alias))add.add(alias);
 if(add.size)node.classList.add(...add);signatures.set(node,node.getAttribute('class'));
}
function tree(node){tag(node);if(node.querySelectorAll)node.querySelectorAll('[class]').forEach(tag)}
let frame=0;const pending=new Set(),changed=new Set();
const observer=new MutationObserver(records=>{
 for(const r of records){if(r.type==='attributes')changed.add(r.target);else for(const n of r.addedNodes)if(n.nodeType===1)pending.add(n)}
 if(!frame)frame=requestAnimationFrame(()=>{frame=0;for(const n of changed)tag(n);changed.clear();for(const n of pending)tree(n);pending.clear()});
});
if(document.body){tree(document.body);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']})}
window.__loewPrimeAliasState={observer,aliases:Object.keys(aliases).length};
