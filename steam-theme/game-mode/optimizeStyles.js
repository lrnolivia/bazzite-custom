/* Index resolved class-token selectors without changing CSS Loader's aliases. */
(() => {
    if(document.title!=='Steam Big Picture Mode')return;
    window.__steamPrimeStyleIndexDispose?.();
    const owned=new Map();
    const token=/\[class\s*~=\s*(['"])([A-Za-z_][A-Za-z0-9_-]*)\1\s*\]/g;
    function optimize(element){
        if(!element.matches?.('style.css-loader-style')||!element.sheet)return;
        const changes=[];
        function visit(rules){
            for(const rule of rules){
                if(rule.type===1){
                    const before=rule.selectorText;
                    const after=before.replace(token,(_,quote,name)=>'.'+CSS.escape(name));
                    if(after!==before){
                        try{rule.selectorText=after;changes.push({rule,before,after});}catch{}
                    }
                }
                if(rule.cssRules)visit(rule.cssRules);
            }
        }
        try{visit(element.sheet.cssRules);}catch{return;}
        // A text refresh replaces the old CSS rules; retain only the new rules.
        const previous=owned.get(element)||[];
        owned.set(element,changes.length?changes:previous);
    }
    const observer=new MutationObserver(records=>{
        const dirty=new Set();
        for(const record of records){
            const target=record.target.nodeType===1?record.target:record.target.parentElement;
            const style=target?.closest('style.css-loader-style');if(style)dirty.add(style);
            for(const node of record.addedNodes||[]){
                if(node.nodeType!==1)continue;
                if(node.matches('style.css-loader-style'))dirty.add(node);
                for(const style of node.querySelectorAll('style.css-loader-style'))dirty.add(style);
            }
        }
        for(const [element]of owned)if(!element.isConnected)owned.delete(element);
        for(const style of dirty)optimize(style);
    });
    for(const style of document.querySelectorAll('style.css-loader-style'))optimize(style);
    observer.observe(document.head,{subtree:true,childList:true,characterData:true});
    window.__steamPrimeStyleIndexDispose=()=>{
        observer.disconnect();
        for(const changes of owned.values())for(const {rule,before,after}of changes){
            try{if(rule.selectorText===after)rule.selectorText=before;}catch{}
        }
        owned.clear();
    };
})();
