/* Short interaction feedback for Big Picture and its native menu windows. */
(() => {
    if(!/^(?:Steam Big Picture Mode$|MainMenu_|QuickAccess_)/.test(document.title))return;
    window.__steamPrimeUiMotionDispose?.();
    const mainRows='#MainNavMenuContainer .ItemOuter';
    const controls='button,.DialogButton,.AppActionButton,.DialogDropDown,[role="button"],[role="tab"],[role="menuitem"],[role="checkbox"],[role="switch"],.contextMenuItem,.DialogDropDownMenuItem';
    const cards='.LibraryItemBox,.GameCapsule,.StoreAppCapsule,.EventPreviewContainer,.PartnerEventMediumImage_Container,.CommunityItem';
    const panels='#QuickAccess-Menu,#MainNavMenuContainer [role="menu"],.GamepadDialogContent,.DialogContent,.BasicContextMenuContainer,.contextMenuContents,.DialogDropDown_Menu,[role="tabpanel"],[role="alert"]';
    const reduced=matchMedia('(prefers-reduced-motion:reduce)');
    const pressed=new Map(),feedback=new WeakMap(),lastPulse=new WeakMap(),lastFocus=new WeakMap(),surfaces=new Map(),surfaceParents=new WeakSet(),animations=new Set();
    let frame=0,stopped=false;
    const schedule=()=>{if(!frame&&!stopped)frame=requestAnimationFrame(refresh);};
    function motion(element,frames,timing,replace=false,hold=false){
        if(!element?.animate||!element.isConnected)return null;
        try{
            if(replace)feedback.get(element)?.cancel();
            const animation=element.animate(frames,timing);animations.add(animation);
            if(replace)feedback.set(element,animation);
            animation.finished.catch(()=>{}).finally(()=>{
                if(hold&&pressed.get(element)?.animation===animation)return;
                animations.delete(animation);if(feedback.get(element)===animation)feedback.delete(element);animation.cancel();
            });
            return animation;
        }catch{return null;}
    }
    function control(target){
        if(!target?.closest||target.closest('input,textarea,[contenteditable="true"],[role="slider"],.DialogSlider,.Slider'))return null;
        let element=target.closest(mainRows)||target.closest(controls);
        if(!element||element.closest(cards))return null;
        element=element.closest('.AppActionButton')||element;
        if(element.matches(':disabled,[disabled],[aria-disabled="true"],.Disabled,.disabled')||element.closest('[inert],[aria-hidden="true"]'))return null;
        return element;
    }
    function scaleOf(element){const value=parseFloat(getComputedStyle(element).scale);return Number.isFinite(value)&&value>0?value:1;}
    function down(element,pointer){
        if(pressed.has(element))return;
        feedback.get(element)?.cancel();
        const base=scaleOf(element),small=element.matches(mainRows)||element.matches('[role="tab"],[role="menuitem"],.contextMenuItem');
        const amount=small ? .965 : .94;
        const frames=reduced.matches?[{opacity:1},{opacity:.72}]:[{scale:String(base),translate:'0 0'},{scale:String(base*amount),translate:'0 1px'}];
        const animation=motion(element,frames,{duration:70,fill:'forwards',easing:'cubic-bezier(.2,.65,.3,1)'},true,true);
        const record={element,base,amount,pointer,animation,timer:0};
        record.timer=setTimeout(()=>release(record,true),1500);pressed.set(element,record);
    }
    function release(record,cancelled=false){
        if(pressed.get(record.element)!==record)return;
        pressed.delete(record.element);clearTimeout(record.timer);
        const {element,base}=record;
        const current=element.isConnected?scaleOf(element):base;
        record.animation?.cancel();animations.delete(record.animation);if(feedback.get(element)===record.animation)feedback.delete(element);
        if(!element.isConnected)return;
        const frames=reduced.matches?[{opacity:.72},{opacity:1}]:cancelled?
            [{scale:String(current),translate:'0 1px'},{scale:String(base),translate:'0 0'}]:
            [{scale:String(current),translate:'0 1px',offset:0},{scale:String(base*1.025),translate:'0 -1px',offset:.65},{scale:String(base),translate:'0 0',offset:1}];
        motion(element,frames,{duration:reduced.matches?90:cancelled?90:190,easing:'cubic-bezier(.2,.65,.3,1)'},true);
        lastPulse.set(element,performance.now());
    }
    function pulse(element){
        if(performance.now()-(lastPulse.get(element)||-Infinity)<120)return;
        const held=pressed.get(element);if(held){release(held);return;}
        feedback.get(element)?.cancel();
        const base=scaleOf(element),amount=element.matches(mainRows) ? .965 : .94;
        const frames=reduced.matches?[{opacity:.72},{opacity:1}]:[
            {scale:String(base*amount),translate:'0 1px',offset:0},
            {scale:String(base*1.025),translate:'0 -1px',offset:.65},
            {scale:String(base),translate:'0 0',offset:1}
        ];
        motion(element,frames,{duration:reduced.matches?90:210,easing:'cubic-bezier(.2,.65,.3,1)'},true);
        lastPulse.set(element,performance.now());
    }
    function focus(element){
        if(!element||pressed.has(element)||performance.now()-(lastFocus.get(element)||-Infinity)<120)return;
        lastFocus.set(element,performance.now());
        if(reduced.matches)return;
        feedback.get(element)?.cancel();
        const base=scaleOf(element);
        motion(element,[{scale:String(base*.985)},{scale:String(base*1.012),offset:.7},{scale:String(base)}],{duration:150,easing:'cubic-bezier(.2,.65,.3,1)'},true);
    }
    const pointerDown=event=>{if(event.button!==0)return;const element=control(event.target);if(element)down(element,event.pointerId);};
    const pointerUp=event=>{for(const record of [...pressed.values()])if(record.pointer===event.pointerId)release(record,event.type==='pointercancel');};
    const keyDown=event=>{if(event.repeat||!['Enter',' '].includes(event.key))return;const element=control(event.target);if(element)down(element,'key');};
    const keyUp=event=>{if(!['Enter',' '].includes(event.key))return;for(const record of [...pressed.values()])if(record.pointer==='key')release(record);};
    const activate=event=>{if(event.type==='click'&&event.button!==0)return;const element=control(event.target)||(event.type==='vgp_onok'?control(document.activeElement):null);if(element)pulse(element);};
    const focused=event=>focus(control(event.target));
    const hovered=event=>{
        const row=event.target.closest?.(mainRows);
        if(row&&row!==event.relatedTarget?.closest?.(mainRows))focus(control(row));
    };
    function eligible(surface){
        if(surface.closest('.TopCapsule,.AppDetailsRoot,.BasicHomeUpdates,.RecentSection,#sgdb-wrap,.sgdb-modal'))return false;
        if(surface.matches('[role="tabpanel"]')&&surface.closest('.BasicHome')&&!surface.closest('#QuickAccess-Menu,.GamepadDialogContent,.DialogContent'))return false;
        return !surface.querySelector('.TopCapsule,.LibraryItemBox,.GameCapsule,.EventPreviewContainer');
    }
    function discover(node,initial=false){
        if(node.nodeType!==1)return;
        const found=node.matches(panels)?[node,...node.querySelectorAll(panels)]:[...node.querySelectorAll(panels)];
        for(const surface of found){
            if(surfaces.has(surface)||!eligible(surface))continue;
            for(let parent=surface.parentElement;parent&&parent!==document.body;parent=parent.parentElement)surfaceParents.add(parent);
            surfaces.set(surface,{shown:false,initial:initial&&document.title==='Steam Big Picture Mode',until:performance.now()+350});intersection.observe(surface);
        }
    }
    function refresh(){
        frame=0;if(stopped)return;
        const entering=[],now=performance.now();
        for(const [element,record] of surfaces){
            if(!element.isConnected){surfaces.delete(element);intersection.unobserve(element);continue;}
            const rect=element.getBoundingClientRect(),style=getComputedStyle(element);
            const inView=rect.width>0&&rect.height>0&&rect.bottom>0&&rect.top<innerHeight&&rect.right>0&&rect.left<innerWidth;
            let parentVisible=true;
            for(let parent=element.parentElement;parent&&parent!==document.body;parent=parent.parentElement){
                const inherited=getComputedStyle(parent);
                if(inherited.display==='none'||inherited.visibility==='hidden'||Number(inherited.opacity)<=.05){parentVisible=false;break;}
            }
            const open=!document.hidden&&parentVisible&&inView&&style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)>.05&&!element.closest('[aria-hidden="true"]');
            if(open&&!record.shown&&!record.initial){
                const rows=element.closest('#MainNavMenuContainer')?[...element.querySelectorAll(mainRows)].filter(row=>{
                    const bounds=row.getBoundingClientRect();return bounds.width>0&&bounds.height>0&&bounds.bottom>0&&bounds.top<innerHeight;
                }):[];
                entering.push({element,rect,rows});
            }
            record.shown=open;record.initial=false;
            if(!open&&inView&&style.display!=='none'&&style.visibility!=='hidden'&&(!parentVisible||Number(style.opacity)<=.05)&&now<record.until)schedule();
        }
        for(const {element,rect,rows} of entering){
            if(entering.some(other=>other.element!==element&&other.element.contains(element)))continue;
            const large=rect.width*rect.height>innerWidth*innerHeight*.55;
            const side=element.id==='QuickAccess-Menu'?1:element.closest('#MainNavMenuContainer')?-1:0;
            const start=side?(side*16)+'px 0':'0 12px',settle=side?(-side*2)+'px 0':'0 -2px';
            const frames=reduced.matches||large?[{opacity:0},{opacity:1}]:[
                {opacity:0,translate:start,scale:'.985',offset:0},
                {opacity:1,translate:settle,scale:'1.004',offset:.75},
                {opacity:1,translate:'0 0',scale:'1',offset:1}
            ];
            motion(element,frames,{duration:reduced.matches?90:element.matches('[role="tabpanel"]')?170:220,easing:'cubic-bezier(.2,.65,.3,1)'});
            for(let index=0;index<rows.length;index++){
                const row=rows[index];if(feedback.has(row)||pressed.has(row))continue;
                const poses=reduced.matches?[{opacity:0},{opacity:1}]:[
                    {opacity:0,translate:'-10px 0',scale:'.985',offset:0},
                    {opacity:1,translate:'1px 0',scale:'1.006',offset:.75},
                    {opacity:1,translate:'0 0',scale:'1',offset:1}
                ];
                motion(row,poses,{duration:reduced.matches?90:180,delay:reduced.matches?0:Math.min(index*22,110),fill:'backwards',easing:'cubic-bezier(.2,.65,.3,1)'},true);
            }
            // Blur only a small heading, never the frosted surface or artwork.
            const title=element.querySelector('.DialogHeader,.TabPanelHeader,.BasicContextMenuHeader');
            if(!reduced.matches&&title){const bounds=title.getBoundingClientRect();if(bounds.width<600&&bounds.height<100)motion(title,[{filter:'blur(.65px)',opacity:.7},{filter:'blur(0px)',opacity:1}],{duration:100,easing:'ease-out'});}
        }
        for(const record of [...pressed.values()])if(!record.element.isConnected)release(record,true);
    }
    const intersection=new IntersectionObserver(()=>schedule(),{threshold:[0,.15,.5,1]});
    const observer=new MutationObserver(records=>{
        let changed=false;
        for(const record of records){
            if(record.type==='childList'){
                for(const node of record.addedNodes)discover(node);
                if(record.addedNodes.length||record.removedNodes.length)changed=true;
            }else{
                if(record.attributeName==='class'&&record.target.classList.contains('gpfocus')&&!/(?:^|\s)gpfocus(?:\s|$)/.test(record.oldValue||''))focus(control(record.target));
                if(record.attributeName==='class'&&record.target.matches(mainRows)&&record.target.classList.contains('gpfocuswithin')&&!/(?:^|\s)gpfocuswithin(?:\s|$)/.test(record.oldValue||''))focus(control(record.target));
                if(record.target.matches(panels)||surfaceParents.has(record.target)){for(const state of surfaces.values())state.until=performance.now()+350;changed=true;}
            }
        }
        if(changed)schedule();
    });
    const reset=()=>{for(const record of [...pressed.values()])release(record,true);if(document.hidden){for(const animation of animations)animation.cancel();for(const state of surfaces.values())state.shown=false;}else schedule();};
    const listeners=[['pointerdown',pointerDown],['pointerup',pointerUp],['pointercancel',pointerUp],['keydown',keyDown],['keyup',keyUp],['click',activate],['vgp_onok',activate],['focusin',focused],['pointerover',hovered]];
    for(const [name,handler] of listeners)document.addEventListener(name,handler,true);
    document.addEventListener('visibilitychange',reset);window.addEventListener('blur',reset);
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeOldValue:true,attributeFilter:['class','style','aria-hidden','aria-selected','hidden','open']});
    discover(document.body,true);schedule();
    window.__steamPrimeUiMotionDispose=()=>{
        stopped=true;cancelAnimationFrame(frame);observer.disconnect();intersection.disconnect();
        for(const [name,handler] of listeners)document.removeEventListener(name,handler,true);
        document.removeEventListener('visibilitychange',reset);window.removeEventListener('blur',reset);
        for(const record of pressed.values())clearTimeout(record.timer);for(const animation of animations)animation.cancel();
        pressed.clear();surfaces.clear();animations.clear();
    };
})();
