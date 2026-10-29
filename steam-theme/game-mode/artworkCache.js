/* Immutable, byte-for-byte cache for versioned local heroes and logos. */
(() => {
    if(document.title!=='Steam Big Picture Mode'&&!(document.title==='Steam'&&document.body.classList.contains('DesktopUI')))return;
    window.__steamPrimeArtworkCacheDispose?.();
    const host=window.opener||window;
    function createCache(){
        const memory=new Map(),pending=new Map(),choices=new Map(),cooldown=new Map(),decoded=[];
        const maxBytes=128*1024*1024,maxFile=32*1024*1024,maxDecoded=96*1024*1024;
        const stats={hits:0,saved:0,hydrated:0,warmed:0,failures:0,bytes:0};
        let db,store,wrapped,descriptor,opening,decodedBytes=0,warmTimer=0,stopped=false,fetchQueue=Promise.resolve(),warmQueue=Promise.resolve();
        let currentRoute=host.tempNavStore?.m_locationPathname||'';
        const noteRoute=()=>{const route=host.tempNavStore?.m_locationPathname||'';if(route!==currentRoute){currentRoute=route;choices.clear();}return route;};
        const identify=value=>{
            try{
                const original=String(value).split('#steam-prime-original=')[1]||value;
                const url=new host.URL(original,host.location.href);
                const custom=/^\/customimages\/\d+_(?:hero|logo)\.(?:jpg|png)$/i.test(url.pathname)&&Number(url.searchParams.get('v'))>0;
                const native=/^\/assets\/\d+\/[a-f0-9]{20,}\/(?:library_hero|logo|library_logo)\.(?:jpg|png)$/i.test(url.pathname);
                if(url.origin!==host.location.origin||(!custom&&!native))return null;
                url.hash='';return url.href;
            }catch{return null;}
        };
        const open=()=>opening||(opening=new Promise(resolve=>{
            let finished=false;
            const finish=value=>{if(!finished){finished=true;host.clearTimeout(timer);resolve(value);}};
            const timer=host.setTimeout(()=>finish(null),2000);
            try{
                const request=host.indexedDB.open('steam-prime-original-artwork',1);
                request.onupgradeneeded=()=>request.result.createObjectStore('images',{keyPath:'source'});
                request.onsuccess=()=>{if(finished)request.result.close();else{db=request.result;db.onversionchange=()=>db.close();finish(db);}};
                request.onerror=request.onblocked=()=>finish(null);
            }catch{finish(null);}
        }));
        function remember(record){
            if(memory.has(record.source))return memory.get(record.source);
            if(!record.blob?.size||record.blob.size>maxFile||stats.bytes+record.blob.size>maxBytes||memory.size>=32)return null;
            const url=host.URL.createObjectURL(record.blob)+'#steam-prime-original='+record.source;
            const entry={...record,url};memory.set(record.source,entry);stats.bytes+=record.blob.size;return entry;
        }
        const ready=(async()=>{
            const database=await open();if(!database)return;
            await new Promise(resolve=>{
                const timer=host.setTimeout(resolve,2000);
                try{
                    const request=database.transaction('images').objectStore('images').getAll();
                    request.onsuccess=()=>{host.clearTimeout(timer);for(const record of (request.result||[]).sort((a,b)=>b.created-a.created))if(identify(record.source)===record.source&&remember(record))stats.hydrated++;resolve();};
                    request.onerror=()=>{host.clearTimeout(timer);resolve();};
                }catch{host.clearTimeout(timer);resolve();}
            });
        })();
        async function persist(record){
            const database=await open();if(!database)return;
            try{
                const transaction=database.transaction('images','readwrite'),images=transaction.objectStore('images');
                images.put(record);
                const request=images.getAll();request.onsuccess=()=>{
                    let bytes=0,count=0;
                    for(const row of request.result.sort((a,b)=>b.created-a.created)){
                        bytes+=row.blob?.size||0;count++;
                        if(count>48||bytes>192*1024*1024)images.delete(row.source);
                    }
                };
            }catch{}
        }
        async function staticImage(blob){
            try{
                const bytes=new Uint8Array(await blob.slice(0,65536).arrayBuffer()),view=new DataView(bytes.buffer);
                // Local artwork URLs and MIME labels can say PNG for JPEG bytes.
                if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return true;
                if(![137,80,78,71,13,10,26,10].every((byte,index)=>bytes[index]===byte))return false;
                for(let at=8;at+12<=bytes.length;){
                    const length=view.getUint32(at),type=String.fromCharCode(...bytes.slice(at+4,at+8));
                    if(type==='acTL')return false;
                    if(type==='IDAT')return true;
                    at+=length+12;
                }
            }catch{}
            return false;
        }
        async function warm(entry){
            const expectedBytes=entry.width*entry.height*4;
            if(stopped||entry.warm||!(expectedBytes>0)||expectedBytes>maxDecoded||!await staticImage(entry.blob))return;
            while(decoded.length&&(decoded.length>=2||decodedBytes+expectedBytes>maxDecoded)){
                const previous=decoded.shift();decodedBytes-=previous.bytes;previous.entry.warm=false;
            }
            entry.warm=true;
            const image=new host.Image();image.decoding='async';image.src=entry.url;
            try{
                await image.decode();
                if(stopped)return;
                const bytes=image.naturalWidth*image.naturalHeight*4;
                if(bytes>maxDecoded){entry.warm=false;return;}
                decoded.push({image,bytes,entry});decodedBytes+=bytes;stats.warmed++;
            }catch{entry.warm=false;}
        }
        function scheduleWarm(entry){
            host.clearTimeout(warmTimer);
            warmTimer=host.setTimeout(()=>{
                warmTimer=0;
                const enqueue=()=>{warmQueue=warmQueue.then(()=>warm(entry)).catch(()=>{});};
                if(typeof host.requestIdleCallback==='function')host.requestIdleCallback(enqueue,{timeout:3000});
                else enqueue();
            },1200);
        }
        function learn(image){
            if(image?.tagName!=='IMG'||!image.complete||!image.naturalWidth)return;
            const source=identify(image.currentSrc||image.src);
            if(!source||memory.has(source)||pending.has(source)||(cooldown.get(source)||0)>Date.now())return;
            const width=image.naturalWidth,height=image.naturalHeight;
            const task=fetchQueue.then(async()=>{
                await ready;
                if(stopped||memory.has(source))return;
                await new Promise(resolve=>host.setTimeout(()=>{
                    if(typeof host.requestIdleCallback==='function')host.requestIdleCallback(resolve,{timeout:2000});
                    else resolve();
                },500));
                if(stopped)return;
                const controller=new host.AbortController(),timer=host.setTimeout(()=>controller.abort(),7000);
                try{
                    const response=await host.fetch(source,{cache:'force-cache',credentials:'same-origin',signal:controller.signal});
                    if(!response.ok||Number(response.headers.get('content-length'))>maxFile)return;
                    const blob=await response.blob();
                    if(!['image/png','image/jpeg'].includes(blob.type)||!blob.size||blob.size>maxFile)return;
                    const record={source,blob,width,height,created:Date.now()};
                    const entry=remember(record);void persist(record);stats.saved++;
                    if(entry)scheduleWarm(entry);
                }catch{stats.failures++;cooldown.set(source,Date.now()+30000);}
                finally{host.clearTimeout(timer);}
            }).finally(()=>pending.delete(source));
            fetchQueue=task.catch(()=>{});
            pending.set(source,task);
        }
        function attach(images=[]){
            const next=host.appStore;
            if(store||typeof next?.GetCustomImageURLs!=='function')return !!store;
            const original=next.GetCustomImageURLs;
            const installRoute=host.tempNavStore?.m_locationPathname||'';
            const activeNative=new Set([...images].filter(image=>!(image.currentSrc||image.src||'').startsWith('blob:')).map(image=>identify(image.currentSrc||image.src)).filter(Boolean).map(source=>source.replace(/\.(?:jpg|png)(?=\?)/i,'')));
            descriptor=Object.getOwnPropertyDescriptor(next,'GetCustomImageURLs');
            wrapped=function(...args){
                let urls=original.apply(this,args);
                const manifest=host.__loewCustomArtwork,app=args[0],suffix=args[1]||'';
                if(manifest&&!(app?.rt_custom_image_mtime>manifest.scannedAt)){
                    const known=manifest.files[String(app?.appid)+':'+suffix];
                    if(known)urls=known.map(url=>new host.URL(url,host.location.href).href);
                    else if(['','p','_hero','_logo'].some(kind=>manifest.files[String(app?.appid)+':'+kind]))urls=[];
                }
                if(!Array.isArray(urls)||!urls.length)return urls;
                const source=urls.map(identify);if(!source.some(Boolean))return urls;
                const signature=urls.join('\n'),route=noteRoute();
                const previous=choices.get(signature);
                // Never change a mounted view's source list when a fetch finishes.
                if(previous?.route===route)return previous.urls;
                const alreadyMounted=!previous&&route===installRoute&&source.some(key=>key&&activeNative.has(key.replace(/\.(?:jpg|png)(?=\?)/i,'')));
                const entry=!alreadyMounted&&source.map(key=>memory.get(key)).find(Boolean);
                const chosen=entry?[entry.url,...urls]:urls;
                if(entry){stats.hits++;scheduleWarm(entry);}
                choices.set(signature,{route,urls:chosen});
                if(choices.size>2048)choices.delete(choices.keys().next().value);
                return chosen;
            };
            try{Object.defineProperty(next,'GetCustomImageURLs',{value:wrapped,writable:true,configurable:true});store=next;}catch{}
            return !!store;
        }
        const detach=()=>{
            if(store?.GetCustomImageURLs===wrapped){if(descriptor)Object.defineProperty(store,'GetCustomImageURLs',descriptor);else delete store.GetCustomImageURLs;}
            store=null;wrapped=null;
        };
        host.addEventListener('unload',()=>{
            stopped=true;detach();host.clearTimeout(warmTimer);
            for(const entry of memory.values())host.URL.revokeObjectURL(entry.url.split('#')[0]);
            decoded.length=0;db?.close();
        },{once:true});
        function use(image){
            if(image?.tagName!=='IMG'||image.src.startsWith('blob:')||image.srcset)return;
            const entry=memory.get(identify(image.src));
            if(entry){image.src=entry.url;stats.hits++;scheduleWarm(entry);}
        }
        return {version:4,clients:0,stats,ready,learn,attach,detach,noteRoute,use};
    }
    const previous=host.__steamPrimeOriginalArtworkCache;
    if(previous&&previous.version!==4)previous.detach();
    const cache=previous?.version===4?previous:(host.__steamPrimeOriginalArtworkCache=createCache());
    cache.clients++;
    let disposed=false,attempts=0,retry=0;
    cache.ready.then(()=>{if(!disposed&&!cache.attach(document.images))retry=host.setInterval(()=>{if(cache.attach(document.images)||++attempts>=30)host.clearInterval(retry);},500);});
    const loaded=event=>cache.learn(event.target);
    const routes=new MutationObserver(records=>{
        cache.noteRoute();
        for(const r of records){
            if(r.type==='attributes')cache.use(r.target);
            else for(const n of r.addedNodes){if(n.nodeType!==1)continue;cache.use(n);n.querySelectorAll('img').forEach(cache.use);}
        }
    });
    routes.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
    document.addEventListener('load',loaded,true);
    for(const image of document.images)cache.learn(image);
    const dispose=()=>{
        if(disposed)return;disposed=true;host.clearInterval(retry);routes.disconnect();
        document.removeEventListener('load',loaded,true);window.removeEventListener('unload',dispose);
        if(--cache.clients===0)cache.detach();
    };
    window.addEventListener('unload',dispose,{once:true});window.__steamPrimeArtworkCacheDispose=dispose;
})();
