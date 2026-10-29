(() => {
    window.__fluentyLibraryExtrasDispose?.();
    const pages=new WeakMap();let scheduled=false;
    const hexRgb=color=>color.match(/\w\w/g)?.slice(0,3).map(v=>parseInt(v,16));
    const rgbHex=rgb=>'#'+rgb.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
    const luminance=rgb=>rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
    function accentTone(color,foreground='#eeeeee'){
        const rgb=hexRgb(color),ink=hexRgb(foreground);if(!rgb||!ink)return{text:foreground,glyph:foreground};
        const light=luminance(rgb),contrast=(a,b)=>(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
        const max=Math.max(...rgb)/255,min=Math.min(...rgb)/255,delta=max-min;
        if(contrast(light,1)<4.5){
            if(delta<.04)return{text:'#202020',glyph:'#303030'};
            let h=(max===rgb[0]/255?((rgb[1]-rgb[2])/255/delta+6)%6:max===rgb[1]/255?(rgb[2]-rgb[0])/255/delta+2:(rgb[0]-rgb[1])/255/delta+4)/6;
            const tone=l=>[0,8,4].map(n=>{const k=(n+h*12)%12;return Math.round(255*(l-l*Math.max(-1,Math.min(k-3,9-k,1))));});
            let l=.19;while(contrast(light,luminance(tone(l)))<7&&l>.03)l-=.005;
            return{text:rgbHex(tone(l)),glyph:rgbHex(tone(Math.min(l+.025,.22)))};
        }
        // Keep a light foreground on mid-tone custom colors; lift it only as much as contrast requires.
        let bright=ink.every(v=>v<140)?[238,238,238]:ink;
        for(let step=0;step<30&&contrast(light,luminance(bright))<4.5;step++)bright=bright.map(v=>Math.min(255,Math.ceil(v+(255-v)*.2)));
        return{text:rgbHex(bright),glyph:rgbHex(bright.map(v=>v*.76+255*.24))};
    }
    window.__fluentyAccentTone=accentTone;
    function refineAccents(){
        for(const bar of document.querySelectorAll('._3Y87YQY56ZCOqhgcZFaDc5.Panel')){
            const style=getComputedStyle(bar),background=style.getPropertyValue('--game-play-accent').trim();
            if(!/^#[0-9a-f]{6}$/i.test(background))continue;
            const original=style.getPropertyValue('--game-play-text').trim(),tone=accentTone(background,original);
            for(const [name,value] of [['--game-play-text',tone.text],['--game-play-glyph',tone.glyph]])if(bar.style.getPropertyValue(name)!==value)bar.style.setProperty(name,value);
            for(const node of bar.querySelectorAll('._2AzIX5kl9k6JnxLfR5H4kX,._2AzIX5kl9k6JnxLfR5H4kX *')){
                const value=node.closest('svg')||node.closest('.ButtonChild:not(.PlayButton)')?tone.glyph:tone.text;
                if(node.style.getPropertyValue('color')!==value)node.style.setProperty('color',value,'important');
            }
        }
    }
    function alignFamilyLibrary(){
        for(const bar of document.querySelectorAll('.InPage .InnerContainer.Panel')){
            const source=bar.querySelector('.SharedLibrary');
            const row=bar.querySelector(':scope > .Row');
            const action=row?.querySelector(':scope > .ActionSection');
            const stats=row?.querySelector(':scope > .StatusAndStats');
            let pill=bar.querySelector('[data-family-library-pill]');
            const note=source?.textContent.trim();
            if(!note||!action){pill?.remove();continue;}
            if(!pill){pill=document.createElement('span');pill.setAttribute('data-family-library-pill','');}
            const anchor=stats||action;if(pill.previousElementSibling!==anchor)anchor.after(pill);
            const text=note.replace(/^From your (Steam Family library)$/i,'$1');
            if(pill.textContent!==text)pill.textContent=text;
            if(pill.getAttribute('aria-label')!==note){pill.setAttribute('aria-label',note);pill.title=note;}
        }
    }
    function decorateNews() {
        for(const day of document.querySelectorAll('.ActivityFeedContainer .AppActivityDay')) {
            const date=day.querySelector(':scope > .AppActivityDate')?.firstChild?.textContent?.trim();
            const events=[...day.querySelectorAll('.Event.Panel')];let news=0;
            for(const event of events) if(decorateStory(event,date))news++;
            if(news&&news===events.length)day.setAttribute('data-dates-in-cards','true');
        }
        for(const event of document.querySelectorAll('.ActivityFeedContainer.Rollup .Event.Panel,[data-shortcut-news] .Event.Panel'))decorateStory(event,null);
    }
    function decorateStory(event,dayDate) {
        const contents=event.querySelector('.PartnerEventMediumImage_Contents,.PartnerEventLargeImage_Contents,.PartnerEventTextOnly_Container');
        if(!contents)return false;
        const date=dayDate||event.querySelector('.DayPosted')?.textContent.replace(/^[\s\u00a0-]+/,'').trim()||event.querySelector('[data-story-date] span')?.textContent;
        const fields={title:'.PartnerEventMediumImage_Title,.PartnerEventLargeImage_Title,.PartnerEventTextOnly_Title',media:'.MediumImageContainer,.PartnerEventLargeImage_Contents>.ImageContainer,.PartnerEventTextOnly_Icon',summary:'.PartnerEventMediumImage_Summary,.PartnerEventLargeImage_Summary,.PartnerEventTextOnly_LimitedSummary'};
        for(const [field,selector] of Object.entries(fields)){const node=contents.querySelector(selector);if(node&&!node.hasAttribute('data-story-'+field))node.setAttribute('data-story-'+field,'');}
        const title=contents.querySelector('[data-story-title]');
        if(title&&!title.querySelector('[data-story-heading-icon]')){
            const type=contents.querySelector('.PartnerEventType')?.textContent.toLowerCase()||'';
            const kind=/patch|small update/.test(type)?'patch':/major update/.test(type)?'major':/update/.test(type)?'update':/release/.test(type)?'release':'news';
            const drawings={
                news:'<rect x="3" y="3" width="14" height="14" rx="2"/><path d="M6 6h4v4H6zM12.5 6h1.5M12.5 9h1.5M6 13h8"/>',
                patch:'<path d="m11.3 6.2 2.5 2.5 3-3a4.7 4.7 0 0 1-6.1 5.8L5 17.2 2.8 15l5.7-5.7a4.7 4.7 0 0 1 5.8-6.1z"/>',
                major:'<circle cx="10" cy="10" r="7"/><path d="M10 5.5v9M6.5 11l3.5 3.5 3.5-3.5"/>',
                update:'<path d="M16 7a6.5 6.5 0 0 0-11-2L3 7m0-4v4h4M4 13a6.5 6.5 0 0 0 11 2l2-2m0 4v-4h-4"/>',
                release:'<path d="M4 17V3m0 1h11l-2 3 2 3H4"/>'
            };
            const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');
            for(const [name,value] of Object.entries({viewBox:'0 0 20 20',fill:'none',stroke:'currentColor','stroke-width':'1.5','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true','data-story-heading-icon':kind}))icon.setAttribute(name,value);
            icon.innerHTML=drawings[kind];title.prepend(icon);
        }
        const footer=event.querySelector('.RatingBar');
        let label=event.querySelector('[data-story-date]');
        if(date&&footer){
            if(!label||label.tagName!=='TIME'){
                label?.remove();label=document.createElement('time');label.setAttribute('data-story-date','');
                label.innerHTML='<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="3.25" y="4.75" width="13.5" height="12" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M6.5 3v4M13.5 3v4M3.5 9h13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg><span></span>';
                footer.prepend(label);
            }
            if(label.querySelector('span').textContent!==date)label.querySelector('span').textContent=date;
        }
        event.setAttribute('data-story-layout','true');return true;
    }
    function decorateComposer(){
        for(const composer of document.querySelectorAll('.ActivityFeedContainer .PostTextEntry.AddToFeed')){
            const feed=composer.closest('.ActivityFeedContainer'),header=feed.querySelector(':scope > .SectionHeader');
            if(!composer.querySelector('[data-composer-heading]')){
                const heading=document.createElement('h2');heading.setAttribute('data-composer-heading','');
                heading.textContent=header?.querySelector('.LabelText')?.textContent||header?.textContent||'Activity';composer.prepend(heading);
            }
            feed.setAttribute('data-composer-card','');
        }
        for(const column of document.querySelectorAll('.ColumnContainer')){
            const first=column.querySelector('.Spotlights .Event.Panel,.LeftColumn .PostTextEntry.AddToFeed,.LeftColumn .Event.Panel');
            if(!first)continue;
            const right=column.querySelector(':scope > .RightColumn');if(!right)continue;
            const inset=Math.max(0,Math.min(160,Math.round(first.getBoundingClientRect().top-right.getBoundingClientRect().top)));
            const value=inset+'px';if(column.style.getPropertyValue('--library-sidebar-inset')!==value)column.style.setProperty('--library-sidebar-inset',value);
        }
    }
    function paginateFeatures() {
        for(const list of document.querySelectorAll('.AppGameInfoContainer .FeaturesList')) {
            const items=[...list.children].filter(e=>e.classList.contains('Container'));
            const total=Math.ceil(items.length/5);if(!total)continue;
            let state=pages.get(list);
            if(!state||state.items.length!==items.length||state.items.some((e,i)=>e!==items[i])) {
                list.querySelector('[data-feature-pages]')?.remove();
                const dots=document.createElement('div');dots.setAttribute('data-feature-pages','');dots.setAttribute('role','group');dots.setAttribute('aria-label','Feature pages');
                state={items,page:0,dots,total};pages.set(list,state);
                if(total>1)for(let page=0;page<total;page++) {
                    const dot=document.createElement('button');dot.type='button';dot.setAttribute('aria-label',`Feature page ${page+1} of ${total}`);
                    dot.addEventListener('click',()=>{state.page=page;renderFeatures(list,state);});dots.append(dot);
                }
                list.append(dots);renderFeatures(list,state);
            }
        }
    }
    function renderFeatures(list,state) {
        state.items.forEach((e,index)=>{
            const visible=Math.floor(index/5)===state.page;
            e.toggleAttribute('data-feature-hidden',!visible);
            e.setAttribute('aria-hidden',String(!visible));
        });
        [...state.dots.children].forEach((dot,index)=>dot.setAttribute('aria-pressed',String(index===state.page)));
        list.setAttribute('data-feature-paginated','true');
    }
    function samplePixel(x,y) {
        const images=[...document.images].filter(img=>{
            const r=img.getBoundingClientRect(),c=getComputedStyle(img);
            return img.complete&&img.naturalWidth>40&&r.width>30&&r.height>20&&x>=r.left&&x<r.right&&y>=r.top&&y<r.bottom&&c.display!=='none'&&c.visibility!=='hidden'&&Number(c.opacity)>.05&&!img.classList.contains('ImgBlur')&&!/blur/i.test(img.currentSrc||img.src)&&!img.hasAttribute('data-floating-game-logo');
        }).sort((a,b)=>{
            const logo=i=>/logo/i.test(i.currentSrc||i.src)?0:1;
            return logo(a)-logo(b)||a.getBoundingClientRect().width*a.getBoundingClientRect().height-b.getBoundingClientRect().width*b.getBoundingClientRect().height;
        });
        const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
        const ctx=canvas.getContext('2d',{willReadFrequently:true});
        for(const img of images) {
            const r=img.getBoundingClientRect(),style=getComputedStyle(img),nw=img.naturalWidth,nh=img.naturalHeight;
            let width=r.width,height=r.height;
            if(['contain','cover'].includes(style.objectFit)) {const scale=style.objectFit==='cover'?Math.max(width/nw,height/nh):Math.min(width/nw,height/nh);width=nw*scale;height=nh*scale;}
            const pos=style.objectPosition.split(' ');
            const offset=(value,space)=>value?.endsWith('%')?parseFloat(value)/100*space:value?.endsWith('px')?parseFloat(value):space/2;
            const px=(x-r.left-offset(pos[0],r.width-width))/width*nw,py=(y-r.top-offset(pos[1],r.height-height))/height*nh;
            if(px<0||py<0||px>=nw||py>=nh)continue;
            try {canvas.width=1;ctx.drawImage(img,px,py,1,1,0,0,1,1);const rgb=ctx.getImageData(0,0,1,1).data;if(rgb[3]<128)continue;return '#'+[...rgb].slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join('');}catch{}
        }
        return null;
    }
    function pickArtwork(onPick,onCancel) {
        document.querySelector('[data-artwork-eyedropper]')?.remove();
        const hero=document.querySelector('.HeaderBackgroundImage .ImgSrc:not(.ImgBlur)');
        let scroller=hero?.parentElement;
        while(scroller&&!(scroller.scrollHeight>scroller.clientHeight+20&&/auto|scroll/.test(getComputedStyle(scroller).overflowY)))scroller=scroller.parentElement;
        const previousScroll=scroller?.scrollTop;
        if(scroller&&hero.getBoundingClientRect().bottom<160)scroller.scrollTo({top:0,behavior:'instant'});
        const overlay=document.createElement('div');overlay.setAttribute('data-artwork-eyedropper','');overlay.tabIndex=-1;
        overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','Pick a color from game artwork');
        const hint=document.createElement('div');hint.className='artwork-picker-hint';hint.textContent='Click artwork to pick its color. Esc cancels.';
        const preview=document.createElement('div');preview.className='artwork-picker-preview';
        const chip=document.createElement('span'),label=document.createElement('b');label.textContent='Point at artwork';preview.append(chip,label);overlay.append(hint,preview);
        const finish=()=>{overlay.remove();if(scroller&&previousScroll!==undefined)scroller.scrollTo({top:previousScroll,behavior:'instant'});};
        overlay.addEventListener('pointermove',event=>{
            const color=samplePixel(event.clientX,event.clientY);label.textContent=color?.toUpperCase()||'Point at artwork';chip.style.background=color||'transparent';
            preview.style.left=Math.min(innerWidth-180,event.clientX+20)+'px';preview.style.top=Math.min(innerHeight-60,event.clientY+20)+'px';
        });
        overlay.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const color=samplePixel(event.clientX,event.clientY);if(color){finish();onPick(color);}});
        overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish();onCancel();}});
        document.body.append(overlay);overlay.focus({preventScroll:true});
    }
    pickArtwork.sample=samplePixel;window.__fluentyArtworkPicker=pickArtwork;
    // Replace the embedded browser's native color popup with themed RGB controls.
    function enhanceColorPicker() {
        for(const panel of document.querySelectorAll('[data-game-accent-picker]')) {
            const source=panel.querySelector('input[type=color]');if(!source||panel.querySelector('[data-accent-rgb]'))continue;
            const frame=document.createElement('figure');frame.setAttribute('data-accent-artwork','');
            const image=document.createElement('img');image.alt='Game artwork';image.crossOrigin='anonymous';
            const caption=document.createElement('figcaption');caption.textContent='Click the image to pick a color.';frame.append(image,caption);
            const shared=window.opener||window;
            const hero=document.querySelector('.HeaderBackgroundImage img.ImgSrc:not(.ImgBlur)');
            const id=Number((hero?.currentSrc||hero?.src||'').match(/(?:customimages\/|\/assets\/|\/librarycache\/)(\d+)/)?.[1]);
            let candidates=[];try{candidates=[...shared.appDetailsStore.GetHeaderImagesForAppId(id)];}catch{}
            const matched=window.__fluentyNonSteamMetadata?.cache?.[id];
            if(matched?.data?.header_image)candidates.push(matched.data.header_image);
            const nextImage=()=>{const url=candidates.shift();if(url)image.src=url;else frame.remove();};
            image.addEventListener('error',nextImage);
            image.addEventListener('click',event=>{
                const color=samplePixel(event.clientX,event.clientY);if(!color)return;
                source.value=color;source.dispatchEvent(new Event('input',{bubbles:true}));
            });
            panel.querySelector('.accent-picker-row').before(frame);nextImage();
            requestAnimationFrame(()=>{const r=panel.getBoundingClientRect();if(r.bottom>innerHeight-12)panel.style.top=Math.max(12,innerHeight-r.height-12)+'px';});
            source.style.display='none';source.tabIndex=-1;
            const button=document.createElement('button');button.type='button';button.setAttribute('data-accent-swatch','');button.setAttribute('aria-label','Show color controls');
            const rgb=document.createElement('div');rgb.setAttribute('data-accent-rgb','');rgb.hidden=true;
            const sliders=[];
            ['Red','Green','Blue'].forEach((name,index)=>{
                const row=document.createElement('label');const text=document.createElement('span');text.textContent=name;
                const range=document.createElement('input');range.type='range';range.min=0;range.max=255;range.setAttribute('aria-label',name);
                const output=document.createElement('output');row.append(text,range,output);rgb.append(row);sliders.push({range,output});
                range.addEventListener('input',()=>{source.value='#'+sliders.map(s=>Number(s.range.value).toString(16).padStart(2,'0')).join('');source.dispatchEvent(new Event('input',{bubbles:true}));sync();});
            });
            function sync(){button.style.background=source.value;const values=source.value.match(/\w\w/g).map(v=>parseInt(v,16));sliders.forEach((s,i)=>{s.range.value=values[i];s.output.value=values[i];});}
            source.addEventListener('input',sync);button.addEventListener('click',()=>{sync();rgb.hidden=!rgb.hidden;button.setAttribute('aria-expanded',String(!rgb.hidden));});
            source.after(button);panel.querySelector('.accent-picker-row').after(rgb);sync();
        }
    }
    const pickClick=event=>{
        const button=event.target.closest?.('[data-game-accent-picker] button');
        if(!button||button.textContent!=='Pick from artwork')return;
        event.preventDefault();event.stopImmediatePropagation();const panel=button.closest('[data-game-accent-picker]');panel.hidePopover();
        pickArtwork(color=>{const input=panel.querySelector('input[type=color]');input.value=color;input.dispatchEvent(new Event('input',{bubbles:true}));panel.showPopover();},()=>panel.showPopover());
    };
    document.addEventListener('click',pickClick,true);
    function reflectArtwork(){
        const hero=document.querySelector('.HeaderBackgroundImage img.ImgSrc:not(.ImgBlur)');
        const source=hero?.currentSrc||hero?.src;
        if(!source)return;
        const value=`url(${JSON.stringify(source)})`;
        for(const panel of document.querySelectorAll('._2OOzYVWIHaKXm6_7sscT9i')){
            if(panel.style.getPropertyValue('--library-reflected-art')!==value)panel.style.setProperty('--library-reflected-art',value);
            const links=[...panel.querySelectorAll(':scope > .LinksSection')].find(e=>getComputedStyle(e).display!=='none');
            const height=Math.max(300,Math.min(800,Math.round((links?.getBoundingClientRect().bottom||panel.getBoundingClientRect().top+360)-panel.getBoundingClientRect().top+60)))+'px';
            if(panel.style.getPropertyValue('--library-reflection-height')!==height)panel.style.setProperty('--library-reflection-height',height);
        }
    }
    function sizeInfoPanels(){
        for(const panel of document.querySelectorAll('.AppGameInfoContainer')){
            const contents=panel.querySelector(':scope > ._2jPMy2QZr8bWi6yrk5ZzHA');if(!contents)continue;
            const height=Math.ceil(contents.scrollHeight);if(!height){if(panel.style.getPropertyValue('--library-info-height')==='0px')panel.style.removeProperty('--library-info-height');continue;}
            const value=height+'px';
            if(panel.style.getPropertyValue('--library-info-height')!==value)panel.style.setProperty('--library-info-height',value);
        }
    }
    function update(){scheduled=false;decorateNews();decorateComposer();paginateFeatures();enhanceColorPicker();refineAccents();alignFamilyLibrary();reflectArtwork();sizeInfoPanels();}
    const observer=new MutationObserver(records=>{if(records.some(r=>r.type==='childList'||r.target.matches?.('._3Y87YQY56ZCOqhgcZFaDc5.Panel'))&&!scheduled){scheduled=true;setTimeout(update,100);}});
    observer.observe(document.documentElement,{subtree:true,childList:true});update();
    window.addEventListener('resize',update);
    window.__fluentyLibraryExtrasDispose=()=>{observer.disconnect();document.removeEventListener('click',pickClick,true);window.removeEventListener('resize',update);};
})();
