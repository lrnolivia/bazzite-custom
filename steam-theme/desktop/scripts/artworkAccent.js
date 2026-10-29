import palettes from './logoPalette.js';
window.__fluentyArtworkAccentDispose?.();
const sampled = new Map();
const sampleStorageKey='fluenty.artworkAccent.samples.v1';
let sampleCache={};
try{sampleCache=JSON.parse(localStorage.getItem(sampleStorageKey)||'{}');}catch{}
const overrideStorageKey='fluenty.artworkAccent.overrides.v1';
let overrides={};
try { overrides=JSON.parse(localStorage.getItem(overrideStorageKey)||'{}'); } catch {}
let currentGameKey='',currentAutomatic=fallbackValue(),refreshAccent=()=>{};
function fallbackValue(){return {color:'#f7f7f7',hover:'#e8e8e8',text:'#171717'};}
function manualColor(color) {
    const rgb=color.match(/\w\w/g).map(v=>parseInt(v,16));
    const vividColor=vivid({color});
    const pastel=(vividColor.text||'#eeeeee').match(/\w\w/g).map(v=>parseInt(v,16));
    const initial=vividColor.text||'#eeeeee';
    const text=window.__fluentyAccentTone?.(color,initial).text||initial;
    return {color,hover:'#'+rgb.map(v=>Math.round(v*.91).toString(16).padStart(2,'0')).join(''),text};
}
function storeAccent(color) {
    if(!currentGameKey)return;
    if(color)overrides[currentGameKey]=color;else delete overrides[currentGameKey];
    try {localStorage.setItem(overrideStorageKey,JSON.stringify(overrides));}catch {return false;}
    refreshAccent();return true;
}
function pickArtworkColor(onPick,onCancel) {
    document.querySelector('[data-artwork-eyedropper]')?.remove();
    const overlay=document.createElement('div');overlay.setAttribute('data-artwork-eyedropper','');overlay.tabIndex=-1;
    overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','Pick a color from game artwork');
    const hint=document.createElement('div');hint.className='artwork-picker-hint';hint.textContent='Click the hero, logo, or poster to pick a color. Press Esc to cancel.';
    const preview=document.createElement('div');preview.className='artwork-picker-preview';
    const chip=document.createElement('span'),label=document.createElement('b');label.textContent='Point at artwork';preview.append(chip,label);overlay.append(hint,preview);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d',{willReadFrequently:true});
    let selected=null;
    function atPoint(x,y) {
        const images=document.elementsFromPoint(x,y).filter(e=>e.tagName==='IMG'&&!overlay.contains(e)&&e.naturalWidth>40);
        for(const img of images) {
            const r=img.getBoundingClientRect(),style=getComputedStyle(img),nw=img.naturalWidth,nh=img.naturalHeight;
            let width=r.width,height=r.height;
            if(['contain','cover'].includes(style.objectFit)) {const scale=style.objectFit==='cover'?Math.max(width/nw,height/nh):Math.min(width/nw,height/nh);width=nw*scale;height=nh*scale;}
            const px=(x-r.left-(r.width-width)/2)/width*nw,py=(y-r.top-(r.height-height)/2)/height*nh;
            if(px<0||py<0||px>=nw||py>=nh)continue;
            try {canvas.width=1;ctx.clearRect(0,0,1,1);ctx.drawImage(img,px,py,1,1,0,0,1,1);const rgb=ctx.getImageData(0,0,1,1).data;if(rgb[3]<128)continue;return '#'+[...rgb].slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join('');}catch{}
        }
        return null;
    }
    overlay.addEventListener('pointermove',event=>{
        selected=atPoint(event.clientX,event.clientY);label.textContent=selected?.toUpperCase()||'Point at artwork';chip.style.background=selected||'transparent';
        preview.style.left=Math.min(innerWidth-180,event.clientX+20)+'px';preview.style.top=Math.min(innerHeight-60,event.clientY+20)+'px';
    });
    overlay.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const color=atPoint(event.clientX,event.clientY);if(color){overlay.remove();onPick(color);}});
    overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();overlay.remove();onCancel();}});
    document.body.append(overlay);overlay.focus();
}
function accentPicker(anchor) {
    document.querySelector('[data-game-accent-picker]')?.remove();
    const panel=document.createElement('div');panel.setAttribute('data-game-accent-picker','');
    panel.setAttribute('popover','auto');panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Game accent color');
    const title=document.createElement('h3');title.textContent='Game accent';
    const hint=document.createElement('p');hint.textContent='Choose a color for this game. Your choice is saved on this PC.';
    const row=document.createElement('div');row.className='accent-picker-row';
    const swatch=document.createElement('input');swatch.type='color';swatch.setAttribute('aria-label','Accent color');
    const hex=document.createElement('input');hex.type='text';hex.maxLength=7;hex.setAttribute('aria-label','Hex color');hex.spellcheck=false;
    const status=document.createElement('p');status.className='accent-picker-status';status.setAttribute('role','status');
    const value=overrides[currentGameKey]||vivid(currentAutomatic).color;swatch.value=value;hex.value=value;
    function choose(color){if(!/^#[0-9a-f]{6}$/i.test(color))return;swatch.value=color;hex.value=color.toUpperCase();status.textContent=storeAccent(color)?'Saved for this game':'Could not save this color.';}
    swatch.addEventListener('input',()=>choose(swatch.value));
    hex.addEventListener('change',()=>choose(hex.value));
    const eye=document.createElement('button');eye.type='button';eye.textContent='Pick from artwork';
    eye.addEventListener('click',()=>{
        panel.hidePopover();
        pickArtworkColor(color=>{choose(color);panel.showPopover();},()=>panel.showPopover());
    });
    const automatic=document.createElement('button');automatic.type='button';automatic.textContent='Automatic';
    automatic.addEventListener('click',()=>{storeAccent(null);const c=vivid(currentAutomatic).color;swatch.value=c;hex.value=c;status.textContent='Using artwork colors again.';});
    const actions=document.createElement('div');actions.className='accent-picker-actions';actions.append(eye,automatic);
    row.append(swatch,hex);panel.append(title,hint,row,actions,status);document.body.append(panel);
    const r=anchor.getBoundingClientRect();panel.style.left=Math.max(12,Math.min(innerWidth-332,r.right-312))+'px';panel.style.top=Math.min(innerHeight-270,r.bottom+10)+'px';
    panel.showPopover();hex.focus();
}
function ensureAccentControls(bars) {
    for(const bar of bars) {
        const controls=bar.querySelector('.AppButtonsContainer');
        if(!controls||controls.querySelector('[data-game-accent-control]'))continue;
        const button=document.createElement('button');button.type='button';button.setAttribute('data-game-accent-control','');
        button.title='Customize game accent';button.setAttribute('aria-label','Customize game accent');
        button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18h1.1a2.4 2.4 0 0 0 1.5-4.3.9.9 0 0 1 .6-1.6h1.3A4.5 4.5 0 0 0 21 10.6C21 6.4 17 3 12 3Z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="7.5" cy="10" r="1.3"/><circle cx="11" cy="6.8" r="1.3"/><circle cx="15.5" cy="7.6" r="1.3"/><circle cx="6.9" cy="14.5" r="1.3"/></svg>';
        button.addEventListener('click',()=>accentPicker(button));controls.prepend(button);
    }
}
window.addEventListener('storage',event=>{if(event.key===overrideStorageKey){try{overrides=JSON.parse(event.newValue||'{}');refreshAccent();}catch{}}});
function vivid(value) { if(value.text)return value;
    const rgb=value.color.match(/\w\w/g).map(v=>parseInt(v,16)/255);
    const max=Math.max(...rgb),min=Math.min(...rgb),d=max-min; if(d<.03)return value;
    let h=0;if(d) {h=max===rgb[0]?((rgb[1]-rgb[2])/d+6)%6:max===rgb[1]?(rgb[2]-rgb[0])/d+2:(rgb[0]-rgb[1])/d+4;h/=6;}
    const saturation=.94;
    const pastel=[0,8,4].map(n=>{const k=(n+h*12)%12;return Math.round(255*(.86-.6*.14*Math.max(-1,Math.min(k-3,9-k,1))));});
    const fromHsl=l=>{
        const a=saturation*Math.min(l,1-l);
        return [0,8,4].map(n=>{const k=(n+h*12)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1))));});
    };
    let lo=0,hi=.75;
    for(let i=0;i<20;i++){const mid=(lo+hi)/2;if((luminance(pastel)+.05)/(luminance(fromHsl(mid))+.05)>=4.5)lo=mid;else hi=mid;}
    const hex=c=>'#'+c.map(v=>v.toString(16).padStart(2,'0')).join('');
    return {color:hex(fromHsl(lo)),hover:hex(fromHsl(lo*.92)),text:hex(pastel)};
}
function updateFloatingLogo(source) {
    for (const identity of document.querySelectorAll('._2L3s2nzh7yCnNESfI5_dN1 .PlayBarIconAndGame')) {
        let logo=identity.querySelector('[data-floating-game-logo]');
        if (!source) {
            if (logo) logo.remove();
            if (identity.hasAttribute('data-logo-ready')) identity.removeAttribute('data-logo-ready');
            continue;
        }
        if (!logo) {
            logo=document.createElement('img');
            logo.setAttribute('data-floating-game-logo','');
            logo.onload=()=>identity.setAttribute('data-logo-ready','true');
            logo.onerror=()=>identity.removeAttribute('data-logo-ready');
            identity.append(logo);
        }
        logo.alt=identity.querySelector('.PlayBarGameName')?.textContent||'';
        if (logo.src!==source.src) {
            identity.removeAttribute('data-logo-ready');
            logo.src=source.src;
        }
    }
}
let scheduled = false;
let revision = 0;
const fallback = {color:'#f7f7f7',hover:'#e8e8e8',text:'#171717'};
let activeArtworkKey = '';
let activeColor = fallback;
function luminance(rgb) {
    return rgb.map(v => {v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
}
function usable(rgb) {
    const [r,g,b]=rgb.map(v=>v/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
    if(max<.3||!d||d/max<.38)return false;
    let h=max===r?((g-b)/d+6)%6:max===g?(b-r)/d+2:(r-g)/d+4;h*=60;
    return h<30||h>80;
}
function extract(img) {
    const canvas=document.createElement('canvas');canvas.width=64;canvas.height=40;
    const context=canvas.getContext('2d',{willReadFrequently:true});
    context.drawImage(img,0,0,64,40);
    const pixels=context.getImageData(0,0,64,40).data;
    const bins=new Map();
    for(let i=0;i<pixels.length;i+=4) {
        const rgb=[pixels[i],pixels[i+1],pixels[i+2]],max=Math.max(...rgb),min=Math.min(...rgb);
        if(pixels[i+3]<180||!usable(rgb))continue;
        const key=rgb.map(v=>Math.floor(v/24)).join(',');
        const bin=bins.get(key)||{sum:[0,0,0],count:0};
        bin.count++;rgb.forEach((v,j)=>bin.sum[j]+=v);bins.set(key,bin);
    }
    let best,score=-1;
    for(const bin of bins.values()) {
        const rgb=bin.sum.map(v=>Math.round(v/bin.count));
        const candidate=bin.count**.6*(Math.max(...rgb)-Math.min(...rgb))/Math.max(...rgb);
        if(candidate>score){score=candidate;best=rgb;}
    }
    if(!best)return null;
    while(1.05/(luminance(best)+.05)<4.7)best=best.map(v=>Math.floor(v*.96));
    const hex=rgb=>'#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('');
    return {color:hex(best),hover:hex(best.map(v=>Math.floor(v*.88)))};
}
async function sample(source) {
    try {if(source.img?.complete)return extract(source.img);}catch{}
    return new Promise(resolve=>{
        const img=new Image();img.crossOrigin='anonymous';
        const timeout=setTimeout(()=>resolve(null),3000);
        img.onload=()=>{clearTimeout(timeout);try{resolve(extract(img));}catch{resolve(null);}};
        img.onerror=()=>{clearTimeout(timeout);resolve(null);};img.src=source.src;
    });
}
function artwork() {
    const native=document.querySelector('.HeaderBackgroundImage img.ImgSrc:not(.ImgBlur)');
    if(native)return{src:native.currentSrc||native.src,img:native,node:native,area:native.clientWidth*native.clientHeight};
    const candidates=[];
    for(const img of document.images) {
        const r=img.getBoundingClientRect();
        if(img.naturalWidth>200&&img.naturalWidth/img.naturalHeight>2.2&&r.width>300&&!/blur|capsule|header/i.test(img.currentSrc||img.src))
            candidates.push({src:img.currentSrc||img.src,img,node:img,area:r.width*r.height});
    }
    for(const node of document.querySelectorAll('[style*="background-image"]')) {
        const r=node.getBoundingClientRect();
        if(r.width<300||r.height<100||r.width/r.height<2)continue;
        const src=getComputedStyle(node).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
        if(src&&!/blur|capsule|header/i.test(src)&&!src.startsWith('data:'))candidates.push({src,node,area:r.width*r.height});
    }
    return candidates.sort((a,b)=>b.area-a.area)[0];
}
function logoArtwork() {
    const logos=[];
    const nativeLogos=document.querySelectorAll('.Header .TitleLogo');
    for(const img of nativeLogos.length?nativeLogos:document.images) {
        if(img.hasAttribute('data-floating-game-logo'))continue;
        const src=img.currentSrc||img.src||'';
        let decoded=src;try{decoded=decodeURIComponent(src);}catch{}
        const r=img.getBoundingClientRect();
        if(/(?:\/logo(?:\.|\/)|_logo\.|library_logo)/i.test(decoded)&&r.width>40&&r.height>15&&r.top<window.innerHeight)
            logos.push({src,img,node:img,area:r.width*r.height});
    }
    return logos.sort((a,b)=>b.area-a.area)[0];
}async function update() {
    scheduled=false;
    const bars=[...document.querySelectorAll('._3Y87YQY56ZCOqhgcZFaDc5.Panel')];
    if(!bars.length)return;
    const current=++revision,hero=artwork(),source=logoArtwork();
    updateFloatingLogo(source);
    ensureAccentControls(bars);
        document.querySelectorAll('[data-fluenty-hero]').forEach(node=>{if(node!==hero?.node)node.removeAttribute('data-fluenty-hero');});
    if(hero?.node)hero.node.setAttribute('data-fluenty-hero','true');
    const src=source?.src||'';
    let decoded=src;try{decoded=decodeURIComponent(src);}catch{}
    const appId=location.pathname.match(/\/(?:app|apps)\/(\d+)/)?.[1];
    const imageId=decoded.match(/(?:\/apps\/|\/assets\/|\/librarycache\/)(\d+)/)?.[1] || decoded.match(/customimages\/(\d+)_logo/)?.[1];
    const matched=Object.entries(palettes.byArtwork).find(([key])=>decoded.includes(key));
    const cached=matched?.[1] || palettes.byId[imageId||appId];
    const heroId=(hero?.src||'').match(/(?:\/assets\/|\/apps\/|customimages\/)(\d+)/)?.[1];
    const identityName=document.querySelector('.PlayBarGameName')?.textContent;
    const gameKey=imageId||heroId||identityName||appId||'';
    if(currentGameKey!==gameKey)document.querySelector('[data-game-accent-picker]')?.remove();
    currentGameKey=gameKey;
    function apply(value) {
        if(current!==revision)return; currentAutomatic=value; value=overrides[gameKey]?manualColor(overrides[gameKey]):vivid(value); activeColor=value;
        for(const bar of bars) {
            const tone=window.__fluentyAccentTone?.(value.color,value.text);
            if(tone)value={...value,text:tone.text};
            const glyphText=tone?.glyph||'#'+(value.text||'#252525').match(/\w\w/g).map(v=>Math.round(parseInt(v,16)*.76+255*.24).toString(16).padStart(2,'0')).join('');
            if(bar.style.getPropertyValue('--game-play-glyph')!==glyphText)bar.style.setProperty('--game-play-glyph',glyphText);
            for(const part of bar.querySelectorAll('._2AzIX5kl9k6JnxLfR5H4kX, ._2AzIX5kl9k6JnxLfR5H4kX *')) {
                const isGlyph=part.closest('svg')||part.closest('.ButtonChild:not(.PlayButton)');
                const desired=isGlyph?glyphText:(value.text||'#252525');if(part.style.getPropertyValue('color')!==desired)part.style.setProperty('color',desired,'important');
            }
            if(bar.style.getPropertyValue('--game-play-accent')!==value.color || bar.style.getPropertyValue('--game-play-text')!==value.text) {
                bar.style.setProperty('--game-play-accent',value.color);
                bar.style.setProperty('--game-play-hover',value.hover);
                bar.style.setProperty('--game-play-text',value.text||'#252525');
            }
        }
    }
        refreshAccent=()=>apply(currentAutomatic);
        const artworkKey=src+'|'+gameKey;
    const saved=sampleCache[artworkKey];
    if(artworkKey!==activeArtworkKey) { activeArtworkKey=artworkKey; apply(saved||cached||fallback); } else { apply(saved||currentAutomatic); }
    if(saved)return;
    if(!source&&cached)apply(cached);
    if(source) {
        if(!sampled.has(src))sampled.set(src,sample(source));
        const value=await sampled.get(src);if(value||cached){
            const result=value||cached;sampleCache[artworkKey]=result;
            const keys=Object.keys(sampleCache);if(keys.length>512)delete sampleCache[keys[0]];
            try{localStorage.setItem(sampleStorageKey,JSON.stringify(sampleCache));}catch{}
            apply(result);
        }
    }
}
let frame=0;
function schedule(){if(!scheduled){scheduled=true;frame=requestAnimationFrame(update);}}
const accentObserver=new MutationObserver(records=>{
    if(records.some(r=>r.type==='childList'||r.attributeName==='src'||(r.attributeName==='style'&&!r.target.closest('._3Y87YQY56ZCOqhgcZFaDc5'))))schedule();
});
accentObserver.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
document.addEventListener('load',schedule,true);window.addEventListener('popstate',schedule);schedule();
window.__fluentyArtworkAccentDispose=()=>{accentObserver.disconnect();cancelAnimationFrame(frame);document.removeEventListener('load',schedule,true);window.removeEventListener('popstate',schedule);};
