(() => {
    function start(){
        if(window.__fluentyNativeLogoCenter)return;
        const state={running:false,seen:new Map(),attempts:new Map(),saved:0,checked:0,errors:[]};
        window.__fluentyNativeLogoCenter=state;
        async function scan(){
            if(state.running||typeof appStore==='undefined'||typeof appDetailsStore==='undefined')return;
            state.running=true;
            try{
                for(const app of appStore.m_mapApps.values()){
                    if(![1,1073741824].includes(app.app_type))continue;
                    const stamp=app.rt_custom_image_mtime||0,id=app.appid;
                    if(state.seen.get(id)===stamp||(state.attempts.get(id)||0)>=2)continue;
                    try{
                        await appDetailsStore.RequestCustomImageInfo(app);
                        const current=appDetailsStore.GetCustomLogoPosition(app);
                        if(current?.pinnedPosition==='CenterCenter'){state.seen.set(id,stamp);state.checked++;continue;}
                        const metadata=appDetailsStore.GetLogoImages(app);
                        if(!current&&!metadata.rgLogoImages.length){state.seen.set(id,stamp);continue;}
                        const original=current?JSON.parse(JSON.stringify(current)):null;
                        const backupKey='fluenty.nativeLogoCenter.previous.v1';
                        const backups=JSON.parse(localStorage.getItem(backupKey)||'{}');
                        if(!(id in backups)){backups[id]=original;localStorage.setItem(backupKey,JSON.stringify(backups));}
                        const position=current||metadata.logoPosition||{};
                        const centered={pinnedPosition:'CenterCenter',nWidthPct:position.nWidthPct||50,nHeightPct:position.nHeightPct||50};
                        await appDetailsStore.SaveCustomLogoPosition(app,centered);
                        if(appDetailsStore.GetCustomLogoPosition(app)?.pinnedPosition!=='CenterCenter')throw new Error('Center position was not retained');
                        state.seen.set(id,app.rt_custom_image_mtime||0);state.saved++;state.checked++;
                    }catch(error){state.attempts.set(id,(state.attempts.get(id)||0)+1);state.errors.push({id,error:String(error)});}
                    await new Promise(resolve=>setTimeout(resolve,25));
                }
            }finally{state.running=false;}
        }
        state.scan=scan;state.timer=setInterval(scan,20000);scan();
    }
    const shared=window.opener;
    if(shared)shared.eval('('+start.toString()+')()');
})();
