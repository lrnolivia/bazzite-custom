(() => {
    window.__seamlessBigPictureDispose?.();
    let timer,frame,accentRevision=0;
    const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'{}');}catch{return {};}};
    const setStyle=(element,name,value)=>{if(element.style.getPropertyValue(name)!==value)element.style.setProperty(name,value);};
    function headerState(main){
        const page=document.documentElement.dataset.steamPrimePage;
        const scroller=main?.closest('.ScrollContainer')||document.querySelector('.BasicHome [class~="ScrollArea"]');
        const tab=document.querySelector('.AppDetailsRoot [role=tabpanel],.BasicHome [class~="TabContentsScroll"]');
        const scroll=(scroller?.scrollTop||0)+(tab?.scrollTop||0);
        const compact=(page==='game'||page==='home')&&scroll>24;
        return {compact,scroll};
    }
    function reflect(){
        frame=0;
        const main=document.querySelector('.AppDetailsOverviewPanel>._2OOzYVWIHaKXm6_7sscT9i');
        const {compact,scroll}=headerState(main),headerValue=String(compact);
        if(!main){if(document.documentElement.dataset.primeHeaderCompact!==headerValue)document.documentElement.dataset.primeHeaderCompact=headerValue;if(document.documentElement.dataset.primePlaybarFloating!=='false')document.documentElement.dataset.primePlaybarFloating='false';return;}
        const root=main.querySelector('.AppDetailsRoot'),bar=root?.querySelector('.PlaySection');
        const padding=compact?0:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tbp-height'))||0;
        const offset=Math.round(-main.getBoundingClientRect().top)+'px';
        const floating=root&&bar?root.getBoundingClientRect().top<(compact?48:56)+Math.max(0,-window.screenY)+padding:false;
        const progress=Math.max(0,Math.min(1,(scroll-32)/320));
        const value=String(Math.round(progress*1000)/1000);
        if(main.style.getPropertyValue('--seamless-reflection-opacity')!==value)main.style.setProperty('--seamless-reflection-opacity',value);
        if(document.documentElement.dataset.primeHeaderCompact!==headerValue)document.documentElement.dataset.primeHeaderCompact=headerValue;
        if(main.style.getPropertyValue('--seamless-reflection-offset')!==offset)main.style.setProperty('--seamless-reflection-offset',offset);
        if(root&&bar){
            const state=String(floating);if(root.getAttribute('data-seamless-floating')!==state)root.setAttribute('data-seamless-floating',state);
            if(document.documentElement.dataset.primePlaybarFloating!==state)document.documentElement.dataset.primePlaybarFloating=state;
        }
    }
    const onScroll=()=>{if(!frame)frame=requestAnimationFrame(reflect);};
    async function update(){
        const request=++accentRevision;
        timer=0;onScroll();
        setStyle(document.documentElement,'--seamless-window-inset',Math.max(0,-window.screenY)+'px');
        const route=(window.opener||window).tempNavStore?.m_locationPathname||'';
        const page=/^\/library\/app\/\d+$/.test(route)?'game':route==='/library/home'?'home':'utility';
        if(document.documentElement.dataset.steamPrimePage!==page)document.documentElement.dataset.steamPrimePage=page;
        const hero=document.querySelector('.TopCapsule .HeaderBackgroundImage img.ImgSrc:not(.ImgBlur)');
        const src=hero?.currentSrc||hero?.src||'';
        const capsule=hero?.closest('.TopCapsule'),background=hero?.closest('.HeaderBackgroundImage');
        let playHeight;
        if(capsule&&background){
            const height=capsule.clientHeight;
            const currentRoot=document.querySelector('.AppDetailsRoot');
            playHeight=currentRoot?.dataset.seamlessFloating==='true'?(parseFloat(currentRoot.style.getPropertyValue('--seamless-playbar-height'))||80):(document.querySelector('.PlaySection')?.getBoundingClientRect().height||80);
            setStyle(capsule,'--seamless-playbar-height',playHeight+'px');
            setStyle(background,'--seamless-gradient-start',(height+playHeight/2)+'px');
            setStyle(background,'--seamless-blur-start',(height+playHeight/2-24)+'px');
        }
        const id=gameArtworkId([{src}],route);
        const root=document.querySelector('.AppDetailsRoot');if(!root)return;
        if(id&&root.getAttribute('data-artwork-appid')!==id)root.setAttribute('data-artwork-appid',id);
        else if(!id&&root.hasAttribute('data-artwork-appid'))root.removeAttribute('data-artwork-appid');
        if(root.dataset.seamlessFloating!=='true')setStyle(root,'--seamless-playbar-height',((playHeight??root.querySelector('.PlaySection')?.getBoundingClientRect().height)||80)+'px');
        if(!root.querySelector(':scope>[data-seamless-transition]')){
            const layer=document.createElement('div');layer.setAttribute('data-seamless-transition','');layer.setAttribute('aria-hidden','true');
            for(const part of ['blur','shade']){const node=document.createElement('div');node.setAttribute('data-seamless-transition-'+part,'');layer.append(node);}
            root.prepend(layer);
        }
        const logo=document.querySelector('.TopCapsule .TitleLogo'),row=root.querySelector('.ActionRow');
        let floatingLogo=root.querySelector('[data-seamless-floating-logo]');
        if(logo&&row){
            if(!floatingLogo){floatingLogo=document.createElement('img');floatingLogo.setAttribute('data-seamless-floating-logo','');floatingLogo.alt='';floatingLogo.setAttribute('aria-hidden','true');row.querySelector('.ActionButtonAndStatusPanel')?.after(floatingLogo);}
            if(floatingLogo.src!==logo.src)floatingLogo.src=logo.src;
        }
        const poster=root.querySelector('.PortraitImage img,._2IYf7aM4eYQ2Oh-ntmzHbm img,img[src*=library_capsule]');
        const sources=[{img:logo,src:logo?.currentSrc||logo?.src,role:'logo'},{img:hero,src,role:'hero'},{img:poster,src:poster?.currentSrc||poster?.src,role:'poster'}].filter(s=>s.src);
        let sample=readGameArtworkAccent(id);
        let override=read('fluenty.artworkAccent.overrides.v1')[id];
        if(!override&&!sample){
            const result=await resolveGameArtworkAccent(id,sources,palettes.byId[id]);
            if(request!==accentRevision||!root.isConnected)return;
            if(result)sample=result;
        }
        if(request!==accentRevision||!root.isConnected)return;
        override=read('fluenty.artworkAccent.overrides.v1')[id];
        const selected=override?manualArtworkAccent(override):sample;
        let color=selected?.color;
        if(!color){
            if(root.style.getPropertyValue('--artwork-play-color'))root.style.removeProperty('--artwork-play-color');
            color=getComputedStyle(root).getPropertyValue('--artwork-play-color').trim();
        }
        if(/^#[0-9a-f]{6}$/i.test(color||'')){
            const text=selected?.text||'#f4f4f4',tone=window.__fluentyAccentTone?.(color,text);
            for(const [name,value] of [['--artwork-play-color',color],['--artwork-play-text',tone?.text||text],['--artwork-play-glyph',tone?.glyph||tone?.text||text]]){
                if(root.style.getPropertyValue(name)!==value)root.style.setProperty(name,value);
            }
        }else{
            root.style.removeProperty('--artwork-play-color');root.style.removeProperty('--artwork-play-text');
        }
    }
    const schedule=()=>{if(!timer)timer=setTimeout(update,100);};
    const observer=new MutationObserver(schedule);
    observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src','srcset']});
    window.addEventListener('storage',schedule);window.addEventListener('resize',schedule);document.addEventListener('load',schedule,true);document.addEventListener('scroll',onScroll,{capture:true,passive:true});update();
    window.__seamlessBigPictureDispose=()=>{accentRevision++;observer.disconnect();clearTimeout(timer);cancelAnimationFrame(frame);window.removeEventListener('storage',schedule);window.removeEventListener('resize',schedule);document.removeEventListener('load',schedule,true);document.removeEventListener('scroll',onScroll,true);};
})();
