(() => {
    window.__fluentyNonSteamMetadata?.dispose();
    document.querySelectorAll('[data-shortcut-info-control]').forEach(e=>e.remove());
    const shared=window.opener||window;
    const storageKey='fluenty.nonSteamMetadata.v1';
    const day=86400000;
    let cache={};try{cache=JSON.parse(localStorage.getItem(storageKey)||'{}');}catch{}
    for(const record of Object.values(cache))if(record.steamId&&record.infoVisibilityVersion!==2){record.collapsed=true;record.infoVisibilityVersion=2;}
    try{localStorage.setItem(storageKey,JSON.stringify(cache));}catch{}
    let stopped=false,running=false,renderTimer=0;
    const attempts=new Map(),pending=new Set();
    const state={cache,errors:[],matches:0,scan,dispose};
    window.__fluentyNonSteamMetadata=state;
    const normalize=name=>String(name||'').normalize('NFKD').replace(/[\u0300-\u036f™®©]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
    const plain=text=>new DOMParser().parseFromString(String(text||'').replace(/\[\/?[^\]]+\]/g,' '),'text/html').body.textContent.replace(/\s+/g,' ').trim();
    const games=()=>[...(shared.appStore?.m_mapApps?.values()||[])].filter(app=>app.app_type===1073741824);
    const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(cache));}catch{}};
    const svg=(path,size=20)=>{const e=document.createElementNS('http://www.w3.org/2000/svg','svg');e.setAttribute('viewBox','0 0 20 20');e.setAttribute('width',size);e.setAttribute('height',size);e.setAttribute('fill','none');e.setAttribute('stroke','currentColor');e.setAttribute('stroke-width','1.5');e.setAttribute('stroke-linecap','round');e.setAttribute('stroke-linejoin','round');e.setAttribute('aria-hidden','true');e.innerHTML=path;return e;};
    const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
    const open=url=>{try{shared.MainWindowBrowserManager.ShowURL(url);}catch{window.open(url,'_blank','noopener');}};
    const link=(text,url,cls='')=>{const e=node('a',cls,text);e.href=url;e.addEventListener('click',event=>{event.preventDefault();open(url);});return e;};
    async function json(url){
        if(window.__loewThemeFetchJson)return window.__loewThemeFetchJson(url);
        throw new Error('Steam metadata bridge is unavailable');
    }
    async function details(steamId){const response=await json(`https://store.steampowered.com/api/appdetails?appids=${steamId}&l=english`);const data=response[steamId];if(!data?.success||data.data?.type!=='game')return null;return data.data;}
    async function match(app){
        const id=String(app.appid),title=app.display_name,previous=cache[id];
        if(previous?.title===title&&Date.now()-previous.checked<day)return;
        if((attempts.get(id)||0)>=2||pending.has(id))return;
        attempts.set(id,(attempts.get(id)||0)+1);pending.add(id);
        try{
            let steamId=previous?.title===title?previous.steamId:null;
            if(!steamId){
                const results=await json(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&l=english&cc=US`);
                const matches=(results.items||[]).filter(item=>normalize(item.name)===normalize(title));
                const ids=[...new Set(matches.map(item=>item.id))];
                if(ids.length!==1){cache[id]={title,checked:Date.now(),steamId:null};save();return;}
                steamId=ids[0];
            }
            const data=await details(steamId);if(!data)return;
            const value={title,steamId,checked:Date.now(),data,news:previous?.news||[],newsChecked:previous?.newsChecked||0,collapsed:previous?.collapsed??true,infoVisibilityVersion:2};
            cache[id]=value;save();state.matches=Object.values(cache).filter(v=>v.steamId).length;render();
            await loadNews(value);save();render();
        }catch(error){state.errors.push({id,error:String(error)});if(state.errors.length>20)state.errors.shift();}
        finally{pending.delete(id);}
    }
    async function loadNews(value){
        if(Date.now()-value.newsChecked<3600000)return;
        try{
            const response=await json(`https://store.steampowered.com/events/ajaxgetpartnereventspageable/?appid=${value.steamId}&offset=0&count=5&l=english`);
            value.news=(response.events||[]).filter(e=>e.event_name).map(event=>{
                let extra={};try{extra=JSON.parse(event.jsondata||'{}');}catch{}
                const hash=extra.localized_capsule_image?.[0]||extra.localized_title_image?.[0];
                const clan=String(BigInt(event.clan_steamid||0)&0xffffffffn);
                return {id:event.gid,title:event.event_name,type:event.event_type,date:event.rtime32_start_time,
                    summary:plain(extra.localized_summary?.[0]||event.announcement_body?.body||'').slice(0,350),
                    image:hash?`https://clan.cloudflare.steamstatic.com/images/${clan}/${hash}`:'',
                    url:`https://store.steampowered.com/news/app/${value.steamId}/view/${event.gid}`};
            });value.newsChecked=Date.now();
        }catch(error){state.errors.push({steamId:value.steamId,error:String(error)});}
    }
    async function scan(){
        if(stopped||running)return;running=true;
        try{const app=active();if(app)await match(app);}
        finally{running=false;render();}
    }
    function active(){
        const hero=document.querySelector('.HeaderBackgroundImage img.ImgSrc:not(.ImgBlur)');
        const src=hero?.currentSrc||hero?.src||'';
        const imageId=src.match(/(?:customimages\/|\/assets\/|\/librarycache\/)(\d+)/)?.[1];
        if(imageId)return games().find(app=>String(app.appid)===imageId)||null;
        const title=document.querySelector('.PlayBarGameName')?.textContent?.trim();
        return games().find(app=>app.display_name===title)||null;
    }
    const featureIcons={
        person:'<circle cx="10" cy="6" r="3"/><path d="M4 17v-2a6 6 0 0 1 12 0v2z"/>',
        people:'<circle cx="7" cy="6" r="2.5"/><circle cx="14" cy="7" r="2"/><path d="M2 17v-2a5 5 0 0 1 10 0v2zM13 11a4 4 0 0 1 5 4v2h-4"/>',
        cloud:'<path d="M5 15a4 4 0 0 1 0-8 5 5 0 0 1 9-2 4 4 0 1 1 1 10z"/>',
        gamepad:'<path d="M6 5h8c3 0 5 10 3 11-1 1-3-2-4-3H7c-1 1-3 4-4 3C1 15 3 5 6 5zM5 8v4M3 10h4M13 9h.1M15 11h.1"/>',
        award:'<circle cx="10" cy="7" r="4"/><path d="m7 11-1 7 4-2 4 2-1-7"/>',
        feature:'<path d="m10 2 2.5 5 5.5 1-4 4 1 6-5-3-5 3 1-6-4-4 5.5-1z"/>'
    };
    function info(value,app){
        const outer=node('section','AppGameInfoContainer AppDetailsExpanded');outer.setAttribute('data-shortcut-info','');outer.setAttribute('aria-label','Game information');
        const wrap=node('div','_2jPMy2QZr8bWi6yrk5ZzHA Container'),inner=node('div','_37mmOlZM_8n5yJAG5CHiW7 InnerContainer');outer.append(wrap);wrap.append(inner);
        const portrait=node('div','Portrait'),imageWrap=node('div','PortraitImage'),img=node('img');
        img.alt=value.data.name;img.src=`/customimages/${app.appid}p.png?v=${app.rt_custom_image_mtime||0}`;
        img.onerror=()=>{img.onerror=null;img.src=`https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${value.steamId}/library_600x900_2x.jpg`;};
        imageWrap.append(img);portrait.append(imageWrap);inner.append(portrait);
        const desc=node('div','Description SectionContainer');desc.append(node('div','GameDescription',plain(value.data.short_description)));inner.append(desc);
        const stats=node('div','Stats SectionContainer');
        for(const [label,text] of [['Developer:',value.data.developers?.join(', ')],['Publisher:',value.data.publishers?.join(', ')],['Release Date:',value.data.release_date?.date]]){
            if(!text)continue;const row=node('div','AssociationList');row.append(node('span','Label',label),node('span','Name',text));stats.append(row);
        }
        inner.append(stats);
        const features=node('div','FeaturesList SectionContainer');
        for(const feature of (value.data.categories||[]).filter(f=>!f.description.startsWith('#'))){
            const row=node('div','Container'),icon=node('span','Icon');
            const kind=/single/i.test(feature.description)?'person':/multi|co.op|family/i.test(feature.description)?'people':/cloud/i.test(feature.description)?'cloud':/controller/i.test(feature.description)?'gamepad':/achievement/i.test(feature.description)?'award':'feature';
            icon.append(svg(featureIcons[kind]));row.append(icon,node('span','Label',feature.description.replace(/^Steam /,'')));features.append(row);
        }
        inner.append(features);return outer;
    }
    function stories(value){
        const section=node('section','AppDetailsSection ActivityFeedContainer Panel');section.setAttribute('data-shortcut-news','');
        section.append(node('h2','SectionHeader','News & updates'));
        const body=node('div','AppDetailsSectionContainer Body InnerContainer');section.append(body);
        for(const item of value.news){
            const event=node('article','Event Panel'),partner=node('div','PartnerEvent'),container=node('div','PartnerEventMediumImage_Container'),contents=node('div','PartnerEventMediumImage_Contents');
            const type=item.type===12?'Update':item.type===14?'Major Update':item.type===13?'Small Update / Patch Notes':'News';
            const title=link(item.title,item.url,'PartnerEventMediumImage_Title');
            const category=node('div','PartnerEventType',type);contents.append(title,category);
            const media=node('div','MediumImageContainer'),image=node('img','PartnerEventMediumImage_Image');image.alt='';image.src=item.image||value.data.header_image;media.append(image);
            contents.append(media,node('div','PartnerEventMediumImage_Summary',item.summary));container.append(contents);partner.append(container);event.append(partner);
            const footer=node('div','RatingBar'),time=node('time');time.setAttribute('data-story-date','');time.dateTime=new Date(item.date*1000).toISOString();
            time.append(svg('<rect x="3" y="5" width="14" height="12" rx="2"/><path d="M6 3v4M14 3v4M3 9h14"/>'),node('span','',new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric'}).format(item.date*1000)));
            footer.append(time,link('Read news',item.url,'shortcut-read-news'));event.append(footer);body.append(event);
        }
        if(!value.news.length)body.append(node('p','shortcut-empty','No recent Steam news for this game.'));
        body.append(link('View all news',`https://store.steampowered.com/news/app/${value.steamId}`,'shortcut-all-news'));return section;
    }
    function links(value){
        const section=node('section','AppDetailsSection LinksSection Panel');section.setAttribute('data-shortcut-links','');
        const bar=node('div','DgVQapkBmhAW6oPY5rPZo Links Panel');section.append(bar);
        for(const [text,url] of [['Store Page',`https://store.steampowered.com/app/${value.steamId}`],['Community Hub',`https://steamcommunity.com/app/${value.steamId}`],['Discussions',`https://steamcommunity.com/app/${value.steamId}/discussions/`],['Guides',`https://steamcommunity.com/app/${value.steamId}/guides/`],['Support',`https://help.steampowered.com/en/wizard/HelpWithGame/?appid=${value.steamId}`]]){
            const inner=node('div','LinkInner'),anchor=link('',url,'Anchor');anchor.append(node('span','Text',text));inner.append(anchor);bar.append(inner);
        }return section;
    }
    function syncInfoControls(main,value){
        const panel=main.querySelector('[data-shortcut-info]');
        if(panel)panel.toggleAttribute('hidden',!!value.collapsed);
        for(const controls of document.querySelectorAll('._3Y87YQY56ZCOqhgcZFaDc5.Panel .AppButtonsContainer')){
            let holder=controls.querySelector('[data-shortcut-info-control]');
            if(!holder){
                holder=node('div','MenuButtonContainer');holder.setAttribute('data-shortcut-info-control','');
                const button=node('button','MenuButton Focusable');button.type='button';button.setAttribute('data-shortcut-toggle-info','');
                button.append(svg('<circle cx="10" cy="10" r="7.5"/><path d="M10 9v5M10 6h.01"/>'));
                button.addEventListener('click',()=>{
                    const current=active(),record=current&&cache[String(current.appid)];
                    if(!record)return;record.collapsed=!record.collapsed;save();
                    const root=document.querySelector('[data-has-shortcut-metadata]');if(root)syncInfoControls(root,record);
                });
                holder.append(button);controls.insertBefore(holder,controls.lastElementChild);
            }
            const button=holder.firstElementChild;
            button.setAttribute('aria-expanded',String(!value.collapsed));
            button.setAttribute('aria-label',value.collapsed?'Show game information':'Hide game information');
            button.title=value.collapsed?'Show game information':'Hide game information';
        }
    }
    function render(){
        if(stopped)return;
        const main=document.querySelector('._2OOzYVWIHaKXm6_7sscT9i'),app=active(),value=app&&cache[String(app.appid)];if(!main)return;
        if(!value?.steamId||!value.data){
            main.removeAttribute('data-has-shortcut-metadata');main.querySelectorAll('[data-shortcut-info],[data-shortcut-links],[data-shortcut-news]').forEach(e=>e.remove());
            document.querySelectorAll('[data-shortcut-info-control]').forEach(e=>e.remove());return;
        }
        const signature=[app.appid,value.checked,value.newsChecked].join(':');
        if(main.getAttribute('data-has-shortcut-metadata')===signature&&main.querySelector('[data-shortcut-info]')){syncInfoControls(main,value);return;}
        main.querySelectorAll('[data-shortcut-info],[data-shortcut-links],[data-shortcut-news]').forEach(e=>e.remove());
        main.setAttribute('data-has-shortcut-metadata',signature);
        const column=main.querySelector(':scope > .ColumnContainer');if(!column)return;
        main.insertBefore(info(value,app),column);main.insertBefore(links(value),column);
        const left=column.querySelector('.LeftColumn');if(left)left.prepend(stories(value));
        else column.prepend(stories(value));
        syncInfoControls(main,value);
    }
    const observer=new MutationObserver(()=>{if(!renderTimer)renderTimer=setTimeout(()=>{renderTimer=0;render();},120);});
    observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
    const timer=setInterval(()=>{scan();render();},10000);
    function dispose(){stopped=true;observer.disconnect();clearTimeout(renderTimer);clearInterval(timer);}
    render();scan();
})();
