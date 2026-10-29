(() => {
    const desktop=document.title==='Steam'&&document.body.classList.contains('DesktopUI');
    if(document.title!=='Steam Big Picture Mode'&&!desktop)return;
    window.__steamPrimeGameMotionDispose?.();
    const capsuleSelector='.TopCapsule,.NZMJ6g2iVnFsOOp-lDmIP';
    const heroSelector='.HeaderBackgroundImage img.ImgSrc:not(.ImgBlur),._1IX7FPSY9Jb82KhBVBSkZa img.HNbe3eZf6H7dtJ042x1vM:not(.HSQWw9HUAP6jtA2OZjS-u):not(._3_IUVzR9tpG_JKEjhwXEAb)';
    const logoSelector='img.TitleLogo,img._3NBxSLAZLbbbnul8KfDFjw';
    const transitionSelector='.TopLevelTransition,._2vPeXDfwKg2Vzg29KBnOIV';
    const exitSelector='.Exit,.ExitActive,._25ZS3AKZvbecqJzhhTAJpJ,.SoGsJMX5YFXJ4igEQIPw3';
    const seen=new WeakMap(),animations=new Set(),waiting=new Map();
    let frame=0,stopped=false;
    const sourceOf=image=>image.currentSrc||image.src;
    function discard(record){
        clearTimeout(record.timer);waiting.delete(record.image);record.animation.cancel();
    }
    function reveal(image,kind,capsule,initial){
        if(!image?.complete||!image.naturalWidth)return;
        const source=sourceOf(image);
        if(!source||seen.get(image)===source)return;
        const transition=capsule.closest(transitionSelector);
        if(transition?.matches(exitSelector))return;
        // Cached images can already be complete when the theme attaches to a
        // newly entering page. Only skip an initial image on a settled page.
        if(initial){
            if(transition?.matches('.Enter,.EnterActive,.d8bGjRp0Z3JsNrdKp1xfP,.Cpk9b1-bcgEsXWaqIL6Oe'))schedule();
            else seen.set(image,source);
            return;
        }
        // Steam adds Loaded after its image load handler. The capture-phase
        // event can arrive while the logo is still display:none.
        const style=getComputedStyle(image);
        if(style.display==='none'||style.visibility==='hidden')return;
        seen.set(image,source);
        if(!image.animate)return;
        const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
        const frames=reduced?[{opacity:0},{opacity:1}]:[{opacity:0,scale:kind==='hero'?'1.045':'0.90'},{opacity:1,scale:'1'}];
        try{
            const animation=image.animate(frames,{duration:reduced?80:300,easing:'cubic-bezier(.2,.65,.3,1)'});
            // Hold the first pose while decoding. Let the browser resolve the
            // play start on presentation; assigning startTime backdates the
            // entrance across expensive first-use decode/raster work.
            animation.pause();animation.currentTime=0;
            const previous=waiting.get(image);if(previous)discard(previous);
            const record={image,source,requested:image.src,capsule,animation,ready:false,queued:performance.now(),timer:0};
            waiting.set(image,record);
            const ready=()=>{
                if(stopped||waiting.get(image)!==record)return;
                clearTimeout(record.timer);record.ready=true;schedule();
            };
            // A failed or stalled decode must never leave artwork hidden.
            record.timer=setTimeout(ready,500);
            Promise.resolve().then(()=>image.decode?.()).then(ready,ready);
            animations.add(animation);
            animation.finished.catch(()=>{}).finally(()=>animations.delete(animation));
        }catch{}
    }
    function scan(initial=false){
        frame=0;if(stopped)return;
        for(const capsule of document.querySelectorAll(capsuleSelector)){
            if(!desktop)reveal(capsule.querySelector(heroSelector),'hero',capsule,initial);
            reveal(capsule.querySelector(logoSelector),'logo',capsule,initial);
        }
        const visibility=new Map();
        for(const record of waiting.values()){
            const {image,capsule,animation}=record,transition=capsule.closest(transitionSelector);
            if(!image.isConnected||image.src!==record.requested||sourceOf(image)!==record.source||transition?.matches(exitSelector)){discard(record);continue;}
            if(!record.ready)continue;
            const target=transition||capsule;
            let visible=visibility.get(target);
            if(visible===undefined){const style=getComputedStyle(target);visible=style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)>0.05;visibility.set(target,visible);}
            if(!visible){
                if(performance.now()-record.queued<800)schedule();
                else discard(record);
                continue;
            }
            clearTimeout(record.timer);waiting.delete(image);animation.play();
        }
    }
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(()=>scan());};
    const loaded=event=>{
        const image=event.target,capsule=image.tagName==='IMG'&&image.closest(capsuleSelector);
        if(capsule&&image.matches(heroSelector+','+logoSelector))schedule();
    };
    const observer=new MutationObserver(records=>{
        if(records.some(record=>record.type==='attributes'?
            (record.target.closest?.(capsuleSelector)&&(record.attributeName!=='class'||record.target.matches(logoSelector)))||
            (record.attributeName==='class'&&record.target.matches(transitionSelector)&&record.target.querySelector(capsuleSelector)):
            [...record.addedNodes].some(node=>node.nodeType===1&&(node.matches(capsuleSelector)||node.closest(capsuleSelector)||node.querySelector(capsuleSelector)))))schedule();
    });
    scan(true);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src','srcset','class']});
    document.addEventListener('load',loaded,true);
    window.__steamPrimeGameMotionDispose=()=>{stopped=true;cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('load',loaded,true);for(const record of waiting.values())clearTimeout(record.timer);waiting.clear();for(const animation of animations)animation.cancel();animations.clear();};
})();
