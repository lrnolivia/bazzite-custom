/* Sample the current artwork, including games added after the bundled palette. */
const samples=new Map();
function luminance(rgb) {
    return rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;})
        .reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
}
function vividArtworkAccent(value) {
    if(value.text)return value;
    const rgb=value.color.match(/\w\w/g).map(v=>parseInt(v,16)/255);
    const max=Math.max(...rgb),min=Math.min(...rgb),d=max-min;
    if(d<.03)return value;
    let h=max===rgb[0]?((rgb[1]-rgb[2])/d+6)%6:max===rgb[1]?(rgb[2]-rgb[0])/d+2:(rgb[0]-rgb[1])/d+4;
    h/=6;
    const pastel=[0,8,4].map(n=>{const k=(n+h*12)%12;return Math.round(255*(.86-.6*.14*Math.max(-1,Math.min(k-3,9-k,1))));});
    const fromHsl=l=>{
        const a=.94*Math.min(l,1-l);
        return [0,8,4].map(n=>{const k=(n+h*12)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1))));});
    };
    let lo=0,hi=.75;
    for(let i=0;i<20;i++){const mid=(lo+hi)/2;if((luminance(pastel)+.05)/(luminance(fromHsl(mid))+.05)>=4.5)lo=mid;else hi=mid;}
    const hex=c=>'#'+c.map(v=>v.toString(16).padStart(2,'0')).join('');
    return {color:hex(fromHsl(lo)),hover:hex(fromHsl(lo*.92)),text:hex(pastel)};
}
function manualArtworkAccent(color) {
    const rgb=color.match(/\w\w/g).map(v=>parseInt(v,16));
    return {color,hover:'#'+rgb.map(v=>Math.round(v*.91).toString(16).padStart(2,'0')).join(''),text:vividArtworkAccent({color}).text||'#eeeeee'};
}
function extractArtworkAccent(img) {
    const canvas=document.createElement('canvas');canvas.width=64;canvas.height=40;
    const context=canvas.getContext('2d',{willReadFrequently:true});
    context.drawImage(img,0,0,64,40);
    const pixels=context.getImageData(0,0,64,40).data;
    const bins=new Map(),warmBins=new Map();
    for(let i=0;i<pixels.length;i+=4){
        const rgb=[pixels[i],pixels[i+1],pixels[i+2]],max=Math.max(...rgb),min=Math.min(...rgb),d=max-min;
        if(pixels[i+3]<180||max<77||!d||d/max<.38)continue;
        let h=max===rgb[0]?((rgb[1]-rgb[2])/d+6)%6:max===rgb[1]?(rgb[2]-rgb[0])/d+2:(rgb[0]-rgb[1])/d+4;
        h*=60;
        const target=h<30||h>80?bins:warmBins,key=rgb.map(v=>Math.floor(v/24)).join(',');
        const bin=target.get(key)||{sum:[0,0,0],count:0};
        bin.count++;rgb.forEach((v,j)=>bin.sum[j]+=v);target.set(key,bin);
    }
    // Retain the existing hue preference, but allow gold-only artwork to work.
    let best,score=-1;
    for(const bin of (bins.size?bins:warmBins).values()){
        const rgb=bin.sum.map(v=>Math.round(v/bin.count));
        const candidate=bin.count**.6*(Math.max(...rgb)-Math.min(...rgb))/Math.max(...rgb);
        if(candidate>score){score=candidate;best=rgb;}
    }
    if(!best)return null;
    while(1.05/(luminance(best)+.05)<4.7)best=best.map(v=>Math.floor(v*.96));
    const hex=rgb=>'#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('');
    return {color:hex(best),hover:hex(best.map(v=>Math.floor(v*.88)))};
}
function sampleArtworkAccent(source) {
    if(!source?.src)return Promise.resolve(null);
    const ready=!!(source.img?.complete&&source.img.naturalWidth>0),previous=samples.get(source.src);
    if(previous?.promise)return previous.promise;
    if(previous?.readable)return Promise.resolve(previous.value);
    if(previous?.retryAfter>Date.now()&&(!ready||previous.ready))return Promise.resolve(null);
    if(ready){
        try{
            const value=extractArtworkAccent(source.img);
            samples.set(source.src,{readable:true,value});return Promise.resolve(value);
        }catch{}
    }
    const entry={ready};samples.set(source.src,entry);
    entry.promise=new Promise(resolve=>{
        const img=new Image();img.crossOrigin='anonymous';let finished=false;
        const finish=(value,readable)=>{
            if(finished)return;finished=true;clearTimeout(timeout);img.onload=img.onerror=null;
            entry.readable=readable;entry.value=value;entry.retryAfter=Date.now()+15000;
            delete entry.promise;resolve(value);
        };
        const timeout=setTimeout(()=>finish(null,false),3000);
        img.onload=()=>{try{finish(extractArtworkAccent(img),true);}catch{finish(null,false);}};
        img.onerror=()=>finish(null,false);img.src=source.src;
    });
    return entry.promise;
}
async function resolveArtworkAccent(sources,known=null) {
    const logo=sources.find(s=>s.role==='logo');
    if(logo){const value=await sampleArtworkAccent(logo);if(value)return value;}
    if(known)return known;
    const seen=new Set(logo?[logo.src]:[]);
    for(const source of sources){
        if(!source?.src||seen.has(source.src))continue;seen.add(source.src);
        const value=await sampleArtworkAccent(source);if(value)return value;
    }
    return null;
}
function artworkAccentKey(sources,id) {
    return sources.map(s=>s.role+':'+s.src).join('\n')+'|'+id;
}
const gameStorageKey='fluenty.artworkAccent.games.v1';
const gameRequests=new Map();
const validAccent=value=>/^#[0-9a-f]{6}$/i.test(value?.color||'');
function readColors(key) {
    try{const value=JSON.parse(localStorage.getItem(key)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}
}
function gameArtworkId(sources,route='') {
    const routed=route.match(/\/(?:app|apps)\/(\d+)/)?.[1];
    if(routed)return routed;
    for(const source of sources){
        let src=source?.src||'';try{src=decodeURIComponent(src);}catch{}
        const id=src.match(/(?:customimages\/|\/(?:apps|assets|librarycache)\/)(\d+)/)?.[1];
        if(id)return id;
    }
    return '';
}
function saveGameAccent(id,value) {
    // Another Steam window may have finished while this one was sampling.
    const latest=readColors(gameStorageKey);
    if(validAccent(latest[id]))return latest[id];
    const selected=vividArtworkAccent(value);latest[id]=selected;
    try{localStorage.setItem(gameStorageKey,JSON.stringify(latest));}catch{}
    return selected;
}
function readGameArtworkAccent(id) {
    if(!id)return null;
    const saved=readColors(gameStorageKey)[id];
    if(validAccent(saved))return saved;
    const legacy=Object.entries(readColors('fluenty.artworkAccent.samples.v1'))
        .reverse().find(([key,value])=>key.endsWith('|'+id)&&validAccent(value))?.[1];
    return legacy?saveGameAccent(id,legacy):null;
}
async function resolveGameArtworkAccent(id,sources,known=null) {
    const saved=readGameArtworkAccent(id);
    if(saved)return saved;
    if(id&&gameRequests.has(id))return gameRequests.get(id);
    // A route can change before its old images are replaced by React.
    const current=sources.filter(source=>{const owner=gameArtworkId([source]);return !id||!owner||owner===String(id);});
    const request=(async()=>{
        const result=await resolveArtworkAccent(current,known);
        if(!result)return null;
        return id?(readGameArtworkAccent(id)||saveGameAccent(id,result)):vividArtworkAccent(result);
    })();
    if(id)gameRequests.set(id,request);
    try{return await request;}finally{if(id&&gameRequests.get(id)===request)gameRequests.delete(id);}
}
