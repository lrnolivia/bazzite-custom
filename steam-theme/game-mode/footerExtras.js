(() => {
 if(document.title!=='Steam Big Picture Mode')return;
 window.__steamPrimeFooterDispose?.();
 let frame=0,layer,gameFooter;
 const clearGameFooter=()=>{gameFooter?.style.removeProperty('--prime-footer-feather-rise');gameFooter=null;};
 const update=()=>{
  frame=0;const root=document.querySelector('.BasicUI'),footer=root?.querySelector('[class~="BasicFooter"]');
  if(!root||!footer){clearGameFooter();layer?.remove();layer=null;return;}
  const game=root.querySelector('[class~="AppDetailsRoot"]');
  if(game){
   const top=footer.getBoundingClientRect().top;
   const controls=[...game.querySelectorAll('[class~="ActionRow"],[class~="CloudStatusRow"],[class~="TabHeaderRowWrapper"]')].map(e=>e.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0&&r.top<top&&r.bottom>0);
   const bottom=Math.max(0,...controls.map(r=>r.bottom));
   const value=Math.max(0,Math.min(72,Math.floor(top-bottom-8)))+'px';
   layer?.remove();layer=null;
   if(gameFooter!==footer){clearGameFooter();gameFooter=footer;}
   if(footer.style.getPropertyValue('--prime-footer-feather-rise')!==value)footer.style.setProperty('--prime-footer-feather-rise',value);
   return;
  }
  clearGameFooter();
  const host=root.querySelector('[class~="ScrollArea"]:has([class~="TabbedContent"])')||root;
  if(!layer?.isConnected){layer=document.createElement('div');layer.dataset.primeFooterLayer='';layer.setAttribute('aria-hidden','true');}
  if(layer.parentElement!==host)host.append(layer);
 };
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
 const observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true});update();
 document.addEventListener('scroll',schedule,true);window.addEventListener('resize',schedule);
 window.__steamPrimeFooterDispose=()=>{cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('scroll',schedule,true);window.removeEventListener('resize',schedule);clearGameFooter();layer?.remove();};
})();
