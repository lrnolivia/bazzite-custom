/* A bounded cascade for newly visible Home and Library artwork. */
(() => {
    if(document.title!=='Steam Big Picture Mode'||!window.IntersectionObserver)return;
    window.__steamPrimeCardEntranceDispose?.();
    const cards='.LibraryItemBox,.WYgDg9NyCcMIVuMyZ_NBC,.GameCapsule,.StoreAppCapsule,.EventPreviewContainer';
    const excluded='.TopCapsule,.NZMJ6g2iVnFsOOp-lDmIP,.AppDetailsRoot,.AppDetailsOverviewPanel,.InGameDetails,._1QRCG0n8wKaq74yZ2G6He3,#sgdb-wrap,.sgdb-modal';
    const wrappers='.CarouselGameLabelWrapper,.ZkD6We6MqGbOsa9K3yiY3';
    const transitions='.TopLevelTransition,._2vPeXDfwKg2Vzg29KBnOIV';
    const exits='.Exit,.ExitActive,._25ZS3AKZvbecqJzhhTAJpJ,.SoGsJMX5YFXJ4igEQIPw3';
    const states=new Map(),ready=new Set(),animations=new Set(),labels=new Map();
    const reduced=matchMedia('(prefers-reduced-motion:reduce)');
    let frame=0,batchTimer=0,stopped=false;
    const schedule=()=>{if(!frame&&!stopped)frame=requestAnimationFrame(flush);};
    const queueBatch=()=>{if(!batchTimer&&!stopped)batchTimer=setTimeout(()=>{batchTimer=0;schedule();},24);};
    const sourceOf=image=>image?.getAttribute('src')||image?.srcset||image?.currentSrc||'';
    const leaving=element=>element.closest(transitions)?.matches(exits);
    const poses=()=>reduced.matches?[{opacity:0},{opacity:1}]:[
        {opacity:0,scale:'.88',translate:'0 16px',offset:0},
        {opacity:1,scale:'1.012',translate:'0 0',offset:.75},
        {opacity:1,scale:'1',translate:'0 0',offset:1}
    ];
    function animate(element,frames,timing){
        if(!element.animate)return null;
        try{
            const animation=element.animate(frames,timing);animations.add(animation);
            animation.finished.catch(()=>{}).finally(()=>{animations.delete(animation);animation.cancel();});
            return animation;
        }catch{return null;}
    }
    function cancel(state){
        clearTimeout(state.timer);state.animation?.cancel();ready.delete(state);
    }
    function prepare(state){
        if(stopped||state.done||state.decoding||ready.has(state)||!state.visible||leaving(state.card)||state.card.hasAttribute('data-prime-poster-pending'))return;
        const image=state.image;
        if(image&&(!image.complete||!image.naturalWidth))return;
        state.decoding=true;
        state.animation=animate(state.card,poses(),{duration:reduced.matches?90:300,fill:'backwards',easing:'cubic-bezier(.2,.65,.3,1)'});
        state.animation?.pause();if(state.animation)state.animation.currentTime=0;
        const finish=()=>{
            if(stopped||states.get(state.card)!==state||state.done)return;
            clearTimeout(state.timer);state.decoding=false;ready.add(state);queueBatch();
        };
        state.timer=setTimeout(finish,500);
        try{Promise.resolve(image?.decode?.()).then(finish,finish);}catch{finish();}
    }
    function track(card){
        if(!card.closest('.BasicUI')||card.closest(excluded)||card.parentElement?.closest(cards))return;
        const image=card.querySelector('.CapsuleVisible img,.PortraitImage img,.Capsule img,img.Image,img.EventImage,img:not(.avatar)');
        const source=sourceOf(image),previous=states.get(card);
        if(previous?.image===image&&previous.source===source){prepare(previous);return;}
        if(previous)cancel(previous);
        const state={card,image,source,visible:previous?.visible||false,decoding:false,done:false,timer:0,animation:null};
        states.set(card,state);intersection.observe(card);prepare(state);
    }
    function discover(node){
        if(node.nodeType!==1||node.matches('[data-prime-poster-skeleton],[data-prime-home-glow],[data-prime-home-reflection]'))return;
        if(node.matches(cards))track(node);
        for(const card of node.querySelectorAll(cards))track(card);
    }
    function slide(label,delay=0){
        if(!label||!label.isConnected)return;
        const frames=reduced.matches?[{opacity:0},{opacity:1}]:[{opacity:0,translate:'0 -14px',filter:'blur(.6px)'},{opacity:1,translate:'0 0',filter:'blur(0px)'}];
        animate(label,frames,{duration:reduced.matches?90:220,delay:reduced.matches?0:delay,fill:'backwards',easing:'cubic-bezier(.2,.65,.3,1)'});
    }
    function revealLabels(){
        for(const [wrapper,state] of labels)if(!wrapper.isConnected){state.animation?.cancel();labels.delete(wrapper);}
        for(const wrapper of document.querySelectorAll('.BasicHome '+wrappers.split(',').join(',.BasicHome '))){
            const label=wrapper.querySelector('.CarouselGameLabel,._3CKjiR7-fuBPyKZKpPI6UZ');if(!label)continue;
            const visible=(wrapper.matches('.ShowAsHovered,._3tdVJpA0NVV1y7pIQ87DkB')||wrapper.parentElement?.matches('.gpfocuswithin')||wrapper.previousElementSibling?.matches(':hover'))&&!leaving(wrapper);
            const card=wrapper.closest('.BasicGameCarouselItemMediaContainer')?.querySelector(cards),cardState=states.get(card);
            if(visible&&cardState&&!cardState.done)continue;
            const previous=labels.get(wrapper);
            if(visible&&(!previous?.visible||previous.label!==label)){
                previous?.animation?.cancel();
                const frames=reduced.matches?[{opacity:0},{opacity:1}]:[{opacity:0,translate:'0 -14px',filter:'blur(.6px)'},{opacity:1,translate:'0 0',filter:'blur(0px)'}];
                const delay=reduced.matches?0:Math.max(0,(cardState?.started||0)+(cardState?.delay||0)+80-performance.now());
                const animation=animate(label,frames,{duration:reduced.matches?90:220,delay,fill:'backwards',easing:'cubic-bezier(.2,.65,.3,1)'});
                labels.set(wrapper,{label,visible,animation});
            }else{if(!visible)previous?.animation?.cancel();labels.set(wrapper,{label,visible,animation:previous?.animation});}
        }
    }
    function flush(){
        frame=0;if(stopped)return;
        for(const [card,state] of states){
            if(!card.isConnected){cancel(state);intersection.unobserve(card);states.delete(card);}
            else if(leaving(card)){cancel(state);}
        }
        const batch=[];
        for(const state of ready){
            if(!state.visible||state.done||!state.card.isConnected||leaving(state.card)||state.card.hasAttribute('data-prime-poster-pending')){ready.delete(state);continue;}
            const rect=state.card.getBoundingClientRect();
            if(rect.width&&rect.height&&rect.bottom>0&&rect.top<innerHeight)batch.push({state,rect});
        }
        batch.sort((a,b)=>Math.abs(a.rect.top-b.rect.top)<40?a.rect.left-b.rect.left:a.rect.top-b.rect.top);
        for(let index=0;index<batch.length;index++){
            const state=batch[index].state;state.done=true;ready.delete(state);
            const delay=reduced.matches?0:Math.min(index*28,196);
            state.delay=delay;state.started=performance.now();
            state.animation?.effect.updateTiming({delay});state.animation?.play();
            if(state.card.closest('.BasicHome'))slide(state.card.querySelector('.BottomBar,.EventInfo'),delay+80);
        }
        if(batch.length)document.dispatchEvent(new CustomEvent('steam-prime-card-motion'));
        revealLabels();
    }
    const intersection=new IntersectionObserver(entries=>{
        for(const entry of entries){const state=states.get(entry.target);if(!state)continue;state.visible=entry.isIntersecting;if(state.visible)prepare(state);else{ready.delete(state);state.animation?.cancel();}}
        schedule();
    },{threshold:.05});
    const observer=new MutationObserver(records=>{
        let labelsChanged=false;
        for(const record of records){
            if(record.type==='childList'){for(const node of record.addedNodes)discover(node);labelsChanged=true;}
            else if(record.attributeName==='class'){
                if(record.target.matches(wrappers)||record.target.matches(transitions)||record.target.closest('.BasicHome')&&record.target.querySelector(wrappers))labelsChanged=true;
            }else{const card=record.target.closest(cards);if(card)track(card);}
        }
        if(labelsChanged)schedule();
    });
    const loaded=event=>{const card=event.target.tagName==='IMG'&&event.target.closest(cards);if(card)track(card);};
    const interact=event=>{if(event.target.closest('.BasicGameCarouselItemMediaContainer'))schedule();};
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src','srcset','class','data-prime-poster-pending']});
    document.addEventListener('load',loaded,true);document.addEventListener('focusin',interact);document.addEventListener('pointerover',interact);
    for(const card of document.querySelectorAll(cards))track(card);schedule();
    window.__steamPrimeCardEntranceDispose=()=>{
        stopped=true;cancelAnimationFrame(frame);clearTimeout(batchTimer);observer.disconnect();intersection.disconnect();
        document.removeEventListener('load',loaded,true);document.removeEventListener('focusin',interact);document.removeEventListener('pointerover',interact);
        for(const state of states.values())clearTimeout(state.timer);for(const animation of animations)animation.cancel();
        states.clear();ready.clear();labels.clear();animations.clear();
    };
})();
